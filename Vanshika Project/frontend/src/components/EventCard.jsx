/**
 * EventCard Component
 * Displays a single event type with its metadata, public link, and action buttons.
 * Props:
 *   - eventType: { id, title, duration, slug }
 *   - onEdit: (eventType) => void
 *   - onDelete: (id) => void
 */

export default function EventCard({ eventType, onEdit, onDelete }) {
  const publicUrl = `${window.location.origin}/event/${eventType.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      // Brief visual feedback via title change — no extra toast library needed
      const btn = document.getElementById(`copy-btn-${eventType.id}`);
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      }
    });
  };

  return (
    <div className="event-card">
      <div className="event-card-title">{eventType.title}</div>

      <div className="event-card-meta">
        <span className="event-card-badge">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          {eventType.duration} min
        </span>
        {(eventType.bufferBefore > 0 || eventType.bufferAfter > 0) && (
          <span className="event-card-badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
            ⏱ {eventType.bufferBefore > 0 ? `+${eventType.bufferBefore}m before` : ''}{eventType.bufferBefore > 0 && eventType.bufferAfter > 0 ? ' / ' : ''}{eventType.bufferAfter > 0 ? `+${eventType.bufferAfter}m after` : ''}
          </span>
        )}
        <span className="event-card-slug">/{eventType.slug}</span>
      </div>

      <div className="event-card-link">{publicUrl}</div>

      <div className="event-card-actions">
        <a
          href={`/event/${eventType.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open
        </a>

        <button
          id={`copy-btn-${eventType.id}`}
          className="btn btn-secondary btn-sm"
          onClick={handleCopyLink}
        >
          Copy Link
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onEdit(eventType)}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>

        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(eventType.id)}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
