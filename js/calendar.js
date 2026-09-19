/**
 * calendar.js
 * Rendering von Monatskalender, Wochenansicht und Tagesbadges.
 */

class CalendarView {
  static WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  static WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  static MONTHS_LONG = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  static getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  static getWeekDateRange(year, weekNum) {
    const simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(ISOweekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  static renderMonthGrid(year, monthIndex, entries, settings, holidays, onSelectDate) {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const startWeekday = window.TimeCalculator.getWeekdayIndex(firstDay);
    const todayStr = window.TimeCalculator.formatDate(new Date());

    let html = `
      <div class="calendar-header-grid">
        <div class="kw-head">KW</div>
        ${this.WEEKDAYS_SHORT.map(wd => `<div class="weekday-head">${wd}</div>`).join('')}
      </div>
      <div class="calendar-days-grid">
    `;

    const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
    let dayCounter = 1;
    let nextMonthDayCounter = 1;

    for (let week = 0; week < 6; week++) {
      let sampleDate;
      if (week === 0 && startWeekday > 0) {
        sampleDate = new Date(year, monthIndex, 1);
      } else if (dayCounter <= daysInMonth) {
        sampleDate = new Date(year, monthIndex, dayCounter);
      } else {
        break;
      }
      const kw = this.getISOWeekNumber(sampleDate);

      html += `<div class="kw-cell">KW ${kw}</div>`;

      for (let wDay = 0; wDay < 7; wDay++) {
        if (week === 0 && wDay < startWeekday) {
          const prevDayNum = prevMonthLastDay - (startWeekday - wDay - 1);
          const prevDate = new Date(year, monthIndex - 1, prevDayNum);
          const dateStr = window.TimeCalculator.formatDate(prevDate);
          html += this.renderDayCell(dateStr, prevDayNum, true, entries, settings, holidays, todayStr);
        } else if (dayCounter <= daysInMonth) {
          const curDate = new Date(year, monthIndex, dayCounter);
          const dateStr = window.TimeCalculator.formatDate(curDate);
          html += this.renderDayCell(dateStr, dayCounter, false, entries, settings, holidays, todayStr);
          dayCounter++;
        } else {
          const nextDate = new Date(year, monthIndex + 1, nextMonthDayCounter);
          const dateStr = window.TimeCalculator.formatDate(nextDate);
          html += this.renderDayCell(dateStr, nextMonthDayCounter, true, entries, settings, holidays, todayStr);
          nextMonthDayCounter++;
        }
      }
    }

    html += `</div>`;
    return html;
  }

  static renderDayCell(dateStr, dayNum, isOtherMonth, entries, settings, holidays, todayStr) {
    const rawEntry = entries[dateStr] || { date: dateStr, status: holidays[dateStr] ? 'feiertag' : 'arbeit' };
    const dayData = window.TimeCalculator.calculateDay(rawEntry, settings, holidays);
    const isToday = dateStr === todayStr;

    let badgeHtml = '';
    let statusClass = `status-${dayData.status}`;

    if (dayData.holidayName) {
      badgeHtml = `<span class="badge badge-holiday" title="${dayData.holidayName}">🎉 Feiertag</span>`;
    } else if (dayData.status === 'urlaub') {
      badgeHtml = `<span class="badge badge-urlaub">🌴 Urlaub</span>`;
    } else if (dayData.status === 'halber_urlaub') {
      badgeHtml = `<span class="badge badge-urlaub">½ Urlaub</span>`;
    } else if (dayData.status === 'fza') {
      badgeHtml = `<span class="badge badge-fza">⏰ FZA</span>`;
    } else if (dayData.status === 'krank') {
      badgeHtml = `<span class="badge badge-krank">🩺 Krank</span>`;
    } else if (dayData.actualHours > 0 || (rawEntry.startTime && rawEntry.endTime)) {
      const balanceSign = dayData.balanceHours >= 0 ? `+${dayData.balanceHours}` : `${dayData.balanceHours}`;
      const balanceColor = dayData.balanceHours >= 0 ? 'text-positive' : 'text-negative';
      badgeHtml = `
        <div class="work-summary">
          <span class="work-hours">${dayData.actualHours.toFixed(1)}h</span>
          <span class="work-balance ${balanceColor}">${balanceSign}h</span>
        </div>
      `;
    } else if (dayData.targetHours > 0) {
      badgeHtml = `<span class="badge badge-open">${dayData.targetHours.toFixed(1)}h Soll</span>`;
    }

    const otherMonthClass = isOtherMonth ? 'other-month' : '';
    const todayClass = isToday ? 'is-today' : '';

    return `
      <div class="calendar-day-cell ${otherMonthClass} ${todayClass} ${statusClass}" data-date="${dateStr}">
        <div class="day-number-row">
          <span class="day-num">${dayNum}</span>
          ${isToday ? '<span class="today-tag">Heute</span>' : ''}
        </div>
        <div class="day-content">
          ${badgeHtml}
        </div>
      </div>
    `;
  }

  static renderWeekView(year, weekNum, entries, settings, holidays) {
    const weekDays = this.getWeekDateRange(year, weekNum);
    const todayStr = window.TimeCalculator.formatDate(new Date());

    const calculatedDays = weekDays.map(date => {
      const dateStr = window.TimeCalculator.formatDate(date);
      const rawEntry = entries[dateStr] || { date: dateStr, status: holidays[dateStr] ? 'feiertag' : 'arbeit' };
      return {
        dateObj: date,
        dateStr,
        ...window.TimeCalculator.calculateDay(rawEntry, settings, holidays)
      };
    });

    const stats = window.TimeCalculator.aggregateStats(calculatedDays);

    let html = `
      <div class="week-summary-bar card">
        <div class="stat-pill">
          <span class="label">Soll gesamt:</span>
          <span class="value">${stats.totalTarget.toFixed(2).replace('.', ',')} Std.</span>
        </div>
        <div class="stat-pill">
          <span class="label">Ist gesamt:</span>
          <span class="value">${stats.totalActual.toFixed(2).replace('.', ',')} Std.</span>
        </div>
        <div class="stat-pill">
          <span class="label">Wochensaldo:</span>
          <span class="value ${stats.totalBalance >= 0 ? 'text-positive' : 'text-negative'}">
            ${window.TimeCalculator.formatHoursWithSign(stats.totalBalance)}
          </span>
        </div>
      </div>

      <div class="week-table-container card">
        <table class="week-table">
          <thead>
            <tr>
              <th>Wochentag</th>
              <th>Datum</th>
              <th>Status</th>
              <th>Beginn</th>
              <th>Pause</th>
              <th>Ende</th>
              <th>Ist</th>
              <th>Soll</th>
              <th>Saldo</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
    `;

    calculatedDays.forEach((day, index) => {
      const weekdayName = this.WEEKDAYS_LONG[index];
      const isToday = day.dateStr === todayStr;
      const balanceSign = day.balanceHours >= 0 ? `+${day.balanceHours.toFixed(2)}` : day.balanceHours.toFixed(2);
      const balanceClass = day.balanceHours > 0 ? 'text-positive' : (day.balanceHours < 0 ? 'text-negative' : '');

      let statusBadge = '';
      switch (day.status) {
        case 'arbeit': statusBadge = '<span class="status-chip chip-work">Arbeit</span>'; break;
        case 'urlaub': statusBadge = '<span class="status-chip chip-urlaub">Urlaub</span>'; break;
        case 'halber_urlaub': statusBadge = '<span class="status-chip chip-urlaub">½ Urlaub</span>'; break;
        case 'fza': statusBadge = '<span class="status-chip chip-fza">FZA</span>'; break;
        case 'krank': statusBadge = '<span class="status-chip chip-krank">Krank</span>'; break;
        case 'feiertag': statusBadge = `<span class="status-chip chip-holiday">${day.holidayName || 'Feiertag'}</span>`; break;
        default: statusBadge = '<span class="status-chip chip-frei">Frei</span>'; break;
      }

      html += `
        <tr class="${isToday ? 'row-today' : ''}">
          <td class="col-weekday"><strong>${weekdayName}</strong></td>
          <td class="col-date">${day.dateStr.split('-').reverse().join('.')}</td>
          <td class="col-status">${statusBadge}</td>
          <td class="col-time">${day.startTime || '-'}</td>
          <td class="col-time">${day.breakMinutes ? day.breakMinutes + ' m' : '-'}</td>
          <td class="col-time">${day.endTime || '-'}</td>
          <td class="col-hours"><strong>${day.actualHours.toFixed(2).replace('.', ',')} h</strong></td>
          <td class="col-hours">${day.targetHours.toFixed(2).replace('.', ',')} h</td>
          <td class="col-balance ${balanceClass}"><strong>${balanceSign.replace('.', ',')} h</strong></td>
          <td class="col-action">
            <button class="btn btn-sm btn-outline edit-day-btn" data-date="${day.dateStr}">
              ✏️ Bearbeiten
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }
}

if (typeof window !== 'undefined') {
  window.CalendarView = CalendarView;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalendarView };
}
