const express = require('express');
const router = express.Router();
const {
  getPublicEvent,
  getSlots,
  createBooking,
  getMeetings,
  cancelMeeting,
} = require('../controllers/bookingController');

// Public routes
router.get('/event/:slug', getPublicEvent);
router.get('/slots', getSlots);
router.post('/book', createBooking);

// Admin routes
router.get('/meetings', getMeetings);
router.patch('/cancel/:id', cancelMeeting);

module.exports = router;
