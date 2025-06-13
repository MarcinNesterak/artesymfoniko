import express from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import Participation from "../models/Participation.js";
import {
  authenticate,
  requireConductor,
  requireUser,
} from "../middleware/auth.js";
import Message from "../models/Message.js";
import MessageRead from "../models/MessageRead.js";
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Automatyczne archiwizowanie wydarzeń
const autoArchiveEvents = async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minut temu

    const result = await Event.updateMany(
      {
        date: { $lt: thirtyMinutesAgo }, // Wydarzenia starsze niż 30 min od rozpoczęcia
        archived: false, // Tylko nieaktywne
      },
      {
        archived: true,
      }
    );

    // Log tylko jeśli coś zostało zarchiwizowane
    if (result.modifiedCount > 0) {
      console.log(
        `🗂️ Auto-archived ${result.modifiedCount} events (30+ minutes after start time)`
      );
    }
  } catch (error) {
    console.error("❌ Auto-archive error:", error);
  }
};

// GET /api/events - pobierz wydarzenia
router.get("/", apiLimiter, requireUser, async (req, res) => {
  try {
    // Automatyczne archiwizowanie przed pobraniem listy
    await autoArchiveEvents();

    let query = {};

    if (req.user.role === "conductor") {
      // Dyrygent widzi swoje wydarzenia
      query.conductorId = req.user._id;
    } else {
      // Różna logika dla archiwum i aktywnych wydarzeń
      if (req.query.archived === "true") {
        // ARCHIWUM: wszystkie wydarzenia gdzie muzyk kiedykolwiek uczestniczył
        const allParticipations = await Participation.find({
          userId: req.user._id,
        }).distinct("eventId");

        query._id = { $in: allParticipations };
      } else {
        // AKTYWNE: tylko potwierdzone uczestnictwa i oczekujące zaproszenia
        const confirmedParticipations = await Participation.find({
          userId: req.user._id,
          status: "confirmed",
        }).distinct("eventId");

        const pendingInvitations = await Invitation.find({
          userId: req.user._id,
          status: "pending",
        }).distinct("eventId");

        const eventIds = [
          ...new Set([...confirmedParticipations, ...pendingInvitations]),
        ];
        query._id = { $in: eventIds };
      }
    }

    // Filtruj według archived jeśli podano
    if (req.query.archived !== undefined) {
      query.archived = req.query.archived === "true";
    }

    let events = await Event.find(query)
      .populate("conductorId", "name email")
      .sort({ date: 1 }); // Chronologicznie - najbliższe pierwsze

    // Dla muzyków - dodaj informacje o nowych wiadomościach i zmianach
    if (req.user.role === "musician") {
      const eventsWithNotifications = await Promise.all(
        events.map(async (event) => {
          // Znajdź ostatnią wizytę użytkownika dla tego wydarzenia
          const user = await User.findById(req.user._id);
          const lastView = user.lastEventViews?.find(
            (view) => view.eventId.toString() === event._id.toString()
          );
          const lastViewedAt = lastView?.lastViewedAt || new Date(0); // Jeśli nigdy nie oglądał = 1970

          // Sprawdź czy są nowe wiadomości
          const newMessagesCount = await Message.countDocuments({
            eventId: event._id,
            createdAt: { $gt: lastViewedAt },
          });

          // Sprawdź czy wydarzenie było modyfikowane od ostatniej wizyty
          const wasModified = event.lastModified > lastViewedAt;

          return {
            ...event.toObject(),
            notifications: {
              newMessages: newMessagesCount,
              wasModified: wasModified,
            },
          };
        })
      );
      events = eventsWithNotifications;
    }

    res.json({
      message: "Lista wydarzeń",
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas pobierania wydarzeń",
    });
  }
});

