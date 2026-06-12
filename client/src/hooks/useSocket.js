import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token) {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const socket = io(API, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);

    return { socket: socketRef.current, isConnected };
}
