/**
 * exporter.js
 * Erstellung von druckfertigen PDF-Stundenzetteln, CSV-Exporten und JSON-Backups.
 */

class Exporter {
  static exportMonthCsv(year, monthIndex, entries, settings, holidays) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = window.CalendarView.MONTHS_LONG[monthIndex];

    const rows = [
      ['Datum', 'Wochentag', 'Status', 'Beginn', 'Ende', 'Pause (Min)', 'Ist-Stunden', 'Soll-Stunden', 'Saldo (Std)', 'Notiz / Projekt']
    ];

    let sumActual = 0;
    let sumTarget = 0;
    let sumBalance = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = window.TimeCalculator.formatDate(date);
      const weekdayIdx = window.TimeCalculator.getWeekdayIndex(date);
      const weekdayName = window.CalendarView.WEEKDAYS_SHORT[weekdayIdx];

      const rawEntry = entries[dateStr] || { date: dateStr, status: holidays[dateStr] ? 'feiertag' : 'arbeit' };
      const calc = window.TimeCalculator.calculateDay(rawEntry, settings, holidays);

      sumActual += calc.actualHours;
      sumTarget += calc.targetHours;
      sumBalance += calc.balanceHours;

      let statusLabel = calc.status;
      if (calc.holidayName) statusLabel = `Feiertag (${calc.holidayName})`;
      else if (calc.status === 'urlaub') statusLabel = 'Urlaub';
      else if (calc.status === 'halber_urlaub') statusLabel = 'Halber Urlaub';
      else if (calc.status === 'fza') statusLabel = 'Überstundenabbau (FZA)';
      else if (calc.status === 'krank') statusLabel = 'Krankheit';
      else if (calc.status === 'arbeit') statusLabel = 'Arbeit';
      else statusLabel = 'Frei';

