# ⏱️ Zeiterfassung Pro (PWA)

Eine moderne, intuitive und datenschutzfreundliche **Progressive Web App (PWA)** zur Zeiterfassung, Überstundenverwaltung, Urlaubsplanung und Erstellung offizieller Stundenzettel (PDF & CSV).

Entwickelt für Smartphones (Android & iOS) und PC / Desktop – ohne Serverkosten, direkt lauffähig und per Link mit Freunden und Kollegen teilbar!

---

## ✨ Hauptfunktionen

* **⚖️ Intelligentes Arbeitszeitmodell & Überstunden:**
  * Wöchentliche Gesamtarbeitszeit (z. B. 40h oder 35h).
  * **Individuelle Soll-Stunden pro Wochentag** (z. B. Montag bis Donnerstag je 8,5 Std., Freitag 6,0 Std. – oder komplett frei konfigurierbar).
  * Automatische Berechnung von Plus- und Minusstunden im Live-Abgleich.
* **🌴 Urlaubs- & Abwesenheitsverwaltung:**
  * Erfassung von **Urlaub** (ganzer oder halber Tag mit Resturlaubszähler).
  * **Überstundenabbau / Freizeitausgleich (FZA)**: Zieht die Soll-Stunden direkt vom Überstundenkonto ab.
  * **Krankheitstage** & **Feiertage** (mit automatischer Feiertagsberechnung für alle 16 deutschen Bundesländer).
* **📅 Kalender- & Wochenansicht:**
  * Farbcodierter Monatskalender (Grün = Arbeit, Gelb = Urlaub, Lila = FZA, Rot = Krank, Blau = Feiertag).
  * Detaillierte Wochenansicht mit Soll-, Ist- und Saldovergleich pro Tag sowie Wochensaldo.
* **📄 Druckfertiger Stundennachweis (PDF) & CSV:**
  * **PDF-Stundenzettel:** Formatiert nach DIN A4 mit Firmen-/Mitarbeiterdaten, Monatstabelle, Summenzeile und Unterschriftenfeldern für Arbeitnehmer und Vorgesetzten.
  * **CSV-Export:** Perfekt formatiert für Microsoft Excel (mit UTF-8 BOM und Semikolon-Trennung).
* **🔒 100 % Datenschutz & Privatsphäre:**
  * Alle Arbeitszeiten und Buchungen werden ausschließlich **lokal im Browser des jeweiligen Nutzers** (`localStorage`) gespeichert. Es werden keine Daten an fremde Server übertragen!
  * Einfache Datensicherung (Backup & Wiederherstellung) per JSON-Datei.
* **✨ Optionale Google Gemini KI-Schnelleingabe:**
  * Schnelleingabe in natürlicher Sprache (z. B. *„Gestern von 8:15 bis 16:45 gearbeitet, 45 Min Pause, Notiz: Kundenmeeting“*).
  * Funktioniert mit optionalem Gemini API-Key oder mit dem integrierten Offline-Parser.

---

## 🚀 1. Lokales Ausprobieren am PC

Du kannst die App sofort ohne jede Installation testen:

1. Navigiere in den Ordner `zeiterfassung-pwa`.
2. Mache einen **Doppelklick auf `index.html`** (oder öffne die Datei in Google Chrome, Microsoft Edge oder Firefox).
3. Die App startet sofort im Browser!

---

## 🌐 2. Kostenlos online stellen über GitHub Pages (In 3 Minuten)

Damit du die App auf deinem Smartphone nutzen und den Link mit Bekannten teilen kannst:

1. **Neues Repository auf GitHub anlegen:**
   * Gehe auf [GitHub](https://github.com) und erstelle ein neues, öffentliches Repository (z. B. `zeiterfassung`).
2. **Dateien hochladen:**
   * Lade alle Dateien aus diesem Ordner (`index.html`, `manifest.json`, `sw.js`, sowie die Unterordner `css/`, `js/` und `icons/`) in dein neues Repository hoch.
3. **GitHub Pages aktivieren:**
   * Klicke im Repository oben auf **Settings** (Einstellungen).
   * Klicke in der linken Seitenleiste auf **Pages**.
   * Wähle unter *Build and deployment* -> *Source* den Branch **`main`** und den Ordner **`/ (root)`** aus.
   * Klicke auf **Save**.
4. **Fertig!**
   * Nach ca. 1 Minute ist deine App unter `https://<dein-github-name>.github.io/zeiterfassung/` für jeden weltweit erreichbar – komplett kostenlos und ohne Serverlimit!

---

## 📱 3. Als App auf dem Android-Smartphone installieren

1. Öffne den Link deiner App (z. B. `https://<dein-name>.github.io/zeiterfassung/`) in **Google Chrome** auf deinem Android-Handy.
2. Es erscheint entweder automatisch ein Banner **„App installieren“** oder der Button oben in der App.
3. Alternativ: Tippe in Chrome oben rechts auf das Drei-Punkte-Menü (⋮) und wähle **„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“**.
4. Jetzt hast du die Zeiterfassungs-App mit eigenem Icon auf deinem Startbildschirm – sie startet im Vollbild ohne Browser-Leiste und funktioniert sogar offline im Flugmodus!

---

## 🛠️ Dateistruktur

```
zeiterfassung-pwa/
├── index.html              # Haupt-Oberfläche (Dashboard, Kalender, Woche, Berichte, Settings)
├── manifest.json           # PWA Web-App-Manifest (Homescreen-Icon, Vollbild-Einstellung)
├── sw.js                   # Service Worker (Offline-Speicherung)
├── css/
│   └── style.css           # Modernes Design (Light/Dark Mode, Mobile Bottom Nav, Drucklayout)
├── js/
│   ├── app.js              # Anwendungssteuerung, View-Wechsel, State-Management
│   ├── storage.js          # LocalStorage Datenhaltung, Backup & Wiederherstellung
│   ├── time-calculator.js  # Arbeitszeit-, Überstunden- und Feiertagsberechnung
│   ├── calendar.js         # Rendering Monatskalender & Wochenansicht
│   ├── exporter.js         # PDF-Stundenzettel (Druck) & CSV-Export für Excel
│   └── gemini.js           # Intelligente KI-Schnelleingabe & lokaler Fallback-Parser
└── icons/
    ├── icon.svg            # Skalierbares App-Icon
    ├── icon-192.png        # Icon für Android Homescreen (192x192)
    └── icon-512.png        # Icon hochauflösend (512x512)
```
