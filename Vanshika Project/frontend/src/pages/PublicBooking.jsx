// the public booking page - accessed via /event/:slug
// step 1: pick a date, step 2: pick a time slot, step 3: fill in your info

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CalendarView from '../components/CalendarView';
import TimeSlotButton from '../components/TimeSlotButton';
import BookingForm from '../components/BookingForm';
import { bookingApi, availabilityApi } from '../services/api';

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export default function PublicBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // event and calendar state─
  const [eventType, setEventType] = useState(null);
  const [availableDays, setAvailableDays] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // booking flow state
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ── Load Event + Availability ─────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [eventRes, availRes] = await Promise.all([
          bookingApi.getEvent(slug),
          availabilityApi.get(),
        ]);
        setEventType(eventRes.data);

        // build a set of day numbers (0-6) that have availability configured
        const daysSet = new Set(
          (availRes.data.raw || []).map((a) => a.dayOfWeek)
        );
        setAvailableDays(daysSet);
      } catch (err) {
        setError(err.message || 'Failed to load event. The link may be invalid.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // ── Load Slots When Date Changes ──────────────────────────
  const loadSlots = useCallback(async (date) => {
    if (!eventType) return;
    setLoadingSlots(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot(null);
    setShowForm(false);
    try {
      const res = await bookingApi.getSlots(date, eventType.id);
      setSlots(res.data);
    } catch (err) {
      setSlotsError(err.message || 'Failed to load slots.');
    } finally {
      setLoadingSlots(false);
    }
  }, [eventType]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    loadSlots(date);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handleBookingSuccess = (booking) => {
    navigate('/confirmation', {
      state: {
        booking,
        eventType,
        selectedDate,
        selectedSlot,
      },
    });
  };

  // render
  if (loading) {
    return (
      <div className="booking-page">
        <div className="loading-state" style={{ minHeight: '100vh', flexDirection: 'column', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
          <div style={{ marginTop: '1.5rem' }}>
            <div className="loading-text">Loading event…</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              (Waking up the free-tier server, this might take 30-60 seconds!)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-page">
        <div className="booking-page-header">
          <span className="booking-page-brand">CalSync</span>
        </div>
        <div className="empty-state" style={{ paddingTop: '20vh' }}>
          <div className="empty-state-icon">🔍</div>
          <h1 className="empty-state-title">Event Not Found</h1>
          <p className="empty-state-description">{error}</p>
        </div>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="booking-page">
      {/* Header */}
      <div className="booking-page-header">
        <span className="booking-page-brand">CalSync</span>
      </div>

      <div className="booking-layout">
        {/* ── Left Sidebar: Event Info ──────────────────── */}
        <aside className="booking-event-info">
          <div className="booking-event-host">
            {eventType.user?.name?.charAt(0) || 'A'}
          </div>

          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
              {eventType.user?.name || 'Admin'}
            </div>
            <h1 className="booking-event-title">{eventType.title}</h1>
          </div>

          <div className="booking-event-detail">
            <span className="booking-event-detail-icon">⏱</span>
            <span>{eventType.duration} minutes</span>
          </div>

          <div className="booking-event-detail">
            <span className="booking-event-detail-icon">🌐</span>
            <span>Web conferencing details provided after booking</span>
          </div>

          {selectedDate && selectedSlot && (
            <div className="booking-event-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-1)' }}>
              <span style={{ color: 'var(--color-brand)', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                Selected Time
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatDateDisplay(selectedDate)}
              </span>
              <span style={{ color: 'var(--color-brand)' }}>
                {selectedSlot.start} – {selectedSlot.end}
              </span>
            </div>
          )}
        </aside>

        {/* ── Right: Calendar + Slots + Form ───────────── */}
        <div className="booking-main">
          {!showForm ? (
            <>
              {/* Calendar */}
              <div>
                <h2 className="booking-section-title">
                  {selectedDate ? 'Select a Time' : 'Select a Date'}
                </h2>
                <CalendarView
                  availableDays={availableDays}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                />
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatDateDisplay(selectedDate)}
                  </h3>

                  {loadingSlots ? (
                    <div className="loading-state" style={{ padding: 'var(--space-8)', flexDirection: 'column', textAlign: 'center' }}>
                      <div className="spinner" />
                      <div style={{ marginTop: '1rem' }}>
                        <div className="loading-text">Loading available slots…</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                          (Waking up the free-tier server, this might take 30-60 seconds!)
                        </div>
                      </div>
                    </div>
                  ) : slotsError ? (
                    <div className="alert alert-error">
                      <span>⚠️</span><span>{slotsError}</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
                      <div className="empty-state-icon">🕐</div>
                      <p className="empty-state-title" style={{ fontSize: 'var(--font-size-lg)' }}>No slots available</p>
                      <p className="empty-state-description">
                        There are no available time slots on this day. Please choose another date.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="time-slot-grid">
                        {slots.map((slot) => (
                          <TimeSlotButton
                            key={slot.start}
                            slot={slot}
                            selected={selectedSlot?.start === slot.start}
                            onClick={() => handleSlotSelect(slot)}
                          />
                        ))}
                      </div>
                      {availableSlots.length === 0 && (
                        <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                          All slots for this day are booked. Please select another date.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Booking Form */
            <div>
              <h2 className="booking-section-title">Enter Your Details</h2>
              <BookingForm
                eventType={eventType}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSuccess={handleBookingSuccess}
                onCancel={() => { setShowForm(false); setSelectedSlot(null); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
