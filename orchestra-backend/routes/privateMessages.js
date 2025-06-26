import express from 'express';
import { requireUser as auth } from '../middleware/auth.js';
import User from '../models/User.js';
import PrivateMessage from '../models/PrivateMessage.js';
import mongoose from 'mongoose';

const router = express.Router();

// @route   POST /
// @desc    Wyślij nową wiadomość prywatną
// @access  Private
router.post('/', auth, async (req, res) => {
  const { recipientId, eventId, content } = req.body;
  const senderId = req.user.id;
  const senderRole = req.user.role;

  try {
    // 1. Walidacja
    if (!recipientId || !content) {
      return res.status(400).json({ msg: 'Proszę podać odbiorcę i treść wiadomości.' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ msg: 'Nie możesz wysłać wiadomości do samego siebie.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ msg: 'Odbiorca nie został znaleziony.' });
    }

    // 2. Sprawdzenie uprawnień
    if (senderRole === 'musician' && recipient.role !== 'conductor') {
      return res.status(403).json({ msg: 'Muzycy mogą wysyłać wiadomości tylko do dyrygenta.' });
    }

    // 3. Utworzenie i zapisanie wiadomości
    const conversationId = PrivateMessage.getConversationId(senderId, recipientId);

    const newMessage = new PrivateMessage({
      conversationId,
      eventId,
      senderId,
      recipientId,
      content,
    });

    await newMessage.save();

    // 4. Zwrócenie zapisanej wiadomości
    res.status(201).json(newMessage);

  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości prywatnej:', error);
    res.status(500).send('Błąd serwera');
  }
});

// @route   GET /conversations
// @desc    Pobierz listę wszystkich konwersacji użytkownika
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // ---- POCZĄTEK TYMCZASOWEGO TESTU ----
    // Zamiast skomplikowanego zapytania, zwracamy na sztywno pustą tablicę
    return res.json([]);
    // ---- KONIEC TYMCZASOWEGO TESTU ----

    /*
    const userId = req.user.id;
    const conversations = await PrivateMessage.aggregate([
      // ... (całe skomplikowane zapytanie jest teraz w komentarzu)
    ]);
    res.json(conversations);
    */
  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error);
    res.status(500).send('Błąd serwera');
  }
});

// @route   GET /conversations/:otherUserId
// @desc    Pobierz historię wiadomości z konkretnym użytkownikiem
// @access  Private
router.get('/conversations/:otherUserId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;
    const conversationId = PrivateMessage.getConversationId(currentUserId, otherUserId);
    const messages = await PrivateMessage.find({ conversationId })
      .sort({ createdAt: 'asc' })
      .populate('senderId', 'name role')
      .populate('recipientId', 'name role')
      .populate('eventId', 'title');
    res.json(messages);
  } catch (error) {
    console.error('Błąd podczas pobierania historii konwersacji:', error);
    res.status(500).send('Błąd serwera');
  }
});

// @route   PUT /conversations/:otherUserId/read
// @desc    Oznacz wiadomości w konwersacji jako przeczytane
// @access  Private
router.put('/conversations/:otherUserId/read', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    const conversationId = PrivateMessage.getConversationId(currentUserId, otherUserId);

    await PrivateMessage.updateMany(
      { 
        conversationId: conversationId,
        recipientId: currentUserId, // Oznacz jako przeczytane tylko te, których jesteś odbiorcą
        isRead: false 
      },
      { $set: { isRead: true } }
    );

    res.json({ msg: 'Wiadomości oznaczone jako przeczytane.' });
  } catch (error) {
    console.error('Błąd podczas oznaczania wiadomości jako przeczytane:', error);
    res.status(500).send('Błąd serwera');
  }
});

export default router; 