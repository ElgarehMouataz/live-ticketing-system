import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, required: true },
    status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);