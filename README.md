<div align="center">

<img src="docs/img/title.png" alt="International Superstar Soccer Deluxe Editor" width="520">

# ISS Deluxe Editor

**Change player names and in-game texts of the SNES classic *International Superstar Soccer Deluxe* –
in your browser or on the command line, and share your changes as a patch.**

![Python](https://img.shields.io/badge/python-3.9%2B-3776AB?logo=python&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-none-success)
![Platform](https://img.shields.io/badge/ROM-SNES%20LoROM-8A2BE2)
![License](https://img.shields.io/badge/license-MIT-blue)

[Deutsch](README.de.md) · [Web app](#-web-app-no-install) · [Quick start](#-quick-start) · [Known limits](#-known-limits)

</div>

---

## 🌐 Web app (no install)

Prefer clicking over typing commands? Open the **web editor** in your browser, drop in your ROM,
edit names and texts and download the changed ROM (or a patch):

**https://rofldark.github.io/iss-deluxe-editor/**

- 🔒 **Your ROM never leaves your browser.** There is no server: the page is plain HTML + JavaScript and
  is not even allowed to make network requests (its Content-Security-Policy says `connect-src 'none'`).
- ✏️ Edit player names (36 teams × 20 players), menu texts and the running texts (help pages, training and
  scenario descriptions) with live length checks, search and an "only changed" filter.
- 💾 Save the changed ROM, a `.bps` / `.ips` patch, or your edits as a small JSON file. Edits are also
  remembered in your browser between visits (only the texts, never the ROM).
- 🇩🇪 / 🇬🇧 Interface in German and English.

The web app and the command line tool produce **byte-identical** ROMs (checked by the tests).
You can also run the web app locally: open `docs/index.html` in a browser.

> The page is published with GitHub Pages from the `docs/` folder.

## ✨ Features

- 📤 **Dump** player names, menu texts and running texts into plain text files
- ✏️ **Edit** them in any editor, one line per text, with the allowed length shown
- 📥 **Insert** them back into a *copy* of your ROM (the original is never touched)
- 🩹 **Patch maker**: create `.bps` / `.ips` patches to share your changes **without sharing the ROM**
- ✅ **Safe**: strict length and character checks, nothing is written on errors, the SNES checksum is fixed automatically
- 🧪 Unit tests, no dependencies – just Python

## 🚀 Quick start

You need **Python 3.9+** and **your own ROM**: *International Superstar Soccer Deluxe (Europe)*
(2 MB, CRC32 `CBA724BA`). This repository does **not** contain any ROM. Please don't ask for one.

```bash
# 0. Is it the right ROM?
python issd_text.py info   "ISS Deluxe.sfc"

# 1. Dump all texts into ./texte
python issd_text.py dump   "ISS Deluxe.sfc" texte

# 2. Edit texte/2_player_names.txt, texte/1_texts.txt, texte/3_prose.txt

# 3. Dry run - only checks that everything fits
python issd_text.py verify "ISS Deluxe.sfc" texte

# 4. Write the changed ROM (a copy!)
python issd_text.py insert "ISS Deluxe.sfc" texte "ISS Deluxe - fixed.sfc"

# 5. Optional: make a shareable patch
python issd_text.py patch  "ISS Deluxe.sfc" "ISS Deluxe - fixed.sfc" my-changes.bps
```

Patches can be applied by anyone with their own ROM – with this tool
(`python issd_text.py apply ROM my-changes.bps OUT.sfc`) or any BPS/IPS patcher
such as *Floating IPS* or *RomPatcher.js* (in the browser).

## 📝 The text files

Each line looks like this: `offset  max=N |text|`. Change only the text between the bars.

| File | Content | Rule |
|---|---|---|
| `2_player_names.txt` | 720 player names (36 teams × 20) | at most 8 characters, padded with spaces automatically |
| `1_texts.txt` | menu and message texts | length must stay **exactly** the same (count the spaces) |
| `3_prose.txt` | running texts in the small font: controller help pages, training and scenario descriptions, one line per entry | length of every line must stay **exactly** the same; sentences may continue in the next line |

- Allowed characters: letters (no umlauts), digits and `. ! ? ' - :` plus space (small font: `. , - ' /`).
  Other bytes can be written as `\xNN`.
- Neighbouring texts are stored without a separator, which is why the length cannot change.
- A second `dump` into the same folder overwrites your edits – copy them away first.

## ⚠️ Known limits

- The team names in the selection menu and many menus are graphics and cannot be changed as text.
- The team names in the dump comments are guessed from the player names.
- Umlauts are not mapped yet.
- Digits and punctuation of the small font are inferred, not verified with a glyph test.

## 🧪 Tests

```bash
ISSD_ROM="ISS Deluxe.sfc" python -m unittest discover tests     # Python tool
ISSD_ROM="ISS Deluxe.sfc" node --test tests/core.test.js        # web app core vs. Python tool
```

(PowerShell: `$env:ISSD_ROM="ISS Deluxe.sfc"`.) The Node test builds the same changes with both
implementations and requires the ROMs to be byte-identical.

## ⚖️ Legal

This project contains **only tools and documentation**, no ROM, no game text dumps and no
copyrighted game data. You need your own legally obtained copy of the game.
*International Superstar Soccer Deluxe* is a trademark/copyright of its respective owners;
this is a fan project and not affiliated with them. The title image is original artwork inspired by the
game's style, not a copy of it. Patches you create contain only the differences to the original ROM.

## 📄 License

[MIT](LICENSE) – for the tools and documentation in this repository.
