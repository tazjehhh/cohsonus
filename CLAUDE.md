# cohsonus

A learning platform for music craft: what the parts of a track do, why things sound right, and how that moves into a DAW. The owner is learner number one and curates the content by going through it. The product is in English.

## Run

```
npm install
npm run dev          # http://localhost:5173
npm test             # vitest: timing, checks, notation
npm run typecheck
npm run build
```

Browser checks (need the dev server on :5173; Chromium is at /opt/pw-browsers/chromium):

```
node scripts/shot.mjs "#/l/pulse" shots/x.png "click:.btn.primary" "wait:500"   # one screenshot after actions
scripts/walk.sh pulse 2 5                                                      # every step of part 3
node scripts/flows.mjs                                                         # drives tap, record, rebuild, final beat
node scripts/shot.mjs "<hash>" shots/x.png ... "eval:$(cat scripts/measure.js)"  # channel levels of what is playing
```

Sound cannot be heard here. Balance mixes by numbers (scripts/measure.js): kick and bass around -18 dB RMS, harmony and melody -20 to -23, hats -35 to -39, master peaks below 0.

## Principles

- Ear first, name second. A step makes the learner listen, guess, build or fail before a term appears. Reveals come after the attempt.
- No meta text. No "in this lecture you will", no explaining why an exercise exists, no praise filler. Prompts are questions or instructions; reveals are content.
- Explanations are interactive too: sound, motion, something to click. No text block without something to hear or touch.
- Each lecture has its own mode and look. The house style (hub, Anatomy of a Track, Pulse & Groove, Into the DAW) is a deliberately plain base. Visual direction for lectures with their own world comes from the owner's references: do not invent finished aesthetics unasked.
- Everything centered. Desktop browser. The hub scrolls horizontally; a lecture is a closed full-screen experience.
- One Loop is the single source of truth: it drives the sound, the step grid and the notation at once.
- Checks are deterministic. There is no AI at runtime.
- The road between lectures is a suggestion, not a lock. Every lecture must work on its own.
- Refreshers test first; the summary comes after.
- Examples from real music are genre classics, linked (YouTube search), never embedded. All audio is synthesized in the browser.
- YAGNI for the shared engine (platform first: Web Audio, SVG, CSS). Not for the craft of a lecture, which is allowed to be bespoke.
- Verify visually: screenshot every step you change and look at it.
- docs/plan.md, docs/findings.md and docs/progress.md are committed. Containers are thrown away; the repo is the memory.

## Map

- `src/audio/` engine (context, reverb, limiter), `instruments.ts` (all synthesized voices), `mixer.ts` (channels with mute, analyser, dusty and echo), `player.ts` (look-ahead scheduler, swing, solo/mute), `usePlayer.ts`
- `src/music/` pure logic: `model.ts` (Loop, Lane, Note), `patterns.ts` (pattern strings, humanize), `timing.ts` (swing, tap tempo, quantize), `checks.ts` (backbeat, fills…), `notation.ts` (drum notation layout)
- `src/ui/` shared pieces: StepGrid + DrumStaff (same column layout), Studio, Strips (mixer), Spectrum, BeatCircle, Choice
- `src/lectures/` `types.ts`, `LectureView.tsx` (cover → part intro → steps → homework), `RefresherView.tsx`, `registry.ts` (all eleven lectures, road order), one folder per built lecture
- `src/hub/` lecture cards with hairline figures

## Adding a lecture

1. Folder `src/lectures/<id>/` exporting a `LectureDef` (parts → steps, homework, refresher tasks).
2. Each step is a component that calls `complete(data)` when its task is met; stored data comes back as `saved`, other steps' data as `memory`.
3. Set `def` on its entry in `registry.ts`.
4. Screenshot every step; run the flows that touch it.
