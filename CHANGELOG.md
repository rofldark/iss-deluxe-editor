# Changelog

Alle nennenswerten Änderungen an diesem Projekt. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased]

### Added
- Fließtexte in der kleinen Schrift (zweite Zeichentabelle): 17 Steuerungs-Hilfeseiten, 9 Trainingstexte und
  12 Szenario-Beschreibungen, zeilenweise bearbeitbar (`3_prose.txt`, Reiter „Fließtexte“ in der Web-App), in Python-Tool,
  `docs/core.js` und Tests
- Web-App „ISS Deluxe Text Studio“ in `docs/` (HTML/CSS/JS ohne Build, für GitHub Pages): ROM im Browser laden,
  Spielernamen (nach Team) und Texte bearbeiten, korrigierte ROM bzw. `.bps`/`.ips` speichern, Änderungen als JSON
  sichern/laden, Autosave im Browser, Oberfläche Deutsch/Englisch. Die ROM verlässt den Browser nie.
- `docs/core.js` als JavaScript-Port der Tool-Logik; `tests/core.test.js` vergleicht ihn byte-genau mit `issd_text.py`
- `issd_text.py` mit den Befehlen `info`, `dump`, `verify`, `insert`, `patch` und `apply`
- Auslesen und Ändern von 720 Spielernamen (36 Teams × 20, je 8 Zeichen) und 61 Textblöcken
  (Menüs, Meldungen, Szenario-Liste) über die ermittelte Zeichentabelle der ROM
- Erzeugen und Anwenden von `.bps`- und `.ips`-Patches
- Prüfung der ROM per CRC32/SHA-1, automatische Korrektur der SNES-Prüfsumme
- Tests (`tests/test_tool.py`), README, `.gitignore`
