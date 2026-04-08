import mongoose from 'mongoose';

const queueDeadLetterSchema = new mongoose.Schema({
  queueName: { type: String, required: true, index: true },
  jobName: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  errorMessage: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  quarantined: { type: Boolean, default: false },
  replayedAt: { type: Date, default: null },
  correlationId: { type: String, default: null, index: true },
}, { timestamps: true });

queueDeadLetterSchema.index({ quarantined: 1, createdAt: -1 });

export default mongoose.model('QueueDeadLetter', queueDeadLetterSchema);
