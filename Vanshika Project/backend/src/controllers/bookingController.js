// handles everything booking-related:
// looking up events by slug, getting available slots, creating bookings, listing meetings, cancellations

const prisma = require('../prismaClient');
const { createError } = require('../middleware/errorHandler');
const { getAvailableSlots, isSlotAvailable } = require('../services/slotService');
const { isValidDate, isValidTime, isPastDate } = require('../utils/timeUtils');

const ADMIN_USER_ID = 1;

// ── Public: Fetch Event Details by Slug ─────────────────────

// GET /api/event/:slug
async function getPublicEvent(req, res, next) {
  try {
    const { slug } = req.params;

    const eventType = await prisma.eventType.findUnique({
      where: { slug },
      include: {
        user: {
          select: { name: true, timezone: true },
        },
      },
    });

    if (!eventType) {
      return next(createError(404, `No event found with slug "${slug}".`));
    }

    res.json({ success: true, data: eventType });
  } catch (err) {
    next(err);
  }
}

// public: get available time slots for a given date──

// GET /api/slots?date=YYYY-MM-DD&eventId=<id>
async function getSlots(req, res, next) {
  try {
    const { date, eventId } = req.query;

    if (!date) return next(createError(400, 'Query parameter "date" is required.'));
    if (!eventId) return next(createError(400, 'Query parameter "eventId" is required.'));

    const parsedEventId = parseInt(eventId, 10);
    if (isNaN(parsedEventId)) return next(createError(400, 'eventId must be a valid integer.'));

    const slots = await getAvailableSlots(date, parsedEventId, ADMIN_USER_ID);
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
}

// public: book a slot──

// POST /api/book
async function createBooking(req, res, next) {
  try {
    const { eventTypeId, date, startTime, endTime, inviteeName, inviteeEmail } = req.body;

    // basic validation before we even hit the db
    if (!eventTypeId || isNaN(parseInt(eventTypeId, 10))) {
      return next(createError(400, 'eventTypeId is required and must be a number.'));
    }
    if (!isValidDate(date)) {
      return next(createError(400, 'Invalid date. Use YYYY-MM-DD format.'));
    }
    if (isPastDate(date)) {
      return next(createError(400, 'Cannot book a slot in the past.'));
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return next(createError(400, 'startTime and endTime must be in HH:MM format.'));
    }
    if (!inviteeName || String(inviteeName).trim() === '') {
      return next(createError(400, 'Invitee name is required.'));
    }
    if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
      return next(createError(400, 'A valid invitee email is required.'));
    }

    const parsedEventTypeId = parseInt(eventTypeId, 10);

    // ── Double-booking prevention with transaction ─────────
    // The isSlotAvailable check + insert happen atomically.
    // If two requests race to the same slot, only the first
    // transaction to commit will succeed; the second will find
    // the slot taken and return a 409.
    const booking = await prisma.$transaction(async (tx) => {
      const available = await isSlotAvailable(tx, parsedEventTypeId, date, startTime);

      if (!available) {
        throw Object.assign(
          new Error('This time slot has just been booked by someone else. Please select another slot.'),
          { statusCode: 409 }
        );
      }

      return tx.booking.create({
        data: {
          eventTypeId: parsedEventTypeId,
          date,
          startTime,
          endTime,
          inviteeName: String(inviteeName).trim(),
          inviteeEmail: String(inviteeEmail).trim().toLowerCase(),
          status: 'booked',
        },
        include: {
          eventType: { select: { title: true, duration: true, slug: true } },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

// admin: list all meetings with optional filter──

// GET /api/meetings?filter=upcoming|past|all
async function getMeetings(req, res, next) {
  try {
    const { filter = 'all' } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let dateFilter = {};
    if (filter === 'upcoming') {
      dateFilter = { date: { gte: today }, status: 'booked' };
    } else if (filter === 'past') {
      dateFilter = { date: { lt: today } };
    }

    const meetings = await prisma.booking.findMany({
      where: {
        eventType: { userId: ADMIN_USER_ID },
        ...dateFilter,
      },
      include: {
        eventType: { select: { title: true, duration: true, slug: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    res.json({ success: true, data: meetings });
  } catch (err) {
    next(err);
  }
}

// admin: cancel a meeting (soft delete - just marks it cancelled)───

// PATCH /api/cancel/:id
// sets status to cancelled so the slot shows as free again
async function cancelMeeting(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'Invalid booking ID.'));

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) return next(createError(404, 'Booking not found.'));
    if (booking.status === 'cancelled') {
      return next(createError(400, 'This booking is already cancelled.'));
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json({
      success: true,
      message: 'Booking cancelled. The slot is now available for others.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicEvent,
  getSlots,
  createBooking,
  getMeetings,
  cancelMeeting,
};
