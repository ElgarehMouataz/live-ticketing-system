# SocketSupport

## Project Overview

SocketSupport is a full-stack, real-time customer support ticketing and live chat application. Students submit support requests and communicate with agents through a persistent, bi-directional messaging system. Agents manage incoming tickets from a centralised dashboard, claim open requests, and resolve conversations in real time.

The application demonstrates practical implementation of WebSocket-based architecture, token-based authentication across both HTTP and socket layers, document-oriented database modelling with compound indexing, binary serialisation for network optimisation, cloud-based file storage, and frontend state management through React Context.

---

## Goals

- Implement a working real-time communication system that separates event delivery from historical data retrieval, reflecting production-grade architectural concerns.
- Enforce a multi-role permission model where students and agents operate through distinct interfaces with scoped data access.
- Persist user personalisation preferences including theme selection, font sizing, and language configuration across sessions.
- Provide cursor-based paginated access to message history so no conversation data is discarded.
- Demonstrate serialisation trade-offs by integrating MessagePack as a Socket.io parser in place of JSON.

---

## Technology Stack

### Node.js / Express

Express provides the HTTP layer for all REST endpoints: authentication, profile management, ticket listing, and paginated message retrieval. It wraps the native `http.createServer` instance, which Socket.io then uses for WebSocket upgrade negotiation. Middleware is applied globally for JSON parsing and CORS, with route-level JWT guards for protected endpoints.

### Socket.io

Socket.io manages all real-time, event-driven traffic: ticket creation broadcasts, live message delivery, typing indicators, and reaction updates. Rooms are scoped to ticket IDs (`ticket:<id>`), allowing targeted emission without additional routing logic. Socket.io was selected over raw WebSockets for its built-in room abstraction, automatic reconnection handling, and fallback transport support. MessagePack replaces the default JSON parser at the socket layer.

### MongoDB / Mongoose

MongoDB stores three primary collections: `users`, `tickets`, and `messages`. Mongoose enforces schema validation, type coercion, and index definitions at the application layer. A compound index `{ ticketId: 1, createdAt: -1 }` on the messages collection reduces paginated history queries from O(n) full collection scans to O(log n) index traversal. The message schema stores `senderUsername` as a denormalised string field, eliminating the need for `populate()` joins during chat rendering.

### jsonwebtoken / bcryptjs

JWT provides stateless session management. The server issues a signed token on successful login containing `userId`, `username`, and `role`. This token is verified by both the HTTP middleware (`Authorization: Bearer`) and the Socket.io handshake middleware (`socket.handshake.auth.token`), meaning a single credential mechanism covers both transport layers. bcryptjs hashes passwords with configurable salt rounds before persistence; plaintext credentials are never stored.

### Multer / Cloudinary

Multer processes `multipart/form-data` on the Express layer, intercepting file streams before they reach route handlers. `multer-storage-cloudinary` pipes those streams directly to Cloudinary, bypassing local disk writes entirely. Only the resulting Cloudinary URL is persisted in MongoDB, keeping document payloads lightweight. This pattern covers both avatar uploads and message attachments.

### MessagePack / msgpackr

`msgpackr` is configured as the Socket.io parser, replacing JSON serialisation for all WebSocket frames. MessagePack produces smaller binary payloads and deserialises faster than JSON. At portfolio scale the throughput difference is marginal; its inclusion demonstrates awareness of serialisation overhead and the mechanisms available to reduce it in high-frequency event systems.

### React / Vite

The frontend is a single-page application bootstrapped with Vite and React. Two Context providers manage global state: `ThemeContext` controls dark/light mode and font-size class application via `document.documentElement` attributes; `LanguageContext` holds translation dictionaries for English, French, and German with a `t(key)` accessor. A custom `useSocket` hook encapsulates the Socket.io client lifecycle — connection, event binding, and disconnection — to prevent memory leaks on unmount.

---

## Architecture

```
Student Client  (React/Vite)  <── Socket.io ──>  Node.js / Express  <── Mongoose ──>  MongoDB
Agent Dashboard (React/Vite)  <── Socket.io ──>  Node.js / Express  <── Multer   ──>  Cloudinary
```

The system enforces strict separation between real-time and historical data concerns:

- **REST API** — authentication (`POST /api/auth/register`, `POST /api/auth/login`), profile management (`PUT /api/users/profile/*`), ticket listing (`GET /api/tickets`), and paginated message retrieval (`GET /api/tickets/:ticketId/messages?before=<timestamp>&limit=30`).
- **Socket.io** — live event delivery only. New messages, typing indicators, ticket status transitions, and reaction toggles transit through socket rooms. No historical queries are performed over the socket layer.

