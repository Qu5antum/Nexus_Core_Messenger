# 💬 Messenger Service

Full-stack messaging app built with FastAPI and React, supporting private and group chats, user profiles, media attachments, real-time updates, and role-based access.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Main API Endpoints](#main-api-endpoints)
- [Usage](#usage)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Features

### Authentication and profiles
- 🔐 JWT authentication with access and refresh tokens
- 👤 Registration and login by phone number and password
- 🪪 Roles: `USER` and `ADMIN`
- 📝 Profile editing and personal description
- 🖼️ User avatar upload and display
- 👀 Last online tracking via `last_seen_at`

### Chats
- 💬 Private chats between two users
- 👫 Group chats with participants
- ➕ Add and remove chat participants
- 🏷️ Edit group name, description, and avatar
- 🗂️ View common chats between users
- 🚫 Leave a chat and delete group chats

### Messages and attachments
- 📨 Text messages
- 🖼️ Image, video, audio, and file attachments
- ✏️ Message editing
- 🗑️ Message deletion
- 🔎 Search messages within a chat
- 📎 Attachment handling through dedicated endpoints

### Real-time events
- 🔔 WebSocket-based real-time communication
- 📡 Redis Pub/Sub for message distribution
- ⚡ Live chat and inbox updates without page reload
- 🧠 Redis caching for selected requests

### Administration
- 🛡️ Admin endpoint for deleting chats
- 👑 Role-based separation for users and admins

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — application server
- **SQLAlchemy** — ORM
- **PostgreSQL** — database
- **Redis** — pub/sub and caching
- **Alembic** — migrations
- **Pydantic** — validation
- **Python 3.11**

### Frontend
- **React 19** — UI
- **TypeScript** — typed JavaScript
- **React Router** — routing
- **Axios** — HTTP client
- **Vite** — frontend build tool
- **Node.js 20**

### DevOps
- **Docker** — containerization
- **Docker Compose** — running the full stack

---

## 📦 Requirements

- Docker 20.10+
- Docker Compose 2.0+
- For local development: Python 3.11, Node.js 20, PostgreSQL 15, Redis 7

---

## 🚀 Quick Start

### 1) Clone the repository
```bash
git clone <repository-url>
cd Messenger_Service
```

### 2) Create `.env`
```env
DB_USER=postgres
DB_PASS=postgres
DB_NAME=chat_sevice
DB_HOST=db
DB_PORT=5432

REDIS_URL=redis://redis:6379/0

SECRET_KEY=your-secret-key-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

APP_NAME=Chat_service
DEBUG=True
```

### 3) Start with Docker Compose
```bash
docker compose up --build
```

### 4) Access the app
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## ⚙️ Configuration

Key environment variables:

```env
# PostgreSQL
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=chat_sevice

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=your-secret-key-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_NAME=Chat_service
DEBUG=True
```

> In production, change `SECRET_KEY` and restrict CORS and admin access.

---

## 📁 Project Structure

```text
Messenger_Service/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── dependencies/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth_endpoint.py
│   │   │   │   ├── user_endpoint.py
│   │   │   │   ├── chat_endpoint.py
│   │   │   │   ├── chat_participant_endpoint.py
│   │   │   │   ├── message_endpoint.py
│   │   │   │   ├── message_attachment_endpoint.py
│   │   │   │   ├── admin_endpoints.py
│   │   │   │   └── websocket_endpoint.py
│   │   │   └── schemas/
│   │   ├── auth/
│   │   ├── core/
│   │   ├── database/
│   │   ├── exception_handlers/
│   │   ├── middleware/
│   │   ├── publisher/
│   │   ├── redis/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── subscriber/
│   │   ├── websocket/
│   │   ├── main.py
│   │   └── ...
│   ├── migrations/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── AuthContext.tsx
│   │   ├── RequireAuth.tsx
│   │   ├── main.tsx
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── index.html
│
├── docker-compose.yml
├── README.md
├── README.en.md
└── uploads/
```

---

## 📚 Main API Endpoints

### Authentication

#### Register
```http
POST /api/user/register
Content-Type: application/json

{
  "username": "alice",
  "phone_number": "+1234567890",
  "password": "securepass",
  "role": "user"
}
```

#### Login
```http
POST /api/user/login
Content-Type: application/x-www-form-urlencoded

username=alice&password=securepass
```

#### Refresh token
```http
POST /api/user/refresh?token=<refresh_token>
```

### Users

#### Current user profile
```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

#### Update profile and avatar
```http
PUT /api/user/update/profile
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Fields: `username`, `phone_number`, `description`, `avatar_upload_file`

#### Get user avatar
```http
GET /api/user/{user_id}/avatar
Authorization: Bearer <access_token>
```

#### Get last seen
```http
GET /api/user/{user_id}/last_seen
Authorization: Bearer <access_token>
```

### Chats

#### Create private chat
```http
POST /api/chat/private_chat/create?phone_number=+1234567890
Authorization: Bearer <access_token>
```

#### Create group chat
```http
POST /api/chat/group_chat/create
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Fields: `title`, `description`, `file`

#### Get all chats
```http
GET /api/chat/all
Authorization: Bearer <access_token>
```

#### Update group chat
```http
PUT /api/chat/{chat_id}/chat_update
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Delete chat
```http
DELETE /api/chat/{chat_id}/delete
Authorization: Bearer <access_token>
```

#### Common chats between users
```http
GET /api/user/{user_id}/chat/all
Authorization: Bearer <access_token>
```

### Chat participants

#### Add participant to group
```http
POST /api/chat/{chat_id}/add_participant?phone_number=+1234567890
Authorization: Bearer <access_token>
```

#### Get participants
```http
GET /api/chat/{chat_id}/participants
Authorization: Bearer <access_token>
```

#### Remove participant
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>
```

#### Leave chat
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>
```

### Messages

#### Send message
```http
POST /api/chat/{chat_id}/message/send
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Fields: `message`, `file`

#### Get messages in chat
```http
GET /api/chat/{chat_id}/messages
Authorization: Bearer <access_token>
```

#### Search messages by text
```http
GET /api/chat/{chat_id}/message/search_message?messageText=hello
Authorization: Bearer <access_token>
```

#### Edit message
```http
PUT /api/chat/{chat_id}/message/{message_id}/update
Authorization: Bearer <access_token>
```

#### Delete message
```http
DELETE /api/chat/{chat_id}/message/{message_id}/delete
Authorization: Bearer <access_token>
```

### WebSocket

```javascript
const token = localStorage.getItem('access_token')
const socket = new WebSocket(`ws://localhost:8000/api/ws?token=${token}`)

socket.onmessage = (event) => {
  const payload = JSON.parse(event.data)
  console.log(payload)
}
```

### Administration

```http
DELETE /api/admin/chat/{chat_id}
Authorization: Bearer <admin_token>
```

---

## 💻 Usage

### Registration and login
1. Open http://localhost:3000
2. Go to login or register page
3. Create an account with username, phone number, and password
4. After login, you will see the chat list

### Creating chats
- Private chat: use the other user's phone number
- Group chat: enter a title and optionally upload a group avatar

### Profile operations
- Edit username, description, and phone number
- Upload or change avatar
- View other users and common chats

### Messaging
- Send text messages
- Send media attachments (images, video, audio, files)
- Search, edit, and delete messages

### Online status
- User status is updated through WebSocket
- `last_seen_at` is available for each user

---

## 🏗️ Architecture

```text
┌─────────────────────────────┐
│      React Frontend         │
│  pages, auth, chat UI      │
└──────────────┬──────────────┘
               │ HTTP / WebSocket
┌──────────────▼──────────────┐
│     FastAPI Backend         │
│  Auth / Users / Chats       │
│  Messages / Attachments     │
│  WebSocket / Admin          │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      SQLAlchemy + PG        │
│  users, chats, messages     │
│  participants, attachments  │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│         Redis               │
│   Pub/Sub + cache + events  │
└─────────────────────────────┘
```

### Data flow
1. The frontend calls a REST endpoint in FastAPI.
2. The service handles business logic and access rules.
3. Data is stored in PostgreSQL.
4. Real-time events are published through Redis.
5. Clients receive updates through WebSocket and refresh the UI.

---

## 🔧 Local development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🐛 Troubleshooting

### Containers do not start
```bash
docker compose ps
docker compose logs -f
```

### Database issues
```bash
docker compose logs db
```

### WebSocket is not working
- Check the `token` query parameter
- Ensure Redis is running
- Confirm the backend is available on port 8000

### Files are not uploaded
- Check the `uploads/` directory
- Make sure the MIME type is supported by the app

---

## 📌 Notes

- The project relies on `multipart/form-data` for avatars and media uploads.
- Real-time events and selected data caching are handled through Redis.
- This README can be extended as new modules, roles, or integrations are added.

---

## 📄 License

MIT License

#### User Registration
```http
POST /api/user/register
Content-Type: application/json

{
  "username": "john_doe",
  "phone_number": "+1234567890",
  "password": "securepassword",
  "role": "user"
}

Response: 201 Created
{
  "id": "uuid",
  "username": "john_doe",
  "phone_number": "+1234567890",
  "role": "user",
  "created_at": "2024-01-01T00:00:00"
}
```

#### Login
```http
POST /api/user/login
Content-Type: application/x-www-form-urlencoded

username=john_doe&password=securepassword

Response: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### Dummy Login (Demo)
```http
POST /api/user/dummyLogin
Content-Type: application/json

{
  "role": "user"
}

Response: 200 OK
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### Chats

#### Get All User Chats
```http
GET /api/chat/all
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "title": "Group Chat",
    "is_group": true,
    "owner_id": "uuid",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### Create Private Chat
```http
POST /api/chat/private_chat/create?phone_number=+1234567890
Authorization: Bearer <access_token>

Response: 201 Created
{
  "id": "uuid",
  "is_group": false,
  "created_at": "2024-01-01T00:00:00"
}
```

#### Create Group Chat
```http
POST /api/chat/group_chat/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "My Group",
  "description": "Group description",
  "avatar": "https://...",
  "is_group": true
}

Response: 201 Created
{
  "id": "uuid",
  "title": "My Group",
  "is_group": true,
  "owner_id": "uuid",
  "created_at": "2024-01-01T00:00:00"
}
```

### Messages

#### Send Message
```http
POST /api/chat/{chat_id}/message/send
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "text": "Hello, World!"
}

Response: 201 Created
{
  "id": "uuid",
  "chat_id": "uuid",
  "sender_id": "uuid",
  "text": "Hello, World!",
  "created_at": "2024-01-01T00:00:00"
}
```

#### Get Messages from Chat
```http
GET /api/chat/{chat_id}/messages
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "chat_id": "uuid",
    "sender_id": "uuid",
    "text": "Hello, World!",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### Chat Participants

#### Add Participant
```http
POST /api/chat/{chat_id}/add_participant?phone_number=+1234567890
Authorization: Bearer <access_token>

Response: 201 Created
{
  "id": "uuid",
  "chat_id": "uuid",
  "user_id": "uuid",
  "joined_at": "2024-01-01T00:00:00"
}
```

#### Get Chat Participants
```http
GET /api/chat/{chat_id}/participants
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "username": "john_doe",
    "joined_at": "2024-01-01T00:00:00"
  }
]
```

#### Remove Participant
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>

Response: 200 OK
```

