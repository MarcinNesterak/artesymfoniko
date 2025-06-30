import express from 'express';
import { requireConductor } from '../middleware/auth.js';
import Contract from '../models/Contract.js';
import Participation from '../models/Participation.js';
import Event from '../models/Event.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/contracts - Stwórz nową umowę
router.post('/', requireConductor, async (req, res) => {
  try {
    const conductorId = req.user._id;
    const contractData = req.body;

    // Walidacja podstawowych danych
    const { eventId, participationId } = contractData;
    if (!eventId || !participationId) {
      return res.status(400).json({ message: 'Brak ID wydarzenia lub uczestnictwa.' });
    }

    // Sprawdzenie, czy dyrygent ma uprawnienia do tego wydarzenia
    const event = await Event.findById(eventId);
    if (!event || event.conductorId.toString() !== conductorId.toString()) {
      return res.status(403).json({ message: 'Brak uprawnień do zarządzania umowami dla tego wydarzenia.' });
    }

    // Sprawdzenie, czy dla tego uczestnictwa nie istnieje już umowa
    const existingContract = await Contract.findOne({ participationId });
    if (existingContract) {
      return res.status(409).json({ message: 'Umowa dla tego uczestnika już istnieje. Możesz ją edytować.' });
    }
    
    // Stworzenie nowej umowy
    const newContract = new Contract({
      ...contractData,
      conductorId, // Ustawienie ID dyrygenta, który tworzy umowę
    });

    const savedContract = await newContract.save();

    // Aktualizacja statusu w dokumencie Participation
    await Participation.findByIdAndUpdate(participationId, {
      contractStatus: 'ready',
      contractId: savedContract._id,
    });

    res.status(201).json({
      message: 'Umowa została pomyślnie utworzona.',
      contract: savedContract,
    });

  } catch (error) {
    console.error('Błąd podczas tworzenia umowy:', error);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas tworzenia umowy.' });
  }
});

export default router; 