/**
 * time-calculator.js
 * Logik für Zeiterfassung, Soll/Ist-Vergleich, Überstunden und Feiertage.
 */

class TimeCalculator {
  /**
   * Berechnet das Osterdatum für ein gegebenes Jahr (Gaußsche Osterformel).
   */
  static getEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  /**
   * Gibt alle gesetzlichen Feiertage für ein Jahr und ein Bundesland zurück.
   */
  static getHolidays(year, state = 'BY') {
    const holidays = {};
    const addHoliday = (date, name) => {
      const key = this.formatDate(date);
      holidays[key] = name;
    };

    // Feste Feiertage
    addHoliday(new Date(year, 0, 1), 'Neujahr');
    addHoliday(new Date(year, 4, 1), 'Tag der Arbeit');
    addHoliday(new Date(year, 9, 3), 'Tag der Deutschen Einheit');
    addHoliday(new Date(year, 11, 25), '1. Weihnachtstag');
    addHoliday(new Date(year, 11, 26), '2. Weihnachtstag');

    // Heilige Drei Könige (BW, BY, ST)
    if (['BW', 'BY', 'ST'].includes(state)) {
      addHoliday(new Date(year, 0, 6), 'Heilige Drei Könige');
    }

    // Internationaler Frauentag (BE, MV)
    if (['BE', 'MV'].includes(state)) {
      addHoliday(new Date(year, 2, 8), 'Internationaler Frauentag');
    }

    // Bewegliche Feiertage basierend auf Ostern
    const easterSunday = this.getEasterSunday(year);
    const addDays = (baseDate, days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d;
    };

    addHoliday(addDays(easterSunday, -2), 'Karfreitag');
    addHoliday(easterSunday, 'Ostersonntag');
    addHoliday(addDays(easterSunday, 1), 'Ostermontag');
    addHoliday(addDays(easterSunday, 39), 'Christi Himmelfahrt');
    addHoliday(addDays(easterSunday, 49), 'Pfingstsonntag');
    addHoliday(addDays(easterSunday, 50), 'Pfingstmontag');

    // Fronleichnam (BW, BY, HE, NW, RP, SL)
    if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(state)) {
      addHoliday(addDays(easterSunday, 60), 'Fronleichnam');
    }

    // Mariä Himmelfahrt (SL, BY*)
    if (state === 'SL' || state === 'BY') {
      addHoliday(new Date(year, 7, 15), 'Mariä Himmelfahrt');
    }

