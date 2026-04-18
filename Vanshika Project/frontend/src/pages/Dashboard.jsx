// admin dashboard with two tabs: event types and availability settings

import { useState, useEffect, useCallback } from 'react';
import EventCard from '../components/EventCard';
import AvailabilityForm from '../components/AvailabilityForm';
import { eventTypesApi, availabilityApi } from '../services/api';

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EMPTY_FORM = { title: '', duration: '30', slug: '', bufferBefore: '0', bufferAfter: '0' };

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('events');

  // event types
  const [eventTypes, setEventTypes] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');

  // modal / form
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // availability─
  const [availability, setAvailability] = useState({ grouped: {} });
  const [loadingAvail, setLoadingAvail] = useState(true);

  // data fetching
  const loadEventTypes = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError('');
    try {
      const res = await eventTypesApi.getAll();
      setEventTypes(res.data);
    } catch (err) {
      setEventsError(err.message);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    setLoadingAvail(true);
    try {
      const res = await availabilityApi.get();
      setAvailability(res.data);
    } catch {
      // availability failing silently is fine, form just won't pre-fill
    } finally {
      setLoadingAvail(false);
    }
  }, []);

  useEffect(() => {
    loadEventTypes();
    loadAvailability();
  }, [loadEventTypes, loadAvailability]);

  // form and modal handlers
  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (eventType) => {
    setEditingEvent(eventType);
    setForm({
      title: eventType.title,
      duration: String(eventType.duration),
      slug: eventType.slug,
      bufferBefore: String(eventType.bufferBefore ?? 0),
      bufferAfter: String(eventType.bufferAfter ?? 0),
    });
    setFormErrors({});
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // auto-generate the slug from the title when creating (not editing)
      if (name === 'title' && !editingEvent) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  };

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    const dur = parseInt(form.duration, 10);
    if (!form.duration || isNaN(dur) || dur <= 0) errors.duration = 'Enter a valid duration (minutes).';
    if (!form.slug.trim()) {
      errors.slug = 'Slug is required.';
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      errors.slug = 'Slug must be lowercase alphanumeric with hyphens only.';
    }
    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setFormSubmitting(true);
    setFormError('');
    try {
      if (editingEvent) {
        await eventTypesApi.update(editingEvent.id, {
          title: form.title.trim(),
          duration: parseInt(form.duration, 10),
          slug: form.slug.trim(),
          bufferBefore: parseInt(form.bufferBefore, 10) || 0,
          bufferAfter: parseInt(form.bufferAfter, 10) || 0,
        });
      } else {
        await eventTypesApi.create({
          title: form.title.trim(),
          duration: parseInt(form.duration, 10),
          slug: form.slug.trim(),
          bufferBefore: parseInt(form.bufferBefore, 10) || 0,
          bufferAfter: parseInt(form.bufferAfter, 10) || 0,
        });
      }
      closeModal();
      loadEventTypes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event type? All its bookings will also be deleted.')) return;
    try {
      await eventTypesApi.delete(id);
      loadEventTypes();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Manage your event types and availability.</p>
        </div>
        {activeTab === 'events' && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Event Type
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Event Types
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
      </div>

      {/* ── Events Tab ───────────────────────────────────── */}
      {activeTab === 'events' && (
        <>
          {loadingEvents ? (
            <div className="loading-state" style={{ flexDirection: 'column', textAlign: 'center' }}>
              <div className="spinner" />
              <div style={{ marginTop: '1rem' }}>
                <div className="loading-text">Loading event types…</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  (Waking up the free-tier server, this might take 30-60 seconds!)
                </div>
              </div>
            </div>
          ) : eventsError ? (
            <div className="alert alert-error">
              <span>⚠️</span><span>{eventsError}</span>
            </div>
          ) : eventTypes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <h2 className="empty-state-title">No event types yet</h2>
              <p className="empty-state-description">
                Create your first event type to start accepting bookings.
              </p>
              <button className="btn btn-primary btn-lg" onClick={openCreateModal}>
                Create Event Type
              </button>
            </div>
          ) : (
            <div className="event-grid">
              {eventTypes.map((et) => (
                <EventCard
                  key={et.id}
                  eventType={et}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Availability Tab ─────────────────────────────── */}
      {activeTab === 'availability' && (
        <>
          {loadingAvail ? (
            <div className="loading-state" style={{ flexDirection: 'column', textAlign: 'center' }}>
              <div className="spinner" />
              <div style={{ marginTop: '1rem' }}>
                <div className="loading-text">Loading availability…</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  (Waking up the free-tier server, this might take 30-60 seconds!)
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 680 }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
                Set the days and times you are available for meetings. Bookings will only be allowed during these windows.
              </p>
              <AvailabilityForm
                initialGrouped={availability.grouped || {}}
                onSave={loadAvailability}
              />
            </div>
          )}
        </>
      )}

      {/* ── Create / Edit Modal ──────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">
                {editingEvent ? 'Edit Event Type' : 'New Event Type'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">×</button>
            </div>

            {formError && (
              <div className="alert alert-error mb-4">
                <span>⚠️</span><span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="et-title">Event Title</label>
                  <input
                    id="et-title"
                    name="title"
                    type="text"
                    className={`form-input ${formErrors.title ? 'error' : ''}`}
                    placeholder="e.g. 30-Minute Discovery Call"
                    value={form.title}
                    onChange={handleFormChange}
                  />
                  {formErrors.title && <span className="form-error">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="et-duration">Duration (minutes)</label>
                  <input
                    id="et-duration"
                    name="duration"
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    className={`form-input ${formErrors.duration ? 'error' : ''}`}
                    placeholder="30"
                    value={form.duration}
                    onChange={handleFormChange}
                  />
                  {formErrors.duration && <span className="form-error">{formErrors.duration}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="et-slug">URL Slug</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 'var(--space-4)', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
                      fontSize: 'var(--font-size-sm)', pointerEvents: 'none',
                    }}>
                      /event/
                    </span>
                    <input
                      id="et-slug"
                      name="slug"
                      type="text"
                      className={`form-input ${formErrors.slug ? 'error' : ''}`}
                      placeholder="30-min-call"
                      value={form.slug}
                      onChange={handleFormChange}
                      style={{ paddingLeft: 'calc(var(--space-4) + 56px)' }}
                    />
                  </div>
                  {formErrors.slug && <span className="form-error">{formErrors.slug}</span>}
                </div>

                {/* buffer time inputs */}
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="et-buffer-before">Buffer Before (min)</label>
                    <input
                      id="et-buffer-before"
                      name="bufferBefore"
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      className="form-input"
                      placeholder="0"
                      value={form.bufferBefore}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="et-buffer-after">Buffer After (min)</label>
                    <input
                      id="et-buffer-after"
                      name="bufferAfter"
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      className="form-input"
                      placeholder="0"
                      value={form.bufferAfter}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={formSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formSubmitting} style={{ flex: 1 }}>
                    {formSubmitting ? (
                      <>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        {editingEvent ? 'Saving…' : 'Creating…'}
                      </>
                    ) : editingEvent ? 'Save Changes' : 'Create Event Type'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
