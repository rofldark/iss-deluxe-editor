#!/usr/bin/env python3
"""Text dumper / inserter / patch maker for International Superstar Soccer Deluxe (SNES, Europe).

Commands:
  info   ROM                       check that the ROM is the expected version
  dump   ROM OUTDIR                extract texts and player names into editable .txt files
  verify ROM TEXTDIR               check that the edited texts fit (writes nothing)
  insert ROM TEXTDIR OUT           write the edited texts into a COPY of the ROM
  patch  ROM FIXED OUT.(bps|ips)   create a patch from an original and a fixed ROM
  apply  ROM PATCH OUT             apply a .bps/.ips patch

The original ROM is never modified. A 512-byte copier header is detected and
stripped automatically; all offsets below refer to the headerless ROM.
"""
import argparse
import glob
import hashlib
import os
import re
import struct
import sys
import zlib

# --- ROM layout (file offsets, headerless) -----------------------------------
EXPECTED_SIZE = 0x200000
EXPECTED_CRC32 = 0xCBA724BA     # International Superstar Soccer Deluxe (Europe)
EXPECTED_SHA1 = "abdbf30d0987aca99183c451b7b9567e2ff67980"
CHECKSUM_OFF = 0x7FDC           # LoROM header: complement (2) + checksum (2)

NAMES_START = 0x3818E           # player names: 8 chars, no terminator, 0x00 = space
NAME_LEN = 8
TEAMS, PLAYERS_PER_TEAM = 36, 20
NAMES_END = NAMES_START + TEAMS * PLAYERS_PER_TEAM * NAME_LEN
# Team order, guessed from the (nationality of the) player names.
TEAM_GUESS = (
    "Italy", "Holland", "England", "Norway", "Spain", "Ireland", "Portugal",
    "Denmark", "Germany", "France", "Belgium", "Sweden", "Romania", "Bulgaria",
    "Russia", "Switzerland", "Greece", "Croatia", "Austria", "Wales", "Scotland",
    "Northern Ireland", "Czech Rep.", "Poland", "Japan", "Korea", "Turkey",
    "Nigeria", "Cameroon", "Morocco", "Brazil", "Argentina", "Colombia", "Chile",
    "U.S.A.", "Mexico",
)

# Fixed-width texts: (offset, length). Neighbouring texts are often stored without
# any separator, so the length must stay exactly the same.
TEXT_BLOCKS = (
    (0x3C5CC, 18), (0x3C80D, 10), (0x3C871, 15), (0x3C880, 54),
    (0x3CA19, 41), (0x3CA53, 141), (0x3D738, 30), (0x3D758, 13),
    (0x3D767, 16), (0x3D88E, 16), (0x3D89E, 19), (0x3D8C0, 16),
    (0x3D918, 14), (0x3D926, 22), (0x3DA09, 16), (0x3DA19, 16),
    (0x3DA29, 16), (0x3DA39, 85), (0x3DB3E, 18), (0x3DB52, 18),
    (0x3DB66, 40), (0x3DB90, 36), (0x3DBB6, 32), (0x3DBD8, 34),
    (0x3DBFC, 36), (0x3DC22, 36), (0x3DC48, 54), (0x3DC80, 54),
    (0x3DCB8, 36), (0x3DD85, 45), (0x3DDE4, 19), (0x3DDFF, 20),
    (0x3DE44, 7), (0x3DE73, 18), (0x3DFB3, 17), (0x3E9E4, 13),
    (0x3E9F1, 4), (0x3EA05, 10), (0x3EA18, 10), (0x3EA2C, 11),
    (0x3EA3F, 11), (0x3ECAB, 12), (0x3EDB6, 20), (0x3EDD0, 11),
    (0x3EE37, 56), (0x3EE6F, 56), (0x3EEA7, 56), (0x3EEDF, 56),
    (0x3EF17, 56), (0x3EF4F, 56), (0x3EF87, 56), (0x3EFBF, 56),
    (0x3EFF7, 56), (0x3F02F, 56), (0x3F067, 56), (0x3F09F, 56),
    (0x3F8D8, 36), (0x3F8FE, 18), (0x3F912, 98), (0x3F98C, 21),
    (0x3F9B6, 27),
)