// GET /api/events/:id - pobierz konkretne wydarzenie
router.get("/:id", apiLimiter, requireUser, async (req, res) => {
  try {
    // Automatyczne archiwizowanie przed pobraniem szczegółów
    await autoArchiveEvents();

    const event = await Event.findById(req.params.id).populate(
      "conductorId",
      "name email"
    );

    if (!event) {
      return res.status(404).json({
        error: "Not found",
        message: "Wydarzenie nie zostało znalezione",
      });
    }

    // Sprawdź czy użytkownik ma dostęp do tego wydarzenia
    if (req.user.role === "musician") {
      const hasAccess =
        (await Invitation.exists({
          eventId: req.params.id,
          userId: req.user._id,
        })) ||
        (await Participation.exists({
          eventId: req.params.id,
          userId: req.user._id,
        }));

      if (!hasAccess) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Brak dostępu do tego wydarzenia",
        });
      }
    } else if (
      req.user.role === "conductor" &&
      !event.conductorId.equals(req.user._id)
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Możesz przeglądać tylko swoje wydarzenia",
      });
    }

    // Pobierz dodatkowe informacje
    const invitations = await Invitation.find({
      eventId: req.params.id,
    }).populate("userId", "name email instrument");

    const participations = await Participation.find({
      eventId: req.params.id,
    }).populate("userId", "name email instrument");

    res.json({
      message: "Szczegóły wydarzenia",
      event,
      invitations,
      participations,
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas pobierania wydarzenia",
    });
  }
});

// POST /api/events - utwórz nowe wydarzenie (tylko dyrygent)
router.post("/", requireConductor, async (req, res) => {
  try {
    // Automatyczne archiwizowanie przed utworzeniem nowego
    await autoArchiveEvents();

    const { title, date, description, schedule, program, inviteUserIds } =
      req.body;

    if (!title || !date) {
      return res.status(400).json({
        error: "Validation error",
        message: "Tytuł i data wydarzenia są wymagane",
      });
    }

    // Sprawdź czy data jest w przyszłości
    const eventDate = new Date(date);
    if (eventDate <= new Date()) {
      return res.status(400).json({
        error: "Validation error",
        message: "Data wydarzenia musi być w przyszłości",
      });
    }

    // Utwórz wydarzenie
    const newEvent = new Event({
      title,
      date: eventDate,
      description,
      schedule,
      program,
      conductorId: req.user._id,
    });

    await newEvent.save();

    // Utwórz zaproszenia jeśli podano muzyków
    if (inviteUserIds && inviteUserIds.length > 0) {
      const invitations = inviteUserIds.map((userId) => ({
        eventId: newEvent._id,
        userId: userId,
        status: "pending",
      }));

      await Invitation.insertMany(invitations);

      // Aktualizuj licznik zaproszeń
      newEvent.invitedCount = inviteUserIds.length;
      await newEvent.save();
    }

    // Pobierz wydarzenie z populowanymi danymi
    const populatedEvent = await Event.findById(newEvent._id).populate(
      "conductorId",
      "name email"
    );

    res.status(201).json({
      message: "Wydarzenie zostało utworzone",
      event: populatedEvent,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas tworzenia wydarzenia",
    });
  }
});

// PUT /api/events/:id - aktualizuj wydarzenie (tylko dyrygent-właściciel)
router.put("/:id", requireConductor, async (req, res) => {
  try {
    // Automatyczne archiwizowanie przed edycją
    await autoArchiveEvents();

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: "Not found",
        message: "Wydarzenie nie zostało znalezione",
      });
    }

    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Możesz edytować tylko swoje wydarzenia",
      });
    }

    const { title, date, description, schedule, program } = req.body;

    // Walidacja daty jeśli została zmieniona - ale tylko dla przyszłych wydarzeń
    // Walidacja daty jeśli została zmieniona - ale tylko dla przyszłych wydarzeń
    if (date && !event.archived) {
      const eventDate = new Date(date);
      if (eventDate <= new Date()) {
        return res.status(400).json({
          error: "Validation error",
          message: "Data wydarzenia musi być w przyszłości",
        });
      }
      event.date = eventDate;
    } else if (date && event.archived) {
      // Dla zarchiwizowanych wydarzeń można zmienić datę bez walidacji przyszłości
      event.date = new Date(date);
    }

    // Sprawdź czy wydarzenie powinno być przywrócone z archiwum
    if (date && event.archived) {
      const newEventDate = new Date(date);
      const now = new Date();

      // Jeśli nowa data jest w przyszłości, przywróć z archiwum
      if (newEventDate > now) {
        event.archived = false;
        console.log(
          `📤 Event restored from archive: ${event.title} (new date: ${newEventDate})`
        );
      }
    }

    // Aktualizuj pola
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (schedule !== undefined) event.schedule = schedule;
    if (program !== undefined) event.program = program;

    await event.save();

    const populatedEvent = await Event.findById(event._id).populate(
      "conductorId",
      "name email"
    );

    res.json({
      message: "Wydarzenie zostało zaktualizowane",
      event: populatedEvent,
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas aktualizacji wydarzenia",
    });
  }
});

