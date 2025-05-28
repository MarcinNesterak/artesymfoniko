import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tytuł wydarzenia jest wymagany'],
    trim: true,
    maxlength: [200, 'Tytuł nie może być dłuższy niż 200 znaków']
  },
  
  date: {
    type: Date,
    required: [true, 'Data wydarzenia jest wymagana']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Opis nie może być dłuższy niż 1000 znaków']
  },
  
  schedule: {
    type: String,
    trim: true,
    maxlength: [2000, 'Harmonogram nie może być dłuższy niż 2000 znaków']
  },
  
  program: {
    type: String,
    trim: true,
    maxlength: [3000, 'Program nie może być dłuższy niż 3000 znaków']
  },
  
  conductorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID dyrygenta jest wymagane']
  },
  
  archived: {
    type: Boolean,
    default: false
  },
  
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  
  invitedCount: {
    type: Number,
    default: 0
  },
  
  confirmedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index dla lepszej wydajności
eventSchema.index({ conductorId: 1, date: -1 });
eventSchema.index({ archived: 1, date: -1 });

// Virtual dla sprawdzania czy wydarzenie jest nadchodzące
eventSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date() && !this.archived;
});

export default mongoose.model('Event', eventSchema);