# Running texts in the small font (second character set): (offset, length, line width, group).
# They are stored as fixed-width lines without separators, so they are edited line by line and the
# length of every line must stay exactly the same. Scenario/help/training blocks are shown in the
# game 4-6 lines at a time.
PROSE_AREAS = (
    (0x3CB27, 56, 28, "help"), (0x3CB60, 112, 28, "help"),
    (0x3CBD1, 112, 28, "help"), (0x3CC42, 364, 28, "help"),
    (0x3CDAF, 140, 28, "help"), (0x3CE3C, 140, 28, "help"),
    (0x3CEC9, 224, 28, "help"), (0x3CFAA, 140, 28, "help"),
    (0x3D037, 140, 28, "help"), (0x3D0C4, 140, 28, "help"),
    (0x3D151, 140, 28, "help"), (0x3D1DE, 112, 28, "help"),
    (0x3D24F, 140, 28, "help"), (0x3D2E8, 588, 28, "help"),
    (0x3D535, 168, 28, "help"), (0x3D5DE, 224, 28, "help"),
    (0x3D6BF, 84, 28, "help"), (0x3DE85, 160, 22, "train"),
    (0x3DFE4, 176, 28, "train"), (0x3E0C4, 63, 28, "train"),
    (0x3E118, 52, 28, "train"), (0x3E1A4, 125, 28, "train"),
    (0x3E284, 147, 28, "train"), (0x3E364, 356, 28, "train"),
    (0x3E804, 69, 24, "train"), (0x3E87C, 144, 24, "train"),
    (0x3F129, 156, 26, "scenario"), (0x3F1C5, 156, 26, "scenario"),
    (0x3F261, 156, 26, "scenario"), (0x3F2FD, 156, 26, "scenario"),
    (0x3F399, 156, 26, "scenario"), (0x3F435, 156, 26, "scenario"),
    (0x3F4D1, 156, 26, "scenario"), (0x3F56D, 156, 26, "scenario"),
    (0x3F609, 156, 26, "scenario"), (0x3F6A5, 156, 26, "scenario"),
    (0x3F741, 156, 26, "scenario"), (0x3F7DD, 156, 26, "scenario"),
)
GROUP_TITLES = {"help": "Controller help pages", "train": "Training / prompts", "scenario": "Scenario descriptions"}


def prose_rows():
    """[(offset, length, group, area number within the group, area start)] for every line."""
    rows, counter = [], {}
    for start, n, width, group in PROSE_AREAS:
        counter[group] = counter.get(group, 0) + 1
        for k in range(0, n, width):
            rows.append((start + k, min(width, n - k), group, counter[group], start))
    return rows


PATTERNS = {"texts": "1_texts*.txt", "names": "2_player_names*.txt", "prose": "3_prose*.txt"}
LINE_RE = re.compile(r"^([0-9a-fA-F]{6})\s+max=(\d+)\s+\|(.*)\|\s*$")

# --- character set (game byte <-> text) ---------------------------------------
CHARSET = {0x00: " ", 0x52: "!", 0x54: ".", 0x57: "-", 0x59: "?", 0x5A: "'", 0x5C: ":"}
CHARSET.update({0x5E + i: str(i) for i in range(10)})
CHARSET.update({0x68 + i: chr(65 + i) for i in range(26)})   # A-Z
CHARSET.update({0x82 + i: chr(97 + i) for i in range(26)})   # a-z
ENCODE = {c: b for b, c in CHARSET.items()}

# Second character set (small font, running texts). Digits and punctuation are inferred from context.
CHARSET_B = {0x00: " ", 0x26: "-", 0x29: ".", 0x50: "'", 0x51: "/", 0x52: ","}
CHARSET_B.update({0x01 + i: str(i) for i in range(10)})
CHARSET_B.update({0x0B + i: chr(65 + i) for i in range(26)})   # A-Z
CHARSET_B.update({0x2A + i: chr(97 + i) for i in range(26)})   # a-z
ENCODE_B = {c: b for b, c in CHARSET_B.items()}


