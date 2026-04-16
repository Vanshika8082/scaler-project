// time helper functions used throughout the app
// we keep times as HH:MM strings to avoid headaches with JS Date timezone stuff

// converts "HH:MM" to total minutes from midnight (e.g. "09:30" -> 570)
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// converts total minutes back to "HH:MM" string
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// breaks a time window into equal-size slots of a given duration
function generateSlots(windowStart, windowEnd, duration) {
  const slots = [];
  let current = timeToMinutes(windowStart);
  const end = timeToMinutes(windowEnd);

  while (current + duration <= end) {
    slots.push({
      start: minutesToTime(current),
      end: minutesToTime(current + duration),
    });
    current += duration;
  }

  return slots;
}

// gets the day of week (0=sunday) for a YYYY-MM-DD string
// we parse manually to avoid timezone offset issues with new Date()
function getDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // force UTC so the server timezone doesn't mess up the day calculation
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCDay();
}

// returns true if the date is before today
function isPastDate(dateStr) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // using UTC date string
  return dateStr < todayStr;
}

// validates that a time string is in HH:MM format and is an actual valid time
function isValidTime(timeStr) {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// checks that a date string matches YYYY-MM-DD and is a real calendar date
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  generateSlots,
  getDayOfWeek,
  isPastDate,
  isValidTime,
  isValidDate,
};
