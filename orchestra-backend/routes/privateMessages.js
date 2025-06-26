const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const PrivateMessage = require('../models/PrivateMessage');
const mongoose = require('mongoose');

// @route   POST /api/private-messages
// @desc    Wyślij nową wiadomość prywatną
// @access  Private
router.post('/', auth, async (req, res) => {
  const { recipientId, eventId, content } = req.body;
  const senderId = req.user.id;
  const senderRole = req.user.role;

  try {
    // 1. Walidacja
    if (!recipientId || !content || !eventId) {
      return res.status(400).json({ msg: 'Proszę podać odbiorcę, treść wiadomości i ID wydarzenia.' });
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

// @route   GET /api/private-messages/conversations
// @desc    Pobierz listę wszystkich konwersacji użytkownika
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await PrivateMessage.aggregate([
      // 1. Znajdź wszystkie wiadomości, w których bierze udział użytkownik
      { $match: { $or: [{ senderId: mongoose.Types.ObjectId(userId) }, { recipientId: mongoose.Types.ObjectId(userId) }] } },
      
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
                    { $eq: ["$recipientId", mongoose.Types.ObjectId(userId)] }
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
                    { $and: [ { $eq: ['$_id', '$$senderId'] }, { $ne: ['$$senderId', mongoose.Types.ObjectId(userId)] } ] },
                    { $and: [ { $eq: ['$_id', '$$recipientId'] }, { $ne: ['$$recipientId', mongoose.Types.ObjectId(userId)] } ] }
                  ]
                }
              } 
            },
            { $project: { name: 1, role: 1 } }
          ],
          as: 'participant'
        }
      },
      
      // 6. Uprość strukturę danych uczestnika
      {
        $unwind: '$participant'
      },

      // 7. Ostateczne sortowanie, aby najnowsze konwersacje były na górze
      { $sort: { createdAt: -1 } },
    ]);
    
    res.json(conversations);

  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error);
    res.status(500).send('Błąd serwera');
  }
});

// @route   GET /api/private-messages/conversations/:otherUserId
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
      .populate('recipientId', 'name role');

    res.json(messages);
  } catch (error) {
    console.error('Błąd podczas pobierania historii konwersacji:', error);
    res.status(500).send('Błąd serwera');
  }
});

// @route   PUT /api/private-messages/conversations/:otherUserId/read
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

module.exports = router; 