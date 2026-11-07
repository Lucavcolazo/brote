---
name: Brote
description: A two-player feria where each partner runs a striped stall and the score hangs on a fluorescent price placard.
colors:
  ground: "#ffffff"
  canvas: "#f4f3ef"
  ink: "#1e1b16"
  ink-2: "#5f5a52"
  ink-3: "#8a847a"
  line: "#e6e3dc"
  fluo: "#ffe14a"
  fluo-ink: "#3a3000"
  vale: "#2f9e57"
  nocuenta: "#d93a26"
  nocuenta-soft: "#fde6e2"
  crate-fruta: "#e8432e"
  crate-ambas: "#f27a1f"
  tie-band: "#c9c4ba"
  debt-tint: "#fff6d1"
  lightbox-scrim: "rgba(20, 18, 15, 0.94)"
  player-tomato: "#E8432E"
  player-tangerine: "#F27A1F"
  player-lemon: "#F6C928"
  player-lime: "#9BCB2F"
  player-leaf: "#2F9E57"
  player-teal: "#1E9C95"
  player-sky: "#3D8BE0"
  player-plum: "#6B4BB8"
  player-berry: "#D23C7C"
  player-ink: "#2A2622"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 62"
  wordmark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 70"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 78"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 75"
  body-strong:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 850
    letterSpacing: "0.07em"
    fontVariation: "'wdth' 72"
  field-label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 750
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 80"
  wordmark-hero:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 70"
  sheet-title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 850
    fontVariation: "'wdth' 78"
  code:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    letterSpacing: "0.35em"
    fontFeature: "'tnum'"
  count-small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 900
    lineHeight: 1
    fontVariation: "'wdth' 70"
  body-small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 750
    letterSpacing: "0.01em"
rounded:
  xs: "4px"
  tag: "6px"
  stamp: "8px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  cta-tile: "14px"
  option-tile: "18px"
  fab: "20px"
  sheet: "28px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  gutter: "16px"
  block: "28px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-line:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-soft:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-vale:
    backgroundColor: "{colors.vale}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-no:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.nocuenta}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-sm:
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  icon-button:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "52px"
  input-focus:
    backgroundColor: "{colors.ground}"
  crate-fruta:
    backgroundColor: "{colors.crate-fruta}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "5px 9px 5px 7px"
  crate-verdura:
    backgroundColor: "{colors.vale}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "5px 9px 5px 7px"
  crate-ambas:
    backgroundColor: "{colors.crate-ambas}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "5px 9px 5px 7px"
  placard:
    backgroundColor: "{colors.fluo}"
    textColor: "{colors.fluo-ink}"
    typography: "{typography.display}"
    rounded: "{rounded.tag}"
    padding: "10px 14px 11px"
  price-tag:
    backgroundColor: "{colors.fluo}"
    textColor: "{colors.fluo-ink}"
    rounded: "{rounded.tag}"
    padding: "6px 8px"
  price-tag-locked:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-2}"
  today-pill:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "9px 12px 9px 9px"
  today-pill-ok:
    backgroundColor: "{colors.vale}"
    textColor: "{colors.ground}"
  post-card:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.lg}"
  post-cta:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.lg}"
    padding: "14px 16px 14px 14px"
  row-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "12px 12px 12px 14px"
  segmented:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-active:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  sheet:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.sheet}"
    padding: "10px 18px 22px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
  toast-error:
    backgroundColor: "{colors.nocuenta}"
    textColor: "{colors.ground}"
  fab:
    backgroundColor: "{colors.fluo}"
    textColor: "{colors.fluo-ink}"
    rounded: "{rounded.fab}"
    size: "60px"
  tab:
    height: "72px"
    textColor: "{colors.ink-2}"
  tab-active:
    textColor: "{colors.ink}"
  week-cell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.sm}"
  week-cell-ok:
    backgroundColor: "{colors.vale}"
    textColor: "{colors.ground}"
  week-cell-miss:
    backgroundColor: "{colors.nocuenta-soft}"
    textColor: "{colors.nocuenta}"
---

# Design System: Brote

## Overview

**Creative North Star: "The Two-Stall Feira"**

