import mongoose from 'mongoose';

const messageReadSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Zapobieganie duplikatów - jeden user może przeczytać wiadomość tylko raz
messageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export default mongoose.model('MessageRead', messageReadSchema);