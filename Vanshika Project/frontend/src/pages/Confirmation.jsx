// shown after a successful booking
// booking data is passed in via react router location state

import { useLocation, useNavigate } from 'react-router-dom';

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minStr} ${ampm}`;
}

export default function Confirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;

  // if someone opens this page directly without going through the booking flow, show a fallback
  if (!state?.booking) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-card">
          <div className="confirmation-icon">❓</div>
          <h1 className="confirmation-title">No Booking Found</h1>
          <p className="confirmation-subtitle">
            This page requires a completed booking to display details.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { booking, eventType, selectedDate, selectedSlot } = state;

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        {/* Success Icon */}
        <div className="confirmation-icon">✅</div>

        <h1 className="confirmation-title">You're Booked!</h1>
        <p className="confirmation-subtitle">
          A calendar invitation has been sent to your email address.
        </p>

        {/* Booking Details */}
        <div className="confirmation-details">
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Event</span>
            <span className="confirmation-detail-value">{eventType?.title || booking.eventType?.title}</span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Date</span>
            <span className="confirmation-detail-value">{formatDateDisplay(selectedDate || booking.date)}</span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Time</span>
            <span className="confirmation-detail-value">
              {formatTime(selectedSlot?.start || booking.startTime)} – {formatTime(selectedSlot?.end || booking.endTime)}
            </span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Duration</span>
            <span className="confirmation-detail-value">
              {eventType?.duration || booking.eventType?.duration} minutes
            </span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Name</span>
            <span className="confirmation-detail-value">{booking.inviteeName}</span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Email</span>
            <span className="confirmation-detail-value">{booking.inviteeEmail}</span>
          </div>
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">Ref. ID</span>
            <span className="confirmation-detail-value" style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
              #{booking.id}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <a
            href={`/event/${eventType?.slug || booking.eventType?.slug}`}
            className="btn btn-secondary"
          >
            Book Another Time
          </a>
          <button className="btn btn-ghost" onClick={() => window.close()}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