#### Leave Chat
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>

Response: 200 OK
```

### WebSocket

#### Connect to Chat
```javascript
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/api/ws?token=${token}`);

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log(payload);
  // {
  //   "type": "message_created",
  //   "chat_id": "uuid",
  //   "data": { message object }
  // }
};
```

#### Send Message via WebSocket
```javascript
const payload = {
  "type": "send_message",
  "chat_id": "uuid",
  "payload": { "text": "Hello!" }
};
ws.send(JSON.stringify(payload));
```

---

## 💻 Usage

### Web Interface

1. **Register:**
   - Navigate to http://localhost:3000
   - Click "Register"
   - Fill in the form (username, phone, password)
   - Click Register button

2. **Login:**
   - Go to Login page
   - Enter your credentials or use "Dummy Login"
   - You'll be redirected to the home page

3. **Create Chat:**
   - Go to "Your Chats"
   - Click "Create Group" for a group chat
   - Or click "Create Private Chat" and enter a phone number

4. **Exchange Messages:**
   - Select a chat from the list
   - Enter chat ID and click "Load messages"
   - Write a message and click Send
   - Messages will be delivered in real-time

---

## 🏗️ Architecture

### Application Layers

```
┌─────────────────────────────────────────┐
│      Frontend (React/TypeScript)         │
├─────────────────────────────────────────┤
│     HTTP/WebSocket API (FastAPI)        │
├─────────────────────────────────────────┤
│  Services (Business Logic) ──┐           │
│  Repositories (Data Access)  │           │
│  Database Models             └──────────→┤ PostgreSQL
├─────────────────────────────────────────┤
│  Redis Pub/Sub (Real-time messaging)   │
├─────────────────────────────────────────┤
│  Authentication (JWT)                   │
└─────────────────────────────────────────┘
```