// Pozostałe endpointy pozostają bez zmian...
// (DELETE, POST invite, POST respond, DELETE invitations, DELETE participants)

// DELETE /api/events/:id - usuń wydarzenie (tylko dyrygent-właściciel)
router.delete("/:id", requireConductor, async (req, res) => {
  try {
    await autoArchiveEvents(); // Auto-archive before deletion

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: "Not found",
        message: "Wydarzenie nie zostało znalezione",
      });
    }

    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Możesz usuwać tylko swoje wydarzenia",
      });
    }

    // Usuń powiązane zaproszenia i uczestnictwa
    await Invitation.deleteMany({ eventId: req.params.id });
    await Participation.deleteMany({ eventId: req.params.id });

    // Usuń wydarzenie
    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: "Wydarzenie zostało usunięte",
      deletedEvent: {
        id: event._id,
        title: event.title,
        date: event.date,
      },
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas usuwania wydarzenia",
    });
  }
});

// POST /api/events/:id/invite - zaproś muzyków do wydarzenia
router.post("/:id/invite", requireConductor, async (req, res) => {
  try {
    await autoArchiveEvents(); // Auto-archive before inviting

    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Lista ID użytkowników jest wymagana",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: "Not found",
        message: "Wydarzenie nie zostało znalezione",
      });
    }

    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Możesz zapraszać tylko do swoich wydarzeń",
      });
    }

    // Sprawdź które zaproszenia już istnieją
    const existingInvitations = await Invitation.find({
      eventId: req.params.id,
      userId: { $in: userIds },
    }).distinct("userId");

    // Filtruj nowych użytkowników
    const newUserIds = userIds.filter(
      (userId) =>
        !existingInvitations.some(
          (existingId) => existingId.toString() === userId
        )
    );

    if (newUserIds.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Wszyscy podani użytkownicy zostali już zaproszeni",
      });
    }

    // Utwórz nowe zaproszenia
    const invitations = newUserIds.map((userId) => ({
      eventId: req.params.id,
      userId: userId,
      status: "pending",
    }));

    await Invitation.insertMany(invitations);

    // Aktualizuj licznik zaproszeń
    const totalInvitations = await Invitation.countDocuments({
      eventId: req.params.id,
    });
    event.invitedCount = totalInvitations;
    await event.save();

    res.json({
      message: `Wysłano ${newUserIds.length} nowych zaproszeń`,
      invitedCount: newUserIds.length,
      totalInvitations: totalInvitations,
    });
  } catch (error) {
    console.error("Invite users error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas wysyłania zaproszeń",
    });
  }
});

