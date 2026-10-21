# Handoff: Treningsapp (Miguel + trener Ruben)

## Overview
A training app for one triathlete (Miguel, Ironman 70.3 Venice-Jesolo, 24 April 2027) and his coach (Ruben). The plan runs 26 weeks, from Monday 26 Oct 2026 to 24 Apr 2027. UI language: Norwegian (bokmål). Mobile first, and it must work fully on desktop. Dark mode is the default.

Start with **`BUILD_PLAN.md`**, then **`phase1/PHASE1.md`**. Build one phase at a time and stop after each phase so the owner can test.

## About the design files
`prototype/Treningsapp v5.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look, copy and behaviour, but it is **not production code**. Rebuild it in Next.js + TypeScript (see BUILD_PLAN.md) with real data from Supabase. Open the HTML in a browser. It starts as Miguel; log out under Innstillinger and pick "Ruben (trener)" to see the coach view.

`prototype/Treningsapp v5.dc.html` is the prototype's source. The logic class at the bottom of the file holds all the behaviour, data shapes, copy and formulas: progression, the session builder, the wheel picker, swap/skip rules and countdown. Treat it as the spec when something in this README is ambiguous. It does not open on its own; use the `.html` file to view it.

## Fidelity
**High fidelity.** Match colours, type, spacing, radii, copy and interactions exactly.

## Design tokens
Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui`. Large numbers use `ui-rounded, "SF Pro Rounded", system-ui` with tabular numerals.

| Token | Dark (default) | Light |
|---|---|---|
| bg | #1A1A1C | #F7F6F3 |
| card | #242426 | #FFFFFF |
| card2 (segmented, wheel band) | #303033 | #EFEDE8 |
| sheet / row | #242426 / #303033 | #FFFFFF / #F4F2EE |
| ink | #F5F5F7 | #2B2B2B |
| muted | #9C9CA2 | #75726C |
| faint | #5F5F65 | #B3AFA8 |
| line | #333336 | #ECE9E3 |
| shadow | none | 0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(0,0,0,.05) |
| swim | #2EB8FF | #0A9FE8 |
| bike | #FFC80A | #E5A800 |
| run | #FF453A | #F0352B |
| strength | #BF5AF2 | #AF52DE |
| ok (✓ Strava, saved) | #32D74B | #28A745 |
| warn / bad | #FFB340 / #FF453A | #FF9500 / #FF3B30 |
| countdown ring | gradient #0A84FF → #2DD4BF | same |

- **Sport tint:** cards use `color-mix(in oklch, <sport> 14%, var(--card))`. Sport colour appears only on the icon and the label.
- **Radii:** 18–22 for cards, 14 for rows and buttons, 999 for chips, 10 for segmented controls.
- **Type scale:** large titles 34/700 (letter-spacing −0.02em); section 20/700; card title 22/700; body 15–16; meta 12–14; numbers 24–68.
- **Spacing:** page padding 18 (mobile) / 40–44 (desktop), 26 between sections on Hjem, 10–16 between cards.
- **Layout:** the sidebar (228 px) appears at ≥ 900 px; below that, a bottom tab bar. Hjem is a single centred column with max width 720 px.

## Screens: athlete (Miguel). Tabs: Hjem · Trening · Progresjon
1. **Hjem**, top to bottom:
   - Logo (mobile), date, "Hei, Miguel", and either "Uke X av 26 · <blokk>" or, before the start, "Planen starter mandag 26. oktober".
   - The countdown ring sits on the right. It is 112 px, stroke 11, and fills with plan progress. The centre reads "JESOLO / 185 / dager".
   - **Dagens innsjekk:** 2×2 tiles on mobile, 4 in a row on desktop: Vekt, Søvnscore, Søvn, VO2 maks. Each tile shows the latest value and a trend arrow ("↓ 0,1 fra 14. okt"). Tapping a tile opens a bottom sheet with a wheel picker and "Lagre". A saved tile turns soft green with a ✓.
   - **I dag:** "Dagens fokus: …" (set by Ruben per day), then the session card(s) with a sport tint. A rest day shows "Hviledag" and "I morgen: …".
   - **Denne uka:** four small tiles: Sykkel / Løp / Svøm km done of planned, and Styrke sessions. Swim shows "Pause" until 1 Jan 2027.