Brote is a street market with exactly two stalls. Each partner owns one: a scalloped, striped awning in their avatar colour, their living avatar under it, and a fluorescent yellow price placard hanging on two strings that carries their points and streak. The score is not a chart; it is the market itself. Whoever leads tints the whole top band with their colour, and a tie drops it to a neutral grey canvas. Every other screen inherits the market through a striped valance under its title, crate-label tags for meal kinds, and placard-yellow price tags in the store.

The ground is plain white and the ink is a warm near-black; everything loud in the system is either a player's colour, placard fluo, or a verdict colour. Type is a single variable family, Archivo, pushed narrow and heavy for anything that names or counts (titles, numerals, tags) and left at normal width for reading. Surfaces are soft and rounded, lifted with warm, low shadows; buttons are full pills. Density is phone-first and generous: 16px gutters, 52px controls, one column.

Motion is part of the material, not decoration. Awnings unroll once on open, placards swing on their strings when points change, numerals roll, sheets ride a spring, and the active tab marker slides between tabs. All of it runs through Motion with `reducedMotion="user"`, so reduced-motion users get state without travel.

**Key Characteristics:**
- Two player colours drive awnings, valances and the leader band; the system has no fixed brand hue beyond ink and fluo.
- Fluorescent yellow placard paper with condensed, 900-weight Archivo numerals is the signature object.
- Light only: white ground, warm canvas sections, warm ink.
- Narrow uppercase Archivo for names and counts; normal-width Archivo for reading.
- Pill buttons, rounded cards, warm soft shadows, Phosphor bold icons.
- Smooth spring motion everywhere, honouring reduced-motion preferences.

## Colors

A white market under warm ink, where colour belongs to the players, the placards and the verdicts.

### Primary
- **Placard Fluo** (fluo): the price-placard paper. Score placards, store price tags, the centre upload button, the icon well of the "upload today" action, text selection, and the demo banner. Always paired with Placard Ink text, never white.
- **Placard Ink** (fluo-ink): dark olive text and glyphs on fluo surfaces only.

### Secondary
- **Vale Green** (vale): the "counts" verdict. Approve button, the done-today pill, completed week cells, the switch-on state, positive point amounts, the "vale" stamp. Also the verdura crate colour.
- **No Cuenta Red** (nocuenta): the "doesn't count" verdict and errors. Reject button outline, rejected stamp, negative amounts, error text, error toasts, destructive links.
- **No Cuenta Blush** (nocuenta-soft): fill of missed week cells, carrying No Cuenta Red glyphs.

### Tertiary
- **Crate Tomato** (crate-fruta) and **Crate Tangerine** (crate-ambas): solid crate-label fills for the fruta and "las dos" meal kinds. Crate Tomato also colours the streak flame on placards and weekly summaries.
- **Player palette** (player-tomato through player-ink, ten colours): the avatar body colours. The chosen one paints that player's awning stripes, the valance on every section header, and, for the leader, the top band at a 20% mix into white. These are the only source of identity colour.
- **Tie Grey** (tie-band): the band colour when nobody leads.
- **Debt Tint** (debt-tint): pale fluo fill on a store row for a reward you owe.

### Neutral
- **Ground** (ground): page background, cards, pills, sheets.
- **Lona Canvas** (canvas): section fills, inputs at rest, soft buttons, icon buttons, segmented tracks, row cards, empty states.
- **Warm Ink** (ink): text, primary buttons, the "upload today" bar, toasts, focus rings, the awning rod and valance band, the active tab marker.
- **Ink Two** (ink-2): secondary text (6.6:1 on white).
- **Ink Three** (ink-3): icons, placeholders and inactive glyphs. Not for small text.
- **Hairline** (line): dividers, the tab bar top edge, the switch-off track, the sheet grip.
- **Lightbox Scrim** (lightbox-scrim): the near-opaque warm black behind a full-screen photo. Sheets use a lighter 42% Warm Ink scrim.

The valance mask uses Warm Ink and transparent as alpha stops. They are mask values, not paint, and are not palette colours.

### Named Rules
**The Players Own the Colour Rule.** Identity colour comes only from the two avatar colours. A surface that needs a player hue reads it from that player's avatar, never from a fixed accent.

**The Fluo Is Paper Rule.** Fluo is the placard material. It marks the score, prices and the act of posting; it is never a generic highlight, and its text is always Placard Ink.

