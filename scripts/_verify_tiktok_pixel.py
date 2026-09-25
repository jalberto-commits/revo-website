#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
pages = [p for p in root.glob("*.html") if p.name != "benefits-temp.html"]
with_def = []
unconditional = []
for p in pages:
    t = p.read_text(encoding="utf-8")
    if "installRevoTikTokPixel" not in t:
        continue
    with_def.append(p.name)
    # Calls that are NOT the assignment of the function
    # Match: installRevoTikTokPixel() but not "installRevoTikTokPixel = function"
    for m in re.finditer(r"installRevoTikTokPixel\s*\(", t):
        start = max(0, m.start() - 40)
        ctx = t[start : m.end() + 20]
        if "= function" in ctx or "window.installRevoTikTokPixel = function" in t[max(0, m.start()-50):m.end()]:
            # check if this specific match is the definition
            before = t[max(0, m.start() - 50) : m.start()]
            if "function" in before or "= function" in before:
                continue
        unconditional.append((p.name, ctx.strip()))

missing = [p.name for p in pages if p.name not in with_def]
print(f"definition on {len(with_def)} of {len(pages)}")
print("missing:", missing or "none")
print("unconditional/extra calls:", unconditional or "none")
# ensure only one pixel id load line per page
for p in pages:
    t = p.read_text(encoding="utf-8")
    n = t.count("DARE3CJC77U88MSO6OQ0")
    if n != 1:
        print(f"WARN {p.name}: pixel id occurrences = {n}")
print("ok")
