// lets the admin set their weekly working hours
// each day can have multiple time windows now (e.g. 9-12 and 14-17)
// you can add/remove windows per day and save it all at once

import { useState } from 'react';
import { availabilityApi } from '../services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildInitialDays(initialGrouped) {
  return DAYS.map((name, dow) => {
    const windows = initialGrouped?.[dow] ?? [];
    return {
      name,
      enabled: windows.length > 0,
      windows: windows.length > 0
        ? windows.map(w => ({ startTime: w.startTime, endTime: w.endTime }))
        : [{ startTime: '09:00', endTime: '17:00' }],
    };
  });
}

export default function AvailabilityForm({ initialGrouped, onSave }) {
  const [days, setDays] = useState(() => buildInitialDays(initialGrouped));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // toggle a day on/off
  const toggleDay = (dow) => {
    setDays(prev => prev.map((d, i) => i === dow ? { ...d, enabled: !d.enabled } : d));
  };

  // update a specific time field in a window
  const updateWindow = (dow, winIdx, field, value) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dow) return d;
      const updated = d.windows.map((w, j) => j === winIdx ? { ...w, [field]: value } : w);
      return { ...d, windows: updated };
    }));
  };

  // add a new time window to a day (defaults to after the last one)
  const addWindow = (dow) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dow) return d;
      const last = d.windows[d.windows.length - 1];
      return { ...d, windows: [...d.windows, { startTime: last.endTime, endTime: '18:00' }] };
    }));
  };

  // remove a specific window from a day
  const removeWindow = (dow, winIdx) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dow) return d;
      const updated = d.windows.filter((_, j) => j !== winIdx);
      // if all windows removed, keep one empty placeholder
      return { ...d, windows: updated.length > 0 ? updated : [{ startTime: '09:00', endTime: '17:00' }] };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // collect windows only from days that are toggled on
    const windows = [];
    for (let dow = 0; dow < 7; dow++) {
      if (days[dow].enabled) {
        for (const w of days[dow].windows) {
          if (!w.startTime || !w.endTime) {
            setError(`Please fill in all times for ${DAYS[dow]}.`);
            return;
          }
          if (w.startTime >= w.endTime) {
            setError(`${DAYS[dow]}: start time must be before end time.`);
            return;
          }
          windows.push({ dayOfWeek: dow, startTime: w.startTime, endTime: w.endTime });
        }
      }
    }

    // always replace all 7 days so nothing gets out of sync
    const replaceDays = [0, 1, 2, 3, 4, 5, 6];

    setSaving(true);
    try {
      if (windows.length === 0) {
        // passing a -1 sentinel to tell the backend to clear all days without needing special handling
        await availabilityApi.set({ windows: [{ dayOfWeek: -1, startTime: '00:00', endTime: '00:00' }], replaceDays });
      } else {
        await availabilityApi.set({ windows, replaceDays });
      }
      setSuccess('Availability saved!');
      if (onSave) onSave();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="availability-form" onSubmit={handleSubmit}>
      {days.map((day, dow) => (
        <div key={dow} className={`availability-day-row ${day.enabled ? 'active' : ''}`}>
          {/* toggle + label */}
          <div className="availability-day-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={() => toggleDay(dow)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="availability-day-label">{day.name}</span>
          </div>

          {/* time windows column */}
          {day.enabled ? (
            <div className="availability-windows-col">
              {day.windows.map((win, winIdx) => (
                <div key={winIdx} className="availability-window-row">
                  <div className="availability-time-inputs">
                    <input
                      type="time"
                      className="availability-time-input"
                      value={win.startTime}
                      onChange={(e) => updateWindow(dow, winIdx, 'startTime', e.target.value)}
                    />
                    <span className="availability-time-separator">–</span>
                    <input
                      type="time"
                      className="availability-time-input"
                      value={win.endTime}
                      onChange={(e) => updateWindow(dow, winIdx, 'endTime', e.target.value)}
                    />
                  </div>
                  {/* only show remove if there's more than one window */}
                  {day.windows.length > 1 && (
                    <button
                      type="button"
                      className="availability-remove-btn"
                      onClick={() => removeWindow(dow, winIdx)}
                      title="Remove this time range"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="availability-add-window-btn"
                onClick={() => addWindow(dow)}
              >
                + Add time range
              </button>
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              Unavailable
            </span>
          )}
        </div>
      ))}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Availability'}
        </button>
      </div>
    </form>
  );
}
