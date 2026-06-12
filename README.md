# SocketSupport

## Overview
SocketSupport is a real-time, role-based ticketing and customer support application. It uses a MERN stack architecture with native WebSocket integration for zero-latency bidirectional communication between clients and support agents.

## Technical Stack
- **Frontend:** React 18, Vite, React Router v6, Lucide React (icons)
- **Backend:** Node.js, Express.js
- **Real-Time:** Socket.io (room-scoped event broadcasting)
- **Database:** MongoDB (Mongoose ODM)
- **Asset Storage:** Cloudinary (avatars: 2MB/image-only, attachments: 5MB/auto-detect)
- **Authentication:** JWT with bcrypt password hashing
- **Localization:** Custom i18n context (EN, FR, DE) with session persistence

## Database Schemas

### User
| Field | Type | Notes |
|---|---|---|
| `username` | String | unique, indexed |
| `password` | String | bcrypt hashed |
| `role` | String | enum: student, agent |
| `avatarUrl` | String | optional, Cloudinary URL |
| `settings` | Object | language, theme, fontSize |

### Ticket
| Field | Type | Notes |
|---|---|---|
| `studentId` | ObjectId | ref: User |
| `agentId` | ObjectId | ref: User, nullable |
| `subject` | String | required |
| `status` | String | enum: open, active, resolved |
| `urgency` | String | enum: low, medium, high |

### Message
| Field | Type | Notes |
|---|---|---|
| `ticketId` | ObjectId | ref: Ticket, indexed |
| `senderId` | ObjectId | ref: User |
| `senderUsername` | String | denormalized for display |
| `text` | String | message body |
| `attachment` | Object | { url, name } |
| `reactions` | Array | [{ emoji, usernames[] }] |

## WebSocket Event Registry

### Client-to-Server
| Event | Payload | Behavior |
|---|---|---|
| `ticket:create` | { subject, urgency } | Creates ticket, joins room, broadcasts to agents |
| `ticket:claim` | { ticketId } | Assigns agent, updates status to active |
| `ticket:join` | { ticketId } | Subscribes socket to room `ticket:<id>` |
| `ticket:resolve` | { ticketId } | Sets status to resolved, broadcasts update |
| `chat:message_send` | { ticketId, text, attachment } | Persists to MongoDB, broadcasts to room |
| `chat:typing_start` | { ticketId } | Emits ephemeral typing state to room |
| `chat:typing_stop` | { ticketId } | Clears typing state in room |

### Server-to-Client
| Event | Payload | Behavior |
|---|---|---|
| `ticket:new_broadcast` | ticket object | Alerts agents to new unassigned tickets |
| `ticket:update` | ticket object | Syncs ticket state mutations |
| `chat:message_received` | message object | Delivers persisted messages |
| `chat:typing_update` | { ticketId, username, isTyping } | Relays typing indicator within room |

## REST API

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create student account (Role locked to `student`) |
| POST | `/login` | Authenticate and return JWT |

### Admin & Provisioning (`/api/admin`)
**Requires JWT & Role: `admin`**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/agents` | List all active agents |
| POST | `/agents` | Provision a new agent account |

### Users (`/api/users`)
| Method | Endpoint | Description |
|---|---|---|
| PUT | `/profile/avatar` | Upload avatar (2MB, images only) |
| PUT | `/profile/password` | Update password |
| PUT | `/profile/settings` | Update settings blob |

### Tickets (`/api/tickets`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List tickets scoped to role |
| GET | `/:ticketId/messages` | Paginated message history |
| POST | `/upload` | Upload attachment (5MB, any type) |

## Session Architecture
Authentication tokens are stored in `sessionStorage` (tab-scoped). This allows multiple independent sessions in separate browser tabs. User preferences (language, theme) persist in `localStorage` across all tabs.

## Localization
The i18n system uses a React Context (`LanguageContext`) with a flat key-value dictionary per language. Supported locales: English, French, German. Language selection is persisted in `localStorage` under the `settings` key and rendered via flag icons (FlagCDN SVG).

## Security & Role-Based Access Control (RBAC)
- **Role Locking:** Public registration exclusively provisions `student` accounts to prevent privilege escalation.
- **RBAC Middleware:** Agent provisioning and administrative actions are protected by a custom `authorizeRoles('admin')` middleware factory.
- **Stealth Routes:** The IT Lead Admin Dashboard (`/admin/login`) is entirely decoupled from the public UI, functioning as a stealth route accessible only via direct URL.
- **Immutable Demo Accounts:** The system detects accounts ending in `_demo` and hard-blocks any backend attempts to modify their passwords or delete them, ensuring a persistent, tamper-proof portfolio experience.

## Setup

### Prerequisites
- Node.js v18+
- MongoDB instance (local or Atlas)
- Cloudinary API credentials

### Environment Variables (`/server/.env`)
```
PORT=5000
MONGO_URI=<connection_string>
JWT_SECRET=<random_secret>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

### Run
```bash
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

## Known Technical Limitations & Scaling Considerations
As a portfolio demonstration piece, this architecture prioritizes core functionality and security over massive horizontal scale. If this were deployed for 10,000+ users, the following enterprise upgrades would be required:
1. **Token Revocation:** Currently, JWTs are cleared client-side on logout. A production environment would require short-lived tokens with a Redis-backed token blacklist to immediately revoke stolen sessions.
2. **Socket Throttling:** `express-rate-limit` handles auth routes, but Socket token-bucket algorithms must be implemented to prevent WebSocket message spam.
3. **Message Delivery Guarantees:** The current UI lacks an offline queue. An "optimistic UI" implementation with local caching is needed to guarantee message delivery if a WebSocket disconnects mid-transmission.
4. **Search Indexing:** While compound indexes handle pagination (`ticketId` + `createdAt`), a dedicated MongoDB Text Index or Elasticsearch cluster is needed for performant keyword searching across thousands of old tickets.

## Development Roadmap

### Phase 1: Core Platform & Security (Completed)
- Real-time WebSockets messaging and typing indicators.
- Role-Based Access Control (RBAC) and stealth admin provisioning.
- Immutable demo accounts and secure database seeding.
- Cloudinary integration for avatars and attachments.

### Phase 2: Multi-Tenant SaaS Architecture (Upcoming)
- **Data Isolation:** Strict separation of tickets, agents, and students per establishment.
- **Socket Segmentation:** Dynamic socket rooms (`org_<id>_agents`) to prevent cross-organization data leakage.
- **Branded Portals:** UI updates to reflect the specific school or organization the user belongs to.

### Phase 3: Advanced Functionality (Future)
- **Online Presence:** Track and display live user connectivity status.
- **Read Receipts:** Unread badges and message view tracking.
- **Analytics Dashboard:** Platform-wide metrics for admins.
- **Rich Text:** Markdown integration for technical support messages.