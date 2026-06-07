import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import authRouter from './routes/auth.js';
import socketAuth from './middleware/socketAuth.js'
import Ticket from './models/Ticket.js';


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
app.get('/', (req, res) => res.json({ status: 'API running' }));

io.on('connection', (socket) => {
    console.log(`Socket connected:    ${socket.id}`);

    socket.on('ticket:create', async (data) => {
        try {
            const ticket = await Ticket.create({
                studentId: socket.userId,
                subject: data.subject,
                urgency: data.urgency || 'low',
            });

            io.emit('ticket:new_broadcast', ticket);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('ticket:claim', async ({ ticketId }) => {
        try {
            const ticket = await Ticket.findByIdAndUpdate(
                ticketId,
                { agentId: socket.userId, status: 'in-progress' },
                { new: true }
            );

            const room = `ticket:${ticketId}`;
            socket.join(room);

            const studentSockets = await io.fetchSockets();
            const studentSocket = studentSockets.find(s => s.userId === String(ticket.studentId));
            if (studentSocket) studentSocket.join(room);

            io.to(room).emit('ticket:claimed', ticket);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
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