/**
 * Mock Server — No Database Required
 * ====================================
 * A fully self-contained Express server using in-memory JavaScript
 * objects instead of MySQL. All data resets on server restart.
 *
 * Run: node mock-server.js
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ══════════════════════════════════════════════════════════
// IN-MEMORY STORE  (replaces MySQL entirely)
// ══════════════════════════════════════════════════════════
let nextId = { user: 2, eventType: 2, availability: 8, booking: 1 };

const db = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@calendly.local', timezone: 'Asia/Kolkata' },
  ],

  eventTypes: [
    { id: 1, userId: 1, title: '30-Minute Meeting', duration: 30, slug: '30-min-meeting', createdAt: new Date().toISOString() },
    { id: 2, userId: 1, title: '60-Minute Strategy Call', duration: 60, slug: '60-min-strategy', createdAt: new Date().toISOString() },  // ← removed trailing comma issue
  ],

  // Monday–Friday, 9 AM – 5 PM
  availability: [1, 2, 3, 4, 5].map((dow, i) => ({
    id: i + 1,
    userId: 1,
    dayOfWeek: dow,
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'Asia/Kolkata',
  })),

  bookings: [],
};

// ══════════════════════════════════════════════════════════
// TIME UTILITIES
// ══════════════════════════════════════════════════════════
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(windowStart, windowEnd, duration) {
  const slots = [];
  let cur = timeToMinutes(windowStart);
  const end = timeToMinutes(windowEnd);
  while (cur + duration <= end) {
    slots.push({ start: minutesToTime(cur), end: minutesToTime(cur + duration) });
    cur += duration;
  }
  return slots;
}

function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function isPastDate(dateStr) {
  return dateStr < getTodayStr();
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

// ══════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════
app.get('/health', (_req, res) => {
  res.json({ status: 'ok (mock mode — no database)', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════
app.get('/api/event-types', (_req, res) => {
  const types = db.eventTypes
    .filter(et => et.userId === 1)
    .sort((a, b) => b.id - a.id);
  res.json({ success: true, data: types });
});

app.post('/api/event-types', (req, res) => {
  const { title, duration, slug } = req.body;

  if (!title?.trim()) return res.status(400).json({ success: false, error: 'Title is required.' });
  if (!duration || isNaN(duration) || Number(duration) <= 0)
    return res.status(400).json({ success: false, error: 'Duration must be a positive number.' });
  if (!slug?.trim() || !/^[a-z0-9-]+$/.test(slug.trim()))
    return res.status(400).json({ success: false, error: 'Slug must be lowercase alphanumeric with hyphens.' });

  const cleanSlug = slug.trim().toLowerCase();
  if (db.eventTypes.find(et => et.slug === cleanSlug))
    return res.status(409).json({ success: false, error: `Slug "${cleanSlug}" is already taken.` });

  const newEt = {
    id: nextId.eventType++,
    userId: 1,
    title: title.trim(),
    duration: parseInt(duration, 10),
    slug: cleanSlug,
    createdAt: new Date().toISOString(),
  };
  db.eventTypes.push(newEt);
  res.status(201).json({ success: true, data: newEt });
});

app.put('/api/event-types/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = db.eventTypes.findIndex(et => et.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Event type not found.' });

  const { title, duration, slug } = req.body;
  const et = { ...db.eventTypes[idx] };

  if (title !== undefined) et.title = title.trim();
  if (duration !== undefined) et.duration = parseInt(duration, 10);
  if (slug !== undefined) {
    const cleanSlug = slug.trim().toLowerCase();
    const conflict = db.eventTypes.find(e => e.slug === cleanSlug && e.id !== id);
    if (conflict) return res.status(409).json({ success: false, error: `Slug "${cleanSlug}" is taken.` });
    et.slug = cleanSlug;
  }

  db.eventTypes[idx] = et;
  res.json({ success: true, data: et });
});

app.delete('/api/event-types/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = db.eventTypes.findIndex(et => et.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Event type not found.' });

  db.eventTypes.splice(idx, 1);
  // Also remove related bookings
  db.bookings = db.bookings.filter(b => b.eventTypeId !== id);
  res.json({ success: true, message: 'Deleted.' });
});

// ══════════════════════════════════════════════════════════
// AVAILABILITY
// ══════════════════════════════════════════════════════════
app.get('/api/availability', (_req, res) => {
  const grouped = {};
  for (let i = 0; i <= 6; i++) grouped[i] = [];

  db.availability
    .filter(a => a.userId === 1)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .forEach(a => {
      grouped[a.dayOfWeek].push({ id: a.id, startTime: a.startTime, endTime: a.endTime, timezone: a.timezone });
    });

  res.json({ success: true, data: { raw: db.availability.filter(a => a.userId === 1), grouped } });
});

app.post('/api/availability', (req, res) => {
  const { windows, replaceDays } = req.body;
  if (!Array.isArray(windows)) return res.status(400).json({ success: false, error: 'windows must be an array.' });

  const validWindows = windows.filter(w => w.dayOfWeek >= 0 && w.dayOfWeek <= 6);
  const daysToReplace = Array.isArray(replaceDays)
    ? replaceDays
    : [...new Set(validWindows.map(w => w.dayOfWeek))];

  // If all days cleared
  if (validWindows.length === 0) {
    db.availability = db.availability.filter(a => a.userId !== 1 || !daysToReplace.includes(a.dayOfWeek));
    return res.json({ success: true, message: 'Cleared.', data: [] });
  }

  // Remove old entries for those days
  db.availability = db.availability.filter(a => a.userId !== 1 || !daysToReplace.includes(a.dayOfWeek));

  // Insert new
  const inserted = validWindows.map(w => {
    const record = {
      id: nextId.availability++,
      userId: 1,
      dayOfWeek: w.dayOfWeek,
      startTime: w.startTime,
      endTime: w.endTime,
      timezone: w.timezone || 'Asia/Kolkata',
    };
    db.availability.push(record);
    return record;
  });

  res.json({ success: true, message: 'Saved.', data: inserted });
});

app.delete('/api/availability/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = db.availability.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found.' });
  db.availability.splice(idx, 1);
  res.json({ success: true, message: 'Deleted.' });
});

// ══════════════════════════════════════════════════════════
// PUBLIC BOOKING
// ══════════════════════════════════════════════════════════
app.get('/api/event/:slug', (req, res) => {
  const et = db.eventTypes.find(e => e.slug === req.params.slug);
  if (!et) return res.status(404).json({ success: false, error: `No event found with slug "${req.params.slug}".` });

  const user = db.users.find(u => u.id === et.userId);
  res.json({ success: true, data: { ...et, user: { name: user?.name, timezone: user?.timezone } } });
});

app.get('/api/slots', (req, res) => {
  const { date, eventId } = req.query;

  if (!date) return res.status(400).json({ success: false, error: 'date is required.' });
  if (!eventId) return res.status(400).json({ success: false, error: 'eventId is required.' });
  if (!isValidDate(date)) return res.status(400).json({ success: false, error: 'Invalid date format.' });
  if (isPastDate(date)) return res.status(400).json({ success: false, error: 'Cannot get slots for a past date.' });

  const et = db.eventTypes.find(e => e.id === parseInt(eventId, 10));
  if (!et) return res.status(404).json({ success: false, error: 'Event type not found.' });

  const dayOfWeek = getDayOfWeek(date);
  const windows = db.availability.filter(a => a.userId === 1 && a.dayOfWeek === dayOfWeek);

  if (windows.length === 0) return res.json({ success: true, data: [] });

  const bookedStarts = new Set(
    db.bookings
      .filter(b => b.eventTypeId === et.id && b.date === date && b.status === 'booked')
      .map(b => b.startTime)
  );

  const allSlots = [];
  for (const w of windows) {
    for (const slot of generateSlots(w.startTime, w.endTime, et.duration)) {
      allSlots.push({ ...slot, available: !bookedStarts.has(slot.start) });
    }
  }

  allSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  res.json({ success: true, data: allSlots });
});

app.post('/api/book', (req, res) => {
  const { eventTypeId, date, startTime, endTime, inviteeName, inviteeEmail } = req.body;

  if (!isValidDate(date)) return res.status(400).json({ success: false, error: 'Invalid date.' });
  if (isPastDate(date)) return res.status(400).json({ success: false, error: 'Cannot book a past date.' });
  if (!inviteeName?.trim()) return res.status(400).json({ success: false, error: 'Name is required.' });
  if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail))
    return res.status(400).json({ success: false, error: 'Valid email is required.' });

  const et = db.eventTypes.find(e => e.id === parseInt(eventTypeId, 10));
  if (!et) return res.status(404).json({ success: false, error: 'Event type not found.' });

  // Double-booking check
  const conflict = db.bookings.find(
    b => b.eventTypeId === et.id && b.date === date && b.startTime === startTime && b.status === 'booked'
  );
  if (conflict) return res.status(409).json({ success: false, error: 'This slot was just booked. Please choose another.' });

  const booking = {
    id: nextId.booking++,
    eventTypeId: et.id,
    date,
    startTime,
    endTime,
    inviteeName: inviteeName.trim(),
    inviteeEmail: inviteeEmail.trim().toLowerCase(),
    status: 'booked',
    createdAt: new Date().toISOString(),
    eventType: { title: et.title, duration: et.duration, slug: et.slug },
  };

  db.bookings.push(booking);
  res.status(201).json({ success: true, message: 'Booking confirmed!', data: booking });
});

// ══════════════════════════════════════════════════════════
// MEETINGS
// ══════════════════════════════════════════════════════════
app.get('/api/meetings', (req, res) => {
  const { filter = 'all' } = req.query;
  const today = getTodayStr();

  let results = db.bookings
    .filter(b => {
      const et = db.eventTypes.find(e => e.id === b.eventTypeId);
      return et && et.userId === 1;
    })
    .map(b => ({
      ...b,
      eventType: db.eventTypes.find(e => e.id === b.eventTypeId),
    }));

  if (filter === 'upcoming') results = results.filter(b => b.date >= today && b.status === 'booked');
  if (filter === 'past') results = results.filter(b => b.date < today);

  results.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  res.json({ success: true, data: results });
});

app.patch('/api/cancel/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = db.bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found.' });
  if (booking.status === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled.' });

  booking.status = 'cancelled';
  res.json({ success: true, message: 'Cancelled. Slot is now available.', data: booking });
});

// ══════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Mock server running at http://localhost:${PORT}`);
  console.log(`⚡  Mode: IN-MEMORY (no database needed)`);
  console.log(`📋  Seeded: 2 event types, Mon–Fri 09:00–17:00 availability`);
  console.log(`\n   Test booking page → http://localhost:5173/event/30-min-meeting\n`);
});
