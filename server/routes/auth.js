import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            token, 
            username: user.username, 
            role: user.role, 
            avatarUrl: user.avatarUrl, 
            settings: user.settings 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required' });

    try {
        const existing = await User.findOne({ username });
        if (existing) return res.status(409).json({ message: 'Username already taken' });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            password: hashed,
            role: 'student',
        });

        res.status(201).json({ message: 'User created', userId: user._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/me', protect, (req, res) => {
    res.json({ user: req.user });
});
export default router;