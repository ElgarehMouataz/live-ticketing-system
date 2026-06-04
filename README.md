# SocketSupport

## Project Overview

SocketSupport is a full-stack, real-time customer support ticketing and live chat application. It allows students to submit support requests and communicate with agents through a persistent, bi-directional messaging system. Agents manage incoming tickets from a centralised dashboard, claim open requests, and resolve conversations in real time.

The application is designed to demonstrate practical knowledge of WebSocket-based architectures, token-based authentication, database modelling, and frontend state management in a production-like environment.

## Goals

- Build a working real-time communication system that goes beyond basic CRUD operations.
- Implement a multi-role architecture where students and agents have distinct interfaces and permissions.
- Separate real-time event delivery (Socket.io) from historical data retrieval (REST API) to reflect how production systems handle these concerns independently.
- Support user personalisation through persistent settings including theme selection, font sizing, and language preferences.
- Provide paginated access to past conversations so ticket history is never lost.

## Technology Stack

### Node.js with Express

Express serves as the HTTP framework for all REST endpoints (authentication, profile management, ticket listing, and paginated message history). It wraps the native HTTP server, which is then passed to Socket.io for WebSocket upgrades. Express was chosen for its minimal footprint and widespread adoption, making the codebase approachable and easy to extend.

### Socket.io

Socket.io handles all real-time, event-driven communication: ticket creation broadcasts, live messaging, typing indicators, and emoji reaction updates. It was chosen over raw WebSockets because it provides built-in room management, automatic reconnection, and fallback transports. The room system maps directly to ticket IDs, allowing messages to be scoped to specific conversations without additional routing logic.

### MongoDB with Mongoose

MongoDB stores users, tickets, and messages as document collections. Mongoose provides schema validation, type enforcement, and indexing. A compound index on messages (`{ ticketId: 1, createdAt: -1 }`) ensures that paginated queries for chat history execute in logarithmic time rather than scanning the entire collection. The message schema stores `senderUsername` directly instead of referencing a user ID, which eliminates the need for database joins when rendering chat history.

### JSON Web Tokens (jsonwebtoken) and bcryptjs

JWT provides stateless session management. After login, the server issues a signed token containing the user's ID, username, and role. This token is attached to both REST requests (via the Authorization header) and Socket.io handshakes (via the auth payload), meaning both layers share the same authentication mechanism without duplicating session state. bcryptjs handles password hashing with salt rounds, ensuring credentials are never stored in plaintext.

### Multer and Cloudinary

Multer processes multipart file uploads on the server. Cloudinary provides cloud-based image storage and transformation. Together they handle avatar uploads and message attachments without storing binary data in the database. Only the resulting URL is persisted in MongoDB, keeping documents lightweight.

### MessagePack (msgpackr)

MessagePack is a binary serialisation format that produces smaller payloads than JSON and parses faster. It is configured as the Socket.io parser for WebSocket traffic. At portfolio scale the performance difference is marginal, but including it demonstrates awareness of serialisation trade-offs and network optimisation techniques.

### React with Vite

The frontend is a single-page application built with React and bundled by Vite. React Context providers manage global state for theme preferences (dark/light mode, font sizes) and language selection (English, French, German). A custom `useSocket` hook encapsulates the Socket.io client lifecycle, handling connection, disconnection, and cleanup to prevent memory leaks.

### Cloudinary

Used specifically for persistent image hosting. Avatar and attachment URLs are stored in MongoDB and rendered directly in the client without serving static files from the backend.

## Architecture Summary

The system enforces a strict separation between real-time and historical data:

- **REST API**: Handles authentication (register, login), user profile updates (password, avatar, settings), ticket listing, and paginated message retrieval using cursor-based queries.
- **Socket.io**: Handles live events only. New messages, typing indicators, ticket status changes, and reaction toggles are broadcast through socket rooms scoped to individual ticket IDs.

This separation ensures that the WebSocket layer remains lightweight and stateless while the REST layer handles all persistent data operations.