# --- helpers -----------------------------------------------------------------
def load_rom(path, quiet=False):
    """Return (headerless ROM as bytearray, copier header bytes)."""
    with open(path, "rb") as f:
        data = bytearray(f.read())
    hdr = len(data) % 1024
    if hdr == 512:
        if not quiet:
            print("Note: 512-byte copier header detected and skipped.")
        header, data = bytes(data[:512]), data[512:]
    elif hdr == 0:
        header = b""
    else:
        sys.exit(f"Unexpected file size: {len(data)} bytes")
    if not quiet and not is_expected_rom(data):
        print("WARNING: this is not the expected ROM (Europe, CRC32 "
              f"{EXPECTED_CRC32:08X}). Offsets may be wrong - run 'info' for details.")
    return data, header


def is_expected_rom(rom):
    return len(rom) == EXPECTED_SIZE and zlib.crc32(bytes(rom)) == EXPECTED_CRC32


def esc(raw, small=False):
    """Game bytes -> editable text. Unknown bytes become \\xNN."""
    table = CHARSET_B if small else CHARSET
    return "".join(table.get(b) or f"\\x{b:02x}" for b in raw)


def unesc(text, small=False):
    """Editable text -> game bytes."""
    encode = ENCODE_B if small else ENCODE
    allowed = "letters, digits and . , - ' / and space" if small else "letters, digits and . ! ? ' - : and space"
    out = bytearray()
    i = 0
    while i < len(text):
        c = text[i]
        if c == "\\":
            m = re.match(r"x([0-9a-fA-F]{2})", text[i + 1:i + 4])
            if not m:
                raise ValueError(f"invalid escape sequence near: {text[i:i+6]!r}")
            out.append(int(m.group(1), 16))
            i += 4
            continue
        if c not in encode:
            raise ValueError(
                f"character {c!r} is not in the game's character set ({allowed}). "
                f"Use \\xNN for raw bytes.")
        out.append(encode[c])
        i += 1
    return bytes(out)