**The Verdict Pair Rule.** Vale Green and No Cuenta Red mean "counts" and "doesn't count" (plus success and error). Do not borrow them for decoration.

## Typography

**Display Font:** Archivo variable (wdth 62 to 125, wght 400 to 900), with ui-sans-serif, system-ui fallback
**Body Font:** Archivo at normal width

**Character:** One family worked across its width axis. Narrow and very heavy, it is market signage: price numerals, stall names, crate labels. At normal width and regular weight it is calm reading text.

### Hierarchy
- **Display** (900, 72px, line-height 0.82, width 62%): placard point numerals only, followed by an 18px "pts" unit at width 75%. Smaller cousins use the same recipe: weekly-summary counts (30px, width 65%), store price tags (26px, width 65%), and the Count Small step.
- **Count Small** (900, 18px, line-height 1, width 70 to 75%): point amounts, the stepper value (850), and the placard "pts" unit.
- **Code** (800, 28px, letter-spacing 0.35em, tabular, centred): the login code input only.
- **Wordmark** (900, 26px, width 70%, uppercase): "BROTE" in the top band.
- **Wordmark Hero** (900, 56px, width 70%, uppercase): the same wordmark on the login screen only.
- **Headline** (850, 30px, line-height 1, width 78%, uppercase): page titles (Tienda, Semana, Config). Login headings use the same recipe at 26px.
- **Sheet Title** (850, 24px, width 78%, uppercase): bottom-sheet titles.
- **Title** (800, 15px, letter-spacing 0.06em, width 75%, uppercase): section headings inside a screen. Stall names and day headings in the feed use the same narrow-caps voice at 15px and 13px.
- **Body Strong** (700, 17px, line-height 1.25): meal descriptions, card and prize titles, list leads.
- **Body** (400, 16px, line-height 1.4): default text.
- **Body Small** (400, 14px): the secondary-text step and the control step. Secondary lines, settings copy, schedules and steps in Ink Two at 400; small buttons, segmented options, links, toasts, post status and error text at 600 to 750. Meta lines drop to 13px.
- **Label** (850, 12px, letter-spacing 0.07em, width 72%, uppercase): crate tags; verdict stamps use it at 15px, 900.
- **Field Label** (750, 13px, letter-spacing 0.05em, width 80%, uppercase, Ink Two): form field captions.
- **Micro** (750, 11px): the floor of the ramp. Tab labels in Ink Two, the demo strip on fluo (700), and the "Gana" leader badge in narrow caps (800). Nothing goes smaller.

### Named Rules
**The Narrow Means Signage Rule.** Narrow widths (62 to 80%) and uppercase are for things that name or count: titles, numerals, tags, stamps, stall names. Reading text stays at normal width and sentence case.

**The Tabular Count Rule.** Every changing number (points, steppers, codes, schedules) uses tabular numerals so values roll and align without jitter.

## Layout

A single phone column. Content sits on 16px gutters with 28px between blocks; stacks inside cards use 10 to 14px gaps. Page headers clear the safe-area top, align the uppercase title left and actions right, and are followed by a 22px striped valance in the player's colour. The Marcador screen replaces the header with a full-bleed leader band holding the two stalls in a two-column grid (12px gap); the today pills overlap the band's bottom edge by 12px.

A fixed bottom tab bar (72px plus safe area) holds four tabs and a raised centre upload button. Screens reserve its height plus 28px at the bottom. Sheets rise from the bottom to a 560px maximum width and 92dvh maximum height.

From 640px wide, the whole app becomes a centred 520px column with a hairline outline, and the tab bar narrows to match. There is no separate desktop layout.

## Elevation & Depth

Depth is warm and soft: shadows are tinted with the ink colour (rgba 30, 27, 22), short and diffuse, never grey or hard. Most surfaces sit flat on Ground or Canvas; shadow is reserved for things that float over content (cards in the feed, pills overlapping the band, sheets, toasts) and for the world's hanging objects (placards, awnings, the valance, the upload button).