// POST /api/events/:id/respond - odpowiedz na zaproszenie (tylko muzyk)
router.post("/:id/respond", requireUser, async (req, res) => {
  try {
    await autoArchiveEvents(); // Auto-archive before responding

    const { status } = req.body;

    if (!status || !["confirmed", "declined"].includes(status)) {
      return res.status(400).json({
        error: "Validation error",
        message: 'Status musi być "confirmed" lub "declined"',
      });
    }

    // Sprawdź czy wydarzenie istnieje
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        error: "Not found",
        message: "Wydarzenie nie zostało znalezione",
      });
    }

    // Sprawdź czy użytkownik ma zaproszenie
    const invitation = await Invitation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
      status: "pending",
    });

    if (!invitation) {
      return res.status(404).json({
        error: "Not found",
        message: "Nie znaleziono oczekującego zaproszenia",
      });
    }

    // Sprawdź czy użytkownik już nie odpowiedział
    const existingParticipation = await Participation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
    });

    if (existingParticipation) {
      return res.status(400).json({
        error: "Already responded",
        message: "Już odpowiedziałeś na to zaproszenie",
      });
    }

    // Mapuj status na response
    const response = status === "confirmed" ? "accepted" : "declined";

    // Utwórz uczestnictwo
    const participation = new Participation({
      eventId: req.params.id,
      userId: req.user._id,
      status: status,
    });

    await participation.save();

    // Aktualizuj status zaproszenia - poprawiona wersja
    invitation.status = "responded";
    invitation.response = response;
    invitation.responseDate = new Date();
    await invitation.save();

    // Aktualizuj liczniki w wydarzeniu
    if (status === "confirmed") {
      event.confirmedCount = (event.confirmedCount || 0) + 1;
    }
    await event.save();

    res.json({
      message:
        status === "confirmed"
          ? "Potwierdziłeś udział w wydarzeniu"
          : "Odrzuciłeś zaproszenie",
      participation: {
        eventId: req.params.id,
        status: status,
      },
    });
  } catch (error) {
    console.error("Respond to invitation error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas odpowiedzi na zaproszenie",
    });
  }
});

// DELETE /api/events/:id/invitations/:invitationId - odwołaj zaproszenie
router.delete(
  "/:id/invitations/:invitationId",
  requireConductor,
  async (req, res) => {
    try {
      await autoArchiveEvents(); // Auto-archive before canceling invitation

      const { id: eventId, invitationId } = req.params;

      // Sprawdź czy wydarzenie istnieje i czy dyrygent jest właścicielem
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: "Not found",
          message: "Wydarzenie nie zostało znalezione",
        });
      }

      if (!event.conductorId.equals(req.user._id)) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Możesz odwoływać zaproszenia tylko do swoich wydarzeń",
        });
      }

      // Usuń zaproszenie
      const deletedInvitation = await Invitation.findByIdAndDelete(
        invitationId
      );

      if (!deletedInvitation) {
        return res.status(404).json({
          error: "Not found",
          message: "Zaproszenie nie zostało znalezione",
        });
      }

      // Aktualizuj licznik zaproszeń
      const totalInvitations = await Invitation.countDocuments({ eventId });
      event.invitedCount = totalInvitations;
      await event.save();

      res.json({
        message: "Zaproszenie zostało odwołane",
        deletedInvitation: {
          id: deletedInvitation._id,
          userId: deletedInvitation.userId,
        },
      });
    } catch (error) {
      console.error("Cancel invitation error:", error);
      res.status(500).json({
        error: "Server error",
        message: "Wystąpił błąd podczas odwoływania zaproszenia",
      });
    }
  }
);

// DELETE /api/events/:id/participants/:participantId - usuń uczestnika
router.delete(
  "/:id/participants/:participantId",
  requireConductor,
  async (req, res) => {
    try {
      await autoArchiveEvents(); // Auto-archive before removing participant

      const { id: eventId, participantId } = req.params;

      // Sprawdź czy wydarzenie istnieje i czy dyrygent jest właścicielem
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: "Not found",
          message: "Wydarzenie nie zostało znalezione",
        });
      }

      if (!event.conductorId.equals(req.user._id)) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Możesz usuwać uczestników tylko ze swoich wydarzeń",
        });
      }

      // Usuń uczestnictwo
      const deletedParticipation = await Participation.findByIdAndDelete(
        participantId
      );

      if (!deletedParticipation) {
        return res.status(404).json({
          error: "Not found",
          message: "Uczestnictwo nie zostało znalezione",
        });
      }

      // Aktualizuj licznik potwierdzonych uczestników
      const confirmedCount = await Participation.countDocuments({
        eventId,
        status: "confirmed",
      });
      event.confirmedCount = confirmedCount;
      await event.save();

      res.json({
        message: "Uczestnik został usunięty z wydarzenia",
        deletedParticipation: {
          id: deletedParticipation._id,
          userId: deletedParticipation.userId,
        },
      });
    } catch (error) {
      console.error("Remove participant error:", error);
      res.status(500).json({
        error: "Server error",
        message: "Wystąpił błąd podczas usuwania uczestnika",
      });
    }
  }
);

