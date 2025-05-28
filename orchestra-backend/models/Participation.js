import mongoose from 'mongoose';

const participationSchema = new mongoose.Schema({
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
    enum: ['confirmed', 'declined'],
    required: [true, 'Status uczestnictwa jest wymagany']
  },
  
  confirmationDate: {
    type: Date,
    default: Date.now
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notatki nie mogą być dłuższe niż 500 znaków']
  },
  
  attendanceConfirmed: {
    type: Boolean,
    default: false
  },
  
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Unikalność uczestnictwa
participationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Participation', participationSchema);