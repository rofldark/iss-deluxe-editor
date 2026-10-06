<div align="center">

<img src="docs/img/title.png" alt="International Superstar Soccer Deluxe" width="420">

# ISS Deluxe Text Studio

**SNES Name- und Text-Editor für *International Superstar Soccer Deluxe* (Super Nintendo):
Spielernamen, Menü- und Fließtexte ändern, als ROM oder `.bps`/`.ips`-Patch speichern.**

[Web-App](#web-app-ohne-installation) · [Kommandozeile](#nutzung) · [Einschränkungen](#bekannte-einschränkungen)

</div>

Werkzeug zum Auslesen, Ändern und Einsetzen der Texte und Spielernamen von
**International Superstar Soccer Deluxe (Europe)** (ISS Deluxe, SNES, 2 MB, LoROM). Aufbau und Bedienung
entsprechen dem Schwesterprojekt `KickOff3-Texte`.

## Web-App (ohne Installation)
`docs/index.html` im Browser öffnen (oder die Veröffentlichung über GitHub Pages nutzen), die eigene ROM hineinziehen,
Namen und Texte bearbeiten und die geänderte ROM oder einen `.bps`/`.ips`-Patch herunterladen. Die ROM verlässt den
Browser nie (die Seite darf keine Netzwerkanfragen stellen). Web-App und Python-Tool erzeugen byte-identische ROMs.

## Voraussetzungen (Kommandozeile)
- Python 3.9 oder neuer, keine weiteren Pakete
- Die eigene ROM `International Superstar Soccer Deluxe (Europe).sfc`
  (CRC32 `CBA724BA`; mit `info` prüfen). Es gehört **keine** ROM zum Projekt.

## Nutzung
```bash
python issd_text.py info   "ROM.sfc"                       # richtige ROM?
python issd_text.py dump   "ROM.sfc" texte                 # Texte nach texte/ auslesen
#   texte/2_player_names.txt und texte/1_texts.txt bearbeiten
python issd_text.py verify "ROM.sfc" texte                 # prüfen, schreibt nichts
python issd_text.py insert "ROM.sfc" texte build/neu.sfc   # in eine KOPIE einsetzen
python issd_text.py patch  "ROM.sfc" build/neu.sfc build/neu.bps   # Patch zum Weitergeben
python issd_text.py apply  "ROM.sfc" build/neu.bps ziel.sfc        # Patch anwenden
```

Das Original wird nie verändert; die SNES-Prüfsumme wird automatisch korrigiert.

## Dateiformat
Eine Zeile pro Text: `offset  max=N |text|`. Nur den Text zwischen den senkrechten Strichen ändern.

- **Spielernamen** (`2_player_names.txt`): 36 Teams × 20 Spieler, höchstens 8 Zeichen; kürzere Namen
  werden mit Leerzeichen aufgefüllt. Die Teamnamen in den Kommentaren sind aus den Namen erraten.
- **Fließtexte** (`3_prose.txt`): Steuerungs-Hilfeseiten, Trainings- und Szenario-Beschreibungen in der kleinen Schrift,
  eine Zeile pro Eintrag (das Spiel zeigt 4–6 Zeilen auf einmal). Die Länge jeder Zeile muss **exakt** gleich bleiben;
  Sätze gehen in der nächsten Zeile weiter. Erlaubt: Buchstaben, Ziffern und `. , - ' /`.
- **Texte** (`1_texts.txt`): Menü- und Meldungstexte mit fester Breite. Die Länge muss **exakt**
  gleich bleiben (Leerzeichen mitzählen), weil die Texte ohne Trenner aneinanderliegen.
- Erlaubte Zeichen: Buchstaben (ohne Umlaute), Ziffern, `. ! ? ' - :` und Leerzeichen.
  Andere Bytes als `\xNN`.

## Bekannte Einschränkungen
- Teamnamen im Auswahlmenü und viele Menüs sind Grafik und lassen sich nicht über Text ändern.
- Umlaute sind (noch) nicht ermittelt.
- Der Test im Emulator steht noch aus.

## Tests
```bash
ISSD_ROM="Pfad/zur/ROM.sfc" python -m unittest discover tests
ISSD_ROM="Pfad/zur/ROM.sfc" node --test tests/core.test.js     # Web-Core gegen Python-Tool
```
