#!/usr/bin/env python3
"""One-shot SEO fix: canonicals, index.html -> /, broken industry href casing."""
from __future__ import annotations

import glob
import os
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.revoapp.ai"
TODAY = "2026-09-25"

# Fragments / non-pages — skip canonical
SKIP_CANONICAL = {
    "benefits-temp.html",
}


def list_html_pages() -> list[Path]:
    pages = []
    for p in ROOT.glob("*.html"):
        if p.name in SKIP_CANONICAL:
            continue
        pages.append(p)
    return sorted(pages)


def canonical_url(filename: str) -> str:
    if filename == "index.html":
        return f"{BASE}/"
    return f"{BASE}/{filename}"


def insert_canonical(text: str, url: str) -> str:
    if re.search(r'rel=["\']canonical["\']', text, re.I):
        # Replace existing
        return re.sub(
            r'<link\s+rel=["\']canonical["\'][^>]*>',
            f'<link rel="canonical" href="{url}">',
            text,
            count=1,
            flags=re.I,
        )

    tag = f'  <link rel="canonical" href="{url}">\n'
    # Prefer after primary meta description or title block
    m = re.search(r'(<meta\s+name=["\']description["\'][^>]*>\s*\n)', text, re.I)
    if m:
        return text[: m.end()] + tag + text[m.end() :]

    m = re.search(r'(</title>\s*\n)', text, re.I)
    if m:
        return text[: m.end()] + tag + text[m.end() :]

    m = re.search(r'(<head[^>]*>\s*\n)', text, re.I)
    if m:
        return text[: m.end()] + tag + text[m.end() :]

    raise RuntimeError("Could not find insertion point for canonical")


def fix_index_links(text: str) -> str:
    # href="index.html" -> href="/"
    text = re.sub(r'href=(["\'])index\.html\1', r'href=\1/\1', text)
    # href="index.html#..." -> href="/#..."
    text = re.sub(r'href=(["\'])index\.html(#[^"\']*)\1', r'href=\1/\2\1', text)
    return text


def build_existing_map() -> dict[str, str]:
    """Map lowercase basename -> actual basename for case-sensitive fix."""
    m = {}
    for p in ROOT.glob("*.html"):
        m[p.name.lower()] = p.name
    return m


def fix_broken_html_hrefs(text: str, existing: dict[str, str]) -> tuple[str, list[str]]:
    """Fix hrefs that point to missing/wrong-case .html files.

    Important: do NOT use Path.exists() for validation — Windows is
    case-insensitive, but Vercel (Linux) is case-sensitive.
    """
    fixes: list[str] = []

    def repl(match: re.Match) -> str:
        quote = match.group(1)
        href = match.group(2)
        path_only = href.split("?")[0].split("#")[0]
        if not path_only.endswith(".html"):
            return match.group(0)
        if path_only.startswith(("http://", "https://", "//")):
            return match.group(0)

        base = os.path.basename(path_only)

        # Special: ind.html -> industries.html
        if base.lower() == "ind.html":
            new_href = href.replace(path_only, "industries.html", 1)
            fixes.append(f"{href} -> {new_href}")
            return f"href={quote}{new_href}{quote}"

        correct = existing.get(base.lower())
        # Title Case with spaces: "industry_Air Duct Cleaning.html"
        if not correct:
            normalized = base.lower().replace(" ", "_")
            correct = existing.get(normalized)

        if correct and correct != base:
            if "?" in href:
                suffix = "?" + href.split("?", 1)[1]
            elif "#" in href:
                suffix = "#" + href.split("#", 1)[1]
            else:
                suffix = ""
            dirpart = os.path.dirname(path_only)
            new_path = f"{dirpart}/{correct}" if dirpart else correct
            new_href = new_path + suffix
            fixes.append(f"{href} -> {new_href}")
            return f"href={quote}{new_href}{quote}"

        return match.group(0)

    new_text = re.sub(r'href=(["\'])([^"\']+)\1', repl, text)
    return new_text, fixes


def process_pages() -> None:
    existing = build_existing_map()
    all_fixes: dict[str, list[str]] = defaultdict(list)

    for path in list_html_pages():
        text = path.read_text(encoding="utf-8")
        original = text

        url = canonical_url(path.name)
        text = insert_canonical(text, url)
        text = fix_index_links(text)
        text, fixes = fix_broken_html_hrefs(text, existing)
        if fixes:
            all_fixes[path.name].extend(fixes)

        if text != original:
            path.write_text(text, encoding="utf-8", newline="\n")
            print(f"updated: {path.name}  canonical={url}")
        else:
            print(f"unchanged: {path.name}")

    print("\nBroken-link fixes:")
    if not all_fixes:
        print("  (none)")
    for fname, fixes in sorted(all_fixes.items()):
        for f in fixes:
            print(f"  {fname}: {f}")


def audit_broken() -> None:
    existing = build_existing_map()
    broken = defaultdict(list)
    for path in list(ROOT.glob("*.html")) + list((ROOT / "templates").glob("*.html")) + list(
        (ROOT / "snippets").glob("*.html")
    ):
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for href in re.findall(r'href=["\']([^"\']+)["\']', text):
            if href.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "data:", "#")):
                continue
            path_only = href.split("?")[0].split("#")[0].lstrip("./")
            if not path_only.endswith(".html"):
                continue
            base = os.path.basename(path_only)
            correct = existing.get(base.lower())
            if correct is None:
                # also try space->underscore
                correct = existing.get(base.lower().replace(" ", "_"))
                if correct is None:
                    broken[path_only].append(path.name)
                elif correct != base:
                    broken[path_only + " (case)"].append(path.name)
            elif correct != base:
                broken[path_only + " (case)"].append(path.name)

    print("\nRemaining broken/case-mismatched HTML targets:")
    if not broken:
        print("  none")
    for t, sources in sorted(broken.items()):
        print(f"  {t}  <- {', '.join(sources[:8])}" + (f" (+{len(sources)-8})" if len(sources) > 8 else ""))


if __name__ == "__main__":
    process_pages()
    audit_broken()
