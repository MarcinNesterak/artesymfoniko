import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import Participation from '../models/Participation.js';
import { authenticate, requireConductor, requireUser } from '../middleware/auth.js';

const router = express.Router();

// GET /api/events - pobierz wydarzenia
router.get('/', requireUser, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'conductor') {
      // Dyrygent widzi swoje wydarzenia
      query.conductorId = req.user._id;
    } else {
      // Muzyk widzi wydarzenia gdzie został zaproszony lub uczestniczy
      const userParticipations = await Participation.find({ 
        userId: req.user._id 
      }).distinct('eventId');
      
      const userInvitations = await Invitation.find({ 
        userId: req.user._id 
      }).distinct('eventId');
      
      const eventIds = [...new Set([...userParticipations, ...userInvitations])];
      query._id = { $in: eventIds };
    }
    
    // Filtruj według archived jeśli podano
    if (req.query.archived !== undefined) {
      query.archived = req.query.archived === 'true';
    }
    
    const events = await Event.find(query)
      .populate('conductorId', 'name email')
      .sort({ date: -1 });
    
    res.json({
      message: 'Lista wydarzeń',
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas pobierania wydarzeń'
    });
  }
});

// GET /api/events/:id - pobierz konkretne wydarzenie
router.get('/:id', requireUser, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('conductorId', 'name email');
    
    if (!event) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Wydarzenie nie zostało znalezione'
      });
    }
    
    // Sprawdź czy użytkownik ma dostęp do tego wydarzenia
    if (req.user.role === 'musician') {
      const hasAccess = await Invitation.exists({ 
        eventId: req.params.id, 
        userId: req.user._id 
      }) || await Participation.exists({ 
        eventId: req.params.id, 
        userId: req.user._id 
      });
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Brak dostępu do tego wydarzenia'
        });
      }
    } else if (req.user.role === 'conductor' && !event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Możesz przeglądać tylko swoje wydarzenia'
      });
    }
    
    // Pobierz dodatkowe informacje
    const invitations = await Invitation.find({ eventId: req.params.id })
      .populate('userId', 'name email instrument');
    
    const participations = await Participation.find({ eventId: req.params.id })
      .populate('userId', 'name email instrument');
    
    res.json({
      message: 'Szczegóły wydarzenia',
      event,
      invitations,
      participations
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas pobierania wydarzenia'
    });
  }
});

// POST /api/events - utwórz nowe wydarzenie (tylko dyrygent)
router.post('/', requireConductor, async (req, res) => {
  try {
    const { title, date, description, schedule, program, inviteUserIds } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Tytuł i data wydarzenia są wymagane'
      });
    }
    
    // Sprawdź czy data jest w przyszłości
    const eventDate = new Date(date);
    if (eventDate <= new Date()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Data wydarzenia musi być w przyszłości'
      });
    }
    
    // Utwórz wydarzenie
    const newEvent = new Event({
      title,
      date: eventDate,
      description,
      schedule,
      program,
      conductorId: req.user._id
    });
    
    await newEvent.save();
    
    // Utwórz zaproszenia jeśli podano muzyków
    if (inviteUserIds && inviteUserIds.length > 0) {
      const invitations = inviteUserIds.map(userId => ({
        eventId: newEvent._id,
        userId: userId,
        status: 'pending'
      }));
      
      await Invitation.insertMany(invitations);
      
      // Aktualizuj licznik zaproszeń
      newEvent.invitedCount = inviteUserIds.length;
      await newEvent.save();
    }
    
    // Pobierz wydarzenie z populowanymi danymi
    const populatedEvent = await Event.findById(newEvent._id)
      .populate('conductorId', 'name email');
    
    res.status(201).json({
      message: 'Wydarzenie zostało utworzone',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas tworzenia wydarzenia'
    });
  }
});

// PUT /api/events/:id - aktualizuj wydarzenie (tylko dyrygent-właściciel)
router.put('/:id', requireConductor, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Wydarzenie nie zostało znalezione'
      });
    }
    
    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Możesz edytować tylko swoje wydarzenia'
      });
    }
    
    const { title, date, description, schedule, program } = req.body;
    
    // Walidacja daty jeśli została zmieniona
    if (date) {
      const eventDate = new Date(date);
      if (eventDate <= new Date()) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Data wydarzenia musi być w przyszłości'
        });
      }
      event.date = eventDate;
    }
    
    // Aktualizuj pola
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (schedule !== undefined) event.schedule = schedule;
    if (program !== undefined) event.program = program;
    
    await event.save();
    
    const populatedEvent = await Event.findById(event._id)
      .populate('conductorId', 'name email');
    
    res.json({
      message: 'Wydarzenie zostało zaktualizowane',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas aktualizacji wydarzenia'
    });
  }
});

