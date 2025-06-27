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
    const userId = req.user.id;
    const conversations = await PrivateMessage.aggregate([
      // 1. Znajdź wszystkie wiadomości, w których bierze udział użytkownik
      { $match: { $or: [{ senderId: new mongoose.Types.ObjectId(userId) }, { recipientId: new mongoose.Types.ObjectId(userId) }] } },
      
      // 2. Sortuj, aby najnowsze wiadomości były pierwsze
      { $sort: { createdAt: -1 } },
      
      // 3. Grupuj po ID konwersacji, aby uzyskać ostatnią wiadomość i dane
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isRead", false] },
                    { $eq: ["$recipientId", new mongoose.Types.ObjectId(userId)] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      
      // 4. Zastąp korzeń dokumentu ostatnią wiadomością i dodaj licznik nieprzeczytanych
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$lastMessage", { unreadCount: "$unreadCount" }]
          }
        }
      },

      // 5. Pobierz dane rozmówcy (nie samego siebie)
      {
        $lookup: {
          from: 'users',
          let: { 
            senderId: '$senderId',
            recipientId: '$recipientId'
          },
          pipeline: [
            { $match: {
                $expr: {
                  $or: [
                    { $and: [ { $eq: ['$_id', '$$senderId'] }, { $ne: ['$$senderId', new mongoose.Types.ObjectId(userId)] } ] },
                    { $and: [ { $eq: ['$_id', '$$recipientId'] }, { $ne: ['$$recipientId', new mongoose.Types.ObjectId(userId)] } ] }
                  ]
                }
              } 
            },
            { $project: { name: 1, role: 1 } }
          ],
          as: 'participant'
        }
      },
      
      // 6. Uprość strukturę danych uczestnika, nie usuwając konwersacji bez wiadomości
      {
        $unwind: {
          path: '$participant',
          preserveNullAndEmptyArrays: true // KLUCZOWA POPRAWKA
        }
      },

      // 7. Ostateczne sortowanie, aby najnowsze konwersacje były na górze
      { $sort: { createdAt: -1 } },
    ]);
    
    // Dodatkowy filtr, aby usunąć potencjalne puste wyniki po $unwind
    const filteredConversations = conversations.filter(c => c.participant);

    res.json(filteredConversations);

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

// @route   DELETE /:messageId
// @desc    Usuń wiadomość
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await PrivateMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ msg: 'Wiadomość nie została znaleziona.' });
    }

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Nie masz uprawnień do usunięcia tej wiadomości.' });
    }

    await message.deleteOne();

    res.json({ msg: 'Wiadomość została usunięta.' });
  } catch (error) {
    console.error('Błąd podczas usuwania wiadomości:', error);
    res.status(500).send('Błąd serwera');
  }
});

export default router; 