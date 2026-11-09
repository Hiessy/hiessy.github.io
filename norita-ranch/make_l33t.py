# -*- coding: utf-8 -*-
"""Writes norita-ranch/i18n/l33t.json from norita-ranch/i18n/en.json.

js/i18n.js offers the same three languages on every page, so this page needs
a l33t file too. It is derived from the English one with the home page's own
converter (tools/l33t.py), never written by hand: run this again whenever
en.json changes.

    python norita-ranch/make_l33t.py
"""
import collections
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from l33t import leet  # noqa: E402

SOURCE = os.path.join(HERE, "i18n", "en.json")
TARGET = os.path.join(HERE, "i18n", "l33t.json")
# Kept as they are: the street and the house are names, and the numbers on the
# drawing must stay readable.
KEEP = re.compile(r"^(intro\.title|plan\.north|plan\.scale|intro\.kicker|street\.name)$")


def main():
    en = json.load(io.open(SOURCE, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    out = collections.OrderedDict((k, v if KEEP.match(k) else leet(v, k)) for k, v in en.items())
    marks = lambda s: re.findall(r"<[^>]*>|&[a-zA-Z]+;|&#\d+;|\{\d+\}", s)
    for k in en:
        if marks(en[k]) != marks(out[k]):
            raise SystemExit("l33t: %r came out with different markup" % k)
    io.open(TARGET, "w", encoding="utf-8", newline="").write(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print("wrote %s - %d keys" % (TARGET, len(out)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