// GET /api/events/:id/messages - pobierz wiadomości czatu
router.get("/:id/messages", requireUser, async (req, res) => {
  try {
    await autoArchiveEvents(); // Auto-archive before fetching messages

    // Sprawdź czy użytkownik ma dostęp do wydarzenia (jest uczestnikiem)
    const participation = await Participation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
      status: "confirmed",
    });

    if (!participation && req.user.role !== "conductor") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Tylko uczestnicy wydarzenia mogą czytać wiadomości",
      });
    }

    // Pobierz wszystkie wiadomości od utworzenia wydarzenia
    const messages = await Message.find({
      eventId: req.params.id,
    })
      .populate("userId", "name instrument")
      .sort({ createdAt: -1 })
      .limit(100);

    // Jeśli to dyrygent, dodaj informacje o przeczytaniach
    const event = await Event.findById(req.params.id);
    if (
      req.user.role === "conductor" &&
      event?.conductorId.equals(req.user._id)
    ) {
      // Pobierz wszystkich uczestników wydarzenia
      const participants = await Participation.find({
        eventId: req.params.id,
        status: "confirmed",
      }).populate("userId", "name");

      // Dla każdej wiadomości pobierz kto ją przeczytał
      const messagesWithReadStatus = await Promise.all(
        messages.map(async (message) => {
          const reads = await MessageRead.find({ messageId: message._id })
            .populate("userId", "name")
            .select("userId readAt");

          return {
            ...message.toObject(),
            readBy: reads.map((read) => ({
              userId: read.userId._id,
              name: read.userId.name,
              readAt: read.readAt,
            })),
            readCount: reads.length,
            participantCount: participants.length,
            allParticipants: participants.map((p) => ({
              userId: p.userId._id,
              name: p.userId.name,
            })),
          };
        })
      );
      res.json({
        message: "Wiadomości czatu",
        count: messagesWithReadStatus.length,
        messages: messagesWithReadStatus,
      });
    } else {
      // Dla muzyków - zwróć normalne wiadomości
      res.json({
        message: "Wiadomości czatu",
        count: messages.length,
        messages,
      });
    }
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas pobierania wiadomości",
    });
  }
});

// POST /api/events/:id/messages - wyślij wiadomość do czatu
router.post("/:id/messages", requireUser, async (req, res) => {
  try {
    await autoArchiveEvents(); // Auto-archive before sending message

    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Treść wiadomości jest wymagana",
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        error: "Validation error",
        message: "Wiadomość nie może być dłuższa niż 500 znaków",
      });
    }

    // Sprawdź czy użytkownik ma dostęp do wydarzenia (jest uczestnikiem lub dyrygentem)
    const participation = await Participation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
      status: "confirmed",
    });

    // Sprawdź czy to dyrygent właściciel wydarzenia
    const event = await Event.findById(req.params.id);
    const isConductor =
      req.user.role === "conductor" && event?.conductorId.equals(req.user._id);

    if (!participation && !isConductor) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Tylko uczestnicy wydarzenia i dyrygent mogą pisać wiadomości",
      });
    }

    // Utwórz nową wiadomość
    const newMessage = new Message({
      eventId: req.params.id,
      userId: req.user._id,
      content: content.trim(),
    });

    await newMessage.save();

    // Pobierz wiadomość z populowanymi danymi
    const populatedMessage = await Message.findById(newMessage._id).populate(
      "userId",
      "name instrument"
    );

    res.status(201).json({
      message: "Wiadomość została wysłana",
      newMessage: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas wysyłania wiadomości",
    });
  }
});

