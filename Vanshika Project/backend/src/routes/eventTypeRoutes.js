const express = require('express');
const router = express.Router();
const {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
} = require('../controllers/eventTypeController');

router.get('/event-types', getEventTypes);
router.post('/event-types', createEventType);
router.put('/event-types/:id', updateEventType);
router.delete('/event-types/:id', deleteEventType);

module.exports = router;
