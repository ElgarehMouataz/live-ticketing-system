import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import 'dotenv/config';

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding.');

        const demoAccounts = [
            { username: 'student_demo', role: 'student', password: 'password123' },
            { username: 'agent_demo', role: 'agent', password: 'password123' },
            { username: 'admin_demo', role: 'admin', password: 'password123' }
        ];

        for (const account of demoAccounts) {
            const existing = await User.findOne({ username: account.username });
            if (!existing) {
                const hashed = await bcrypt.hash(account.password, 10);
                await User.create({
                    username: account.username,
                    role: account.role,
                    password: hashed
                });
                console.log(`Created ${account.role} demo account: ${account.username}`);
            } else {
                console.log(`Demo account ${account.username} already exists.`);
            }
        }

        console.log('Database seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDatabase();
