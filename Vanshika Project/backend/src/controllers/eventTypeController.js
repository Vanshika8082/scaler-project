// CRUD for event types - all belong to the seeded admin user (id=1)

const prisma = require('../prismaClient');
const { createError } = require('../middleware/errorHandler');

const ADMIN_USER_ID = 1;

// GET /api/event-types
async function getEventTypes(req, res, next) {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: ADMIN_USER_ID },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: eventTypes });
  } catch (err) {
    next(err);
  }
}

// POST /api/event-types
// creates a new event type, title/duration/slug all required
async function createEventType(req, res, next) {
  try {
    const { title, duration, slug, bufferBefore = 0, bufferAfter = 0 } = req.body;

    // quick validation before hitting the db
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return next(createError(400, 'Title is required.'));
    }
    if (!duration || isNaN(duration) || Number(duration) <= 0) {
      return next(createError(400, 'Duration must be a positive number (minutes).'));
    }
    if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug.trim())) {
      return next(createError(400, 'Slug is required and must be lowercase alphanumeric with hyphens only.'));
    }

    const durationInt = parseInt(duration, 10);
    const cleanSlug = slug.trim().toLowerCase();

    const bufBefore = parseInt(bufferBefore, 10) || 0;
    const bufAfter = parseInt(bufferAfter, 10) || 0;

    // give a cleaner error if the slug is already taken
    const existing = await prisma.eventType.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return next(createError(409, `Slug "${cleanSlug}" is already taken. Choose a different slug.`));
    }

    const eventType = await prisma.eventType.create({
      data: {
        userId: ADMIN_USER_ID,
        title: title.trim(),
        duration: durationInt,
        slug: cleanSlug,
        bufferBefore: bufBefore,
        bufferAfter: bufAfter,
      },
    });

    res.status(201).json({ success: true, data: eventType });
  } catch (err) {
    next(err);
  }
}

// PUT /api/event-types/:id
// all fields are optional, only update what's sent
async function updateEventType(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'Invalid event type ID.'));

    const { title, duration, slug } = req.body;
    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return next(createError(400, 'Title cannot be empty.'));
      }
      updateData.title = title.trim();
    }

    if (duration !== undefined) {
      const durationInt = parseInt(duration, 10);
      if (isNaN(durationInt) || durationInt <= 0) {
        return next(createError(400, 'Duration must be a positive integer.'));
      }
      updateData.duration = durationInt;
    }

    if (slug !== undefined) {
      const cleanSlug = slug.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
        return next(createError(400, 'Slug must be lowercase alphanumeric with hyphens only.'));
      }

      if (bufferBefore !== undefined) updateData.bufferBefore = parseInt(bufferBefore, 10) || 0;
    if (bufferAfter !== undefined) updateData.bufferAfter = parseInt(bufferAfter, 10) || 0;

    // make sure the new slug isn't already used by a different event type
      const conflict = await prisma.eventType.findFirst({
        where: { slug: cleanSlug, NOT: { id } },
      });
      if (conflict) {
        return next(createError(409, `Slug "${cleanSlug}" is already taken.`));
      }
      updateData.slug = cleanSlug;
    }

    if (Object.keys(updateData).length === 0) {
      return next(createError(400, 'No valid fields provided for update.'));
    }

    const updated = await prisma.eventType.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/event-types/:id
// deletes the event type and cascades to its bookings via prisma schema
async function deleteEventType(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError(400, 'Invalid event type ID.'));

    await prisma.eventType.delete({ where: { id } });

    res.json({ success: true, message: 'Event type deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEventTypes, createEventType, updateEventType, deleteEventType };
