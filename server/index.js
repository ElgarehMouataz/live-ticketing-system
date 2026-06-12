import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import authRouter from './routes/auth.js';
import socketAuth from './middleware/socketAuth.js'
import Ticket from './models/Ticket.js';
import Message from './models/Message.js';
import usersRouter from './routes/users.js';
import ticketsRouter from './routes/tickets.js';
import adminRouter from './routes/admin.js';



const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});
io.use(socketAuth);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/admin', adminRouter);
app.get('/', (req, res) => res.json({ status: 'API running' }));

io.on('connection', async (socket) => {
    console.log(`Socket connected:    ${socket.id}`);

    // Auto-join rooms for existing active tickets so reconnecting users
    // can resume receiving messages without re-claiming.
    try {
        const query = socket.role === 'agent'
            ? { agentId: socket.userId, status: { $ne: 'resolved' } }
            : { studentId: socket.userId, status: { $ne: 'resolved' } };
        const active = await Ticket.find(query).select('_id');
        active.forEach(t => socket.join(`ticket:${t._id}`));
    } catch (err) {
        console.error('Room auto-join failed:', err.message);
    }

    socket.on('ticket:create', async (data) => {
        try {
            const ticket = await Ticket.create({
                studentId: socket.userId,
                subject: data.subject,
                urgency: data.urgency || 'low',
            });

            socket.join(`ticket:${ticket._id}`);
            io.emit('ticket:new_broadcast', ticket);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('ticket:claim', async ({ ticketId }) => {
        try {
            const ticket = await Ticket.findByIdAndUpdate(
                ticketId,
                { agentId: socket.userId, status: 'active' },
                { new: true }
            );

            const room = `ticket:${ticketId}`;
            socket.join(room);

            const studentSockets = await io.fetchSockets();
            const studentSocket = studentSockets.find(s => s.userId === String(ticket.studentId));
            if (studentSocket) studentSocket.join(room);

            io.emit('ticket:update', ticket);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('ticket:join', ({ ticketId }) => {
        socket.join(`ticket:${ticketId}`);
    });

    socket.on('chat:message_send', async ({ ticketId, text, attachment }) => {
        try {
            const message = await Message.create({
                ticketId,
                senderUsername: socket.username,
                text,
                attachment: attachment || null,
            });
            io.to(`ticket:${ticketId}`).emit('chat:message_received', message);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('chat:reaction_toggle', async ({ messageId, emoji }) => {
        try {
            const message = await Message.findById(messageId);
            const reaction = message.reactions.find(r => r.emoji === emoji);
            if (!reaction) {
                await Message.findByIdAndUpdate(messageId, {
                    $push: { reactions: { emoji, usernames: [socket.username] } }
                });
            } else if (reaction.usernames.includes(socket.username)) {
                await Message.findByIdAndUpdate(messageId, {
                    $pull: { 'reactions.$[r].usernames': socket.username }
                }, { arrayFilters: [{ 'r.emoji': emoji }] });
            } else {
                await Message.findByIdAndUpdate(messageId, {
                    $addToSet: { 'reactions.$[r].usernames': socket.username }
                }, { arrayFilters: [{ 'r.emoji': emoji }] });
            }
            const updated = await Message.findById(messageId);
            io.to(`ticket:${updated.ticketId}`).emit('chat:reaction_updated', updated);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('ticket:resolve', async ({ ticketId }) => {
        try {
            const ticket = await Ticket.findByIdAndUpdate(
                ticketId,
                { status: 'resolved' },
                { new: true }
            );
            io.to(`ticket:${ticketId}`).emit('ticket:update', ticket);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('chat:typing_start', ({ ticketId }) => {
        socket.to(`ticket:${ticketId}`).emit('chat:typing_update', {
            ticketId,
            username: socket.username,
            isTyping: true,
        });
    });

    socket.on('chat:typing_stop', ({ ticketId }) => {
        socket.to(`ticket:${ticketId}`).emit('chat:typing_update', {
            ticketId,
            username: socket.username,
            isTyping: false,
        });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});