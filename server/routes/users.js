import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';
import User from '../models/User.js';

const router = express.Router();

// Avatar upload
router.put('/profile/avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { avatarUrl: req.file.path },
            { new: true }
        ).select('-password');

        res.json({ avatarUrl: user.avatarUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Password change
router.put('/profile/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: 'Both fields required' });

        const user = await User.findById(req.user.userId);
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ error: 'Current password incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings update
router.put('/profile/settings', protect, async (req, res) => {
    try {
        const { theme, fontSize, language } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { settings: { theme, fontSize, language } },
            { new: true }
        ).select('-password');

        res.json({ settings: user.settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;