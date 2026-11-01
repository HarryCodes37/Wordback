# Wordback: Incident Management Dashboard

Offline web app for a first-arriving CFA crew leader running a Level 1 incident. Single device, autosaves on every tap, exports at the end. Incident data stays on the device; nothing is sent anywhere.

Live app: https://harrycodes37.github.io/Wordback/

Install on iPhone: open the link in Safari, tap Share, then Add to Home Screen. Open it once while online so it caches for offline use.

- App files (served by GitHub Pages from this branch): `index.html`, `sw.js`, `manifest.webmanifest`, icons.
- Source: `source/src` (CSS + JS). Build with `python3 source/tools/build.py`, then copy `source/dist/*` to the repo root.
