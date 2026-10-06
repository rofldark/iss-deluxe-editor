"""Tests for issd_text.py.

Unit tests run without a ROM. For the full tests set ISSD_ROM=<path to the original ROM>:
    ISSD_ROM="C:\\...\\International Superstar Soccer Deluxe (Europe).sfc" python -m unittest discover tests
"""
import argparse
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import issd_text as t  # noqa: E402

ROM_PATH = os.environ.get("ISSD_ROM")


class CharsetTests(unittest.TestCase):
    def test_roundtrip_all_known_bytes(self):
        raw = bytes(sorted(t.CHARSET))
        self.assertEqual(t.unesc(t.esc(raw)), raw)

    def test_unknown_byte_is_escaped(self):
        self.assertEqual(t.esc(b"\x72\x01"), "K\\x01")
        self.assertEqual(t.unesc("K\\x01"), b"\x72\x01")

    def test_unsupported_character(self):
        with self.assertRaises(ValueError):
            t.unesc("Ü")

    def test_known_values(self):
        self.assertEqual(t.unesc("Aa0 .'"), bytes([0x68, 0x82, 0x5E, 0x00, 0x54, 0x5A]))

    def test_blocks_do_not_overlap(self):
        spans = [(o, o + n) for o, n in t.TEXT_BLOCKS]
        spans += [(o, o + n) for o, n, *_ in t.prose_rows()]
        spans.append((t.NAMES_START, t.NAMES_END))
        spans.sort()
        for (_, e), (s, _) in zip(spans, spans[1:]):
            self.assertLessEqual(e, s)

    def test_small_font_charset(self):
        self.assertEqual(t.unesc("Aa0 .,-'/", small=True),
                         bytes([0x0B, 0x2A, 0x01, 0x00, 0x29, 0x52, 0x26, 0x50, 0x51]))
        self.assertEqual(t.esc(bytes([0x53, 0x0B]), small=True), "\\x53A")
        with self.assertRaises(ValueError):
            t.unesc("!", small=True)

    def test_prose_rows_cover_areas_exactly(self):
        for start, n, width, _ in t.PROSE_AREAS:
            rows = [(o, m) for o, m, _, _, s in t.prose_rows() if s == start]
            self.assertEqual(sum(m for _, m in rows), n)
            self.assertTrue(all(m <= width for _, m in rows))

    def test_ips_bps_roundtrip(self):
        src = bytes(range(256)) * 40
        dst = bytearray(src)
        dst[10:14] = b"ABCD"
        dst[5000:5003] = b"xyz"
        for make, apply in ((t.make_ips, t.apply_ips), (t.make_bps, t.apply_bps)):
            self.assertEqual(apply(src, make(src, bytes(dst))), bytes(dst))


@unittest.skipUnless(ROM_PATH, "set ISSD_ROM for the ROM tests")
class RomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rom, _ = t.load_rom(ROM_PATH, quiet=True)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.texts = os.path.join(cls.tmp.name, "texte")
        t.cmd_dump(argparse.Namespace(rom=ROM_PATH, outdir=cls.texts))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_expected_rom(self):
        self.assertTrue(t.is_expected_rom(self.rom))

    def test_unchanged_insert_is_identical(self):
        changes, errors = t.build_changes(self.rom, self.texts)
        self.assertEqual((changes, errors), ({}, []))
        out = t.apply_changes(self.rom, {})
        self.assertEqual(bytes(out), bytes(self.rom))

    def test_every_block_decodes_without_unknown_bytes_at_edges(self):
        for o, n, raw in t.text_items(self.rom):
            self.assertEqual(t.unesc(t.esc(raw)), raw, hex(o))

    def test_name_edit(self):
        path = os.path.join(self.texts, "2_player_names.txt")
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        i = next(k for k, l in enumerate(lines) if l.startswith("03818e"))
        lines[i] = "03818e  max=8 |Baggio|"
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines))
        try:
            changes, errors = t.build_changes(self.rom, self.texts)
            self.assertEqual(errors, [])
            self.assertEqual(changes, {0x3818E: t.unesc("Baggio") + b"\x00\x00"})
            out = t.apply_changes(self.rom, changes)
            self.assertEqual(sum(out[:0x7FDC]) & 0, 0)
            self.assertEqual(t.player_name(out, 0x3818E), t.unesc("Baggio"))
            # checksum fields are consistent
            c = out[t.CHECKSUM_OFF:t.CHECKSUM_OFF + 4]
            self.assertEqual((c[0] | c[1] << 8) ^ (c[2] | c[3] << 8), 0xFFFF)
            self.assertEqual(sum(out) & 0xFFFF, c[2] | c[3] << 8)
        finally:
            lines[i] = "03818e  max=8 |Pagani|"
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write("\n".join(lines))

    def test_prose_edit_and_length_check(self):
        path = os.path.join(self.texts, "3_prose.txt")
        with open(path, encoding="utf-8") as f:
            original = f.read()

        def write(text):
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(text)

        try:
            write(original.replace("|Turn the page by pressing   |", "|Flip the page by pressing   |", 1))
            changes, errors = t.build_changes(self.rom, self.texts)
            self.assertEqual(errors, [])
            self.assertEqual(changes, {0x3CB27: t.unesc("Flip the page by pressing   ", small=True)})
            write(original.replace("|Turn the page by pressing   |", "|Turn the page   |", 1))
            _, errors = t.build_changes(self.rom, self.texts)
            self.assertEqual(len(errors), 1)
        finally:
            write(original)

    def test_wrong_length_text_is_rejected(self):
        path = os.path.join(self.texts, "1_texts.txt")
        with open(path, encoding="utf-8") as f:
            original = f.read()
        try:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(original.replace("|DON'T GIVE UP", "|X DON'T GIVE UP", 1))
            _, errors = t.build_changes(self.rom, self.texts)
            self.assertEqual(len(errors), 1)
        finally:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(original)


if __name__ == "__main__":
    unittest.main()
