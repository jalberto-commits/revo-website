#!/usr/bin/env python3
"""Inject TikTok pixel definition (consent-gated; does not auto-fire)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP = {
    "benefits-temp.html",  # fragment, no <head>
}

MARKER = "installRevoTikTokPixel"

TIKTOK_BLOCK = """<!-- TikTok Pixel (definition only; fires after ad consent via installRevoTikTokPixel) -->
<script>
(function (window, document) {
  var installed = false;

  window.installRevoTikTokPixel = function () {
    if (installed) return;
    installed = true;

    window.TiktokAnalyticsObject = 'ttq';

    var ttq = window.ttq = window.ttq || [];

    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug',
      'on', 'off', 'once', 'ready', 'alias', 'group',
      'enableCookie', 'disableCookie', 'holdConsent',
      'revokeConsent', 'grantConsent'
    ];

    ttq.setAndDefer = function (target, method) {
      target[method] = function () {
        target.push(
          [method].concat(Array.prototype.slice.call(arguments, 0))
        );
      };
    };

    for (var index = 0; index < ttq.methods.length; index++) {
      ttq.setAndDefer(ttq, ttq.methods[index]);
    }

    ttq.instance = function (pixelId) {
      var instance = ttq._i[pixelId] || [];

      for (var index = 0; index < ttq.methods.length; index++) {
        ttq.setAndDefer(instance, ttq.methods[index]);
      }

      return instance;
    };

    ttq.load = function (pixelId, options) {
      var source = 'https://analytics.tiktok.com/i18n/pixel/events.js';

      ttq._i = ttq._i || {};
      ttq._i[pixelId] = [];
      ttq._i[pixelId]._u = source;

      ttq._t = ttq._t || {};
      ttq._t[pixelId] = +new Date();

      ttq._o = ttq._o || {};
      ttq._o[pixelId] = options || {};

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = source + '?sdkid=' + pixelId + '&lib=ttq';

      document.head.appendChild(script);
    };

    ttq.load('DARE3CJC77U88MSO6OQ0');
    ttq.grantConsent();
    ttq.page();
  };
})(window, document);
</script>
<!-- End TikTok Pixel -->
"""


def inject(text: str) -> str | None:
    if MARKER in text:
        return None  # already present

    # Prefer after Meta Pixel end marker
    meta_end = "<!-- End Meta Pixel Code -->"
    if meta_end in text:
        return text.replace(meta_end, meta_end + "\n\n" + TIKTOK_BLOCK, 1)

    # Else before </head>
    lower = text.lower()
    idx = lower.rfind("</head>")
    if idx == -1:
        raise RuntimeError("no </head> found")
    return text[:idx] + TIKTOK_BLOCK + "\n" + text[idx:]


def main() -> None:
    updated = []
    skipped = []
    for path in sorted(ROOT.glob("*.html")):
        if path.name in SKIP:
            skipped.append(path.name)
            continue
        original = path.read_text(encoding="utf-8")
        new = inject(original)
        if new is None:
            skipped.append(path.name + " (already)")
            continue
        path.write_text(new, encoding="utf-8", newline="\n")
        updated.append(path.name)

    print("Updated:")
    for n in updated:
        print(f"  {n}")
    print(f"\nTotal updated: {len(updated)}")
    print("Skipped:", ", ".join(skipped) if skipped else "(none)")


if __name__ == "__main__":
    main()
