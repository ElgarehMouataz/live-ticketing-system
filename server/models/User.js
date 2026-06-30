import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'agent', 'admin'], default: 'student' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    avatarUrl: { type: String, default: '' },
    settings: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model('User', userSchema);