### Shadow Vocabulary
- **Rest lift** (`box-shadow: 0 1px 2px rgba(30,27,22,0.06), 0 6px 18px -10px rgba(30,27,22,0.22)`): feed cards, prize rows, today pills, the segmented thumb, the leader badge.
- **Overlay lift** (`box-shadow: 0 2px 4px rgba(30,27,22,0.06), 0 18px 40px -16px rgba(30,27,22,0.32)`): sheets and toasts.
- **Hanging placard** (`box-shadow: 0 2px 3px rgba(30,27,22,0.12), 0 12px 20px -12px rgba(30,27,22,0.4)`): score and wallet placards.
- **Raised upload** (`box-shadow: 0 2px 4px rgba(30,27,22,0.12), 0 14px 26px -12px rgba(30,27,22,0.55)`): the centre tab-bar button.
- **Awning drop** (`filter: drop-shadow(0 6px 6px rgba(30,27,22,0.12))`): stall awnings; the valance uses a 3px version.

### Named Rules
**The Warm Shadow Rule.** Every shadow is tinted with Warm Ink and has a negative spread on its long layer, so objects feel lifted off paper rather than outlined.

## Shapes

Soft and friendly. Controls are full pills (999px); cards use 22px corners, rows and inputs 16px, week cells 10px, sheets 28px top corners. Icon tiles are squircles whose radius scales with the tile: the 46px icon well of the upload bar at 14px, avatar option tiles at 18px, the 60px upload button at 20px. Small backings (the stall-name plate, the tab marker's lower corners) use 4px; verdict stamps use 8px. Paper objects (placards, price tags, crate labels) keep tight 6px corners so they read as cut card stock, and placards sit slightly rotated (wallet -2deg, weekly streak placards plus or minus 1.5deg, the leader badge 6deg). The awning and valance end in a scalloped edge of 7px half-circles under a 6px ink rod; this scallop is the system's recurring silhouette. Strokes are inset 2px ink rings (3px on selected avatar options), never borders that change layout.

## Components

### Buttons
Full pills with heavy labels, built to be hit with a thumb.
- **Shape:** full pill (999px), 52px tall, 22px side padding, 16px weight 750 label, 20px Phosphor bold icon with 8px gap.
- **Primary (Ink):** Warm Ink fill, white label. The default commit action.
- **Line:** Ground fill with a 2px inset ink ring.
- **Soft:** Canvas fill, ink label; secondary and cancel actions.
- **Verdict:** Vale (green fill, white label) and No (Ground fill, red label, 2px inset red ring), always shown as a pair on a partner's post.
- **Small:** 40px tall, 16px padding, 14px label.
- **Icon button:** 40px Canvas circle with a 20px icon.
- **Press:** every tappable scales to 0.96 on press (spring 420/34). The upload button presses to 0.9 with a -4deg twist. Disabled controls drop to 40% opacity.
- **Focus:** a 3px Warm Ink outline, 2px offset, on every focus-visible element.

### Chips (Crate Labels)
- **Style:** solid colour card (Crate Tomato for fruta, Vale Green for verdura, Crate Tangerine for las dos), white Label text, 15px Phosphor icon, 6px corners.
- **State:** static; they classify, they never toggle.

### Cards / Containers
- **Corner Style:** 22px for feed posts, the upload bar, empty states and settings panels; 16px for row cards (debts, prizes, toggles).
- **Background:** Ground with rest lift when floating over Ground; Canvas without shadow for grouped sections. A debt you owe tints to Debt Tint, a pale fluo.
- **Shadow Strategy:** rest lift only; see Elevation.
- **Internal Padding:** 12 to 14px.
- **Feed post:** avatar, name and time head; 4:3.3 photo; a verdict stamp (3px coloured border, 92% white fill, narrow 900 caps) in the photo corner; rejected photos fade to 85% greyscale. Expired photos collapse to a short Canvas placeholder.

### Inputs / Fields
- **Style:** Canvas fill, no border, 16px corners, 52px tall, 17px text, Ink Three placeholder.
- **Focus:** fill switches to Ground and a 2px inset ink ring fades in (0.18s, ease-out).
- **Error:** 14px weight 600 No Cuenta Red text under the field.
- **Code input:** 28px weight 800, 0.35em tracking, tabular numerals, centred.

### Navigation
- **Tab bar:** fixed, 92% white with an 18px backdrop blur and a hairline top edge. Five columns: Marcador, Tienda, centre upload, Semana, Config. Labels use the Micro step. Inactive tabs (icon and label) are Ink Two.
- **States:** inactive tabs use Phosphor bold icons; the active tab switches to the fill variant, turns Warm Ink, and gets a 26 by 4px ink tab hanging from the bar's top edge that slides between tabs on a shared layout spring.
- **Upload button:** a 60px fluo squircle with a camera icon, raised 14px above the bar.
- **Screen change:** content fades and slides 18px in the direction of travel (0.32s, ease-out).

### Segmented Control
A Canvas pill track with 4px padding; the selected option sits on a Ground pill with rest lift that slides between options on a shared layout spring. Unselected labels are Ink Two, selected labels Warm Ink. Used for language choice and avatar part tabs.

### Sheet
Bottom sheet on a 42% ink scrim, 28px top corners, overlay lift, a 44 by 5px hairline grip. It enters on a spring (380/38), drags down to dismiss (past 110px or 600px/s) and closes with Escape. The title uses the 24px headline recipe beside a close icon button.

### Toast
Ink pill (No Cuenta Red for errors) above the tab bar with a filled Phosphor check or warning icon. Enters rising and scaling from 0.92 on a spring; at most three, each lasting 3 seconds.

### Stall (Signature)
The scoreboard unit. A 168 by 62 striped awning (14px stripes alternating player colour and white, a 10px ink shade at the top, a 6px ink rod, scalloped bottom) unrolls from 5% height on a spring (170/17), staggered 80ms between stalls. Below it, the 64px avatar and the narrow-caps name, then the placard hanging on two 2px ink strings at 50% opacity that run behind the avatar from the awning. When points change the placard swings around the awning edge (11deg decaying over 1.5s; 7deg on first appearance) and the numeral rolls vertically in the direction of change (spring 300/28). The leader's placard carries a rotated ink "Gana" badge with a crown that pops in on a spring.

### Valance (Signature)
The awning's edge carried onto every section screen: a 22px band of 14px stripes in the viewer's avatar colour, masked to a scalloped bottom, under a 4px ink rod.

### Avatar (Signature)
An original creature whose body is a radial profile sampled at 72 points, so any of eight shapes morphs smoothly into any other (spring 260/24). Ten body colours, eight eye styles, seven mouths, five extras, optional cheeks; facial features flip to white on dark bodies. In "alive" mode it breathes (3.6s), blinks and shifts its gaze; mood switches to happy once the player has posted today.

### Week Grid
A label column plus seven square cells with 10px corners: Canvas for pending, Vale Green with a check for done, No Cuenta Blush with a red mark for missed, a 2px inset ink ring on Ground for today, and 45% opacity for future days.

## Do's and Don'ts

### Do:
- **Do** take every identity colour from the players' avatar colours, and tint the top band with the leader's colour at 20% into white (tie: Tie Grey).
- **Do** put scores, prices and the upload action on Placard Fluo with Placard Ink text and condensed 900-weight Archivo numerals.
- **Do** open every section screen with an uppercase 30px headline followed by the striped valance in the viewer's colour.
- **Do** use Phosphor icons from react-icons/pi in the bold weight, switching to the fill variant only for the active tab and for status glyphs (flame, crown, check, warning).
- **Do** animate with Motion using the shared tokens: ease-out cubic-bezier(0.16, 1, 0.3, 1), spring 420/34 for UI state, press scale 0.96, and keep MotionConfig reducedMotion="user".
- **Do** use tabular numerals for every number that changes.

### Don't:
- **Don't** add a dark theme or dark surfaces beyond Warm Ink controls; the system is light only.
- **Don't** use emojis anywhere; meal kinds, verdicts and status use Phosphor icons and crate labels.
- **Don't** add taglines, kickers or explanatory footnotes above or below titles.
- **Don't** show score as progress rings or charts on grey cards; the score lives on placards under awnings.
- **Don't** use Ink Three for small text; it is for icons, placeholders and borders.
- **Don't** use Vale Green or No Cuenta Red for anything but the verdicts, success and errors.
- **Don't** use grey or hard-offset shadows; shadows are warm, soft and spread negatively.

### Known Drift
None right now. When a value ships that is not part of the system, list it here so the next change snaps it to an existing step.
