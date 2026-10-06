// Compares docs/core.js with issd_text.py. Run with:
//   ISSD_ROM=<path to the original ROM> node --test tests/core.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const K = require("../docs/core.js");

const ROM = process.env.ISSD_ROM;
const TOOL = path.join(__dirname, "..", "issd_text.py");
const py = (...args) => execFileSync(process.env.PYTHON || "python", [TOOL, ...args], { encoding: "utf8" });

test("charset round trip", () => {
  for (const b of [0x00, 0x52, 0x54, 0x68, 0x81, 0x82, 0x9b, 0x5e, 0x67]) {
    assert.deepStrictEqual([...K.uiToBytes(K.bytesToUi(Uint8Array.of(b)))], [b]);
  }
  assert.strictEqual(K.bytesToUi(Uint8Array.of(0x72, 0x01)), "K\\x01");
  assert.throws(() => K.uiToBytes("Ü"), /bad-char/);
  // second character set (small font)
  assert.deepStrictEqual([...K.uiToBytes("Aa0 .,-'/", true)], [0x0b, 0x2a, 0x01, 0x00, 0x29, 0x52, 0x26, 0x50, 0x51]);
  assert.strictEqual(K.bytesToUi(Uint8Array.of(0x53, 0x0b), true), "\\x53A");
  assert.throws(() => K.uiToBytes("!", true), /bad-char/);
});

test("text areas do not overlap", () => {
  const spans = [
    ...K.parseRom(new Uint8Array(0x200000)).texts.map((x) => [x.off, x.off + x.max]),
    ...K.proseRows().map((x) => [x.off, x.off + x.max]),
    [K.C.NAMES_START, K.C.NAMES_END],
  ].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i - 1][1] <= spans[i][0], `overlap at ${spans[i][0].toString(16)}`);
});

test("ips/bps round trip", () => {
  const src = Uint8Array.from({ length: 10240 }, (_, i) => i & 255);
  const dst = src.slice();
  dst.set([65, 66, 67, 68], 10);
  dst.set([120, 121, 122], 5000);
  assert.deepStrictEqual(K.applyIps(src, K.makeIps(src, dst)), dst);
  assert.deepStrictEqual(K.applyBps(src, K.makeBps(src, dst)), dst);
});

test("ROM tests", { skip: !ROM }, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "issd-"));
  const rom = K.splitHeader(new Uint8Array(fs.readFileSync(ROM))).rom;
  const parsed = K.parseRom(rom);
  assert.ok(K.isExpected(rom));
  assert.ok(K.looksLikeIssd(rom));

  await t.test("unchanged ROM stays identical", () => {
    assert.deepStrictEqual(K.applyChanges(rom, []), rom);
  });

  await t.test("JS and Python build identical ROMs", () => {
    const dir = path.join(tmp, "texte");
    py("dump", ROM, dir);
    const namesFile = path.join(dir, "2_player_names.txt");
    const textsFile = path.join(dir, "1_texts.txt");
    let names = fs.readFileSync(namesFile, "utf8");
    let texts = fs.readFileSync(textsFile, "utf8");
    names = names.replace("03818e  max=8 |Pagani|", "03818e  max=8 |Baggio|")
                 .replace("038196  max=8 |Premoli|", "038196  max=8 |TESTNAME|")
                 .replace(/^(038\w+)\s+max=8 \|Hansen\|/m, "$1  max=8 |Rep|");
    texts = texts.replace("|   FROM THE BIGINING|", "|  FROM THE BEGINNING|");
    const proseFile = path.join(dir, "3_prose.txt");
    let prose = fs.readFileSync(proseFile, "utf8");
    prose = prose.replace("|Turn the page by pressing   |", "|Flip the page by pressing   |")
                 .replace(/^(03f129\s+max=26 \|)It seems like a defeat for\|/m, "$1It looks like a defeat for|");
    fs.writeFileSync(namesFile, names);
    fs.writeFileSync(textsFile, texts);
    fs.writeFileSync(proseFile, prose);
    const pyOut = path.join(tmp, "py.sfc");
    py("insert", ROM, dir, pyOut);

    const edits = { texts: new Map(), names: new Map(), prose: new Map() };
    edits.names.set(0x3818e, K.uiToBytes("Baggio"));
    edits.names.set(0x38196, K.uiToBytes("TESTNAME"));
    const hansen = parsed.names.find((n) => n.orig.length && K.bytesToUi(n.orig) === "Hansen");
    edits.names.set(hansen.off, K.uiToBytes("Rep"));
    edits.texts.set(0x3edb6, K.uiToBytes("  FROM THE BEGINNING"));
    edits.prose.set(0x3cb27, K.uiToBytes("Flip the page by pressing   ", true));
    edits.prose.set(0x3f129, K.uiToBytes("It looks like a defeat for", true));
    const r = K.buildChanges(rom, parsed, edits);
    assert.deepStrictEqual(r.errors, []);
    const jsOut = K.applyChanges(rom, r.changes);
    assert.deepStrictEqual(new Uint8Array(fs.readFileSync(pyOut)), jsOut);

    // patches made by one side apply on the other
    const jsBps = path.join(tmp, "js.bps");
    fs.writeFileSync(jsBps, K.makeBps(rom, jsOut));
    const viaPy = path.join(tmp, "via_py.sfc");
    py("apply", ROM, jsBps, viaPy);
    assert.deepStrictEqual(new Uint8Array(fs.readFileSync(viaPy)), jsOut);
    const pyBps = path.join(tmp, "py.bps");
    py("patch", ROM, pyOut, pyBps);
    assert.deepStrictEqual(K.applyBps(rom, new Uint8Array(fs.readFileSync(pyBps))), jsOut);
  });

  await t.test("rejects too long names and wrong-length texts", () => {
    const e = {
      texts: new Map([[0x3d738, K.uiToBytes("SHORT")]]),
      names: new Map([[0x3818e, K.uiToBytes("123456789")]]),
      prose: new Map([[0x3cb27, K.uiToBytes("too short", true)]]),
    };
    const r = K.buildChanges(rom, parsed, e);
    assert.deepStrictEqual(r.errors.map((x) => x.code).sort(), ["exact", "exact", "too-long"]);
  });

  fs.rmSync(tmp, { recursive: true, force: true });
});
