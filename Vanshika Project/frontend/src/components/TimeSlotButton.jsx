/**
 * TimeSlotButton Component
 * Renders a single bookable time slot pill.
 * Props:
 *   - slot: { start, end, available }
 *   - selected: boolean
 *   - onClick: () => void
 */

// Format "HH:MM" → "H:MM AM/PM"
function formatTime(timeStr) {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

export default function TimeSlotButton({ slot, selected, onClick }) {
  const isUnavailable = !slot.available;

  return (
    <button
      className={`time-slot-btn ${selected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''}`}
      onClick={isUnavailable ? undefined : onClick}
      disabled={isUnavailable}
      title={isUnavailable ? 'This slot is already booked' : `Book ${formatTime(slot.start)}`}
      aria-pressed={selected}
      aria-label={`${formatTime(slot.start)} to ${formatTime(slot.end)}${isUnavailable ? ' — unavailable' : ''}`}
    >
      <span style={{ fontWeight: 600 }}>{formatTime(slot.start)}</span>
      <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{formatTime(slot.end)}</span>
    </button>
  );
}
