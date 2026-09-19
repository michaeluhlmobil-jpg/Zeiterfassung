/**
 * app.js
 * Hauptanwendungslogik, Event-Handling, UI-State und View-Wechsel.
 */

class App {
  constructor() {
    this.StorageManager = window.StorageManager;
    this.TimeCalculator = window.TimeCalculator;
    this.CalendarView = window.CalendarView;
    this.Exporter = window.Exporter;
    this.GeminiAssistant = window.GeminiAssistant;

    this.settings = this.StorageManager.getSettings();
    this.entries = this.StorageManager.getEntries();
    
    // Aktiver Anzeigezustand
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.currentWeek = this.CalendarView.getISOWeekNumber(now);
    this.holidays = this.TimeCalculator.getHolidays(this.currentYear, this.settings.state);

    this.currentView = 'dashboard';
    this.editingDate = null;
    this.deferredPrompt = null; // Für PWA Installation

    this.init();
  }

  init() {
    this.applyTheme(this.settings.theme);
    this.bindEvents();
    this.populateSettingsForm();
    this.updateAllViews();
    this.registerServiceWorker();
  }

  /* -------------------------------------------------------------
     Service Worker & PWA
  ------------------------------------------------------------- */
  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('ServiceWorker registriert:', reg.scope))
        .catch(err => console.log('ServiceWorker Registrierung:', err));
    }

    // PWA Install-Prompt abfangen
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.style.display = 'inline-flex';
    });
  }

  /* -------------------------------------------------------------
     Theme Management
  ------------------------------------------------------------- */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    this.settings.theme = next;
    this.StorageManager.saveSettings({ theme: next });
    this.applyTheme(next);
  }

  /* -------------------------------------------------------------
     Event Binding
  ------------------------------------------------------------- */
  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = btn.getAttribute('data-view-target');
        this.switchView(targetView);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // PWA Install Button
    const pwaBtn = document.getElementById('pwa-install-btn');
    if (pwaBtn) {
      pwaBtn.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`PWA Installation gewählt: ${outcome}`);
          this.deferredPrompt = null;
          pwaBtn.style.display = 'none';
        }
      });
    }

    // Kalender Navigation
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      this.changeMonth(-1);
    });
    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      this.changeMonth(1);
    });
    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.holidays = this.TimeCalculator.getHolidays(this.currentYear, this.settings.state);
      this.updateCalendarView();
    });

    // Wochen Navigation
    document.getElementById('week-prev-btn')?.addEventListener('click', () => {
      this.changeWeek(-1);
    });
    document.getElementById('week-next-btn')?.addEventListener('click', () => {
      this.changeWeek(1);
    });
    document.getElementById('week-today-btn')?.addEventListener('click', () => {
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentWeek = this.CalendarView.getISOWeekNumber(now);
      this.updateWeekView();
    });

    // Schnell-Aktionen Dashboard
    document.getElementById('quick-add-today-btn')?.addEventListener('click', () => {
      this.openEntryModal(this.TimeCalculator.formatDate(new Date()));
    });
    document.getElementById('gemini-open-modal-btn')?.addEventListener('click', () => {
      this.openAiModal();
    });

    // Zeiterfassungs-Modal
    document.getElementById('entry-modal-close')?.addEventListener('click', () => this.closeEntryModal());
    document.getElementById('entry-modal-cancel')?.addEventListener('click', () => this.closeEntryModal());
    document.getElementById('entry-form')?.addEventListener('submit', (e) => this.handleSaveEntry(e));
    document.getElementById('entry-delete-btn')?.addEventListener('click', () => this.handleDeleteEntry());

    // Status Wechsel im Modal
    document.getElementById('entry-status')?.addEventListener('change', (e) => {
      this.handleStatusChange(e.target.value);
    });

    // Live-Berechnung bei Zeiteingabe
    ['entry-start-time', 'entry-end-time', 'entry-break'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updateModalLiveCalc());
    });

    // KI-Modal
    document.getElementById('ai-modal-close')?.addEventListener('click', () => this.closeAiModal());
    document.getElementById('ai-modal-cancel')?.addEventListener('click', () => this.closeAiModal());
    document.getElementById('ai-submit-btn')?.addEventListener('click', () => this.handleAiParse());

    // Einstellungen Speichern
    document.getElementById('settings-form')?.addEventListener('submit', (e) => this.handleSaveSettings(e));
    
    // Vorlagen für Wochenarbeitszeit
    document.getElementById('preset-5x8')?.addEventListener('click', () => this.applyWorktimePreset([8, 8, 8, 8, 8, 0, 0]));
    document.getElementById('preset-mo-do')?.addEventListener('click', () => this.applyWorktimePreset([8.5, 8.5, 8.5, 8.5, 6, 0, 0]));
    document.getElementById('preset-35h')?.addEventListener('click', () => this.applyWorktimePreset([7, 7, 7, 7, 7, 0, 0]));

    // Exporte
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
      const year = parseInt(document.getElementById('report-year').value, 10);
      const month = parseInt(document.getElementById('report-month').value, 10);
      this.Exporter.printReport(year, month, this.entries, this.settings, this.holidays);
    });
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      const year = parseInt(document.getElementById('report-year').value, 10);
      const month = parseInt(document.getElementById('report-month').value, 10);
      this.Exporter.exportMonthCsv(year, month, this.entries, this.settings, this.holidays);
    });

    // Backup & Restore
    document.getElementById('backup-download-btn')?.addEventListener('click', () => {
      const json = this.StorageManager.createBackup();
      const blob = new Blob([json], { type: 'application/json' });
      this.Exporter.triggerDownload(blob, `Zeiterfassung_Backup_${this.TimeCalculator.formatDate(new Date())}.json`);
    });
    document.getElementById('restore-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = this.StorageManager.restoreBackup(event.target.result);
        if (result.success) {
          alert('Backup erfolgreich wiederhergestellt!');
          this.settings = this.StorageManager.getSettings();
          this.entries = this.StorageManager.getEntries();
          this.populateSettingsForm();
          this.updateAllViews();
        } else {
          alert('Fehler beim Wiederherstellen: ' + result.error);
        }
      };
      reader.readAsText(file);
    });

    // Delegiertes Event für Kalender-Zellen Klick
    document.getElementById('calendar-container')?.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-day-cell');
      if (cell) {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) this.openEntryModal(dateStr);
      }
    });

    // Delegiertes Event für Bearbeiten-Buttons in der Wochenansicht
    document.getElementById('week-view-container')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.edit-day-btn');
      if (btn) {
        const dateStr = btn.getAttribute('data-date');
        if (dateStr) this.openEntryModal(dateStr);
      }
    });
  }

  /* -------------------------------------------------------------
     View Navigation
  ------------------------------------------------------------- */
  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active-view', panel.id === `view-${viewName}`);
    });

    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view-target') === viewName);
    });

    this.updateAllViews();
  }

  /* -------------------------------------------------------------
     Kalender & Wochen Nav
  ------------------------------------------------------------- */
  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    }
    this.holidays = this.TimeCalculator.getHolidays(this.currentYear, this.settings.state);
    this.updateCalendarView();
  }

  changeWeek(delta) {
    this.currentWeek += delta;
    if (this.currentWeek < 1) {
      this.currentWeek = 52;
      this.currentYear -= 1;
    } else if (this.currentWeek > 52) {
      this.currentWeek = 1;
      this.currentYear += 1;
    }
    this.updateWeekView();
  }

  /* -------------------------------------------------------------
     Views Aktualisieren
  ------------------------------------------------------------- */
  updateAllViews() {
    this.updateDashboard();
    this.updateCalendarView();
    this.updateWeekView();
    this.updateReportsView();
  }

  updateDashboard() {
    let totalBalance = Number(this.settings.initialOvertimeHours) || 0;
    let vacationDaysUsedTotal = 0;
    let sickDaysTotal = 0;

    let curMonthActual = 0;
    let curMonthTarget = 0;

    const now = new Date();
    const curYearStr = String(now.getFullYear());
    const curMonthStr = String(now.getMonth() + 1).padStart(2, '0');

    Object.keys(this.entries).forEach(dateStr => {
      const entry = this.entries[dateStr];
      const entryYear = new Date(dateStr + 'T12:00:00').getFullYear();
      const holidaysForYear = this.TimeCalculator.getHolidays(entryYear, this.settings.state);
      const calc = this.TimeCalculator.calculateDay(entry, this.settings, holidaysForYear);

      totalBalance += calc.balanceHours;

      if (dateStr.startsWith(curYearStr)) {
        vacationDaysUsedTotal += calc.vacationDaysUsed;
        if (calc.status === 'krank') sickDaysTotal += 1;
      }

      if (dateStr.startsWith(`${curYearStr}-${curMonthStr}`)) {
        curMonthActual += calc.actualHours;
        curMonthTarget += calc.targetHours;
      }
    });

    const saldoEl = document.getElementById('kpi-total-balance');
    if (saldoEl) {
      saldoEl.textContent = this.TimeCalculator.formatHoursWithSign(totalBalance);
      saldoEl.className = `kpi-value ${totalBalance >= 0 ? 'text-positive' : 'text-negative'}`;
    }

    const totalVacationEntitlement = (Number(this.settings.annualVacationDays) || 0) + (Number(this.settings.carryoverVacationDays) || 0);
    const vacationRemaining = Math.max(0, totalVacationEntitlement - vacationDaysUsedTotal);
    const vacationEl = document.getElementById('kpi-vacation-remaining');
    if (vacationEl) {
      vacationEl.textContent = `${vacationRemaining.toFixed(1).replace('.', ',')} / ${totalVacationEntitlement.toFixed(1).replace('.', ',')} Tage`;
    }

    const curMonthHoursEl = document.getElementById('kpi-month-hours');
    if (curMonthHoursEl) {
      curMonthHoursEl.textContent = `${curMonthActual.toFixed(1).replace('.', ',')} Std.`;
    }

    const sickDaysEl = document.getElementById('kpi-sick-days');
    if (sickDaysEl) {
      sickDaysEl.textContent = `${sickDaysTotal} Tage`;
    }

    this.renderRecentEntries();
  }

  renderRecentEntries() {
    const container = document.getElementById('recent-entries-list');
    if (!container) return;

    const dates = Object.keys(this.entries).sort().reverse().slice(0, 5);
    if (dates.length === 0) {
      container.innerHTML = `<p class="empty-state" style="color: var(--text-muted); font-size: 0.9rem;">Noch keine Buchungen vorhanden. Klicke auf "Heute erfassen" oder wähle einen Tag im Kalender!</p>`;
      return;
    }

    let html = '<div class="recent-list">';
    dates.forEach(dateStr => {
      const raw = this.entries[dateStr];
      const calc = this.TimeCalculator.calculateDay(raw, this.settings, this.holidays);
      const balanceSign = calc.balanceHours >= 0 ? `+${calc.balanceHours.toFixed(1)}` : `${calc.balanceHours.toFixed(1)}`;
      const balanceClass = calc.balanceHours >= 0 ? 'text-positive' : 'text-negative';

      let statusBadgeClass = 'chip-work';
      if (calc.status === 'urlaub' || calc.status === 'halber_urlaub') statusBadgeClass = 'chip-urlaub';
      else if (calc.status === 'fza') statusBadgeClass = 'chip-fza';
      else if (calc.status === 'krank') statusBadgeClass = 'chip-krank';
      else if (calc.status === 'feiertag') statusBadgeClass = 'chip-holiday';

      html += `
        <div class="recent-item">
          <div class="recent-date-col">
            <span class="recent-date">${dateStr.split('-').reverse().join('.')}</span>
            <span class="status-chip ${statusBadgeClass}">${calc.status.toUpperCase()}</span>
          </div>
          <div class="recent-times-col">
            ${calc.status === 'arbeit' ? `${calc.startTime || '-'} - ${calc.endTime || '-'} (${calc.breakMinutes}m Pause)` : (calc.note || 'Ganztägig')}
          </div>
          <div class="recent-hours-col">
            <strong>${calc.actualHours.toFixed(1)}h</strong>
            <span class="${balanceClass}">(${balanceSign}h)</span>
          </div>
          <button class="btn btn-sm btn-outline edit-day-btn" data-date="${dateStr}">✏️</button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  updateCalendarView() {
    const titleEl = document.getElementById('calendar-month-title');
    if (titleEl) {
      titleEl.textContent = `${this.CalendarView.MONTHS_LONG[this.currentMonth]} ${this.currentYear}`;
    }

    const container = document.getElementById('calendar-container');
    if (container) {
      container.innerHTML = this.CalendarView.renderMonthGrid(
        this.currentYear,
        this.currentMonth,
        this.entries,
        this.settings,
        this.holidays
      );
    }
  }

  updateWeekView() {
    const titleEl = document.getElementById('week-title');
    if (titleEl) {
      titleEl.textContent = `Kalenderwoche ${this.currentWeek} / ${this.currentYear}`;
    }

    const container = document.getElementById('week-view-container');
    if (container) {
      container.innerHTML = this.CalendarView.renderWeekView(
        this.currentYear,
        this.currentWeek,
        this.entries,
        this.settings,
        this.holidays
      );
    }
  }

  updateReportsView() {
    const reportMonthSelect = document.getElementById('report-month');
    const reportYearInput = document.getElementById('report-year');
    if (reportMonthSelect && !reportMonthSelect.dataset.initialized) {
      reportMonthSelect.innerHTML = this.CalendarView.MONTHS_LONG.map((name, i) =>
        `<option value="${i}" ${i === this.currentMonth ? 'selected' : ''}>${name}</option>`
      ).join('');
      reportMonthSelect.dataset.initialized = "true";
    }
    if (reportYearInput && !reportYearInput.value) {
      reportYearInput.value = this.currentYear;
    }
  }

  /* -------------------------------------------------------------
     Zeiterfassungs-Modal
  ------------------------------------------------------------- */
  openEntryModal(dateStr) {
    this.editingDate = dateStr;
    const modal = document.getElementById('entry-modal');
    const titleEl = document.getElementById('entry-modal-title');
    const deleteBtn = document.getElementById('entry-delete-btn');

    const raw = this.entries[dateStr] || {
      date: dateStr,
      status: this.holidays[dateStr] ? 'feiertag' : 'arbeit',
      startTime: this.settings.defaultStartTime || '08:00',
      endTime: this.settings.defaultEndTime || '16:30',
      breakMinutes: this.settings.defaultBreakMinutes || 30,
      note: ''
    };

    const isExisting = !!this.entries[dateStr];
    deleteBtn.style.display = isExisting ? 'inline-block' : 'none';

    document.getElementById('entry-date').value = dateStr;
    document.getElementById('entry-status').value = raw.status || 'arbeit';
    document.getElementById('entry-start-time').value = raw.startTime || this.settings.defaultStartTime || '08:00';
    document.getElementById('entry-end-time').value = raw.endTime || this.settings.defaultEndTime || '16:30';
    document.getElementById('entry-break').value = raw.breakMinutes !== undefined ? raw.breakMinutes : (this.settings.defaultBreakMinutes || 30);
    document.getElementById('entry-note').value = raw.note || '';

    const formattedDate = dateStr.split('-').reverse().join('.');
    titleEl.textContent = `Zeiterfassung: ${formattedDate}`;

    this.handleStatusChange(raw.status || 'arbeit');
    this.updateModalLiveCalc();

    modal.classList.add('active');
  }

  closeEntryModal() {
    document.getElementById('entry-modal')?.classList.remove('active');
    this.editingDate = null;
  }

  handleStatusChange(status) {
    const workFields = document.getElementById('work-time-fields');
    if (!workFields) return;
    if (status === 'arbeit' || status === 'halber_urlaub') {
      workFields.style.display = 'block';
    } else {
      workFields.style.display = 'none';
    }
    this.updateModalLiveCalc();
  }

  updateModalLiveCalc() {
    const status = document.getElementById('entry-status').value;
    const dateStr = document.getElementById('entry-date').value;
    const startTime = document.getElementById('entry-start-time').value;
    const endTime = document.getElementById('entry-end-time').value;
    const breakMinutes = parseInt(document.getElementById('entry-break').value, 10) || 0;

    const dummyEntry = {
      date: dateStr,
      status,
      startTime,
      endTime,
      breakMinutes
    };

    const calc = this.TimeCalculator.calculateDay(dummyEntry, this.settings, this.holidays);
    const liveBox = document.getElementById('entry-live-calc');
    const warningBox = document.getElementById('entry-pause-warning');

    if (liveBox) {
      const balanceSign = calc.balanceHours >= 0 ? `+${calc.balanceHours.toFixed(2)}` : calc.balanceHours.toFixed(2);
      const balanceClass = calc.balanceHours >= 0 ? 'text-positive' : 'text-negative';
      liveBox.innerHTML = `
        <span>Ist: <strong>${calc.actualHours.toFixed(2)}h</strong></span> |
        <span>Soll: <strong>${calc.targetHours.toFixed(2)}h</strong></span> |
        <span>Saldo: <strong class="${balanceClass}">${balanceSign}h</strong></span>
      `;
    }

    if (warningBox) {
      if (calc.pauseWarning && status === 'arbeit') {
        warningBox.textContent = calc.pauseWarning;
        warningBox.style.display = 'block';
      } else {
        warningBox.style.display = 'none';
      }
    }
  }

  handleSaveEntry(e) {
    e.preventDefault();
    const dateStr = document.getElementById('entry-date').value;
    const status = document.getElementById('entry-status').value;
    const startTime = document.getElementById('entry-start-time').value;
    const endTime = document.getElementById('entry-end-time').value;
    const breakMinutes = parseInt(document.getElementById('entry-break').value, 10) || 0;
    const note = document.getElementById('entry-note').value;

    const entry = {
      date: dateStr,
      status,
      startTime: (status === 'arbeit' || status === 'halber_urlaub') ? startTime : null,
      endTime: (status === 'arbeit' || status === 'halber_urlaub') ? endTime : null,
      breakMinutes: (status === 'arbeit' || status === 'halber_urlaub') ? breakMinutes : 0,
      note
    };

    this.StorageManager.saveEntry(entry);
    this.entries = this.StorageManager.getEntries();
    this.closeEntryModal();
    this.updateAllViews();
  }

  handleDeleteEntry() {
    if (!this.editingDate) return;
    if (confirm(`Möchtest du den Eintrag für den ${this.editingDate.split('-').reverse().join('.')} wirklich löschen?`)) {
      this.StorageManager.deleteEntry(this.editingDate);
      this.entries = this.StorageManager.getEntries();
      this.closeEntryModal();
      this.updateAllViews();
    }
  }

  /* -------------------------------------------------------------
     Gemini KI Schnelleingabe Modal
  ------------------------------------------------------------- */
  openAiModal() {
    document.getElementById('ai-modal')?.classList.add('active');
    document.getElementById('ai-prompt-input').value = '';
    document.getElementById('ai-result-preview').style.display = 'none';
  }

  closeAiModal() {
    document.getElementById('ai-modal')?.classList.remove('active');
  }

  async handleAiParse() {
    const input = document.getElementById('ai-prompt-input').value.trim();
    if (!input) return;

    const submitBtn = document.getElementById('ai-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Analysiere...';

    try {
      const parsed = await this.GeminiAssistant.parseWorkEntry(input, this.settings.geminiApiKey);
      console.log('KI Parsed Result:', parsed);

      this.closeAiModal();
      this.openEntryModal(parsed.date);

      if (parsed.status) document.getElementById('entry-status').value = parsed.status;
      if (parsed.startTime) document.getElementById('entry-start-time').value = parsed.startTime;
      if (parsed.endTime) document.getElementById('entry-end-time').value = parsed.endTime;
      if (parsed.breakMinutes !== undefined) document.getElementById('entry-break').value = parsed.breakMinutes;
      if (parsed.note) document.getElementById('entry-note').value = parsed.note;

      this.handleStatusChange(parsed.status || 'arbeit');
      this.updateModalLiveCalc();

    } catch (err) {
      alert('Fehler bei der KI-Analyse: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '⚡ Zeit erfassen';
    }
  }

  /* -------------------------------------------------------------
     Einstellungen
  ------------------------------------------------------------- */
  populateSettingsForm() {
    document.getElementById('setting-name').value = this.settings.employeeName || '';
    document.getElementById('setting-emp-num').value = this.settings.employeeNumber || '';
    document.getElementById('setting-weekly-hours').value = this.settings.weeklyHours || 40;
    
    const targetHours = this.settings.targetHoursPerDay || [8, 8, 8, 8, 8, 0, 0];
    const dayIds = ['target-mo', 'target-di', 'target-mi', 'target-do', 'target-fr', 'target-sa', 'target-so'];
    dayIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.value = targetHours[idx] !== undefined ? targetHours[idx] : 0;
    });

    document.getElementById('setting-default-start').value = this.settings.defaultStartTime || '08:00';
    document.getElementById('setting-default-end').value = this.settings.defaultEndTime || '16:30';
    document.getElementById('setting-default-break').value = this.settings.defaultBreakMinutes || 30;
    document.getElementById('setting-vacation').value = this.settings.annualVacationDays || 30;
    document.getElementById('setting-vacation-carryover').value = this.settings.carryoverVacationDays || 0;
    document.getElementById('setting-initial-overtime').value = this.settings.initialOvertimeHours || 0;
    document.getElementById('setting-state').value = this.settings.state || 'BY';
    document.getElementById('setting-gemini-key').value = this.settings.geminiApiKey || '';
  }

  applyWorktimePreset(hoursArray) {
    const dayIds = ['target-mo', 'target-di', 'target-mi', 'target-do', 'target-fr', 'target-sa', 'target-so'];
    dayIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.value = hoursArray[idx];
    });
    const sum = hoursArray.reduce((a, b) => a + b, 0);
    document.getElementById('setting-weekly-hours').value = sum;
  }

  handleSaveSettings(e) {
    e.preventDefault();

    const dayIds = ['target-mo', 'target-di', 'target-mi', 'target-do', 'target-fr', 'target-sa', 'target-so'];
    const targetHoursPerDay = dayIds.map(id => parseFloat(document.getElementById(id).value) || 0);

    const updated = {
      employeeName: document.getElementById('setting-name').value.trim(),
      employeeNumber: document.getElementById('setting-emp-num').value.trim(),
      weeklyHours: parseFloat(document.getElementById('setting-weekly-hours').value) || 40,
      targetHoursPerDay,
      defaultStartTime: document.getElementById('setting-default-start').value,
      defaultEndTime: document.getElementById('setting-default-end').value,
      defaultBreakMinutes: parseInt(document.getElementById('setting-default-break').value, 10) || 30,
      annualVacationDays: parseFloat(document.getElementById('setting-vacation').value) || 30,
      carryoverVacationDays: parseFloat(document.getElementById('setting-vacation-carryover').value) || 0,
      initialOvertimeHours: parseFloat(document.getElementById('setting-initial-overtime').value) || 0,
      state: document.getElementById('setting-state').value,
      geminiApiKey: document.getElementById('setting-gemini-key').value.trim()
    };

    this.StorageManager.saveSettings(updated);
    this.settings = this.StorageManager.getSettings();
    this.holidays = this.TimeCalculator.getHolidays(this.currentYear, this.settings.state);

    alert('Einstellungen erfolgreich gespeichert!');
    this.updateAllViews();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.timeTrackApp = new App();
});
