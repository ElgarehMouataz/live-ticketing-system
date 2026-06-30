import mongoose from 'mongoose';
import User from './models/User.js';
import Ticket from './models/Ticket.js';
import Message from './models/Message.js';
import 'dotenv/config';

const resetDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for reset.');

        // Delete all tickets and messages
        await Ticket.deleteMany({});
        console.log('Cleared all tickets.');

        await Message.deleteMany({});
        console.log('Cleared all messages.');

        // Delete non-demo users
        const demoUsernames = ['student_demo', 'agent_demo', 'admin_demo'];
        const deletedUsers = await User.deleteMany({ username: { $nin: demoUsernames } });
        console.log(`Deleted ${deletedUsers.deletedCount} non-demo user accounts.`);

        // Reset demo user preferences and avatars
        const updatedDemos = await User.updateMany(
            { username: { $in: demoUsernames } },
            { $set: { settings: {}, avatarUrl: '' } }
        );
        console.log(`Reset preferences and avatars for ${updatedDemos.modifiedCount} demo accounts.`);

        console.log('Database reset complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting database:', err);
        process.exit(1);
    }
};

resetDatabase();
