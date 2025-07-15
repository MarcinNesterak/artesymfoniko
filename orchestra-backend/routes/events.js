import express from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import Participation from "../models/Participation.js";
import Contract from "../models/Contract.js";
import {
  authenticate,
  requireConductor,
  requireUser,
} from "../middleware/auth.js";
import Message from "../models/Message.js";
import MessageRead from "../models/MessageRead.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { body, validationResult } from "express-validator";
import sendEmail from "../utils/email.js";
import { sendPushNotification } from "../utils/notificationService.js";

const router = express.Router();

// Helper do formatowania daty w polskiej strefie czasowej
const formatEventDate = (date) => {
  if (!date) return { eventDate: "", eventTime: "" };
  const d = new Date(date);
  const dateOptions = {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  const timeOptions = {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return {
    eventDate: d.toLocaleDateString("pl-PL", dateOptions),
    eventTime: d.toLocaleTimeString("pl-PL", timeOptions),
  };
};

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

          // Sprawdź czy są nowe wiadomości, ignorując wiadomości własnego autorstwa
          const newMessagesCount = await Message.countDocuments({
            eventId: event._id,
            createdAt: { $gt: lastViewedAt },
            userId: { $ne: req.user._id.toString() }, // Ignoruj wiadomości od samego siebie
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
    }).populate(
      "userId",
      "name email instrument personalData.address personalData.pesel personalData.bankAccountNumber"
    );

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

// POST /api/events - stwórz nowe wydarzenie (tylko dyrygent)
router.post(
  "/",
  requireConductor,
  [
    // Reguły walidacji
    body("title")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Tytuł wydarzenia jest wymagany."),
    body("date")
      .isISO8601()
      .toDate()
      .withMessage("Data musi być w prawidłowym formacie."),
    body("location")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Lokalizacja jest wymagana."),
    body("description").optional().trim().escape(),
    body("dresscode").optional().trim().escape(),
    body("inviteUserIds")
      .isArray()
      .withMessage("Lista muzyków musi być tablicą."),
  ],
  async (req, res) => {
    // Sprawdzenie wyników walidacji
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await autoArchiveEvents();

      const {
        title,
        date,
        description,
        schedule,
        importantInfo,
        program,
        inviteUserIds,
        location,
        dresscode,
      } = req.body;

      // Walidacja, czy data jest w przyszłości
      if (new Date(date) <= new Date()) {
        return res.status(400).json({
          errors: [{ msg: "Data wydarzenia musi być w przyszłości." }],
        });
      }

      // Utwórz wydarzenie
      const newEvent = new Event({
        title,
        date,
        description,
        schedule,
        importantInfo,
        program,
        dresscode,
        conductorId: req.user._id,
        location,
      });

      const savedEvent = await newEvent.save();

      // Utwórz zaproszenia i wyślij powiadomienia
      if (inviteUserIds && inviteUserIds.length > 0) {
        const invitations = inviteUserIds.map((userId) => ({
          eventId: savedEvent._id,
          userId: userId,
        }));
        await Invitation.insertMany(invitations);

        // 1. Zbierz ID muzyków do powiadomień
        const musicianIds = inviteUserIds.map((id) => id.toString());

        // 2. Wyślij powiadomienia PUSH do wszystkich zaproszonych
        const pushPayload = {
          title: "Nowe zaproszenie!",
          body: `Zostałeś zaproszony/a na wydarzenie: ${savedEvent.title}`,
          url: `/musician/dashboard`,
        };
        // Celowo nie czekamy na wynik (fire and forget)
        sendPushNotification(musicianIds, pushPayload);

        // 3. Wyślij powiadomienia E-MAIL do wszystkich zaproszonych
        const invitedUsers = await User.find({
          _id: { $in: inviteUserIds },
        }).select("email name");

        const { eventDate, eventTime } = formatEventDate(date);

        for (const user of invitedUsers) {
          await sendEmail({
            to: user.email,
            subject: `Zaproszenie do udziału w wydarzeniu: ${title}`,
            html: `
              <h1>Cześć ${user.name.split(" ")[0]}!</h1>
              <p>Zostałeś/aś zaproszony/a do udziału w nowym wydarzeniu: <strong>${title}</strong>.</p>
              <p>Data: ${eventDate} o godzinie ${eventTime}</p>
              <p>Lokalizacja: ${location}</p>
              <p>Aby zobaczyć szczegóły i odpowiedzieć na zaproszenie, zaloguj się do aplikacji.</p>
              <a href="https://www.artesymfoniko.pl">www.artesymfoniko.pl</a>
              login: ${user.email}
              <p> Jeśli logujesz się poraz pierwszy, to Twoje hasło to: haslo123</p>
              <br>
              <p>Pozdrawiamy,</p>
              <p><strong>Artesymfoniko</strong></p>
            `,
          });
        }
      }

      res.status(201).json({
        message: "Wydarzenie zostało utworzone, a zaproszenia wysłane.",
        event: savedEvent,
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({
        error: "Server error",
        message: "Wystąpił błąd podczas tworzenia wydarzenia",
      });
    }
  }
);

// PUT /api/events/:id - zaktualizuj wydarzenie (tylko dyrygent-właściciel)
router.put(
  "/:id",
  requireConductor,
  [
    // Walidacja, podobna do tworzenia
    body("title")
      .optional()
      .notEmpty()
      .trim()
      .escape()
      .withMessage("Tytuł nie może być pusty."),
    body("date")
      .optional()
      .isISO8601()
      .toDate()
      .withMessage("Nieprawidłowy format daty."),
    body("location")
      .optional()
      .notEmpty()
      .trim()
      .escape()
      .withMessage("Lokalizacja nie może być pusta."),
    body("description").optional().trim().escape(),
    body("schedule").optional().trim().escape(),
    body("program").optional().trim().escape(),
    body("dresscode")
      .optional()
      .isIn(["", "frak", "black", "casual", "other"])
      .withMessage("Nieprawidłowa wartość dresscode."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({ message: "Wydarzenie nie znalezione." });
      }

      // Sprawdź, czy dyrygent jest właścicielem wydarzenia
      if (event.conductorId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do edycji tego wydarzenia." });
      }

      // 1. Pobierz aktualne zaproszenia PRZED modyfikacją
      const originalInvitations = await Invitation.find({ eventId: event._id });
      const originalInvitedUserIds = originalInvitations.map((inv) =>
        inv.userId.toString()
      );

      // Aktualizuj pola, które zostały przesłane w ciele żądania
      const {
        title,
        date,
        description,
        schedule,
        program,
        location,
        dresscode,
        inviteUserIds,
      } = req.body;
      if (title) event.title = title;
      if (date) event.date = date;
      if (description) event.description = description;
      if (schedule) event.schedule = schedule;
      if (program) event.program = program;
      if (location) event.location = location;
      if (dresscode) event.dresscode = dresscode;

      // Oznacz jako zmodyfikowane
      event.lastModified = new Date();

      // 2. Logika obsługi zaproszeń (jeśli inviteUserIds jest przekazane)
      if (inviteUserIds && Array.isArray(inviteUserIds)) {
        const newInvitedUserIds = inviteUserIds.map((id) => id.toString());

        // 2a. Znajdź usuniętych muzyków
        const removedUserIds = originalInvitedUserIds.filter(
          (id) => !newInvitedUserIds.includes(id)
        );
        if (removedUserIds.length > 0) {
          // Usuń ich zaproszenia i potwierdzenia uczestnictwa
          await Invitation.deleteMany({
            eventId: event._id,
            userId: { $in: removedUserIds },
          });
          await Participation.deleteMany({
            eventId: event._id,
            userId: { $in: removedUserIds },
          });
          console.log(
            `Usunięto zaproszenia dla ${removedUserIds.length} muzyków.`
          );
        }

        // 2b. Znajdź nowo dodanych muzyków
        const addedUserIds = newInvitedUserIds.filter(
          (id) => !originalInvitedUserIds.includes(id)
        );

        if (addedUserIds.length > 0) {
          // Utwórz dla nich nowe zaproszenia
          const newInvitations = addedUserIds.map((userId) => ({
            eventId: event._id,
            userId: userId,
          }));
          await Invitation.insertMany(newInvitations);
          console.log(`Dodano ${addedUserIds.length} nowych zaproszeń.`);

          // 2c. Wyślij powiadomienia email do nowo zaproszonych
          const newlyInvitedUsers = await User.find({
            _id: { $in: addedUserIds },
          }).select("email name");
          for (const user of newlyInvitedUsers) {
            const { eventDate, eventTime } = formatEventDate(event.date);
            await sendEmail({
              to: user.email,
              subject: `Nowe zaproszenie do wydarzenia: ${event.title}`,
              html: `
                <h1>Cześć ${user.name.split(" ")[0]}!</h1>
                <p>Zostałeś/aś zaproszony/a do udziału w wydarzeniu: <strong>${
                  event.title
                }</strong>.</p>
                <p>Data: ${eventDate} o godzinie ${eventTime}</p>
                <p>Lokalizacja: ${location || event.location}</p>
                <p>Wydarzenie zostało zaktualizowane. Zaloguj się do aplikacji, aby zobaczyć szczegóły i potwierdzić swój udział.</p>
                <br>
                <p>Pozdrawiamy,</p>
                <p><strong>Artesymfoniko</strong></p>
              `,
            });
          }
          console.log(
            `Wysłano powiadomienia e-mail do ${newlyInvitedUsers.length} nowych muzyków.`
          );
        }
      }

      const updatedEvent = await event.save();

      // Wyślij powiadomienie do uczestników o zmianie
      const participations = await Participation.find({
        eventId: req.params.id,
        status: "confirmed",
      }).populate("userId");

      const musicianIds = participations.map(p => p.userId._id);
      
      if (musicianIds.length > 0) {
        const { eventDate, eventTime } = formatEventDate(updatedEvent.date);

        // Przygotuj treść powiadomień
        const emailSubject = `Aktualizacja wydarzenia: ${updatedEvent.title}`;
        const emailText = `Wydarzenie "${updatedEvent.title}" zaplanowane na ${eventDate} o ${eventTime} zostało zaktualizowane. Sprawdź szczegóły w aplikacji.`;
        const pushPayload = {
            title: `Wydarzenie "${updatedEvent.title}" zostało zaktualizowane`,
            body: `Sprawdź nowe szczegóły w aplikacji.`
        };

        // Wyślij powiadomienia (E-mail + Push)
        await Promise.all(participations.map(async (p) => {
          if (p.userId && p.userId.email) {
            sendEmail(p.userId.email, emailSubject, emailText);
          }
        }));
        
        // Wyślij powiadomienie push do wszystkich muzyków jednocześnie
        await sendPushNotification(musicianIds, pushPayload);
        
        console.log(`Successfully sent update notifications for event ${updatedEvent._id} to ${musicianIds.length} musicians.`);
      }

      res.json({
        message: "Wydarzenie zostało pomyślnie zaktualizowane.",
        event: updatedEvent,
      });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({
        message: "Błąd serwera podczas aktualizacji wydarzenia.",
      });
    }
  }
);

// DELETE /api/events/:id - usuń wydarzenie (tylko dyrygent-właściciel)
router.delete("/:id", requireConductor, async (req, res) => {
  try {
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
        message: "Możesz usuwać tylko swoje wydarzenia",
      });
    }

    // Usuń wszystkie powiązane dane
    await Invitation.deleteMany({ eventId: req.params.id });
    await Participation.deleteMany({ eventId: req.params.id });
    await Message.deleteMany({ eventId: req.params.id });
    await MessageRead.deleteMany({ eventId: req.params.id });

    // Na końcu usuń samo wydarzenie
    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: "Wydarzenie i wszystkie powiązane dane zostały usunięte",
      deletedEventId: event._id,
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

    // Aktualizuj licznik zaproszeń i oznacz jako zmodyfikowane
    const totalInvitations = await Invitation.countDocuments({
      eventId: req.params.id,
    });
    event.invitedCount = totalInvitations;
    event.lastModified = new Date();
    await event.save();

    // Wyślij powiadomienia e-mail do nowo zaproszonych
    try {
      const newlyInvitedUsers = await User.find({
        _id: { $in: newUserIds },
      }).select("email name");
      for (const user of newlyInvitedUsers) {
        const { eventDate, eventTime } = formatEventDate(event.date);
        await sendEmail({
          to: user.email,
          subject: `Zaproszenie do udziału w wydarzeniu: ${event.title}`,
          html: `
            <h1>Cześć ${user.name.split(" ")[0]}!</h1>
            <p>Zostałeś/aś zaproszony/a do udziału w wydarzeniu: <strong>${
              event.title
            }</strong>.</p>
            <p>Data: ${eventDate} o godzinie ${eventTime}</p>
            <p>Lokalizacja: ${event.location}</p>
            <p>Aby zobaczyć szczegóły i odpowiedzieć na zaproszenie, zaloguj się do aplikacji.</p>
            <br>
            <p>Pozdrawiamy,</p>
            <p><strong>Artesymfoniko</strong></p>
          `,
        });
      }
      console.log(
        `Wysłano powiadomienia e-mail do ${newlyInvitedUsers.length} nowych muzyków.`
      );
    } catch (emailError) {
      console.error(
        "Błąd podczas wysyłania e-maili z zaproszeniami (szybkie zapraszanie):",
        emailError
      );
      // Nie przerywamy operacji, zaproszenia w systemie są ważniejsze
    }

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
      await autoArchiveEvents();

      const { id: eventId, invitationId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ message: "Wydarzenie nie zostało znalezione" });
      }

      if (!event.conductorId.equals(req.user._id)) {
        return res
          .status(403)
          .json({ message: "Możesz modyfikować tylko swoje wydarzenia" });
      }

      // Znajdź zaproszenie, upewniając się, że należy do tego wydarzenia
      const invitation = await Invitation.findOne({
        _id: invitationId,
        eventId: eventId, // <-- Kluczowe zabezpieczenie
      });

      if (!invitation) {
        return res
          .status(404)
          .json({
            message: "Zaproszenie nie zostało znalezione w tym wydarzeniu",
          });
      }

      // Usuń je
      await invitation.deleteOne();

      // Aktualizuj licznik
      const totalInvitations = await Invitation.countDocuments({ eventId });
      event.invitedCount = totalInvitations;
      await event.save();

      res.json({
        message: "Zaproszenie zostało odwołane",
        deletedInvitationId: invitation._id,
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
      await autoArchiveEvents();

      const { id: eventId, participantId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ message: "Wydarzenie nie zostało znalezione" });
      }

      if (!event.conductorId.equals(req.user._id)) {
        return res
          .status(403)
          .json({ message: "Możesz modyfikować tylko swoje wydarzenia" });
      }

      // Znajdź uczestnictwo, upewniając się, że należy do tego wydarzenia
      const participation = await Participation.findOne({
        _id: participantId,
        eventId: eventId, // <-- Kluczowe zabezpieczenie
      });

      if (!participation) {
        return res
          .status(404)
          .json({
            message: "Uczestnictwo nie zostało znalezione w tym wydarzeniu",
          });
      }

      const wasConfirmed = participation.status === "confirmed";

      // Usuń je
      await participation.deleteOne();

      // Jeśli usunięto potwierdzonego uczestnika, zaktualizuj licznik
      if (wasConfirmed) {
        const confirmedCount = await Participation.countDocuments({
          eventId,
          status: "confirmed",
        });
        event.confirmedCount = confirmedCount;
        await event.save();
      }

      res.json({
        message: "Uczestnik został usunięty z wydarzenia",
        deletedParticipationId: participation._id,
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
            readBy: reads
              .filter((read) => read.userId)
              .map((read) => ({
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
    if (!event) {
      return res.status(404).json({
        error: "Not Found",
        message:
          "Wydarzenie, do którego próbujesz wysłać wiadomość, nie istnieje.",
      });
    }

    const isConductor =
      req.user.role === "conductor" && event.conductorId.equals(req.user._id);

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

// DELETE /api/events/:eventId/messages/:messageId - usuń wiadomość (tylko autor)
router.delete(
  "/:eventId/messages/:messageId",
  requireUser,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await Message.findById(messageId);

      if (!message) {
        return res
          .status(404)
          .json({ message: "Wiadomość nie została znaleziona." });
      }

      // Sprawdź, czy użytkownik jest autorem wiadomości
      if (message.userId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Nie masz uprawnień do usunięcia tej wiadomości." });
      }

      // "Miękkie" usunięcie
      message.isDeleted = true;
      message.content = "Wiadomość została usunięta.";
      await message.save();

      res.status(200).json({ message: "Wiadomość została usunięta." });
    } catch (error) {
      console.error("Error deleting message:", error);
      res
        .status(500)
        .json({ message: "Błąd serwera podczas usuwania wiadomości." });
    }
  }
);

// PATCH /api/participations/:id - zaktualizuj uczestnictwo (np. wynagrodzenie)
router.patch("/participations/:id", requireConductor, async (req, res) => {
  try {
    const { fee } = req.body;
    const participationId = req.params.id;

    // Walidacja
    if (fee === undefined || typeof fee !== "number" || fee < 0) {
      return res
        .status(400)
        .json({ message: "Nieprawidłowa wartość wynagrodzenia (fee)." });
    }

    const participation = await Participation.findById(participationId);
    if (!participation) {
      return res
        .status(404)
        .json({ message: "Uczestnictwo nie zostało znalezione." });
    }

    // Sprawdź, czy dyrygent ma prawo edytować to uczestnictwo (czy jest dyrygentem wydarzenia)
    const event = await Event.findById(participation.eventId);
    if (!event || event.conductorId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Brak uprawnień do edycji tego uczestnictwa." });
    }

    // Aktualizuj i zapisz
    participation.fee = fee;
    await participation.save();

    res.json({
      message: "Uczestnictwo zostało zaktualizowane.",
      participation,
    });
  } catch (error) {
    console.error("Error updating participation:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas aktualizacji uczestnictwa." });
  }
});

// POST /api/events/contracts - Stwórz nową umowę
router.post("/contracts", requireConductor, async (req, res) => {
  try {
    const contractData = req.body;
    const conductorId = req.user._id;

    const participation = await Participation.findById(
      contractData.participationId
    );
    if (!participation) {
      return res.status(404).json({ message: "Uczestnictwo nie istnieje." });
    }

    // Walidacja, czy dyrygent jest właścicielem wydarzenia
    const event = await Event.findById(contractData.eventId);
    if (!event || event.conductorId.toString() !== conductorId.toString()) {
      return res
        .status(403)
        .json({ message: "Brak uprawnień do tworzenia umowy dla tego wydarzenia." });
    }
    
    // Krok 1: Usuń istniejącą umowę powiązaną z tym participationId (jeśli istnieje)
    await Contract.findOneAndDelete({ participationId: participation._id });
    
    // Krok 2: Stwórz i zapisz nową umowę.
    const newContract = new Contract({
      ...contractData,
      conductorId,
    });
    const savedContract = await newContract.save();

    // Krok 3: Zaktualizuj uczestnictwo, przypisując nową umowę.
    participation.contractStatus = "ready";
    participation.contractId = savedContract._id;
    await participation.save();

    res.status(201).json({
      message: "Umowa została pomyślnie utworzona.",
      contract: savedContract,
    });
  } catch (error) {
    console.error("Błąd podczas tworzenia umowy:", error);
    res
      .status(500)
      .json({ message: "Wystąpił błąd serwera podczas tworzenia umowy." });
  }
});

// GET /api/events/contracts/:id - Pobierz konkretną umowę
router.get("/contracts/:id", requireConductor, async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id);

    if (!contract) {
      return res.status(404).json({ message: "Umowa nie została znaleziona." });
    }

    // Sprawdź, czy dyrygent ma uprawnienia do tego wydarzenia
    const event = await Event.findById(contract.eventId);
    if (!event || event.conductorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Brak uprawnień do tej umowy." });
    }

    res.json({ contract });
  } catch (error) {
    console.error("Błąd podczas pobierania umowy:", error);
    res.status(500).json({ message: "Wystąpił błąd serwera." });
  }
});

export default router;