---

## WebSocket Event Registry

### Client-to-Server

| Event | Description |
|---|---|
| `ticket:create` | Student submits a new support request. Payload: `{ subject, urgency }`. |
| `ticket:claim` | Agent takes ownership of an open ticket. Payload: `{ ticketId }`. |
| `ticket:resolve` | Closes an active ticket and notifies room participants. Payload: `{ ticketId }`. |
| `chat:message_send` | Transmits a message to a ticket room. Payload: `{ ticketId, text, attachment? }`. |
| `chat:reaction_toggle` | Adds or removes a username from a reaction's usernames array. Payload: `{ messageId, emoji }`. |
| `chat:typing_start` | Signals the remote participant that input is in progress. Payload: `{ ticketId }`. |
| `chat:typing_stop` | Signals that input has ceased. Payload: `{ ticketId }`. |

### Server-to-Client

| Event | Description |
|---|---|
| `ticket:new_broadcast` | Emitted to all connected agents when a new ticket is created. |
| `ticket:update` | Emitted to room participants when ticket status changes. |
| `chat:message_received` | Delivers a persisted message object to the target room. |
| `chat:reaction_updated` | Broadcasts the updated reactions array for a given message. |
| `chat:typing_update` | Relays typing state to the opposing participant in the room. |

---

## Folder Structure

```
server/
    .env
    package.json
    index.js
    config/
        db.js
    models/
        User.js
        Ticket.js
        Message.js
    routes/
        auth.js
        tickets.js
        messages.js
    middleware/
        auth.js
        socketAuth.js

client/
    package.json
    vite.config.js
    src/
        main.jsx
        App.jsx
        hooks/
            useSocket.js
        context/
            ThemeContext.jsx
            LanguageContext.jsx
        components/
        pages/
            Login.jsx
            Register.jsx
            Dashboard.jsx
            Settings.jsx
```

---

## Setup

### Prerequisites

- Node.js v18 or later
- MongoDB Atlas cluster or local MongoDB instance
- Cloudinary account

### Server

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<minimum_64_byte_random_hex_string>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP server port. Defaults to `5000`. |
| `MONGO_URI` | Full MongoDB connection string including credentials and database name. |
| `JWT_SECRET` | Signing secret for JSON Web Tokens. Use a cryptographically random string of at least 64 bytes. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name. |
| `CLOUDINARY_API_KEY` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. |
| `CLIENT_URL` | Origin permitted by CORS policy. Defaults to `http://localhost:5173`. |

---

## REST API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a new user. Body: `{ username, password, role }`. |
| POST | `/api/auth/login` | None | Authenticate and receive JWT. Body: `{ username, password }`. |
| GET | `/api/auth/me` | Bearer | Return decoded token payload for the authenticated user. |

### Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| PUT | `/api/users/profile/avatar` | Bearer | Upload avatar via multipart form. Stores Cloudinary URL. |
| PUT | `/api/users/profile/password` | Bearer | Re-hash and update password. Body: `{ currentPassword, newPassword }`. |
| PUT | `/api/users/profile/settings` | Bearer | Persist theme, fontSize, language. Body: `{ theme, fontSize, language }`. |

