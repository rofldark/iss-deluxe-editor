/*
 * ISSD Text Studio - core logic (no DOM access).
 * Works in the browser (global ISSD) and in Node (require). A direct port of
 * issd_text.py; tests/core.test.js checks both produce identical ROMs.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ISSD = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // --- ROM layout (file offsets, headerless) ---------------------------------
  const C = {
    EXPECTED_SIZE: 0x200000,
    EXPECTED_CRC32: 0xcba724ba,
    EXPECTED_SHA1: "abdbf30d0987aca99183c451b7b9567e2ff67980",
    CHECKSUM_OFF: 0x7fdc,
    NAMES_START: 0x3818e,
    NAME_LEN: 8,
    TEAMS: 36,
    PLAYERS_PER_TEAM: 20,
  };
  C.NAMES_END = C.NAMES_START + C.TEAMS * C.PLAYERS_PER_TEAM * C.NAME_LEN;

  // Team order, guessed from the nationality of the player names.
  const TEAM_GUESS = [
    "Italy", "Holland", "England", "Norway", "Spain", "Ireland", "Portugal",
    "Denmark", "Germany", "France", "Belgium", "Sweden", "Romania", "Bulgaria",
    "Russia", "Switzerland", "Greece", "Croatia", "Austria", "Wales", "Scotland",
    "Northern Ireland", "Czech Rep.", "Poland", "Japan", "Korea", "Turkey",
    "Nigeria", "Cameroon", "Morocco", "Brazil", "Argentina", "Colombia", "Chile",
    "U.S.A.", "Mexico",
  ];

  // Fixed-width texts: [offset, length].
  const TEXT_BLOCKS = [
    [0x3c5cc, 18], [0x3c80d, 10], [0x3c871, 15], [0x3c880, 54],
    [0x3ca19, 41], [0x3ca53, 141], [0x3d738, 30], [0x3d758, 13],
    [0x3d767, 16], [0x3d88e, 16], [0x3d89e, 19], [0x3d8c0, 16],
    [0x3d918, 14], [0x3d926, 22], [0x3da09, 16], [0x3da19, 16],
    [0x3da29, 16], [0x3da39, 85], [0x3db3e, 18], [0x3db52, 18],
    [0x3db66, 40], [0x3db90, 36], [0x3dbb6, 32], [0x3dbd8, 34],
    [0x3dbfc, 36], [0x3dc22, 36], [0x3dc48, 54], [0x3dc80, 54],
    [0x3dcb8, 36], [0x3dd85, 45], [0x3dde4, 19], [0x3ddff, 20],
    [0x3de44, 7], [0x3de73, 18], [0x3dfb3, 17], [0x3e9e4, 13],
    [0x3e9f1, 4], [0x3ea05, 10], [0x3ea18, 10], [0x3ea2c, 11],
    [0x3ea3f, 11], [0x3ecab, 12], [0x3edb6, 20], [0x3edd0, 11],
    [0x3ee37, 56], [0x3ee6f, 56], [0x3eea7, 56], [0x3eedf, 56],
    [0x3ef17, 56], [0x3ef4f, 56], [0x3ef87, 56], [0x3efbf, 56],
    [0x3eff7, 56], [0x3f02f, 56], [0x3f067, 56], [0x3f09f, 56],
    [0x3f8d8, 36], [0x3f8fe, 18], [0x3f912, 98], [0x3f98c, 21],
    [0x3f9b6, 27],
  ];

  // Running texts in the small font: [offset, length, line width, group]. Edited line by line.
  const PROSE_AREAS = [
    [0x3cb27, 56, 28, "help"], [0x3cb60, 112, 28, "help"],
    [0x3cbd1, 112, 28, "help"], [0x3cc42, 364, 28, "help"],
    [0x3cdaf, 140, 28, "help"], [0x3ce3c, 140, 28, "help"],
    [0x3cec9, 224, 28, "help"], [0x3cfaa, 140, 28, "help"],
    [0x3d037, 140, 28, "help"], [0x3d0c4, 140, 28, "help"],
    [0x3d151, 140, 28, "help"], [0x3d1de, 112, 28, "help"],
    [0x3d24f, 140, 28, "help"], [0x3d2e8, 588, 28, "help"],
    [0x3d535, 168, 28, "help"], [0x3d5de, 224, 28, "help"],
    [0x3d6bf, 84, 28, "help"], [0x3de85, 160, 22, "train"],
    [0x3dfe4, 176, 28, "train"], [0x3e0c4, 63, 28, "train"],
    [0x3e118, 52, 28, "train"], [0x3e1a4, 125, 28, "train"],
    [0x3e284, 147, 28, "train"], [0x3e364, 356, 28, "train"],
    [0x3e804, 69, 24, "train"], [0x3e87c, 144, 24, "train"],
    [0x3f129, 156, 26, "scenario"], [0x3f1c5, 156, 26, "scenario"],
    [0x3f261, 156, 26, "scenario"], [0x3f2fd, 156, 26, "scenario"],
    [0x3f399, 156, 26, "scenario"], [0x3f435, 156, 26, "scenario"],
    [0x3f4d1, 156, 26, "scenario"], [0x3f56d, 156, 26, "scenario"],
    [0x3f609, 156, 26, "scenario"], [0x3f6a5, 156, 26, "scenario"],
    [0x3f741, 156, 26, "scenario"], [0x3f7dd, 156, 26, "scenario"],
  ];
  const GROUP_TITLES = { help: "Controller help pages", train: "Training / prompts", scenario: "Scenario descriptions" };

  // [{ off, max, group, num, start }] for every line of every area.
  function proseRows() {
    const rows = [];
    const counter = {};
    for (const [start, n, width, group] of PROSE_AREAS) {
      counter[group] = (counter[group] || 0) + 1;
      for (let k = 0; k < n; k += width)
        rows.push({ off: start + k, max: Math.min(width, n - k), group, num: counter[group], start, width });
    }
    return rows;
  }

  // --- character set (game byte <-> text) -------------------------------------
  const CHARSET = { 0x00: " ", 0x52: "!", 0x54: ".", 0x57: "-", 0x59: "?", 0x5a: "'", 0x5c: ":" };
  for (let i = 0; i < 10; i++) CHARSET[0x5e + i] = String(i);
  for (let i = 0; i < 26; i++) {
    CHARSET[0x68 + i] = String.fromCharCode(65 + i);
    CHARSET[0x82 + i] = String.fromCharCode(97 + i);
  }
  const ENCODE = {};
  for (const [b, c] of Object.entries(CHARSET)) ENCODE[c] = Number(b);

  // Second character set (small font, running texts). Digits and punctuation are inferred from context.
  const CHARSET_B = { 0x00: " ", 0x26: "-", 0x29: ".", 0x50: "'", 0x51: "/", 0x52: "," };
  for (let i = 0; i < 10; i++) CHARSET_B[0x01 + i] = String(i);
  for (let i = 0; i < 26; i++) {
    CHARSET_B[0x0b + i] = String.fromCharCode(65 + i);
    CHARSET_B[0x2a + i] = String.fromCharCode(97 + i);
  }
  const ENCODE_B = {};
  for (const [b, c] of Object.entries(CHARSET_B)) ENCODE_B[c] = Number(b);

  // --- helpers ---------------------------------------------------------------
  let crcTable = null;
  function crc32(u8) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function splitHeader(bytes) {
    const r = bytes.length % 1024;
    if (r === 512) return { header: bytes.slice(0, 512), rom: bytes.slice(512) };
    if (r === 0) return { header: new Uint8Array(0), rom: bytes.slice() };
    throw new Error("Unexpected file size: " + bytes.length);
  }

  function isExpected(rom) {
    return rom.length === C.EXPECTED_SIZE && crc32(rom) === C.EXPECTED_CRC32;
  }

  const key = (u8) => String.fromCharCode.apply(null, u8); // bytes -> latin1 string
  const hex = (n, w) => n.toString(16).padStart(w || 6, "0");
  const eqBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const concat = (parts) => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  // Text <-> bytes. Unknown bytes are shown as \xNN.
  function bytesToUi(u8, small) {
    const table = small ? CHARSET_B : CHARSET;
    let s = "";
    for (const b of u8) s += table[b] !== undefined ? table[b] : "\\x" + hex(b, 2);
    return s;
  }

  function uiToBytes(text, small) {
    const encode = small ? ENCODE_B : ENCODE;
    const out = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === "\\") {
        const m = /^x([0-9a-fA-F]{2})/.exec(text.slice(i + 1, i + 4));
        if (!m) throw new Error("bad-escape:" + text.slice(i, i + 4));
        out.push(parseInt(m[1], 16));
        i += 3;
        continue;
      }
      if (encode[c] === undefined) throw new Error("bad-char:" + c);
      out.push(encode[c]);
    }
    return Uint8Array.from(out);
  }

  // --- reading the ROM -------------------------------------------------------
  function trimZeros(u8) {
    let e = u8.length;
    while (e > 0 && u8[e - 1] === 0) e--;
    return u8.slice(0, e);
  }

  function parseRom(rom) {
    const texts = TEXT_BLOCKS.map(([off, max]) => ({ kind: "texts", off, max, orig: rom.slice(off, off + max) }));
    const names = [];
    for (let t = 0; t < C.TEAMS; t++) {
      for (let k = 0; k < C.PLAYERS_PER_TEAM; k++) {
        const off = C.NAMES_START + (t * C.PLAYERS_PER_TEAM + k) * C.NAME_LEN;
        names.push({ kind: "names", off, max: C.NAME_LEN, team: t, orig: trimZeros(rom.slice(off, off + C.NAME_LEN)) });
      }
    }
    const prose = proseRows().map((r) => ({ kind: "prose", ...r, orig: rom.slice(r.off, r.off + r.max) }));
    return { texts, names, prose };
  }

  // Share of name bytes that the character set knows (sanity check for foreign ROMs).
  function looksLikeIssd(rom) {
    if (rom.length < C.NAMES_END) return false;
    let ok = 0;
    for (let i = C.NAMES_START; i < C.NAMES_END; i++) if (CHARSET[rom[i]] !== undefined) ok++;
    return ok / (C.NAMES_END - C.NAMES_START) > 0.98;
  }

  // --- building changes ------------------------------------------------------
  // edits: { texts: Map(off -> Uint8Array), names: Map(off -> Uint8Array) }
  function buildChanges(rom, parsed, edits) {
    const changes = [];
    const errors = [];

    for (const [off, raw] of edits.texts || []) {
      const item = parsed.texts.find((m) => m.off === off);
      if (!item) { errors.push({ kind: "texts", off, code: "unknown" }); continue; }
      if (eqBytes(raw, item.orig)) continue;
      if (raw.length !== item.max) errors.push({ kind: "texts", off, code: "exact", len: raw.length, max: item.max });
      else changes.push([off, raw]);
    }

    for (const [off, raw] of edits.prose || []) {
      const item = parsed.prose.find((m) => m.off === off);
      if (!item) { errors.push({ kind: "prose", off, code: "unknown" }); continue; }
      if (eqBytes(raw, item.orig)) continue;
      if (raw.length !== item.max) errors.push({ kind: "prose", off, code: "exact", len: raw.length, max: item.max });
      else changes.push([off, raw]);
    }

    for (const [off, raw] of edits.names || []) {
      const item = parsed.names.find((m) => m.off === off);
      if (!item) { errors.push({ kind: "names", off, code: "unknown" }); continue; }
      if (raw.length > C.NAME_LEN) {
        errors.push({ kind: "names", off, code: "too-long", len: raw.length, max: C.NAME_LEN });
        continue;
      }
      const out = new Uint8Array(C.NAME_LEN);   // padded with 0x00 (= space)
      out.set(raw);
      if (!eqBytes(out, rom.slice(off, off + C.NAME_LEN))) changes.push([off, out]);
    }
    return { changes, errors };
  }

  function fixChecksum(rom) {
    rom.set([0x00, 0x00, 0xff, 0xff], C.CHECKSUM_OFF);
    let s = 0;
    for (let i = 0; i < rom.length; i++) s = (s + rom[i]) & 0xffff;
    const x = s ^ 0xffff;
    rom.set([x & 0xff, x >> 8, s & 0xff, s >> 8], C.CHECKSUM_OFF);
  }

  function applyChanges(rom, changes) {
    const out = rom.slice();
    for (const [off, raw] of changes) out.set(raw, off);
    fixChecksum(out);
    return out;
  }

  // --- patches (IPS / BPS) ---------------------------------------------------
  function* diffRuns(a, b) {
    let i = 0;
    const n = a.length;
    while (i < n) {
      if (a[i] === b[i]) { i++; continue; }
      let j = i;
      while (j < n && a[j] !== b[j]) j++;
      yield [i, j];
      i = j;
    }
  }

  function makeIps(src, dst) {
    if (src.length !== dst.length) throw new Error("IPS needs equal sizes");
    const regions = [];
    for (const [s, e] of diffRuns(src, dst)) {
      if (regions.length && s - regions[regions.length - 1][1] <= 5) regions[regions.length - 1][1] = e;
      else regions.push([s, e]);
    }
    const parts = [new TextEncoder().encode("PATCH")];
    for (let [s, e] of regions) {
      while (s < e) {
        if (s === 0x454f46) s--;
        const n = Math.min(e - s, 0xffff);
        parts.push(Uint8Array.of((s >> 16) & 0xff, (s >> 8) & 0xff, s & 0xff, n >> 8, n & 0xff), dst.slice(s, s + n));
        s += n;
      }
    }
    parts.push(new TextEncoder().encode("EOF"));
    return concat(parts);
  }

  function bpsNum(n) {
    const out = [];
    for (;;) {
      const x = n & 0x7f;
      n = Math.floor(n / 128);
      if (n === 0) { out.push(0x80 | x); return Uint8Array.from(out); }
      out.push(x);
      n -= 1;
    }
  }

  const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);

  function makeBps(src, dst) {
    const parts = [new TextEncoder().encode("BPS1"), bpsNum(src.length), bpsNum(dst.length), bpsNum(0)];
    let pos = 0;
    const n = dst.length;
    while (pos < n) {
      const same = pos < src.length && src[pos] === dst[pos];
      let end = pos;
      while (end < n && (end < src.length && src[end] === dst[end]) === same) end++;
      const len = end - pos;
      if (same) parts.push(bpsNum((len - 1) * 4));
      else parts.push(bpsNum((len - 1) * 4 + 1), dst.slice(pos, end));
      pos = end;
    }
    parts.push(le32(crc32(src)), le32(crc32(dst)));
    const body = concat(parts);
    return concat([body, le32(crc32(body))]);
  }

  function applyIps(src, patch) {
    if (key(patch.slice(0, 5)) !== "PATCH") throw new Error("Not an IPS patch");
    let out = src.slice();
    let i = 5;
    while (key(patch.slice(i, i + 3)) !== "EOF") {
      const off = (patch[i] << 16) | (patch[i + 1] << 8) | patch[i + 2];
      const size = (patch[i + 3] << 8) | patch[i + 4];
      i += 5;
      let data;
      if (size === 0) {
        const rle = (patch[i] << 8) | patch[i + 1];
        data = new Uint8Array(rle).fill(patch[i + 2]);
        i += 3;
      } else { data = patch.slice(i, i + size); i += size; }
      if (off + data.length > out.length) { const g = new Uint8Array(off + data.length); g.set(out); out = g; }
      out.set(data, off);
    }
    return out;
  }

  const readLe32 = (a, o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;

  function applyBps(src, patch) {
    if (key(patch.slice(0, 4)) !== "BPS1") throw new Error("Not a BPS patch");
    if (crc32(patch.slice(0, -4)) !== readLe32(patch, patch.length - 4)) throw new Error("Patch is damaged");
    let pos = 4;
    const num = () => {
      let data = 0, shift = 1;
      for (;;) {
        const x = patch[pos++];
        data += (x & 0x7f) * shift;
        if (x & 0x80) return data;
        shift *= 128;
        data += shift;
      }
    };
    const srcSize = num(), dstSize = num(), meta = num();
    pos += meta;
    if (srcSize !== src.length || crc32(src) !== readLe32(patch, patch.length - 12))
      throw new Error("Wrong source ROM for this patch");
    const out = new Uint8Array(dstSize);
    let o = 0, srcRel = 0, dstRel = 0;
    const end = patch.length - 12;
    while (pos < end) {
      const v = num();
      const mode = v & 3, len = (v >> 2) + 1;
      if (mode === 0) { out.set(src.slice(o, o + len), o); o += len; }
      else if (mode === 1) { out.set(patch.slice(pos, pos + len), o); pos += len; o += len; }
      else {
        const d = num();
        const off = (d & 1 ? -1 : 1) * (d >> 1);
        if (mode === 2) { srcRel += off; out.set(src.slice(srcRel, srcRel + len), o); srcRel += len; o += len; }
        else { dstRel += off; for (let k = 0; k < len; k++) out[o++] = out[dstRel++]; }
      }
    }
    if (o !== dstSize || crc32(out) !== readLe32(patch, patch.length - 8)) throw new Error("Result checksum mismatch");
    return out;
  }

  return {
    C, TEAM_GUESS, PROSE_AREAS, GROUP_TITLES, proseRows, crc32, splitHeader, isExpected, looksLikeIssd, bytesToUi, uiToBytes, parseRom,
    buildChanges, applyChanges, fixChecksum, makeIps, makeBps, applyIps, applyBps, diffRuns, hex, eqBytes,
  };
});