      rows.push([
        dateStr.split('-').reverse().join('.'),
        weekdayName,
        statusLabel,
        calc.startTime || '',
        calc.endTime || '',
        calc.breakMinutes ? String(calc.breakMinutes) : '0',
        calc.actualHours.toFixed(2).replace('.', ','),
        calc.targetHours.toFixed(2).replace('.', ','),
        calc.balanceHours.toFixed(2).replace('.', ','),
        calc.note ? `"${calc.note.replace(/"/g, '""')}"` : ''
      ]);
    }

    rows.push([
      'GESAMT', '', '', '', '', '',
      sumActual.toFixed(2).replace('.', ','),
      sumTarget.toFixed(2).replace('.', ','),
      sumBalance.toFixed(2).replace('.', ','),
      ''
    ]);

    const csvContent = '\uFEFF' + rows.map(e => e.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Stundenzettel_${year}_${String(monthIndex + 1).padStart(2, '0')}_${monthName}.csv`;
    this.triggerDownload(blob, filename);
  }

  static generatePrintableHtml(year, monthIndex, entries, settings, holidays) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = window.CalendarView.MONTHS_LONG[monthIndex];
    const employeeName = settings.employeeName || 'Mitarbeiter/in';
    const employeeNum = settings.employeeNumber ? `Personal-Nr.: ${settings.employeeNumber}` : '';

    const calculatedDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = window.TimeCalculator.formatDate(date);
      const weekdayIdx = window.TimeCalculator.getWeekdayIndex(date);
      const rawEntry = entries[dateStr] || { date: dateStr, status: holidays[dateStr] ? 'feiertag' : 'arbeit' };
      calculatedDays.push({
        dateStr,
        weekday: window.CalendarView.WEEKDAYS_SHORT[weekdayIdx],
        ...window.TimeCalculator.calculateDay(rawEntry, settings, holidays)
      });
    }

    const stats = window.TimeCalculator.aggregateStats(calculatedDays);

    let rowsHtml = '';
    calculatedDays.forEach(day => {
      let statusText = '';
      if (day.holidayName) statusText = `Feiertag (${day.holidayName})`;
      else if (day.status === 'urlaub') statusText = 'Urlaub';
      else if (day.status === 'halber_urlaub') statusText = '½ Urlaub';
      else if (day.status === 'fza') statusText = 'FZA';
      else if (day.status === 'krank') statusText = 'Krank';
      else if (day.status === 'arbeit') statusText = 'Arbeit';
      else statusText = '-';

      const isWeekend = day.weekday === 'Sa' || day.weekday === 'So';
      const balanceFormatted = day.balanceHours >= 0
        ? `+${day.balanceHours.toFixed(2).replace('.', ',')}`
        : day.balanceHours.toFixed(2).replace('.', ',');

      rowsHtml += `
        <tr class="${isWeekend ? 'print-weekend' : ''}">
          <td>${day.dateStr.split('-').reverse().join('.')}</td>
          <td><strong>${day.weekday}</strong></td>
          <td>${statusText}</td>
          <td>${day.startTime || '-'}</td>
          <td>${day.breakMinutes ? day.breakMinutes + ' min' : '-'}</td>
          <td>${day.endTime || '-'}</td>
          <td class="text-right"><strong>${day.actualHours > 0 ? day.actualHours.toFixed(2).replace('.', ',') : '-'}</strong></td>
          <td class="text-right">${day.targetHours.toFixed(2).replace('.', ',')}</td>
          <td class="text-right">${day.targetHours > 0 || day.actualHours > 0 ? balanceFormatted : '-'}</td>
          <td class="print-note">${day.note || ''}</td>
        </tr>
      `;
    });

    const balanceSign = stats.totalBalance >= 0 ? `+${stats.totalBalance.toFixed(2).replace('.', ',')}` : stats.totalBalance.toFixed(2).replace('.', ',');

    return `
      <div class="print-document">
        <div class="print-header">
          <div class="print-title-area">
            <h1>Arbeitszeitnachweis / Stundenzettel</h1>
            <h2>${monthName} ${year}</h2>
          </div>
          <div class="print-employee-info">
            <p><strong>Name:</strong> ${employeeName}</p>
            ${employeeNum ? `<p>${employeeNum}</p>` : ''}
            <p><strong>Wochenarbeitszeit:</strong> ${settings.weeklyHours} Stunden</p>
            <p><strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
          </div>
        </div>

        <div class="print-kpi-row">
          <div class="print-kpi-card">
            <span class="kpi-label">Soll-Stunden Monat:</span>
            <span class="kpi-val">${stats.totalTarget.toFixed(2).replace('.', ',')} Std.</span>
          </div>
          <div class="print-kpi-card">
            <span class="kpi-label">Ist-Stunden geleistet:</span>
            <span class="kpi-val">${stats.totalActual.toFixed(2).replace('.', ',')} Std.</span>
          </div>
          <div class="print-kpi-card">
            <span class="kpi-label">Monats-Saldo:</span>
            <span class="kpi-val ${stats.totalBalance >= 0 ? 'text-positive' : 'text-negative'}">${balanceSign} Std.</span>
          </div>
          <div class="print-kpi-card">
            <span class="kpi-label">Urlaubstage / Krank:</span>
            <span class="kpi-val">${stats.vacationUsed} Tg. / ${stats.sickDays} Tg.</span>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 10%;">Datum</th>
              <th style="width: 6%;">Tag</th>
              <th style="width: 16%;">Status</th>
              <th style="width: 8%;">Beginn</th>
              <th style="width: 8%;">Pause</th>
              <th style="width: 8%;">Ende</th>
              <th style="width: 8%;" class="text-right">Ist (h)</th>
              <th style="width: 8%;" class="text-right">Soll (h)</th>
              <th style="width: 8%;" class="text-right">Saldo (h)</th>
              <th style="width: 20%;">Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="print-sum-row">
              <td colspan="6"><strong>MONATSSUMMEN</strong></td>
              <td class="text-right"><strong>${stats.totalActual.toFixed(2).replace('.', ',')} h</strong></td>
              <td class="text-right"><strong>${stats.totalTarget.toFixed(2).replace('.', ',')} h</strong></td>
              <td class="text-right"><strong>${balanceSign} h</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="print-signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Datum, Unterschrift Arbeitnehmer/in</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Datum, Unterschrift Vorgesetzte/r</p>
          </div>
        </div>
      </div>
    `;
  }

  static printReport(year, monthIndex, entries, settings, holidays) {
    const reportHtml = this.generatePrintableHtml(year, monthIndex, entries, settings, holidays);
    
    let printContainer = document.getElementById('print-area');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'print-area';
      printContainer.className = 'print-only';
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = reportHtml;

    window.print();
  }

  static triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

if (typeof window !== 'undefined') {
  window.Exporter = Exporter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Exporter };
}
