---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/styles.css","src/screens"]
---

# Brote app shell (Operate)

Scope: the whole mobile PWA (login, Marcador/feed, Tienda, Semana, Config with avatar builder, upload sheet). Visitor mode: Operate. Two users only (Luca, Giovanna), phone, daylight, quick sessions driven by push.

## Direction contract

THESIS: Each player runs their own feria stall; the score is two striped awnings with fluorescent price placards hanging under them. Refuses the habit-tracker default of progress rings on grey cards.

OWN-WORLD: White ground, ink #1E1B16. Each player's awning stripes take their avatar colour; the leader's colour owns the whole top band as one field. Placards are fluorescent yellow #FFE14A paper with condensed heavy Archivo numerals. Crate-label tags (condensed caps on solid colour) mark fruta/verdura/ambas. State colours: vale #2F9E57, no cuenta #E8432E. Phosphor icons, bold weight.

STORY: Open the app and know in one glance who is winning, by how much, each streak, and whether each already posted today; then check the partner's photo and post your own.

FIRST VIEWPORT: Top band in the leader's colour: two stalls side by side, scalloped striped awning, live avatar, name, placard with points and streak flame. Below: today's two status pills, the ink "Subir lo de hoy" action, then the feed. Bottom tab bar with centre upload button.

FORM: Feira (feria/verdulería stalls), position 6 of 7 on the grounded list. seed:76cb35f5469803e4

SIGNATURE MOVE + MOTION: placards swing on their string and numerals roll when points change; awnings unroll once on open. Spring sheets, shared tab indicator, stamped verdicts, layout-animated feed. Reduced motion keeps fades only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Close-out (2026-11-06)

- Build path: code-led. No image generation was available, so no comps were produced. Asked "Close the design without image mockups (code-led)?", the user answered "Yes, close it". The comp-led build tracker had been started by mistake and was removed.
- Finish review: 8 material fixes; 7 resolved, 1 (the tracker) closed by the above; 3 regressions from the fix batch resolved.
- DESIGN.md and .impeccable/design.json written from the built world; design detector reports 0 findings.
