import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    inviteCode: { type: String, required: true, unique: true },
    branding: {
        logoUrl: { type: String, default: '' },
        primaryColor: { type: String, default: '#007bff' }
    }
}, { timestamps: true });

export default mongoose.model('Organization', organizationSchema);
