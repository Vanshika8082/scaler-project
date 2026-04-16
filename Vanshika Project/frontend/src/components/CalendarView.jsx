// custom month calendar for the booking page
// disables past dates and days with no admin availability
// highlights today and the currently selected date

import { useState, useMemo } from 'react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getTodayUTC() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarView({ availableDays, selectedDate, onSelectDate }) {
  const today = getTodayUTC();
  const [year, month] = useMemo(() => {
    // start the calendar on whichever month the selected date is in, or current month
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00Z') : new Date();
    return [d.getUTCFullYear(), d.getUTCMonth()];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  // build the grid cells for the calendar
  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const cells = [];

    // pad with empty cells so the first day lands on the right column
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(viewYear, viewMonth, d);
      const dow = new Date(Date.UTC(viewYear, viewMonth, d)).getUTCDay();
      const isPast = dateStr < today;
      const hasAvailability = availableDays.has(dow);

      cells.push({ day: d, dateStr, isPast, hasAvailability, dow });
    }

    return cells;
  }, [viewYear, viewMonth, today, availableDays]);

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else { setViewMonth((m) => m - 1); }
  };

  const goToNext = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else { setViewMonth((m) => m + 1); }
  };

  // don't let users go back to past months
  const todayYear = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]) - 1;
  const isPrevDisabled = viewYear === todayYear && viewMonth <= todayMonth;

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={goToPrev}
          disabled={isPrevDisabled}
          aria-label="Previous month"
          style={{ opacity: isPrevDisabled ? 0.3 : 1, cursor: isPrevDisabled ? 'not-allowed' : 'pointer' }}
        >
          ‹
        </button>
        <span className="calendar-month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          className="calendar-nav-btn"
          onClick={goToNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day name headers */}
      <div className="calendar-grid">
        {DAY_NAMES.map((name) => (
          <div key={name} className="calendar-day-name">{name}</div>
        ))}

        {/* Day cells */}
        {calendarDays.map((cell, i) => {
          if (!cell.day) {
            return <div key={`empty-${i}`} className="calendar-day empty" />;
          }

          const isToday = cell.dateStr === today;
          const isSelected = cell.dateStr === selectedDate;
          const isDisabled = cell.isPast || !cell.hasAvailability;

          let className = 'calendar-day';
          if (isSelected) className += ' selected';
          else if (isToday) className += ' today';
          else if (isDisabled) className += cell.isPast ? ' past' : ' no-availability';
          else className += ' available';

          return (
            <div
              key={cell.dateStr}
              className={className}
              onClick={isDisabled ? undefined : () => onSelectDate(cell.dateStr)}
              role={isDisabled ? undefined : 'button'}
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                  onSelectDate(cell.dateStr);
                }
              }}
              aria-label={`${cell.dateStr}${isToday ? ' (today)' : ''}${isDisabled ? ' (unavailable)' : ''}`}
              aria-selected={isSelected}
              aria-disabled={isDisabled}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
