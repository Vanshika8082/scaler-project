// slot generation logic lives here
// slots are never stored in the db - we compute them fresh each time by:
//   1. checking what hours the admin has set as available for that day
//   2. splitting those hours into chunks based on the event duration
//   3. removing any slots that are already booked

const prisma = require('../prismaClient');
const { generateSlots, getDayOfWeek, isPastDate, isValidDate, timeToMinutes, minutesToTime } = require('../utils/timeUtils');

// generates available slots for a given date and event type
// returns an array of { start, end, available }
async function getAvailableSlots(dateStr, eventTypeId, userId = 1) {
  // make sure the date is valid─
  if (!isValidDate(dateStr)) {
    throw Object.assign(new Error('Invalid date format. Use YYYY-MM-DD.'), { statusCode: 400 });
  }

  if (isPastDate(dateStr)) {
    throw Object.assign(new Error('Cannot generate slots for a past date.'), { statusCode: 400 });
  }

  // grab the event type to know the slot duration
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType) {
    throw Object.assign(new Error('Event type not found.'), { statusCode: 404 });
  }

  const { duration, bufferBefore = 0, bufferAfter = 0 } = eventType;

  // figure out what day of the week the requested date falls on
  const dayOfWeek = getDayOfWeek(dateStr);

  // ── 4. Fetch availability windows for that day ────────────
  const availabilityWindows = await prisma.availability.findMany({
    where: { userId, dayOfWeek },
    orderBy: { startTime: 'asc' },
  });

  if (availabilityWindows.length === 0) {
    return []; // no availability set for this day, nothing to return
  }

  // fetch bookings for this date that are still active (not cancelled)
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
      date: dateStr,
      status: 'booked',
    },
    select: { startTime: true, endTime: true },
  });

  // build blocked ranges — each booking blocks bufferBefore..endTime+bufferAfter
  const blockedRanges = existingBookings.map((b) => ({
    from: timeToMinutes(b.startTime) - bufferBefore,
    to: timeToMinutes(b.endTime) + bufferAfter,
  }));

  // generate all possible slots then mark ones that overlap a blocked range
  const allSlots = [];

  for (const window of availabilityWindows) {
    const rawSlots = generateSlots(window.startTime, window.endTime, duration);

    for (const slot of rawSlots) {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      // slot is blocked if it overlaps any booked range (including buffers)
      const blocked = blockedRanges.some(
        (r) => slotStart < r.to && slotEnd > r.from
      );
      allSlots.push({
        start: slot.start,
        end: slot.end,
        available: !blocked,
      });
    }
  }

  // sort by start time just to be safe
  allSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  return allSlots;
}

// checks if a specific slot is still free right before we create the booking
// this is called inside a transaction to prevent race conditions
async function isSlotAvailable(prismaClient, eventTypeId, dateStr, startTime) {
  const conflict = await prismaClient.booking.findFirst({
    where: {
      eventTypeId,
      date: dateStr,
      startTime,
      status: 'booked',
    },
  });
  return conflict === null;
}

module.exports = { getAvailableSlots, isSlotAvailable };
