import express from 'express';
import { protect } from '../middleware/auth.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadAttachment } from '../config/cloudinary.js';

const router = express.Router();

// List tickets scoped to role
router.get('/', protect, async (req, res) => {
    try {
        const query = req.user.role === 'agent'
            ? { organizationId: req.user.organizationId, $or: [{ agentId: req.user.userId }, { status: 'open' }] }
            : { studentId: req.user.userId, organizationId: req.user.organizationId };

        const tickets = await Ticket.find(query).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Paginated message history
router.get('/:ticketId/messages', protect, async (req, res) => {
    try {
        const { before, limit = 30 } = req.query;

        // Verify ticket belongs to the user's organization
        const ticket = await Ticket.findOne({ _id: req.params.ticketId, organizationId: req.user.organizationId });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found or unauthorized' });

        const query = { ticketId: req.params.ticketId };
        if (before) query.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        const usernames = [...new Set(messages.map(m => m.senderUsername))];
        const users = await User.find({ username: { $in: usernames } }).select('username avatarUrl').lean();
        const avatarMap = users.reduce((acc, user) => {
            acc[user.username] = user.avatarUrl;
            return acc;
        }, {});

        const messagesWithAvatars = messages.map(m => ({
            ...m,
            senderAvatarUrl: avatarMap[m.senderUsername] || ''
        }));

        res.json(messagesWithAvatars.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload attachment
router.post('/upload', protect, uploadAttachment.single('attachment'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        res.json({ url: req.file.path, name: req.file.originalname });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;