### Tickets and Messages

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tickets` | Bearer | List tickets scoped to the authenticated user's role. |
| GET | `/api/tickets/:ticketId/messages` | Bearer | Paginated message history. Query: `?before=<ISO timestamp>&limit=30`. |

---

---

# SocketSupport — Documentation Technique (Francais)

## Presentation du projet

SocketSupport est une application de support client en temps reel, construite avec une architecture full-stack. Les etudiants soumettent des demandes d'assistance et communiquent avec des agents via un systeme de messagerie bidirectionnel persistant. Les agents gerent les tickets entrants depuis un tableau de bord centralise, prennent en charge les demandes ouvertes et resolvent les conversations en temps reel.

L'application illustre l'implementation pratique d'une architecture basee sur les WebSockets, l'authentification par jeton sur les couches HTTP et socket, la modelisation de base de donnees orientee documents avec indexation composee, la serialisation binaire pour l'optimisation reseau, le stockage de fichiers en nuage, et la gestion d'etat frontend via React Context.

---

## Objectifs

- Implementer un systeme de communication en temps reel qui separe la livraison d'evenements de la recuperation des donnees historiques, conformement aux pratiques architecturales en production.
- Appliquer un modele de permissions multi-role ou etudiants et agents operent via des interfaces distinctes avec un acces aux donnees delimite.
- Persister les preferences de personnalisation utilisateur incluant le theme, la taille de police et la configuration linguistique entre les sessions.
- Fournir un acces pagine base sur curseur a l'historique des messages afin qu'aucune donnee de conversation ne soit perdue.
- Illustrer les compromis de serialisation en integrant MessagePack comme parseur Socket.io en remplacement de JSON.

---

## Stack Technique

### Node.js / Express

Express fournit la couche HTTP pour tous les points de terminaison REST : authentification, gestion de profil, listage de tickets et recuperation paginee des messages. Il encapsule l'instance native `http.createServer`, que Socket.io utilise ensuite pour la negociation de mise a niveau WebSocket. Le middleware est applique globalement pour le parsing JSON et CORS, avec des gardes JWT au niveau des routes pour les points de terminaison proteges.

### Socket.io

Socket.io gere tout le trafic en temps reel oriente evenements : diffusion de creation de tickets, livraison de messages en direct, indicateurs de frappe et mises a jour de reactions. Les rooms sont delimites aux identifiants de tickets (`ticket:<id>`), permettant une emission ciblee sans logique de routage supplementaire. Socket.io a ete choisi par rapport aux WebSockets bruts pour son abstraction de room integree, sa gestion automatique de reconnexion et son support de transports de repli. MessagePack remplace le parseur JSON par defaut au niveau de la couche socket.

### MongoDB / Mongoose

MongoDB stocke trois collections principales : `users`, `tickets` et `messages`. Mongoose applique la validation de schema, la coercition de type et les definitions d'index au niveau applicatif. Un index compose `{ ticketId: 1, createdAt: -1 }` sur la collection messages reduit les requetes d'historique pagine de O(n) scans complets a O(log n) parcours d'index. Le schema message stocke `senderUsername` comme champ de chaine denormalise, eliminant le besoin de jointures `populate()` lors du rendu du chat.

### jsonwebtoken / bcryptjs

JWT fournit une gestion de session sans etat. Le serveur emet un jeton signe a la connexion reussie contenant `userId`, `username` et `role`. Ce jeton est verifie par le middleware HTTP (`Authorization: Bearer`) et le middleware de handshake Socket.io (`socket.handshake.auth.token`), ce qui signifie qu'un seul mecanisme d'authentification couvre les deux couches de transport. bcryptjs hache les mots de passe avec des rounds de sel configurables avant persistance ; les credentials en clair ne sont jamais stockes.

### Multer / Cloudinary

Multer traite `multipart/form-data` sur la couche Express, interceptant les flux de fichiers avant qu'ils n'atteignent les gestionnaires de routes. `multer-storage-cloudinary` dirige ces flux directement vers Cloudinary, contournant entierement les ecritures sur disque local. Seule l'URL Cloudinary resultante est persistee dans MongoDB. Ce schema couvre les uploads d'avatars et les pieces jointes de messages.

### MessagePack / msgpackr

`msgpackr` est configure comme parseur Socket.io, remplacant la serialisation JSON pour toutes les trames WebSocket. MessagePack produit des charges utiles binaires plus petites et se deserialise plus rapidement que JSON. A l'echelle d'un portfolio la difference de debit est marginale ; son inclusion demontre la connaissance des surcharges de serialisation et des mecanismes disponibles pour les reduire dans les systemes d'evenements a haute frequence.

### React / Vite

Le frontend est une application monopage initialisee avec Vite et React. Deux fournisseurs Context gerent l'etat global : `ThemeContext` controle le mode sombre/clair et l'application de classes de taille de police via les attributs `document.documentElement` ; `LanguageContext` contient des dictionnaires de traduction pour l'anglais, le francais et l'allemand avec un accesseur `t(key)`. Un hook personnalise `useSocket` encapsule le cycle de vie du client Socket.io — connexion, liaison d'evenements et deconnexion — pour prevenir les fuites memoire au demontage.

---

## Architecture

```
Client Etudiant  (React/Vite)  <── Socket.io ──>  Node.js / Express  <── Mongoose ──>  MongoDB
Tableau de bord  (React/Vite)  <── Socket.io ──>  Node.js / Express  <── Multer   ──>  Cloudinary
```

Le systeme applique une separation stricte entre les preoccupations temps reel et historiques :

- **API REST** — authentification, gestion de profil, listage de tickets et recuperation paginee des messages.
- **Socket.io** — livraison d'evenements en direct uniquement. Les nouveaux messages, indicateurs de frappe, transitions d'etat de tickets et toggles de reactions transitent par les rooms socket. Aucune requete historique n'est effectuee sur la couche socket.

---

## Registre des evenements WebSocket

### Client vers Serveur

| Evenement | Description |
|---|---|
| `ticket:create` | L'etudiant soumet une nouvelle demande d'assistance. Charge utile : `{ subject, urgency }`. |
| `ticket:claim` | L'agent prend la propriete d'un ticket ouvert. Charge utile : `{ ticketId }`. |
| `ticket:resolve` | Ferme un ticket actif et notifie les participants de la room. Charge utile : `{ ticketId }`. |
| `chat:message_send` | Transmet un message a une room de ticket. Charge utile : `{ ticketId, text, attachment? }`. |
| `chat:reaction_toggle` | Ajoute ou retire un nom d'utilisateur du tableau usernames d'une reaction. Charge utile : `{ messageId, emoji }`. |
| `chat:typing_start` | Signale au participant distant que la saisie est en cours. Charge utile : `{ ticketId }`. |
| `chat:typing_stop` | Signale que la saisie a cesse. Charge utile : `{ ticketId }`. |

### Serveur vers Client

| Evenement | Description |
|---|---|
| `ticket:new_broadcast` | Emis a tous les agents connectes lors de la creation d'un nouveau ticket. |
| `ticket:update` | Emis aux participants de la room lors d'un changement de statut de ticket. |
| `chat:message_received` | Livre un objet message persiste a la room ciblee. |
| `chat:reaction_updated` | Diffuse le tableau de reactions mis a jour pour un message donne. |
| `chat:typing_update` | Relaie l'etat de frappe au participant oppose dans la room. |

---

## Structure des dossiers

```
server/
    .env
    package.json
    index.js
    config/
        db.js
    models/
        User.js
        Ticket.js
        Message.js
    routes/
        auth.js
        tickets.js
        messages.js
    middleware/
        auth.js
        socketAuth.js

