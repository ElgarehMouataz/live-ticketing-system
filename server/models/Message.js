import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    senderUsername: { type: String, required: true },
    text: { type: String, default: '' },
    attachment: { type: Object, default: null },
    reactions: { type: Map, of: Number, default: {} },
}, { timestamps: true });

messageSchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);