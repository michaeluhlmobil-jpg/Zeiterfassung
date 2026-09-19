/**
 * storage.js
 * Verwaltung von Einstellungen und Zeiterfassungsdaten in localStorage.
 */

const SETTINGS_KEY = 'timetrack_settings_v1';
const ENTRIES_KEY = 'timetrack_entries_v1';

const DEFAULT_SETTINGS = {
  employeeName: '',
  employeeNumber: '',
  weeklyHours: 40.0,
  // Mo, Di, Mi, Do, Fr, Sa, So
  targetHoursPerDay: [8.0, 8.0, 8.0, 8.0, 8.0, 0.0, 0.0],
  defaultBreakMinutes: 30,
  defaultStartTime: '08:00',
  defaultEndTime: '16:30',
  annualVacationDays: 30.0,
  carryoverVacationDays: 0.0,
  initialOvertimeHours: 0.0,
  state: 'BY',
  geminiApiKey: '',
  theme: 'auto'
};

class StorageManager {
  static getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error('Fehler beim Laden der Einstellungen:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings) {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern der Einstellungen:', e);
      return false;
    }
  }

  static getEntries() {
    try {
      const raw = localStorage.getItem(ENTRIES_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.error('Fehler beim Laden der Einträge:', e);
      return {};
    }
  }

  static getEntry(dateStr) {
    const entries = this.getEntries();
    return entries[dateStr] || null;
  }

  static saveEntry(entry) {
    try {
      if (!entry || !entry.date) return false;
      const entries = this.getEntries();
      entries[entry.date] = {
        ...entry,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern des Eintrags:', e);
      return false;
    }
  }

  static deleteEntry(dateStr) {
    try {
      const entries = this.getEntries();
      if (entries[dateStr]) {
        delete entries[dateStr];
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      }
      return true;
    } catch (e) {
      console.error('Fehler beim Löschen des Eintrags:', e);
      return false;
    }
  }

  static createBackup() {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      entries: this.getEntries()
    };
    return JSON.stringify(backupData, null, 2);
  }

  static restoreBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || (!parsed.settings && !parsed.entries)) {
        throw new Error('Ungültiges Backup-Format.');
      }
      if (parsed.settings) {
        this.saveSettings(parsed.settings);
      }
      if (parsed.entries) {
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(parsed.entries));
      }
      return { success: true };
    } catch (e) {
      console.error('Fehler beim Importieren:', e);
      return { success: false, error: e.message };
    }
  }

  static clearAllEntries() {
    localStorage.removeItem(ENTRIES_KEY);
  }
}

if (typeof window !== 'undefined') {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, DEFAULT_SETTINGS };
}
