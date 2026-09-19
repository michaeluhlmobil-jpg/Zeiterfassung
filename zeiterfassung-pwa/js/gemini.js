/**
 * gemini.js
 * Intelligente Zeiterfassung per KI (Google Gemini API) mit robustem lokalem Fallback-Parser.
 */

class GeminiAssistant {
  static async parseWorkEntry(promptText, apiKey, referenceDateStr = null) {
    const todayStr = referenceDateStr || window.TimeCalculator.formatDate(new Date());

    if (apiKey && apiKey.trim().length > 10) {
      try {
        return await this.callGeminiApi(promptText, apiKey.trim(), todayStr);
      } catch (err) {
        console.warn('Gemini API Aufruf fehlgeschlagen, wechsle auf lokalen Parser:', err);
        return this.parseLocally(promptText, todayStr);
      }
    } else {
      return this.parseLocally(promptText, todayStr);
    }
  }

  static async callGeminiApi(promptText, apiKey, todayStr) {
    const systemInstruction = `Du bist ein intelligenter Assistent für eine Zeiterfassungs-App. 
Das heutige Datum ist ${todayStr}.
Der Benutzer gibt in natürlicher deutscher Sprache ein, was er gearbeitet hat (z. B. "Gestern von 8:15 bis 17:00 gearbeitet, 45 Min Pause, Notiz: Kundentermin" oder "Nächste Woche Montag Urlaub").
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Codeblöcke oder sonstige Erklärungen:
{
  "date": "YYYY-MM-DD",
  "status": "arbeit" | "urlaub" | "halber_urlaub" | "fza" | "krank" | "feiertag",
  "startTime": "HH:MM" (oder null),
  "endTime": "HH:MM" (oder null),
  "breakMinutes": number (z.B. 30, oder 0 wenn keine),
  "note": string (z. B. Tätigkeit oder null)
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: `Benutzereingabe: "${promptText}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Fehler (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Keine Antwort von Gemini erhalten.');
    }

    const cleanJson = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);
    return {
      ...result,
      source: 'gemini'
    };
  }

  static parseLocally(text, todayStr) {
    const lower = text.toLowerCase();
    const refDate = new Date(todayStr + 'T12:00:00');
    let targetDate = new Date(refDate);

    // 1. Datum ermitteln
    if (lower.includes('vorgestern')) {
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (lower.includes('gestern')) {
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (lower.includes('morgen')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      const weekdays = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
      weekdays.forEach((dayName, idx) => {
        if (lower.includes(dayName)) {
          const currentDay = refDate.getDay();
          let diff = idx - currentDay;
          if (diff > 0 && lower.includes('letzten')) diff -= 7;
          targetDate.setDate(targetDate.getDate() + diff);
        }
      });
    }

    const date = window.TimeCalculator.formatDate(targetDate);

    // 2. Status ermitteln
    let status = 'arbeit';
    if (lower.includes('krank')) {
      status = 'krank';
    } else if (lower.includes('urlaub')) {
      status = lower.includes('halb') ? 'halber_urlaub' : 'urlaub';
    } else if (lower.includes('fza') || lower.includes('überstundenabbau') || lower.includes('zeitausgleich')) {
      status = 'fza';
    } else if (lower.includes('feiertag')) {
      status = 'feiertag';
    }

    // 3. Zeiten ermitteln
    let startTime = null;
    let endTime = null;

    const timeRangeRegex = /(?:von\s+)?(\d{1,2}(?::\d{2})?)\s*(?:bis|-|–)\s*(\d{1,2}(?::\d{2})?)/i;
    const timeMatch = text.match(timeRangeRegex);

    if (timeMatch) {
      startTime = this.formatTimeStr(timeMatch[1]);
      endTime = this.formatTimeStr(timeMatch[2]);
    }

    // 4. Pause ermitteln
    let breakMinutes = 30;
    const breakRegex = /(?:pause|pause:\s*)?(\d+)\s*(?:min|minuten|m\b)/i;
    const breakMatch = text.match(breakRegex);
    if (breakMatch) {
      breakMinutes = parseInt(breakMatch[1], 10);
    } else if (lower.includes('keine pause') || lower.includes('0 min') || lower.includes('ohne pause')) {
      breakMinutes = 0;
    } else if (lower.includes('stunde pause') || lower.includes('1h pause')) {
      breakMinutes = 60;
    }

    // 5. Notiz extrahieren
    let note = '';
    const noteMatch = text.match(/(?:notiz|tätigkeit|thema|projekt|bemerkung):\s*(.+)$/i);
    if (noteMatch) {
      note = noteMatch[1].trim();
    }

    return {
      date,
      status,
      startTime: status === 'arbeit' ? (startTime || '08:00') : null,
      endTime: status === 'arbeit' ? (endTime || '16:30') : null,
      breakMinutes: status === 'arbeit' ? breakMinutes : 0,
      note,
      source: 'local_parser'
    };
  }

  static formatTimeStr(str) {
    if (!str) return null;
    let s = str.trim();
    if (!s.includes(':')) {
      s = `${s}:00`;
    }
    const [h, m] = s.split(':');
    return `${String(h).padStart(2, '0')}:${String(m || '00').padStart(2, '0')}`;
  }
}

if (typeof window !== 'undefined') {
  window.GeminiAssistant = GeminiAssistant;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiAssistant };
}
