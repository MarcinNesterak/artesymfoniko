import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: ['title', 'date', 'description', 'schedule', 'importantInfo', 'program', 'dresscode', 'location']
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { _id: false });

const eventAuditSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  editorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: [changeSchema],
    required: true
  }
});

export default mongoose.model('EventAudit', eventAuditSchema);