    // Reformationstag (BB, HB, HH, MV, NI, SN, ST, SH, TH)
    if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(state)) {
      addHoliday(new Date(year, 9, 31), 'Reformationstag');
    }

    // Allerheiligen (BW, BY, NW, RP, SL)
    if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(state)) {
      addHoliday(new Date(year, 10, 1), 'Allerheiligen');
    }

    // Buß- und Bettag (SN)
    if (state === 'SN') {
      const nov23 = new Date(year, 10, 23);
      const dayOfWeek = nov23.getDay();
      const diff = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
      const bussBettag = new Date(year, 10, 23 - diff);
      addHoliday(bussBettag, 'Buß- und Bettag');
    }

    return holidays;
  }

  /**
   * Konvertiert 'HH:MM' String in Minuten seit Mitternacht.
   */
  static timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * Konvertiert Minuten in 'HH:MM' oder Dezimalstunden.
   */
  static minutesToTimeStr(minutes) {
    const isNegative = minutes < 0;
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = Math.round(absMin % 60);
    const sign = isNegative ? '-' : '';
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Formatiert Minuten als Vorzeichen-Stundenanzeige, z.B. "+1,50 Std." oder "-0,75 Std."
   */
  static formatHoursWithSign(hours, decimals = 2) {
    const sign = hours > 0 ? '+' : (hours < 0 ? '-' : '±');
    return `${sign}${Math.abs(hours).toFixed(decimals).replace('.', ',')} Std.`;
  }

  /**
   * Formatiert Date-Objekt als 'YYYY-MM-DD'.
   */
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Gibt den deutschen Wochentag-Index zurück (0 = Montag, ..., 6 = Sonntag).
   */
  static getWeekdayIndex(date) {
    const jsDay = new Date(date).getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * Berechnet für einen Buchungseintrag die Ist-Arbeitszeit und das Saldo.
   */
  static calculateDay(entry, settings, holidays = {}) {
    const dateStr = entry.date;
    const date = new Date(dateStr + 'T12:00:00');
    const weekdayIdx = this.getWeekdayIndex(date);
    
    // Soll-Stunden für diesen Wochentag aus Einstellungen
    const targetHours = (settings.targetHoursPerDay && settings.targetHoursPerDay[weekdayIdx] !== undefined)
      ? Number(settings.targetHoursPerDay[weekdayIdx])
      : 8.0;

    const holidayName = holidays[dateStr] || null;
    const status = entry.status || (holidayName ? 'feiertag' : 'arbeit');

    let actualHours = 0;
    let balanceHours = 0;
    let vacationDaysUsed = 0;
    let isWorkDay = targetHours > 0;

    switch (status) {
      case 'arbeit': {
        if (entry.startTime && entry.endTime) {
          const startMin = this.timeToMinutes(entry.startTime);
          const endMin = this.timeToMinutes(entry.endTime);
          let breakMin = Number(entry.breakMinutes) || 0;

          let diffMin = endMin - startMin;
          if (diffMin < 0) diffMin += 24 * 60; // Nachtschicht

          // Gesetzlicher Mindestpausen-Hinweis (ArbZG §4):
          const grossHours = diffMin / 60;
          let pauseWarning = null;
          if (grossHours > 9 && breakMin < 45) {
            pauseWarning = 'Gesetzl. Hinweis: Ab 9 Std. Arbeitszeit sind mind. 45 Min. Pause vorgeschrieben.';
          } else if (grossHours > 6 && breakMin < 30) {
            pauseWarning = 'Gesetzl. Hinweis: Ab 6 Std. Arbeitszeit sind mind. 30 Min. Pause vorgeschrieben.';
          }

          const netMin = Math.max(0, diffMin - breakMin);
          actualHours = Math.round((netMin / 60) * 100) / 100;
          balanceHours = Math.round((actualHours - targetHours) * 100) / 100;

          return {
            ...entry,
            targetHours,
            actualHours,
            balanceHours,
            vacationDaysUsed: 0,
            pauseWarning,
            holidayName
          };
        } else {
          actualHours = 0;
          balanceHours = isWorkDay ? -targetHours : 0;
          return {
            ...entry,
            targetHours,
            actualHours,
            balanceHours,
            vacationDaysUsed: 0,
            holidayName
          };
        }
      }

      case 'urlaub': {
        actualHours = targetHours;
        balanceHours = 0;
        vacationDaysUsed = isWorkDay ? 1.0 : 0;
        return {
          ...entry,
          targetHours,
          actualHours,
          balanceHours,
          vacationDaysUsed,
          holidayName
        };
      }

      case 'halber_urlaub': {
        const halfTarget = targetHours / 2;
        let workedMin = 0;
        if (entry.startTime && entry.endTime) {
          const sMin = this.timeToMinutes(entry.startTime);
          const eMin = this.timeToMinutes(entry.endTime);
          const bMin = Number(entry.breakMinutes) || 0;
          workedMin = Math.max(0, (eMin - sMin) - bMin);
        }
        const workedHours = Math.round((workedMin / 60) * 100) / 100;
        actualHours = workedHours + halfTarget;
        balanceHours = Math.round((actualHours - targetHours) * 100) / 100;
        vacationDaysUsed = 0.5;

        return {
          ...entry,
          targetHours,
          actualHours,
          balanceHours,
          vacationDaysUsed,
          holidayName
        };
      }

      case 'fza': {
        actualHours = 0;
        balanceHours = -targetHours;
        vacationDaysUsed = 0;
        return {
          ...entry,
          targetHours,
          actualHours,
          balanceHours,
          vacationDaysUsed,
          holidayName
        };
      }

      case 'krank': {
        actualHours = targetHours;
        balanceHours = 0;
        vacationDaysUsed = 0;
        return {
          ...entry,
          targetHours,
          actualHours,
          balanceHours,
          vacationDaysUsed,
          holidayName
        };
      }

      case 'feiertag': {
        actualHours = targetHours;
        balanceHours = 0;
        vacationDaysUsed = 0;
        return {
          ...entry,
          targetHours,
          actualHours,
          balanceHours,
          vacationDaysUsed,
          holidayName: holidayName || 'Gesetzlicher Feiertag'
        };
      }

      case 'frei':
      default: {
        actualHours = 0;
        balanceHours = 0;
        vacationDaysUsed = 0;
        return {
          ...entry,
          targetHours: 0,
          actualHours: 0,
          balanceHours: 0,
          vacationDaysUsed: 0,
          holidayName
        };
      }
    }
  }

  /**
   * Berechnet die Gesamtsummen für eine Liste von Tagen.
   */
  static aggregateStats(calculatedDays) {
    let totalTarget = 0;
    let totalActual = 0;
    let totalBalance = 0;
    let vacationUsed = 0;
    let sickDays = 0;
    let fzaDays = 0;

    calculatedDays.forEach(day => {
      totalTarget += (day.targetHours || 0);
      totalActual += (day.actualHours || 0);
      totalBalance += (day.balanceHours || 0);
      vacationUsed += (day.vacationDaysUsed || 0);

      if (day.status === 'krank') sickDays += 1;
      if (day.status === 'fza') fzaDays += 1;
    });

    return {
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
      vacationUsed: Math.round(vacationUsed * 10) / 10,
      sickDays,
      fzaDays
    };
  }
}

// Unterstütze sowohl direkten Browser-Scriptaufruf als auch Module
if (typeof window !== 'undefined') {
  window.TimeCalculator = TimeCalculator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimeCalculator };
}