// DELETE /api/events/:id - usuń wydarzenie (tylko dyrygent-właściciel)
router.delete('/:id', requireConductor, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Wydarzenie nie zostało znalezione'
      });
    }
    
    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Możesz usuwać tylko swoje wydarzenia'
      });
    }
    
    // Usuń powiązane zaproszenia i uczestnictwa
    await Invitation.deleteMany({ eventId: req.params.id });
    await Participation.deleteMany({ eventId: req.params.id });
    
    // Usuń wydarzenie
    await Event.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Wydarzenie zostało usunięte',
      deletedEvent: {
        id: event._id,
        title: event.title,
        date: event.date
      }
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas usuwania wydarzenia'
    });
  }
});

// POST /api/events/:id/invite - zaproś muzyków do wydarzenia
router.post('/:id/invite', requireConductor, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Lista ID użytkowników jest wymagana'
      });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Wydarzenie nie zostało znalezione'
      });
    }
    
    // Sprawdź czy dyrygent jest właścicielem wydarzenia
    if (!event.conductorId.equals(req.user._id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Możesz zapraszać tylko do swoich wydarzeń'
      });
    }
    
    // Sprawdź które zaproszenia już istnieją
    const existingInvitations = await Invitation.find({
      eventId: req.params.id,
      userId: { $in: userIds }
    }).distinct('userId');
    
    // Filtruj nowych użytkowników
    const newUserIds = userIds.filter(userId => 
      !existingInvitations.some(existingId => existingId.toString() === userId)
    );
    
    if (newUserIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Wszyscy podani użytkownicy zostali już zaproszeni'
      });
    }
    
    // Utwórz nowe zaproszenia
    const invitations = newUserIds.map(userId => ({
      eventId: req.params.id,
      userId: userId,
      status: 'pending'
    }));
    
    await Invitation.insertMany(invitations);
    
    // Aktualizuj licznik zaproszeń
    const totalInvitations = await Invitation.countDocuments({ eventId: req.params.id });
    event.invitedCount = totalInvitations;
    await event.save();
    
    res.json({
      message: `Wysłano ${newUserIds.length} nowych zaproszeń`,
      invitedCount: newUserIds.length,
      totalInvitations: totalInvitations
    });
  } catch (error) {
    console.error('Invite users error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas wysyłania zaproszeń'
    });
  }
});

// POST /api/events/:id/respond - odpowiedz na zaproszenie (tylko muzyk)
router.post('/:id/respond', requireUser, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['confirmed', 'declined'].includes(status)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Status musi być "confirmed" lub "declined"'
      });
    }
    
    // Sprawdź czy wydarzenie istnieje
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Wydarzenie nie zostało znalezione'
      });
    }
    
    // Sprawdź czy użytkownik ma zaproszenie
    const invitation = await Invitation.findOne({
      eventId: req.params.id,
      userId: req.user._id,
      status: 'pending'
    });
    
    if (!invitation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Nie znaleziono oczekującego zaproszenia'
      });
    }
    
    // Sprawdź czy użytkownik już nie odpowiedział
    const existingParticipation = await Participation.findOne({
      eventId: req.params.id,
      userId: req.user._id
    });
    
    if (existingParticipation) {
      return res.status(400).json({
        error: 'Already responded',
        message: 'Już odpowiedziałeś na to zaproszenie'
      });
    }
    
    // Utwórz uczestnictwo
    const participation = new Participation({
      eventId: req.params.id,
      userId: req.user._id,
      status: status
    });
    
    await participation.save();
    
    // Aktualizuj status zaproszenia
    invitation.status = status;
    await invitation.save();
    
    // Aktualizuj liczniki w wydarzeniu
    if (status === 'confirmed') {
      event.confirmedCount = (event.confirmedCount || 0) + 1;
    }
    await event.save();
    
    res.json({
      message: status === 'confirmed' ? 'Potwierdziłeś udział w wydarzeniu' : 'Odrzuciłeś zaproszenie',
      participation: {
        eventId: req.params.id,
        status: status
      }
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas odpowiedzi na zaproszenie'
    });
  }
});

export default router;