// POST /api/events/:id/messages/mark-read - oznacz wiadomości jako przeczytane
router.post("/:id/messages/mark-read", requireUser, async (req, res) => {
  try {
    await autoArchiveEvents();

    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        error: "Validation error",
        message: "messageIds musi być tablicą",
      });
    }

    // Sprawdź czy użytkownik ma dostęp do wydarzenia
    const participation = await Participation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
      status: "confirmed",
    });

    const event = await Event.findById(req.params.id);
    const isConductor =
      req.user.role === "conductor" && event?.conductorId.equals(req.user._id);

    if (!participation && !isConductor) {
      return res.status(403).json({
        error: "Forbidden",
        message:
          "Tylko uczestnicy wydarzenia mogą oznaczać wiadomości jako przeczytane",
      });
    }

    // Oznacz wiadomości jako przeczytane (ignoruj duplikaty)
    const markPromises = messageIds.map(async (messageId) => {
      try {
        await MessageRead.create({
          messageId,
          userId: req.user._id,
        });
      } catch (error) {
        // Ignoruj błędy duplikatów (już przeczytane)
        if (error.code !== 11000) {
          console.error("Error marking message as read:", error);
        }
      }
    });

    await Promise.all(markPromises);

    res.json({
      message: "Wiadomości zostały oznaczone jako przeczytane",
      markedCount: messageIds.length,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas oznaczania wiadomości",
    });
  }
});

// Aktualizuj ostatnią wizytę wydarzenia
router.put("/:id/update-last-view", requireUser, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // Znajdź użytkownika i zaktualizuj ostatnią wizytę
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    }

    // Znajdź istniejący wpis lub utwórz nowy
    const existingViewIndex = user.lastEventViews.findIndex(
      (view) => view.eventId.toString() === eventId
    );

    if (existingViewIndex !== -1) {
      // Aktualizuj istniejący wpis
      user.lastEventViews[existingViewIndex].lastViewedAt = new Date();
    } else {
      // Dodaj nowy wpis
      user.lastEventViews.push({
        eventId: eventId,
        lastViewedAt: new Date(),
      });
    }

    await user.save();
    res.json({ message: "Ostatnia wizyta zaktualizowana" });
  } catch (error) {
    console.error("Błąd przy aktualizacji ostatniej wizyty:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// GET /api/events/admin/backup - pobierz backup danych
router.get("/admin/backup", requireUser, async (req, res) => {
  try {
    // Tylko dyrygent może robić backup
    if (req.user.role !== "conductor") {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    // Pobierz wszystkie dane
    const users = await User.find({}).select("+password");
    const events = await Event.find({});
    const messages = await Message.find({});
    const participations = await Participation.find({});

    const backupData = {
      createdAt: new Date().toISOString(),
      users,
      events,
      messages,
      participations,
      counts: {
        users: users.length,
        events: events.length,
        messages: messages.length,
        participations: participations.length,
      },
    };

    res.json(backupData);
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ error: "Błąd podczas tworzenia kopii zapasowej" });
  }
});

// POST /api/events/admin/restore - przywróć dane z backupu
router.post("/admin/restore", requireUser, async (req, res) => {
  try {
    // Tylko dyrygent może przywracać backup
    if (req.user.role !== "conductor") {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    const { users, events, messages, participations } = req.body;

    // Sprawdź czy dane są prawidłowe
    if (!users || !events || !messages || !participations) {
      return res.status(400).json({
        error: "Nieprawidłowy format danych backup",
      });
    }

    // USUŃ wszystkie istniejące dane
    await User.deleteMany({});
    await Event.deleteMany({});
    await Message.deleteMany({});
    await Participation.deleteMany({});

    // WSTAW dane z backup
    if (users.length > 0) {
      const usersWithFlag = users.map((user) => ({
        ...user,
        isImporting: true,
      }));
      await User.insertMany(usersWithFlag);
    }
    if (events.length > 0) await Event.insertMany(events);
    if (messages.length > 0) await Message.insertMany(messages);
    if (participations.length > 0)
      await Participation.insertMany(participations);

    res.json({
      message: "Backup został przywrócony pomyślnie",
      restored: {
        users: users.length,
        events: events.length,
        messages: messages.length,
        participations: participations.length,
      },
    });
  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({
      error: "Błąd podczas przywracania danych",
      details: error.message,
    });
  }
});
export default router;
