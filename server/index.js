import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'API running' }));

io.on('connection', (socket) => {
    console.log(`Socket connected:    ${socket.id}`);
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