2. **Session page:** Tilbake; tag, title and date line; a banner when changed; three key-number tiles; the Strava match; Program steps; exercises plus "Start styrkelogg" (strength); "Fra Ruben" note; "Bytt økt"; a comment thread.
3. **Bytt økt** (bottom sheet) has four options:
   - Innendørsversjon (the coach's alternative).
   - Flytt til annen dag (this week).
   - Kort versjon (60 %).
   - Hopp over, with a reason: Vær / Syk / Sliten / Skade / Ikke tid.

   Each change notifies the coach.
4. **Styrkelogg** (full screen, gym mode):
   - One exercise at a time, with progress segments at the top.
   - Two wheels, kg (0–200, step 2.5) and reps (1–30), prefilled from last time.
   - "✓ Sett N ferdig"; after the last set it auto-advances. Swipe or ‹ › moves between exercises. A summary screen comes at the end.
5. **Trening:** the week list, day by day, with ‹ › and swipe. Planned sessions vs ✓ Strava, skipped, moved and paused states. Tiles show km done / planned.
6. **Progresjon:**
   - Segmented FTP / Vekt / VO2 maks / Søvn, with a big value, the delta and a line chart.
   - Weekly volume planned vs actual (bars, weeks 1–8, sport switch).
   - Skadelogg (injury log) with "+ Ny".
7. **Innstillinger:** theme Lys / Mørk / System; Strava connected; Garmin status; Logg ut.

## Screens: coach (Ruben). Tabs: Ukeplan · Økter · Varsler (badge) · Miguel
1. **Ukeplan:**
   - Header: ‹ "Uke 1 · Grunnlag 1 · 26. okt – 1. nov" › plus "Kopier uke til…". Nothing else.
   - When it applies, a line reads "Svømming pauset til januar (skulder)", and paused swim sessions are hidden.
   - Seven day columns on desktop (≥ 760 px content width), a list on the phone. Each day has: name, date, a "Dagens fokus" inline input, session chips (tinted, icon, title, meta, status flag), and "+".
   - Drag a chip to another day to move it.
2. **"+" flow:**
   - Pick a sport (4 big tinted buttons), then choose "Velg fra mine økter" or "Ny økt".
   - **Ny økt builder:**
     - Name.
     - For bike, run and swim, parts added with "+ Del": Oppvarming / Drag / Pause / Nedkjøling. Each part is Tid or Distanse, with a target: Watt / Tempo / Sone / Kadens, depending on the sport. Drag parts have "Gjenta ×", which adds reps and rest between, e.g. "4× [8 min @ 223 W + 2 min rolig]".
     - For strength: pick exercises from a list or type a new one; sets, reps, RiR and rest on wheels.
     - Optional note and indoor alternative.
   - Save with "Bare denne dagen" or "Lagre i mine økter".
3. **Session edit panel:**
   - Main value on a wheel. Each built-in session has one main value: distance, watt, pace or sets.
   - "Øk hver uke med" chips (e.g. +2 / +5 / +10 km, +2 / +5 W, −5 s, +1 sett). These fill the weeks from next week through week 23.
   - Note, indoor alternative, day, comments, "Endre innhold" (built sessions).
   - Save with "Bare denne dagen" or "Alle kommende uker"; "Fjern fra uka".
4. **Kopier uke til…:** quick picks (Resten av blokken / Neste uke / Alle resterende) plus a U-number grid with multi-select.
5. **Økter:** the library grouped by sport, plus "+ Ny økt".
6. **Varsler:** Miguel's changes with their reason. "Håndter" opens a modal with four choices: Dropp den / Flytt den / Legg til som dobbeløkt / Erstatt. The modal also pops up automatically at login when anything is unhandled.
7. **Miguel:** check-in values, tests (+ Ny test via wheels), weekly goals (wheels), comments, injury log.
8. **First-time guide:** three steps, Velg uke → Trykk + → Lagre.

## Key interactions
- **Wheel picker** (used everywhere): momentum on touch drag; mouse click-drag; trackpad/mouse wheel spins it; arrow keys work too. Items are 44 px, with a centre band, 3D fade and snap with ease-out-cubic over 220 ms. It starts at the last saved value. See the `Wheel` class in the source.
- **Real date:** use `new Date()`. Plan week = floor((today − 2026-10-26) / 7) + 1. The countdown is the number of days to 2027-04-24 and recalculates daily.
- **Sheets:** bottom sheet on mobile (radius 22 22 0 0), centred on desktop; the editor docks to the right on desktop. Animation: translateY 24 px → 0 with fade, 250 ms.
- **Toasts:** a dark pill at the bottom for confirmations ("Ruben har fått beskjed", "Lagret").
- **Optional sessions** ("Styrke 3 – Valgfri", Sunday) never count as missed and are excluded from planned volume.

## Assets
- `assets/logo.svg`: an original flat logo of three silhouettes on stepped bars (swim #19B2F5, bike #FFC20E, run #FF3B30).
- `assets/icon-180.png` (apple-touch-icon) and `icon-512.png` (PWA): the logo on #1A1A1C.
- Icons: sport icons are inline SVG masks (bike, run, swim, dumbbell). See `ICONS` in the source.

## Files
- `BUILD_PLAN.md`: architecture, security, phases.
- `phase1/PHASE1.md`: Phase 1 step by step.
- `phase1/schema.sql`: Supabase schema with Row Level Security.
- `prototype/`: design reference.
- `assets/`: logo and icons.
