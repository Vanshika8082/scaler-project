/**
 * BookingForm Component
 * Shown after a user selects a time slot on the public booking page.
 * Collects invitee name + email and submits the booking.
 *
 * Props:
 *   - eventType: { id, title, duration, slug }
 *   - selectedDate: "YYYY-MM-DD"
 *   - selectedSlot: { start, end }
 *   - onSuccess: (booking) => void
 *   - onCancel: () => void
 */

import { useState } from 'react';
import { bookingApi } from '../services/api';

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(timeStr) {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

export default function BookingForm({ eventType, selectedDate, selectedSlot, onSuccess, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Your name is required.';
    if (!form.email.trim()) {
      newErrors.email = 'Your email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      const result = await bookingApi.book({
        eventTypeId: eventType.id,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        inviteeName: form.name.trim(),
        inviteeEmail: form.email.trim().toLowerCase(),
      });

      onSuccess(result.data);
    } catch (err) {
      setApiError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Selected slot summary */}
      <div className="booking-form-selection-summary">
        <span className="booking-form-selection-icon">📅</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            {formatDateDisplay(selectedDate)}
          </div>
          <div style={{ color: 'var(--color-brand)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
            {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="alert alert-error mt-4">
          <span>⚠️</span>
          <span>{apiError}</span>
        </div>
      )}

      <form className="booking-form mt-4" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="booking-name">Your Name</label>
          <input
            id="booking-name"
            name="name"
            type="text"
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="Jane Smith"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="booking-email">Email Address</label>
          <input
            id="booking-email"
            name="email"
            type="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="jane@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Back
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ flex: 1 }}
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Confirming...
              </>
            ) : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
