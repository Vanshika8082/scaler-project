// shows all bookings for the admin - can filter by upcoming/past/all
// also lets you soft-cancel a booking from here

import { useState, useEffect, useCallback } from 'react';
import { meetingsApi } from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    day: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    full: date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }),
  };
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

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await meetingsApi.getAll(filter);
      setMeetings(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this meeting? The time slot will become available again.')) return;
    setCancellingId(id);
    try {
      await meetingsApi.cancel(id);
      loadMeetings();
    } catch (err) {
      alert(err.message || 'Failed to cancel meeting.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Meetings</h1>
          <p className="dashboard-subtitle">View and manage your scheduled meetings.</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="meetings-filter">
        {['upcoming', 'past', 'all'].map((f) => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span className="loading-text">Loading meetings…</span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>⚠️</span><span>{error}</span>
        </div>
      ) : meetings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h2 className="empty-state-title">
            {filter === 'upcoming' ? 'No upcoming meetings' : filter === 'past' ? 'No past meetings' : 'No meetings yet'}
          </h2>
          <p className="empty-state-description">
            {filter === 'upcoming'
              ? 'Share your event link with others to start receiving bookings.'
              : 'Your meeting history will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {meetings.map((meeting) => {
            const dateInfo = formatDate(meeting.date);
            const isCancelled = meeting.status === 'cancelled';
            const isToday = meeting.date === new Date().toISOString().split('T')[0];

            return (
              <div key={meeting.id} className={`meeting-card ${isCancelled ? 'cancelled' : ''}`}>
                {/* Date Block */}
                <div className="meeting-date-block">
                  <div className="meeting-date-day">{dateInfo.day}</div>
                  <div className="meeting-date-month">{dateInfo.month}</div>
                </div>

                {/* Meeting Info */}
                <div className="meeting-info">
                  <div className="meeting-title">{meeting.eventType?.title}</div>
                  <div className="meeting-meta">
                    <span>🕐 {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}</span>
                    <span>👤 {meeting.inviteeName}</span>
                    <span>✉️ {meeting.inviteeEmail}</span>
                    {isToday && !isCancelled && (
                      <span style={{
                        background: 'var(--color-brand-dim)',
                        color: 'var(--color-brand)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 700,
                      }}>Today</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <span className={`meeting-status-badge ${isCancelled ? 'cancelled' : 'booked'}`}>
                      {isCancelled ? '✕ Cancelled' : '✓ Confirmed'}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      Ref #{meeting.id}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!isCancelled && (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(meeting.id)}
                      disabled={cancellingId === meeting.id}
                    >
                      {cancellingId === meeting.id ? (
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : 'Cancel'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
