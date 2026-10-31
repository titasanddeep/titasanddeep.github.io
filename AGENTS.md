# AGENTS.md — Titas & Deep · তিতাসের বাড়ি থেকে

The bride's side of a Bengali wedding invitation. It is the companion to the groom's film at
https://deepandtitas.github.io/ ("Deep & Titas"). This film is Titas's to share: one wedding day in her home, about 53 s,
from the গায়ে হলুদ to শুভদৃষ্টি and মালাবদল, ending on an interactive invitation card that lists **the wedding only**.

A Remotion composition (1080×1920, 60 FPS, paced in 30-per-second "beats") plays inside a mobile-first React shell
via `@remotion/player`. **The whole picture is drawn into ONE canvas** from pure draw lists, and the DOM holds only that
canvas, text and tap targets. The groom's film used to draw about 40 DOM layers; on phones that needed about 300 MB of GPU tile
memory and parts of the picture blinked out. The one-canvas engine fixed it: 25–70 MB, 0 missing tiles, about 88 fps on a
moto g96. Keep it that way.

## State of this repo
The engine, shell and tooling come from the groom's repo; the film is built on them.
- `spec/story.md`: the story brief (scenes, beats, cast, settings) and, in §6, the family's decisions so far. Its §0
  holds the family's revised outline (2026-10-31), which the film follows, and the groom's original outline as history.
  Keep it up to date as the film changes.
- The full-day 120 s film (dawn, pond, tattva, adornment, বরণ, সাত পাক) is kept at the git tag `full-day-120s`.
- `reference/deep-film/` (git-ignored, so only in checkouts that have it): the groom's film-specific code and docs,
  **read-only, not compiled, linted or tested**. Its docs are in `reference/deep-film/docs/`: `CONTRACTS.md`
  (interfaces, conversion rules, budgets) and `SPEC/*.md`.
- The film: `src/story/{timeline,layout,camera,choreography}.ts`, `src/scene/{frame,holud,wedding,invitation,text,kit,figure}.ts`.
  Each setting is a 1080×1920 *set* seen through its own camera (`src/story/camera.ts`: shots with moves and cuts).
  The holud and the wedding meet in one vertical move: the holud rises to a shared framing (`HIGH` in `camera.ts`),
  and the wedding starts there and comes down.