client/
    package.json
    vite.config.js
    src/
        main.jsx
        App.jsx
        hooks/
            useSocket.js
        context/
            ThemeContext.jsx
            LanguageContext.jsx
        components/
        pages/
            Login.jsx
            Register.jsx
            Dashboard.jsx
            Settings.jsx
```

---

## Installation

### Prerequis

- Node.js v18 ou superieur
- Cluster MongoDB Atlas ou instance MongoDB locale
- Compte Cloudinary

### Serveur

```bash
cd server
npm install
```

Creer `server/.env` :

```
PORT=5000
MONGO_URI=mongodb+srv://<utilisateur>:<motdepasse>@<cluster>.mongodb.net/<base>
JWT_SECRET=<chaine_hexadecimale_aleatoire_minimum_64_octets>
CLOUDINARY_CLOUD_NAME=<nom_cloud>
CLOUDINARY_API_KEY=<cle_api>
CLOUDINARY_API_SECRET=<secret_api>
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

---

## Reference API REST

### Authentification

| Methode | Point de terminaison | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Aucune | Enregistrer un nouvel utilisateur. Corps : `{ username, password, role }`. |
| POST | `/api/auth/login` | Aucune | Authentifier et recevoir un JWT. Corps : `{ username, password }`. |
| GET | `/api/auth/me` | Bearer | Retourner la charge utile du jeton decode pour l'utilisateur authentifie. |

### Profil

| Methode | Point de terminaison | Auth | Description |
|---|---|---|---|
| PUT | `/api/users/profile/avatar` | Bearer | Uploader un avatar via formulaire multipart. Stocke l'URL Cloudinary. |
| PUT | `/api/users/profile/password` | Bearer | Re-hacher et mettre a jour le mot de passe. Corps : `{ currentPassword, newPassword }`. |
| PUT | `/api/users/profile/settings` | Bearer | Persister theme, fontSize, language. Corps : `{ theme, fontSize, language }`. |

### Tickets et Messages

| Methode | Point de terminaison | Auth | Description |
|---|---|---|---|
| GET | `/api/tickets` | Bearer | Lister les tickets delimites au role de l'utilisateur authentifie. |
| GET | `/api/tickets/:ticketId/messages` | Bearer | Historique de messages pagine. Requete : `?before=<horodatage ISO>&limit=30`. |