### Data Flow

1. **REST API:**
   - Frontend sends HTTP request
   - FastAPI processes the request
   - Service executes business logic
   - Repository queries the database
   - Response is returned to client

2. **Real-time Messaging:**
   - WebSocket connection is established
   - Client sends a message
   - Server publishes to Redis Pub/Sub
   - All subscribed clients receive the message
   - Frontend updates UI in real-time

---

## 🔒 Security

- ✅ JWT token-based authentication
- ✅ Input validation (Pydantic)
- ✅ CORS configuration
- ✅ Role-based access control
- ✅ Password hashing
- ⚠️ Change `SECRET_KEY` in production

---

## 📝 Logging

Backend logs:
- User authentication
- Message and chat creation/deletion
- Database errors
- WebSocket connections
- Redis operations

View logs (in Docker):
```bash
docker-compose logs -f backend
```

---

## 🐛 Troubleshooting

### Problem: Containers won't start
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### Problem: Database connection error
```bash
# Ensure PostgreSQL container is healthy
docker-compose ps db

# Check environment variables in .env
```

### Problem: WebSocket not working
```bash
# Check connection and token in browser console
# Ensure Redis is running
docker-compose ps redis
```

---

## 📞 Support

For questions and suggestions, please open an Issue in the repository.

---

## 📄 License

MIT License - see LICENSE file