- Engine changes made for this film: the rig (`src/story/rig.ts`) has a third figure (`mother`), sitting (`sit`),
  Titas's two looks (`look`: `holud`, `wedding`), haldi, and face points; `figure.ts` draws them. Explore mode holds on
  the next stop's object (`guidedHoldFrame` in the timeline, used by `usePlayerEvents`), with a caption
  (`guide-caption`). The soundtrack (the groom's, 50 s) plays once; the film is timed so the card is complete when it
  ends (`TRACK_SECONDS` in `src/app/lib/soundtrackVolume.ts`).
- Tools added: `scripts/measure-text.mjs` (text widths and line counts with the shipped fonts) and
  `scripts/art/sheet.mjs` (contact sheets of art or stills for review).

## Commands
- `npm run dev` — Vite dev server · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`
- `npm run studio` — Remotion Studio (composition `TitasAndDeepWedding`) · `npm run render` (MP4) · `npm run still`
- `npm run art` — generate and bake the painted art (`scripts/art/*.mjs` → `public/art/*.webp` + `src/art/manifest.ts`).
  `scripts/art/characters.mjs` (Deep and Titas) and `sprites.mjs` are reused. Add this film's generators to
  `scripts/generate-art.mjs`.
- `npm run stills` / `node scripts/stills.mjs <frames…> [--lang=en] [--scale=0.5]` — PNGs to `out/stills/`. Look at them.
- `npm run phone` — **the device gate**: plays the build on a USB-connected Android phone (adb + Chrome over CDP) and
  prints GPU tile memory, out-of-memory share, checkerboarded draws and fps per stretch.
  - `node scripts/phone-record.mjs --python=<python with opencv-python + numpy>` records a full play-through and scans
    it for blinks (`scripts/phone-scan.py`).
  - `node scripts/phone-controls.mjs` taps every control with real touch events.
- `npm run profile` — headless throttled-phone benchmark (relative numbers only). Compare with the groom's film on the same machine:
  `node scripts/profile.mjs --url=https://deepandtitas.github.io/ --timeline=reference/deep-film/src/story/timeline.ts`

## Architecture (single sources of truth)
| What | Where |
|---|---|
| timing: scenes, beats, checkpoints, skip, duration | `src/story/timeline.ts` |
| positions (couple, mother, props, card, hotspots, camera focus) | `src/story/layout.ts` |
| motion: anim helpers, camera, rig (IK, walk, blinks), choreography (poses, sprite states) | `src/story/*` (pure) |
| strings / event details / asset URLs | `src/content/translations.ts` / `wedding.ts` / `assets.ts` |
| painted art | `scripts/art/*.mjs` → `src/art/manifest.ts` (generated) |
| what is on screen at a frame | `src/scene/frame.ts` `describeFrame(frame, ctx) → { draw: DrawOp[], overlay: OverlayItem[] }` (pure), built from `src/scene/*` |
| how it is drawn | `src/render/canvas.ts` (the only canvas code), `mat.ts`, `ops.ts`, `overlay.ts`, `textStyles.ts`, `images.ts` |
| composition | `src/remotion/` — `StoryCanvas` (one canvas) + `Overlay` (a fixed set of text/tap elements) |
| website shell | `src/app/` — loader, cover, controls, guided state machine, language, soundtrack, stage layout |

## Rules
1. **Pure and frame-driven.** Everything on screen is a pure function of the frame and context. No `Date`,
   `performance`, `Math.random` or timers in `src/story`, `src/scene` or `src/render` (lint-enforced). The same frame gives the same picture.
2. **Single sources of truth** (table above). No numeric frame or beat literals in `src/scene`; derive them from the timeline.
3. **One picture canvas.** Never add `<img>`, `<svg>`, CSS gradients or `will-change` imagery to the composition;
   draw it as ops. The overlay's element set is FIXED for the whole story (hidden with opacity/visibility), and each box is sized
   to its content. Only hotspots and the map link take pointer events.
4. **No `import.meta.env`** in `src/remotion`, `src/scene`, `src/story` or `src/render`; pass values in via input props.
5. **Asset URLs** go through `asset(base, src)` with the `assetBase` prop. The hosting address is **not decided yet**
   (see `spec/story.md` §6). `index.html` and `.github/workflows/deploy.yml` say what to set once it is.
6. **Never fabricate wedding details.** Blank fields stay hidden. The card shows the wedding only, exactly as in
   `wedding.ts`, and the map link opens `wedding.mapUrl` exactly. At the family's request the card's invitation line
   was written for the film and is signed "তিতাসের পরিবার / Titas's family" (spec/story.md §6.1). Never invent hosts'
   names or any other real-world detail; add names only when the family gives them.
7. **Cultural respect.** The order is fixed by the family's revised outline (spec/story.md §0.1): গায়ে হলুদ → পিঁড়ি →
   শুভদৃষ্টি → মালাবদল (the bride garlands the groom first) → the wedding invitation. At the family's request the film
   no longer shows দধি মঙ্গল, জল সইতে, the তত্ত্ব trays, শাঁখা-পলা/সাজ, the বরণ or the সাত পাক; do not bring them back unless
   they ask. Leave out the fire ritual, সিঁদুরদান, সম্প্রদান, কনকাঞ্জলি/বিদায়, আইবুড়োভাত and বাসর ঘর unless the family asks
   for them. When unsure, depict something symbolically, and ask.
8. **Characters.**
   - Deep and Titas are drawn only by `src/scene/figure.ts` from the parts in `scripts/art/characters.mjs`, using
     `src/story/rig.ts`. Their rest geometry must match `SKELETON`.
   - Titas's mother is the only other full character. She is generic, not modelled on anyone, in the same style, and gets her own parts.
   - Everyone else (the other women, the piri bearers) appears only as silhouettes or hands.
9. **Fonts.** Anek Bangla (variable 100–800); Galada for the names (always `DISPLAY_WEIGHT`); Cormorant Garamond for
   English. Bengali boxes that clip need `BN_PAD` block padding. The names read bride first: **তিতাস ও দীপ / Titas & Deep**.
10. **Audio** is optional, starts after a user gesture, and a missing track degrades silently (a plain `<audio>` in the shell).
    `public/audio/soundtrack.mp3` is the groom's film's track, kept at the family's request; it plays once (never
    loops), and the film is timed so the card is complete as it ends. Retime `BEATS.invitation` if the track changes.
11. Bengali is the default language; every visible string comes from `translations.ts`. "Watch the story" is always
    the primary cover action. Guided-mode checks use `>=` (the Player can skip frames).
12. The Player renders at 1080×1920 (scale 1); `useStageLayout` scales it with one CSS transform, fitted to `svh`.
13. **Verify on a phone.** Anything aimed at phones must meet these on a real phone (USB debugging, Chrome):
    - `npm run phone`: 0% out of memory and 0 checkerboarded draws in every stretch, tile memory ≤ 80 MB, about 60 fps;
    - `phone-record`: no blinks.

    Headless Chrome cannot reproduce phone GPU limits, so never claim a phone fix from headless numbers alone. When no
    phone is connected (`adb devices -l` is empty), build and verify everything else, keep to the engine's budgets
    (`npm run profile`, reference/deep-film/docs/CONTRACTS.md), and report the phone gates as **not run yet**.
