const express = require('express');
const router = express.Router();
const {
  getAvailability,
  setAvailability,
  deleteAvailability,
} = require('../controllers/availabilityController');

router.get('/availability', getAvailability);
router.post('/availability', setAvailability);
router.delete('/availability/:id', deleteAvailability);

module.exports = router;
