import jwt from 'jsonwebtoken';

const socketAuth = (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token)
        return next(new Error('No token provided'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        next();
    } catch (err) {
        next(new Error('Invalid or expired token'));
    }
};

export default socketAuth;