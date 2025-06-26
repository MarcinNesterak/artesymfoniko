import mongoose from 'mongoose';

const privateMessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: false
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 2000
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
}, {
  timestamps: true // Automatycznie dodaje pola createdAt i updatedAt
});

// Funkcja pomocnicza do tworzenia ID konwersacji w jednolity sposób
privateMessageSchema.statics.getConversationId = function(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
};

export default mongoose.model('PrivateMessage', privateMessageSchema); 