# CalSync — Scheduling Platform (Calendly Clone)

A production-grade scheduling web application built with **React**, **Node.js/Express**, **MySQL**, and **Prisma ORM**.

---

## 🚀 Features

- **Admin Dashboard** — Create, edit, and delete event types with unique URL slugs
- **Availability Settings** — Configure weekly availability windows (per day, multiple time ranges)
- **Public Booking Page** — Calendar-based slot picker with real-time availability
- **Double-Booking Prevention** — Transactional DB checks prevent race conditions
- **Meetings Management** — View upcoming/past meetings, soft-cancel bookings
- **Dynamic Slot Generation** — Slots computed at request time, never stored in DB
- **Mobile Responsive** — Clean dark-mode UI inspired by Calendly

---

## 🧰 Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | React 18, Vite, React Router v6 |
| Backend  | Node.js, Express.js            |
| Database | MySQL 8+                       |
| ORM      | Prisma 5                       |
| Styling  | Vanilla CSS (Design System)    |

---

## 📋 Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org))
- **MySQL 8+** running locally
- **npm** v9+ (comes with Node.js)

---

## ⚙️ Setup Instructions

### Step 1 — Clone & Navigate

```bash
cd "d:/Vanshika Project"
```

### Step 2 — Create MySQL Database

Log into MySQL and run:

```sql
CREATE DATABASE calendly_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 3 — Configure Backend Environment

```bash
cd backend
copy .env.example .env
```

Open `backend/.env` and fill in your MySQL credentials:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/calendly_clone"
PORT=3001
NODE_ENV=development
ADMIN_NAME="Admin User"
ADMIN_EMAIL="admin@calendly.local"
ADMIN_TIMEZONE="Asia/Kolkata"
```

### Step 4 — Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 5 — Run Database Migrations

```bash
npm run migrate
```

This creates all tables (users, event_types, availability, bookings).

### Step 6 — Generate Prisma Client

```bash
npm run generate
```

### Step 7 — Seed the Database

```bash
npm run seed
```

This creates:
- Admin user (id=1)
- Default Mon–Fri 9 AM–5 PM availability
- A sample "30-Minute Meeting" event type

### Step 8 — Start the Backend

```bash
npm run dev
```

Backend runs at: `http://localhost:3001`

---

### Step 9 — Setup & Start Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 Application URLs

| URL | Description |
|-----|-------------|
| `http://localhost:5173/` | Admin Dashboard |
| `http://localhost:5173/meetings` | Meetings Manager |
| `http://localhost:5173/event/:slug` | Public Booking Page |
| `http://localhost:5173/confirmation` | Post-booking confirmation |
| `http://localhost:3001/health` | Backend health check |

---

## 🔌 API Reference

### Event Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/event-types` | List all event types |
| POST | `/api/event-types` | Create event type |
| PUT | `/api/event-types/:id` | Update event type |
| DELETE | `/api/event-types/:id` | Delete event type |

### Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/availability` | Get availability config |
| POST | `/api/availability` | Set availability (batch upsert) |
| DELETE | `/api/availability/:id` | Remove a window |

### Public Booking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/event/:slug` | Get event type by slug |
| GET | `/api/slots?date=YYYY-MM-DD&eventId=N` | Get available slots |
| POST | `/api/book` | Create a booking |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings?filter=upcoming\|past\|all` | List meetings |
| PATCH | `/api/cancel/:id` | Soft-cancel a booking |

---

## 🧠 Architecture Notes

### Slot Generation
Slots are **never stored** in the database. When a user requests slots:
1. The server determines the dayOfWeek for the requested date
2. It fetches admin's availability windows for that day
3. Each window is divided into chunks of `eventType.duration` minutes
4. Existing `status='booked'` bookings are fetched and their start times subtracted
5. The remaining slots are returned

### Double-Booking Prevention
The `POST /api/book` endpoint wraps the availability check and insert in a **Prisma transaction**:
```
BEGIN TRANSACTION
  SELECT ... WHERE startTime = ? AND status = 'booked'  → if exists → 409 Conflict
  INSERT booking ...
COMMIT
```
This ensures concurrent requests to the same slot are serialized at the DB level.

### Cancelled Slots
When a booking is cancelled (`status = 'cancelled'`), slot generation automatically makes that slot available again — because it only filters out `status = 'booked'` records.

---

## 📁 Project Structure

```
d:/Vanshika Project/
├── backend/
│   ├── prisma/schema.prisma     # DB schema
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── routes/              # Express routers
│   │   ├── services/slotService.js  # Slot generation logic
│   │   ├── utils/timeUtils.js   # Time helpers
│   │   ├── middleware/errorHandler.js
│   │   ├── prismaClient.js
│   │   └── server.js
│   ├── seed.js
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level pages
│   │   ├── services/api.js      # Axios API layer
│   │   └── styles/index.css     # Design system
│   └── vite.config.js
│
└── README.md
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_URL` connection error | Check MySQL is running; verify credentials in `.env` |
| Migration fails | Ensure the `calendly_clone` database exists |
| 409 Conflict on booking | Slot was just taken — refresh and choose another |
| Slots not showing | Check admin has availability set for that day of week |
| Frontend can't reach backend | Verify backend is running on port 3001 |
