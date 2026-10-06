<div align="center">

<img src="docs/img/title.png" alt="International Superstar Soccer Deluxe Editor" width="520">

# ISS Deluxe Editor

**Spielernamen und Spieltexte des SNES-Klassikers *International Superstar Soccer Deluxe* ändern –
im Browser oder in der Kommandozeile, und die Änderungen als Patch weitergeben.**

![Python](https://img.shields.io/badge/python-3.9%2B-3776AB?logo=python&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-none-success)
![Platform](https://img.shields.io/badge/ROM-SNES%20LoROM-8A2BE2)
![License](https://img.shields.io/badge/license-MIT-blue)

[English](README.md) · [Web-App](#-web-app-ohne-installation) · [Schnellstart](#-schnellstart) · [Einschränkungen](#-bekannte-einschränkungen)

</div>

---

## 🌐 Web-App (ohne Installation)

Lieber klicken als Befehle tippen? Öffne den **Web-Editor** im Browser, ziehe deine ROM hinein,
bearbeite Namen und Texte und lade die geänderte ROM (oder einen Patch) herunter:

**https://rofldark.github.io/iss-deluxe-editor/**

- 🔒 **Deine ROM verlässt den Browser nie.** Es gibt keinen Server: Die Seite besteht aus HTML + JavaScript und darf
  nicht einmal Netzwerkanfragen stellen (Content-Security-Policy `connect-src 'none'`).
- ✏️ Spielernamen (36 Teams × 20 Spieler), Menütexte und Fließtexte (Hilfeseiten, Training, Szenarien) mit Live-Längenprüfung,
  Suche und Filter „Nur geänderte“.
- 💾 Geänderte ROM, `.bps`-/`.ips`-Patch oder die Änderungen als kleine JSON-Datei speichern. Änderungen merkt sich der
  Browser zwischen den Besuchen (nur die Texte, nie die ROM).
- 🇩🇪 / 🇬🇧 Oberfläche auf Deutsch und Englisch.

Web-App und Kommandozeilen-Tool erzeugen **byte-identische** ROMs (durch Tests geprüft).
Die Web-App läuft auch lokal: `docs/index.html` im Browser öffnen.

> Die Seite wird mit GitHub Pages aus dem Ordner `docs/` veröffentlicht.

## ✨ Funktionen

- 📤 **Auslesen** von Spielernamen, Menü- und Fließtexten in einfache Textdateien
- ✏️ **Bearbeiten** in jedem Editor, eine Zeile pro Text, mit angezeigter erlaubter Länge
- 📥 **Einsetzen** in eine *Kopie* der ROM (das Original bleibt unberührt)
- 🩹 **Patch-Erzeugung**: `.bps`-/`.ips`-Patches zum Weitergeben **ohne die ROM weiterzugeben**
- ✅ **Sicher**: strenge Längen- und Zeichenprüfung, bei Fehlern wird nichts geschrieben, SNES-Prüfsumme wird korrigiert
- 🧪 Tests, keine Abhängigkeiten – nur Python

## 🚀 Schnellstart

Du brauchst **Python 3.9+** und **deine eigene ROM**: *International Superstar Soccer Deluxe (Europe)*
(2 MB, CRC32 `CBA724BA`). Dieses Repository enthält **keine** ROM.

```bash
python issd_text.py info   "ISS Deluxe.sfc"                          # richtige ROM?
python issd_text.py dump   "ISS Deluxe.sfc" texte                    # Texte nach texte/ auslesen
#   texte/2_player_names.txt, texte/1_texts.txt, texte/3_prose.txt bearbeiten
python issd_text.py verify "ISS Deluxe.sfc" texte                    # prüfen, schreibt nichts
python issd_text.py insert "ISS Deluxe.sfc" texte "ISS Deluxe - fixed.sfc"   # in eine KOPIE einsetzen
python issd_text.py patch  "ISS Deluxe.sfc" "ISS Deluxe - fixed.sfc" my-changes.bps   # Patch zum Weitergeben
python issd_text.py apply  "ISS Deluxe.sfc" my-changes.bps ziel.sfc  # Patch anwenden
```

## 📝 Die Textdateien

Eine Zeile pro Text: `offset  max=N |text|`. Nur den Text zwischen den senkrechten Strichen ändern.

| Datei | Inhalt | Regel |
|---|---|---|
| `2_player_names.txt` | 720 Spielernamen (36 Teams × 20) | höchstens 8 Zeichen, wird mit Leerzeichen aufgefüllt |
| `1_texts.txt` | Menü- und Meldungstexte | Länge muss **exakt** gleich bleiben (Leerzeichen mitzählen) |
| `3_prose.txt` | Fließtexte in der kleinen Schrift: Steuerungs-Hilfeseiten, Trainings- und Szenario-Beschreibungen, eine Zeile pro Eintrag | Länge jeder Zeile muss **exakt** gleich bleiben; Sätze können in der nächsten Zeile weitergehen |

- Erlaubt: Buchstaben (keine Umlaute), Ziffern und `. ! ? ' - :` sowie Leerzeichen (kleine Schrift: `. , - ' /`).
  Andere Bytes als `\xNN`.
- Benachbarte Texte liegen ohne Trennzeichen aneinander, deshalb kann sich die Länge nicht ändern.
- Ein zweites `dump` in denselben Ordner überschreibt deine Änderungen – vorher wegkopieren.

## ⚠️ Bekannte Einschränkungen

- Teamnamen im Auswahlmenü und viele Menüs sind Grafik und lassen sich nicht als Text ändern.
- Die Teamnamen in den Kommentaren der Dump-Dateien sind aus den Spielernamen geraten.
- Umlaute sind noch nicht ermittelt.
- Ziffern und Satzzeichen der kleinen Schrift sind abgeleitet, nicht per Glyph-Test belegt.

## 🧪 Tests

```bash
ISSD_ROM="ISS Deluxe.sfc" python -m unittest discover tests     # Python-Tool
ISSD_ROM="ISS Deluxe.sfc" node --test tests/core.test.js        # Web-Core gegen Python-Tool
```

(PowerShell: `$env:ISSD_ROM="ISS Deluxe.sfc"`.)

## ⚖️ Rechtliches

Dieses Projekt enthält **nur Werkzeuge und Dokumentation**: keine ROM, keine Textdumps und keine urheberrechtlich
geschützten Spieldaten. Du brauchst deine eigene, legal erworbene Kopie des Spiels.
*International Superstar Soccer Deluxe* ist Marke/Eigentum der jeweiligen Rechteinhaber; dies ist ein Fan-Projekt ohne
Verbindung zu ihnen. Patches enthalten nur die Unterschiede zur Original-ROM.

## 📄 Lizenz

[MIT](LICENSE) – für die Werkzeuge und die Dokumentation in diesem Repository.