def parse_file(path, small=False):
    """Return {offset: (max, bytes)}; validates every line."""
    items = {}
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    for n, line in enumerate(lines, 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = LINE_RE.match(line)
        if not m:
            sys.exit(f"{os.path.basename(path)}:{n}: cannot parse line: {line!r}")
        try:
            items[int(m.group(1), 16)] = (int(m.group(2)), unesc(m.group(3), small))
        except ValueError as e:
            sys.exit(f"{os.path.basename(path)}:{n}: {e}")
    return items


def write_lines(path, lines):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


# --- reading the ROM ---------------------------------------------------------
def text_items(rom):
    return [(o, n, bytes(rom[o:o + n])) for o, n in TEXT_BLOCKS]


def player_name(rom, off):
    return bytes(rom[off:off + NAME_LEN]).rstrip(b"\x00")


# --- dump --------------------------------------------------------------------
def cmd_dump(args):
    rom, _ = load_rom(args.rom)
    os.makedirs(args.outdir, exist_ok=True)
    common = [
        "# Format: <offset>  max=<allowed length> |text|",
        "# Only change the text between the vertical bars, never the offset or max.",
        r"# Characters: letters, digits and . ! ? ' - : and space. Raw bytes as \xNN.",
    ]
    for pat in PATTERNS.values():       # remove stale files so nothing is loaded twice
        for old in glob.glob(os.path.join(args.outdir, pat)):
            os.remove(old)

    lines = ["# Fixed-width texts. The length must stay EXACTLY the same",
             "# (count the spaces; neighbouring texts are stored without separator)."]
    lines += common + [""]
    for o, n, raw in text_items(rom):
        lines.append(f"{o:06x}  max={n:<3} |{esc(raw)}|")
    write_lines(os.path.join(args.outdir, "1_texts.txt"), lines)

    lines = [f"# Player names: {TEAMS} teams x {PLAYERS_PER_TEAM} players, max. {NAME_LEN} characters.",
             "# Shorter names are padded with spaces automatically.",
             "# Team names in the headers are guessed from the names - the game itself shows",
             "# them as graphics."] + common
    for t in range(TEAMS):
        lines += ["", f"# Team {t + 1:02d} ({TEAM_GUESS[t]}?)"]
        for k in range(PLAYERS_PER_TEAM):
            o = NAMES_START + (t * PLAYERS_PER_TEAM + k) * NAME_LEN
            lines.append(f"{o:06x}  max={NAME_LEN} |{esc(player_name(rom, o))}|")
    write_lines(os.path.join(args.outdir, "2_player_names.txt"), lines)

    lines = ["# Running texts in the small font, one line per entry (the game shows 4-6 lines at once).",
             "# The length of every line must stay EXACTLY the same (count the spaces); sentences",
             "# often continue in the next line and may start in the middle of a line.",
             r"# Characters: letters, digits and . , - ' / and space. Raw bytes as \xNN."]
    lines += common[:2] + [""]
    last = None
    for o, n, group, num, start in prose_rows():
        if start != last:
            width = next(w for s_, _, w, _ in PROSE_AREAS if s_ == start)
            lines += ["", f"# {GROUP_TITLES[group]} {num:02d} (line width {width})"]
            last = start
        lines.append(f"{o:06x}  max={n:<2} |{esc(bytes(rom[o:o + n]), small=True)}|")
    write_lines(os.path.join(args.outdir, "3_prose.txt"), lines)
    print(f"{len(TEXT_BLOCKS)} texts, {len(prose_rows())} text lines, "
          f"{TEAMS * PLAYERS_PER_TEAM} player names -> {args.outdir}")


# --- insert ------------------------------------------------------------------
def load_group(textdir, key, errors):
    merged = {}
    for p in sorted(glob.glob(os.path.join(textdir, PATTERNS[key]))):
        for off, val in parse_file(p, small=(key == "prose")).items():
            if off in merged:
                errors.append(f"{key}: offset {off:06x} appears in several files "
                              f"(last in {os.path.basename(p)})")
            merged[off] = val
    return merged


def build_changes(rom, textdir):
    changes, errors = {}, []

    known = dict(TEXT_BLOCKS)
    for off, (_, raw) in load_group(textdir, "texts", errors).items():
        if off not in known:
            errors.append(f"texts: offset {off:06x} is unknown (line changed?)")
        elif raw != bytes(rom[off:off + known[off]]):
            if len(raw) != known[off]:
                errors.append(f"texts {off:06x}: length {len(raw)}, must be exactly {known[off]}")
            else:
                changes[off] = raw

    rows = {o: n for o, n, *_ in prose_rows()}
    for off, (_, raw) in load_group(textdir, "prose", errors).items():
        if off not in rows:
            errors.append(f"prose: offset {off:06x} is unknown (line changed?)")
        elif raw != bytes(rom[off:off + rows[off]]):
            if len(raw) != rows[off]:
                errors.append(f"prose {off:06x}: length {len(raw)}, must be exactly {rows[off]}")
            else:
                changes[off] = raw

    valid = set(range(NAMES_START, NAMES_END, NAME_LEN))
    for off, (_, raw) in load_group(textdir, "names", errors).items():
        if off not in valid:
            errors.append(f"names: offset {off:06x} is unknown (line changed?)")
        elif len(raw) > NAME_LEN:
            errors.append(f"names {off:06x}: {len(raw)} characters, max. {NAME_LEN}")
        else:
            new = raw.ljust(NAME_LEN, b"\x00")
            if new != bytes(rom[off:off + NAME_LEN]):
                changes[off] = new
    return changes, errors


def fix_checksum(rom):
    rom[CHECKSUM_OFF:CHECKSUM_OFF + 4] = b"\x00\x00\xff\xff"
    s = sum(rom) & 0xFFFF
    rom[CHECKSUM_OFF:CHECKSUM_OFF + 4] = bytes(
        ((s ^ 0xFFFF) & 0xFF, (s ^ 0xFFFF) >> 8, s & 0xFF, s >> 8))


def apply_changes(rom, changes):
    out = bytearray(rom)
    for off, raw in changes.items():
        out[off:off + len(raw)] = raw
    fix_checksum(out)
    return out


def cmd_insert(args, write=True):
    rom, hdr = load_rom(args.rom)
    changes, errors = build_changes(rom, args.textdir)
    if errors:
        print("ERRORS - nothing written:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"{len(changes)} places changed.")
    if not write:
        print("Everything fits (check only, nothing written).")
        return
    if os.path.abspath(args.output) == os.path.abspath(args.rom):
        sys.exit("The output file must not be the original ROM.")
    out = apply_changes(rom, changes)
    with open(args.output, "wb") as f:
        f.write(hdr + bytes(out))
    print(f"Written: {args.output} (checksum updated)")


# --- patches (IPS / BPS) -----------------------------------------------------
def diff_runs(a, b):
    """Yield (start, end) of differing regions (a and b have the same length)."""
    i, n = 0, len(a)
    while i < n:
        if a[i] == b[i]:
            i += 1
            continue
        j = i
        while j < n and a[j] != b[j]:
            j += 1
        yield i, j
        i = j


def make_ips(src, dst):
    if len(src) != len(dst):
        sys.exit("IPS export needs two ROMs of the same size.")
    regions = []
    for s, e in diff_runs(src, dst):
        if regions and s - regions[-1][1] <= 5:       # merge close regions
            regions[-1][1] = e
        else:
            regions.append([s, e])
    out = bytearray(b"PATCH")
    for s, e in regions:
        while s < e:
            if s == 0x454F46:                          # would be mistaken for "EOF"
                s -= 1
            n = min(e - s, 0xFFFF)
            out += struct.pack(">I", s)[1:] + struct.pack(">H", n) + bytes(dst[s:s + n])
            s += n
    return bytes(out + b"EOF")


def bps_num(n):
    out = bytearray()
    while True:
        x = n & 0x7F
        n >>= 7
        if n == 0:
            out.append(0x80 | x)
            return bytes(out)
        out.append(x)
        n -= 1


def make_bps(src, dst):
    out = bytearray(b"BPS1")
    out += bps_num(len(src)) + bps_num(len(dst)) + bps_num(0)
    pos, n = 0, len(dst)
    while pos < n:
        same = pos < len(src) and src[pos] == dst[pos]
        end = pos
        while end < n and (end < len(src) and src[end] == dst[end]) == same:
            end += 1
        length = end - pos
        if same:
            out += bps_num(((length - 1) << 2) | 0)                         # SourceRead
        else:
            out += bps_num(((length - 1) << 2) | 1) + bytes(dst[pos:end])   # TargetRead
        pos = end
    out += struct.pack("<I", zlib.crc32(bytes(src)))
    out += struct.pack("<I", zlib.crc32(bytes(dst)))
    out += struct.pack("<I", zlib.crc32(bytes(out)))
    return bytes(out)


def apply_ips(src, patch):
    if patch[:5] != b"PATCH":
        sys.exit("Not an IPS patch.")
    out, i = bytearray(src), 5
    while patch[i:i + 3] != b"EOF":
        off = int.from_bytes(patch[i:i + 3], "big")
        size = int.from_bytes(patch[i + 3:i + 5], "big")
        i += 5
        if size == 0:                                          # RLE record
            rle = int.from_bytes(patch[i:i + 2], "big")
            data = patch[i + 2:i + 3] * rle
            i += 3
        else:
            data = patch[i:i + size]
            i += size
        if off + len(data) > len(out):
            out.extend(b"\x00" * (off + len(data) - len(out)))
        out[off:off + len(data)] = data
    return bytes(out)


def apply_bps(src, patch):
    if patch[:4] != b"BPS1":
        sys.exit("Not a BPS patch.")
    if zlib.crc32(patch[:-4]) != struct.unpack("<I", patch[-4:])[0]:
        sys.exit("Patch is damaged (checksum mismatch).")
    pos = 4

    def num():
        nonlocal pos
        data, shift = 0, 1
        while True:
            x = patch[pos]
            pos += 1
            data += (x & 0x7F) * shift
            if x & 0x80:
                return data
            shift <<= 7
            data += shift

    src_size, dst_size, meta = num(), num(), num()
    pos += meta
    if src_size != len(src) or zlib.crc32(src) != struct.unpack("<I", patch[-12:-8])[0]:
        sys.exit("Wrong source ROM for this patch (size or CRC32 differs).")
    out, end = bytearray(), len(patch) - 12
    src_rel = dst_rel = 0
    while pos < end:
        v = num()
        mode, length = v & 3, (v >> 2) + 1
        if mode == 0:
            out += src[len(out):len(out) + length]
        elif mode == 1:
            out += patch[pos:pos + length]
            pos += length
        else:
            d = num()
            off = (-1 if d & 1 else 1) * (d >> 1)
            if mode == 2:
                src_rel += off
                out += src[src_rel:src_rel + length]
                src_rel += length
            else:
                dst_rel += off
                for _ in range(length):
                    out.append(out[dst_rel])
                    dst_rel += 1
    if len(out) != dst_size or zlib.crc32(bytes(out)) != struct.unpack("<I", patch[-8:-4])[0]:
        sys.exit("Result does not match the patch checksum.")
    return bytes(out)


def cmd_patch(args):
    src, _ = load_rom(args.rom)
    dst, _ = load_rom(args.fixed, quiet=True)
    if args.output.lower().endswith(".ips"):
        data = make_ips(src, dst)
    elif args.output.lower().endswith(".bps"):
        data = make_bps(src, dst)
    else:
        sys.exit("Output file must end in .bps or .ips")
    with open(args.output, "wb") as f:
        f.write(data)
    changed = sum(e - s for s, e in diff_runs(src, dst)) if len(src) == len(dst) else "?"
    print(f"Patch written: {args.output} ({len(data)} bytes, {changed} bytes differ)")
    print(f"Patch is relative to the headerless ROM (CRC32 {zlib.crc32(bytes(src)):08X}).")


def cmd_apply(args):
    src, hdr = load_rom(args.rom)
    with open(args.patch, "rb") as f:
        patch = f.read()
    out = apply_ips(bytes(src), patch) if patch[:5] == b"PATCH" else apply_bps(bytes(src), patch)
    if os.path.abspath(args.output) == os.path.abspath(args.rom):
        sys.exit("The output file must not be the original ROM.")
    with open(args.output, "wb") as f:
        f.write(hdr + out)
    print(f"Written: {args.output}")


def cmd_info(args):
    rom, hdr = load_rom(args.rom, quiet=True)
    crc, sha1 = zlib.crc32(bytes(rom)), hashlib.sha1(bytes(rom)).hexdigest()
    print(f"File size : {len(rom) + len(hdr)} bytes"
          + (" (incl. 512-byte copier header)" if hdr else ""))
    print(f"CRC32     : {crc:08X}   expected {EXPECTED_CRC32:08X}")
    print(f"SHA-1     : {sha1}")
    print(f"            {EXPECTED_SHA1} (expected)")
    ok = is_expected_rom(rom) and sha1 == EXPECTED_SHA1
    print("Result    :", "OK - this is the expected ROM." if ok else
          "DIFFERENT ROM - the offsets in this tool will probably not match.")
    sys.exit(0 if ok else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawTextHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump")
    d.add_argument("rom")
    d.add_argument("outdir")
    i = sub.add_parser("insert")
    i.add_argument("rom")
    i.add_argument("textdir")
    i.add_argument("output")
    v = sub.add_parser("verify")
    v.add_argument("rom")
    v.add_argument("textdir")
    p = sub.add_parser("patch")
    p.add_argument("rom")
    p.add_argument("fixed")
    p.add_argument("output")
    a_ = sub.add_parser("apply")
    a_.add_argument("rom")
    a_.add_argument("patch")
    a_.add_argument("output")
    n = sub.add_parser("info")
    n.add_argument("rom")
    a = ap.parse_args()
    if a.cmd == "dump":
        cmd_dump(a)
    elif a.cmd == "insert":
        cmd_insert(a)
    elif a.cmd == "verify":
        cmd_insert(a, write=False)
    elif a.cmd == "patch":
        cmd_patch(a)
    elif a.cmd == "apply":
        cmd_apply(a)
    else:
        cmd_info(a)


if __name__ == "__main__":
    main()
