// handles reading and writing the admin's weekly availability
// supports multiple time windows per day (e.g. morning + evening)

const prisma = require('../prismaClient');
const { createError } = require('../middleware/errorHandler');
const { isValidTime, timeToMinutes } = require('../utils/timeUtils');

const ADMIN_USER_ID = 1;

// GET /api/availability
// returns all the availability windows, grouped by day so the frontend doesn't have to do it
async function getAvailability(req, res, next) {
  try {
    const availability = await prisma.availability.findMany({
      where: { userId: ADMIN_USER_ID },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

  // group results by day (0-6) so the UI can just look up by day number
    const grouped = {};
    for (let i = 0; i <= 6; i++) {
      grouped[i] = [];
    }

    for (const slot of availability) {
      grouped[slot.dayOfWeek].push({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
      });
    }

    res.json({ success: true, data: { raw: availability, grouped } });
  } catch (err) {
    next(err);
  }
}

// POST /api/availability
// replaces the availability for whatever days are specified
// body should have a windows array and optionally replaceDays
async function setAvailability(req, res, next) {
  try {
    const { windows, replaceDays } = req.body;

    if (!Array.isArray(windows)) {
      return next(createError(400, 'windows must be an array.'));
    }

    // if empty array comes in, just wipe the days they specified
    if (windows.length === 0) {
      const daysToReplace = Array.isArray(replaceDays)
        ? replaceDays
        : [0, 1, 2, 3, 4, 5, 6];
      await prisma.availability.deleteMany({
        where: { userId: ADMIN_USER_ID, dayOfWeek: { in: daysToReplace } },
      });
      return res.json({ success: true, message: 'All availability cleared.', data: [] });
    }

    // the frontend sends dayOfWeek=-1 when a day is toggled off, ignore those
    const validWindows = windows.filter((w) => w.dayOfWeek >= 0 && w.dayOfWeek <= 6);

    // validate each window before touching the db
    for (const w of validWindows) {
      if (!isValidTime(w.startTime)) {
        return next(createError(400, `Invalid startTime: ${w.startTime}. Use HH:MM format.`));
      }
      if (!isValidTime(w.endTime)) {
        return next(createError(400, `Invalid endTime: ${w.endTime}. Use HH:MM format.`));
      }
      if (timeToMinutes(w.startTime) >= timeToMinutes(w.endTime)) {
        return next(createError(400, `startTime must be before endTime for day ${w.dayOfWeek}.`));
      }
    }

    // figure out which days we're replacing
    const daysToReplace = Array.isArray(replaceDays)
      ? replaceDays.filter((d) => [0, 1, 2, 3, 4, 5, 6].includes(d))
      : [...new Set(validWindows.map((w) => w.dayOfWeek))];

    // delete old windows then insert new ones in one transaction so we never end up with a half-saved state
    const result = await prisma.$transaction(async (tx) => {
      // first, clear out the old data for those days
      await tx.availability.deleteMany({
        where: {
          userId: ADMIN_USER_ID,
          dayOfWeek: { in: daysToReplace },
        },
      });

      // now insert the new ones
      const created = await tx.availability.createMany({
        data: validWindows.map((w) => ({
          userId: ADMIN_USER_ID,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
          timezone: w.timezone || 'Asia/Kolkata',
        })),
      });

      return created;
    });

    // fetch and return the updated list so the frontend can refresh
    const updated = await prisma.availability.findMany({
      where: { userId: ADMIN_USER_ID },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({
      success: true,
      message: `Availability updated for days: ${daysToReplace.join(', ')}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/availability/:id
// removes a single time window by id
async function deleteAvailability(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'Invalid availability ID.'));

    await prisma.availability.delete({ where: { id } });
    res.json({ success: true, message: 'Availability window removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAvailability, setAvailability, deleteAvailability };
