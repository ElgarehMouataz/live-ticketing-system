import express from 'express';
import { protect } from '../middleware/auth.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import { uploadAttachment } from '../config/cloudinary.js';

const router = express.Router();

// List tickets scoped to role
router.get('/', protect, async (req, res) => {
    try {
        const query = req.user.role === 'agent'
            ? { $or: [{ agentId: req.user.userId }, { status: 'open' }] }
            : { studentId: req.user.userId };

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

        const query = { ticketId: req.params.ticketId };
        if (before) query.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json(messages.reverse());
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