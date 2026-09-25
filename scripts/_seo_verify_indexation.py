#!/usr/bin/env python3
"""Verify SEO acceptance criteria locally (pre-deploy)."""
from __future__ import annotations

import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.revoapp.ai"
SKIP = {"benefits-temp.html"}
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def main() -> int:
    errors = []

    # 1. Canonicals
    pages = [p for p in ROOT.glob("*.html") if p.name not in SKIP]
    for p in pages:
        text = p.read_text(encoding="utf-8")
        cans = re.findall(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', text, re.I)
        expected = f"{BASE}/" if p.name == "index.html" else f"{BASE}/{p.name}"
        if len(cans) != 1:
            errors.append(f"canonical count {len(cans)} in {p.name}")
        elif cans[0] != expected:
            errors.append(f"canonical mismatch in {p.name}: {cans[0]} != {expected}")

    # 2. No index.html hrefs
    for p in list(ROOT.glob("*.html")) + list((ROOT / "snippets").glob("*.html")):
        text = p.read_text(encoding="utf-8")
        if re.search(r'href=["\']index\.html', text):
            errors.append(f"index.html href still in {p.name}")

    # 3. Case-sensitive internal HTML link audit
    existing = {f.name.lower(): f.name for f in ROOT.glob("*.html")}
    broken = defaultdict(list)
    for p in list(ROOT.glob("*.html")) + list((ROOT / "templates").glob("*.html")) + list(
        (ROOT / "snippets").glob("*.html")
    ):
        text = p.read_text(encoding="utf-8", errors="replace")
        for href in re.findall(r'href=["\']([^"\']+)["\']', text):
            if href.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "data:", "#")):
                continue
            path_only = href.split("?")[0].split("#")[0].lstrip("./")
            if not path_only.endswith(".html"):
                continue
            base = os.path.basename(path_only)
            correct = existing.get(base.lower()) or existing.get(base.lower().replace(" ", "_"))
            if correct is None or correct != base:
                broken[path_only].append(p.name)
    if broken:
        for t, srcs in sorted(broken.items()):
            errors.append(f"broken/case href {t} from {srcs[0]}")

    # 4. Sitemap internal consistency
    tree = ET.parse(ROOT / "sitemap.xml")
    locs = [el.text for el in tree.findall("sm:url/sm:loc", NS)]
    if f"{BASE}/industries.html" not in locs:
        errors.append("industries.html missing from sitemap")
    for loc in locs:
        if not loc.startswith(f"{BASE}/"):
            errors.append(f"sitemap loc not www absolute: {loc}")
            continue
        path = loc[len(BASE) :]
        if path == "/":
            fname = "index.html"
        else:
            fname = path.lstrip("/")
        fpath = ROOT / fname
        if not fpath.is_file():
            errors.append(f"sitemap loc file missing: {loc}")
            continue
        text = fpath.read_text(encoding="utf-8")
        cans = re.findall(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', text, re.I)
        if len(cans) != 1 or cans[0] != loc:
            errors.append(f"sitemap/canonical mismatch for {loc}: {cans}")

    # 5. robots.txt untouched check — must still contain the templates note
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "/templates/ y /thank-you.html NO se bloquean" not in robots:
        errors.append("robots.txt appears altered")

    # 6. vercel.json permanent apex redirect
    v = (ROOT / "vercel.json").read_text(encoding="utf-8")
    if '"value": "revoapp.ai"' not in v or '"permanent": true' not in v:
        errors.append("vercel.json missing permanent apex->www redirect")

    print(f"Pages checked: {len(pages)}")
    print(f"Sitemap URLs: {len(locs)}")
    if errors:
        print(f"FAIL ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: local acceptance checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
