import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/role.js';

const router = express.Router();

// All routes here require a valid JWT AND the 'admin' role
router.use(protect, authorizeRoles('admin'));

// Get all agents
router.get('/agents', async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent', organizationId: req.user.organizationId }).select('-password').sort({ createdAt: -1 });
        res.json(agents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Provision a new agent
router.post('/agents', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ message: 'Username already taken' });
        }

        // Prevent demo account from provisioning users
        if (req.user.username === 'admin_demo') {
            return res.status(403).json({ message: 'Demo Admin accounts are restricted from provisioning new agents.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const agent = await User.create({
            username,
            password: hashed,
            role: 'agent', // Strictly forced to agent
            organizationId: req.user.organizationId
        });

        res.status(201).json({ 
            message: 'Agent provisioned successfully', 
            agent: { _id: agent._id, username: agent.username } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
