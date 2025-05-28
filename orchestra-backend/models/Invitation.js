import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'ID wydarzenia jest wymagane']
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID użytkownika jest wymagane']
  },
  
  status: {
    type: String,
    enum: ['pending', 'responded'],
    default: 'pending'
  },
  
  response: {
    type: String,
    enum: ['accepted', 'declined'],
    required: function() {
      return this.status === 'responded';
    }
  },
  
  responseDate: {
    type: Date,
    required: function() {
      return this.status === 'responded';
    }
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notatki nie mogą być dłuższe niż 500 znaków']
  }
}, {
  timestamps: true
});

// Unikalność zaproszenia
invitationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Invitation', invitationSchema);