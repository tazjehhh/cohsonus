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

Sound cannot be heard here. Balance mixes by numbers (scripts/measure.js): kick and bass around -18 dB RMS, harmony and melody -20 to -23, hats -35 to -39, master peaks below 0. Set an instrument's base level in `src/audio/voices.ts`; per-track adjustments go in the track's channel options.

## Samples

```
pip install numpy soundfile
python3 scripts/samples/build.py                 # everything
python3 scripts/samples/build.py kit.snare       # one instrument
```

The script clones the source libraries without blobs into `.cache/samples`, fetches only the files it uses, mixes the drum microphones, trims, measures the pitch of every tonal sample (octave by majority vote, fine tuning per file) and writes `public/samples/`, `src/audio/samples.json` and `CREDITS.md`.

Synth instruments are rendered from Surge XT factory patches. They need the Python bindings:

```
apt-get install libasound2-dev libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxcomposite-dev libxext-dev libfreetype-dev libfontconfig1-dev libcurl4-openssl-dev
git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/surge-synthesizer/surge.git
cmake -S surge -B surge/buildpy -GNinja -DCMAKE_BUILD_TYPE=Release -DSURGE_BUILD_PYTHON_BINDINGS=ON && ninja -C surge/buildpy surgepy
SURGEPY=surge/buildpy/src/surge-python SURGE_PATCHES=surge/resources/data/patches_factory python3 scripts/samples/build.py synth.bass
```

Drum machines (808, 909) are to come from Freesound, CC0 only, with the key in `FREESOUND_API_KEY`. Until then they are Surge renders: `machine.kick` from the factory bank, `machine.hat`, `machine.open` and `machine.clap` from the bundled third-party "Emu" drum patches; the 808 is the Surge sub bass with a pitch drop.

Samples keep their stereo; a pair whose sides are identical is stored as mono. Hats use the overhead microphone only, with a highpass, and the lo-fi hat gets hum notches. Channels take `pan` and `lowpass` options; meters read after the pan, so a part panned off centre measures quieter. The master is gain 0.45 → limiter → tanh ceiling, so nothing passes 0 dBFS.

## Principles

- Ear first, name second. A step makes the learner listen, guess, build or fail before a term appears. Reveals come after the attempt.
- No meta text. No "in this lecture you will", no explaining why an exercise exists, no praise filler. Prompts are questions or instructions; reveals are content.
- Explanations are interactive too: sound, motion, something to click. Text, images and moving images are composed together like a good interactive e-learning: pages built from `Page`, `Spread`, `Figure` and `Art` (`src/ui/page.tsx`).
- Text is written in a textbook voice: prompts are complete sentences, feedback is one neutral sentence, and after the attempt an `Explain` block (`src/ui/Explain.tsx`) defines each new term in bold, explains how it works, ties it to what was just heard, and gives context. The full rules become `docs/text.md` once the owner approves the rewrite.
- Each lecture has its own mode and look. The house style (hub, Anatomy of a Track, Pulse & Groove, Into the DAW) is a deliberately plain base. Visual direction for lectures with their own world comes from the owner's references: do not invent finished aesthetics unasked.
- Everything centered. Desktop browser. The hub shows the lectures as a tree that branches down from Anatomy (Path), as a plain list (All) or by release date (Released); a lecture is a closed full-screen experience.
- Motion runs at 24 drawings a second at most, like film animation on ones, at real-time speed. Every drawing should show a visible change; space them with ease-out, hold key poses, never flicker or rush. CSS: `--drawing` and `--frames-n` in `src/styles.css`, or keyframes held with `step-end`. JS: `useDrawings` in `src/ui/drawings.ts`, which locks drawings to the beat while a player runs. A step that lights up as it sounds is an event, not motion: it lands on time. (12 a second was tried and looked wrong to the owner.)
- Card art is the owner's, made by hand. Do not draw card art; leave the placeholders.
- One Loop is the single source of truth: it drives the sound, the step grid and the notation at once.
- Checks are deterministic. There is no AI at runtime.
- The road between lectures is a suggestion, not a lock. Every lecture must work on its own.
- Refreshers test first; the summary comes after.
- Examples from real music are genre classics, linked (YouTube search), never embedded.
- Every sound is a recording or an offline render. Nothing is synthesized in the browser. Only CC0 or CC-BY sources (attribution on the Sounds page), or our own renders; never "royalty-free" packs, which forbid passing the sounds on.
- YAGNI for the shared engine (platform first: Web Audio, SVG, CSS). Not for the craft of a lecture, which is allowed to be bespoke.
- Verify visually: screenshot every step you change and look at it.
- docs/plan.md, docs/findings.md and docs/progress.md are committed. Containers are thrown away; the repo is the memory.

## Map

- `src/audio/` engine (context, reverb, limiter), `sampler.ts` (velocity layers, round robin, pitched playback, choke groups), `voices.ts` (voice name → instrument and level), `samples.json` (generated manifest), `mixer.ts` (channels with mute, analyser, dusty and echo), `player.ts` (look-ahead scheduler, swing, solo/mute; loads its samples before it starts), `usePlayer.ts`
- `public/samples/` the audio (FLAC), built by `scripts/samples/build.py`
- `src/music/` pure logic: `model.ts` (Loop, Lane, Note), `patterns.ts` (pattern strings, humanize), `timing.ts` (swing, tap tempo, quantize), `checks.ts` (backbeat, fills…), `notation.ts` (drum notation layout)
- `src/ui/` shared pieces: StepGrid + DrumStaff (same column layout), Studio, Strips (mixer), Spectrum, BeatCircle, Choice, `page.tsx` (Page, Spread, Figure, Art), `Explain.tsx`, `drawings.ts` (the 24-a-second drawing clock)
- `src/lectures/<id>/art/` pictures the owner makes for a lecture's pages, picked up by `Art` by file name; until one exists, `Art` shows an empty frame naming the file and size
- `src/lectures/` `types.ts`, `LectureView.tsx` (cover → part intro → steps → homework), `RefresherView.tsx`, `registry.ts` (all eleven lectures, road order), one folder per built lecture
- `src/hub/` `Hub.tsx` (Path / All / Released), `map.ts` (tree layout; lines that skip a row get their own gap), `cards/` (card art: `<lecture id>.<png|jpg|gif|webp|svg>`, 600 × 480; replace a placeholder by dropping in a file with the same name)

## Adding a lecture

1. Folder `src/lectures/<id>/` exporting a `LectureDef` (parts → steps, homework, refresher tasks).
2. Each step is a component that calls `complete(data)` when its task is met; stored data comes back as `saved`, other steps' data as `memory`.
3. On its entry in `registry.ts`: set `def`, `released` (YYYY-MM-DD) and `after` (the lectures it branches from on the map).
4. A new entry also gets a placeholder in `src/hub/cards/` until the owner makes its art.
5. Screenshot every step; run the flows that touch it.
