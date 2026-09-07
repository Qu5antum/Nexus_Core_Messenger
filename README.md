# 💬 Messenger Service

Full-stack мессенджер на FastAPI + React, с приватными и групповыми чатами, профилями пользователей, вложениями, обновлениями в реальном времени и ролями доступа.

---

## 📋 Содержание

- [Возможности](#возможности)
- [Технологии](#технологии)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [Структура проекта](#структура-проекта)
- [Основные API endpoints](#основные-api-endpoints)
- [Использование](#использование)
- [Архитектура](#архитектура)
- [Решение проблем](#решение-проблем)

---

## 🚀 Возможности

### Аутентификация и профиль
- 🔐 JWT-авторизация с access/refresh токенами
- 👤 Регистрация и вход по телефону/паролю
- 🪪 Роли: `USER` и `ADMIN`
- 📝 Редактирование профиля и описания пользователя
- 🖼️ Загрузка и отображение аватара пользователя
- 👀 Данные о последнем онлайн (`last_seen_at`)

### Чаты
- 💬 Приватные чаты между двумя пользователями
- 👫 Групповые чаты с участниками
- ➕ Добавление и удаление участников из группы
- 🏷️ Редактирование названия, описания и аватара чата
- 🗂️ Просмотр общих чатов между пользователями
- 🚫 Выход из чата и удаление группового чата

### Сообщения и вложения
- 📨 Отправка текстовых сообщений
- 🖼️ Отправка изображений, видео, аудио и файлов
- ✏️ Редактирование сообщений
- 🗑️ Удаление сообщений
- 🔎 Поиск сообщений внутри чата
- 📎 Работа с файлами через отдельные attachment-эндпоинты

### Real-time и синхронизация
- 🔔 WebSocket-подключение для обмена сообщениями в реальном времени
- 📡 Redis Pub/Sub для публикации и распространения событий
- ⚡ Обновление списка чатов и переписки без перезагрузки страницы
- 🧠 Кеширование данных в Redis для некоторых запросов

### Администрирование
- 🛡️ Админ-эндпоинт для удаления чата
- 👑 Разделение прав для обычных пользователей и администраторов

---

## 🛠️ Технологии

### Backend
- **FastAPI** — API сервер
- **SQLAlchemy** — ORM
- **PostgreSQL** — база данных
- **Redis** — pub/sub, кеширование и подписки
- **Alembic** — миграции
- **Pydantic** — валидация данных
- **Python 3.11**

### Frontend
- **React 19** — интерфейс приложения
- **TypeScript** — типизация
- **React Router** — маршрутизация
- **Axios** — HTTP-клиент
- **Vite** — сборка фронтенда
- **Node.js 20**

### DevOps
- **Docker** — контейнеризация
- **Docker Compose** — запуск всей системы

---

## 📦 Требования

- Docker 20.10+
- Docker Compose 2.0+
- Для локальной разработки: Python 3.11, Node.js 20, PostgreSQL 15, Redis 7

---

## 🚀 Быстрый старт

### 1) Клонировать проект
```bash
git clone <repository-url>
cd Messenger_Service
```

### 2) Создать `.env`
Создайте файл `.env` в корне проекта:

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

### 3) Запустить через Docker Compose
```bash
docker compose up --build
```

### 4) Проверить сервисы
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## ⚙️ Конфигурация

Основные переменные окружения:

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

> В продакшене обязательно смените `SECRET_KEY` и ограничьте CORS/доступ.

---

## 📁 Структура проекта

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

## 📚 Основные API endpoints

### Аутентификация

#### Регистрация
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

#### Вход
```http
POST /api/user/login
Content-Type: application/x-www-form-urlencoded

username=alice&password=securepass
```

#### Refresh токена
```http
POST /api/user/refresh?token=<refresh_token>
```

#### Dummy login для тестов
```http
POST /api/user/dummyLogin
Content-Type: application/json

{
  "role": "user"
}
```

### Пользователи

#### Профиль текущего пользователя
```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

#### Обновить профиль и аватар
```http
PUT /api/user/update/profile
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Поля: `username`, `phone_number`, `description`, `avatar_upload_file`

#### Получить аватар пользователя
```http
GET /api/user/{user_id}/avatar
Authorization: Bearer <access_token>
```

#### Последний онлайн пользователя
```http
GET /api/user/{user_id}/last_seen
Authorization: Bearer <access_token>
```

### Чаты

#### Создать приватный чат
```http
POST /api/chat/private_chat/create?phone_number=+1234567890
Authorization: Bearer <access_token>
```

#### Создать групповой чат
```http
POST /api/chat/group_chat/create
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Поля: `title`, `description`, `file`

#### Получить все чаты пользователя
```http
GET /api/chat/all
Authorization: Bearer <access_token>
```

#### Получить чат по ID
```http
GET /api/chat/{chat_id}
Authorization: Bearer <access_token>
```

#### Обновить групповой чат
```http
PUT /api/chat/{chat_id}/chat_update
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Удалить.chat
```http
DELETE /api/chat/{chat_id}/delete
Authorization: Bearer <access_token>
```

#### Получить общие чаты двух пользователей
```http
GET /api/user/{user_id}/chat/all
Authorization: Bearer <access_token>
```

### Участники чата

#### Добавить участника в группу
```http
POST /api/chat/{chat_id}/add_participant?phone_number=+1234567890
Authorization: Bearer <access_token>
```

#### Получить участников чата
```http
GET /api/chat/{chat_id}/participants
Authorization: Bearer <access_token>
```

#### Удалить участника из чата
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>
```

#### Покинуть чат
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>
```

### Сообщения

#### Отправить сообщение
```http
POST /api/chat/{chat_id}/message/send
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Поля: `message`, `file`

#### Получить сообщения чата
```http
GET /api/chat/{chat_id}/messages
Authorization: Bearer <access_token>
```

#### Поиск по тексту сообщения
```http
GET /api/chat/{chat_id}/message/search_message?messageText=hello
Authorization: Bearer <access_token>
```

#### Редактировать сообщение
```http
PUT /api/chat/{chat_id}/message/{message_id}/update
Authorization: Bearer <access_token>
```

#### Удалить сообщение
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

### Администрирование

```http
DELETE /api/admin/chat/{chat_id}
Authorization: Bearer <admin_token>
```

---

## 💻 Использование

### Регистрация и вход
1. Откройте http://localhost:3000
2. Перейдите на страницу регистрации или логина
3. Создайте аккаунт с логином, телефоном и паролем
4. После входа откроется список чатов

### Создание чатов
- Для приватного чата — используйте номер телефона собеседника
- Для группового чата — задайте название и при необходимости загрузите изображение группы

### Работа с профилем
- Редактируйте username, описание и номер телефона
- Загружайте/меняйте аватар
- Смотрите профиль других пользователей и общие чаты

### Отправка сообщений
- Напишите текстовое сообщение
- Отправляйте файлы, изображения, аудио и видео
- У вас есть поиск по тексту, редактирование и удаление сообщений

### Наблюдение за онлайном
- Состояние пользователя обновляется через WebSocket
- Для пользователя доступен `last_seen_at`

---

## 🏗️ Архитектура

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

### Поток данных
1. Пользователь вызывает REST endpoint на FastAPI.
2. Сервис выполняет бизнес-логику и проверяет права доступа.
3. Данные сохраняются в PostgreSQL.
4. Для реального времени сообщения публикуются через Redis.
5. Клиент получает обновления через WebSocket и обновляет интерфейс.

---

## 🔧 Локальная разработка

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

## 🐛 Решение проблем

### Контейнеры не запускаются
```bash
docker compose ps
docker compose logs -f
```

### Проблема с БД
```bash
docker compose logs db
```

### WebSocket не работает
- Проверьте токен в query-параметре `token`
- Проверьте, что Redis запущен
- Убедитесь, что backend доступен по адресу 8000

### Файлы не загружаются
- Проверьте директорию `uploads/`
- Убедитесь, что MIME-тип файла поддерживается проектом

---

## 📌 Дополнительно

- Проект активно использует `multipart/form-data` для загрузки аватаров и файлов.
- Большая часть данных и событий хранится/передаётся через Redis.
- README можно расширять по мере добавления новых модулей, ролей или интеграций.

---

## 📄 Лицензия

MIT License

#### Регистрация пользователя
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

#### Вход
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

#### Тестовый вход (для демонстрации)
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

### Чаты

#### Получить все чаты пользователя
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

#### Создать приватный чат
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

#### Создать групповой чат
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

### Сообщения

#### Отправить сообщение
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

#### Получить сообщения из чата
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

### Участники чата

#### Добавить участника
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

#### Получить участников чата
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

#### Удалить участника
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>

Response: 200 OK
```

#### Покинуть чат
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>

Response: 200 OK
```

### WebSocket

#### Подключиться к чату
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

#### Отправить сообщение через WebSocket
```javascript
const payload = {
  "type": "send_message",
  "chat_id": "uuid",
  "payload": { "text": "Hello!" }
};
ws.send(JSON.stringify(payload));
```

---

## 💻 Использование

### Веб-интерфейс

1. **Регистрация:**
   - Перейдите на http://localhost:3000
   - Нажмите "Register"
   - Заполните форму (username, phone, password)
   - Нажмите кнопку Register

2. **Вход:**
   - Перейдите на страницу Login
   - Введите учетные данные или используйте "Dummy Login"
   - Вас перенесет на главную страницу

3. **Создание чата:**
   - Перейдите в "Your Chats"
   - Нажмите "Create Group" для группового чата
   - Или нажмите "Create Private Chat" и введите номер телефона

4. **Обмен сообщениями:**
   - Выберите чат из списка
   - Введите идентификатор чата и нажмите "Load messages"
   - Напишите сообщение и нажмите Send
   - Сообщения будут отправлены в реальном времени

---

## 🏗️ Архитектура

### Слои приложения

```
┌─────────────────────────────────────────┐
│         Frontend (React/TypeScript)      │
├─────────────────────────────────────────┤
│         HTTP/WebSocket API (FastAPI)    │
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

### Поток данных

1. **REST API:**
   - Frontend отправляет HTTP запрос
   - FastAPI обрабатывает запрос
   - Service выполняет бизнес-логику
   - Repository работает с БД
   - Response возвращается клиенту

2. **Real-time messaging:**
   - WebSocket соединение устанавливается
   - Клиент отправляет сообщение
   - Server публикует в Redis Pub/Sub
   - Все подписанные клиенты получают сообщение
   - Frontend обновляет UI в реальном времени

---

## 🔒 Безопасность

- ✅ JWT токены для аутентификации
- ✅ Валидация входных данных (Pydantic)
- ✅ CORS настройки
- ✅ Роли и разрешения (Role-based access)
- ✅ Хеширование паролей
- ⚠️ Измените `SECRET_KEY` в production

---

## 📝 Логирование

Backend логирует:
- Аутентификацию пользователей
- Создание/удаление сообщений и чатов
- Ошибки БД
- WebSocket соединения
- Redis операции

Просмотр логов (в Docker):
```bash
docker-compose logs -f backend
```

---

## 🐛 Решение проблем

### Проблема: Контейнеры не запускаются
```bash
# Проверьте статус контейнеров
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

### Проблема: Ошибка подключения к БД
```bash
# Убедитесь, что PostgreSQL контейнер здоров
docker-compose ps db

# Проверьте переменные окружения в .env
```

### Проблема: WebSocket не работает
```bash
# Проверьте соединение и токен в браузерной консоли
# Убедитесь, что Redis работает
docker-compose ps redis
```

---

## 📞 Контакты и поддержка

Для вопросов и предложений откройте Issue в репозитории.

---

## 📄 Лицензия

MIT License - см. LICENSE файл
