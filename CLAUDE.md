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

Drum machines (808, 909) are to come from Freesound, CC0 only, with the key in `FREESOUND_API_KEY`. Until then `machine.kick` is a Surge render and the 808 is the Surge sub bass with a pitch drop.

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
- Examples from real music are genre classics, linked (YouTube search), never embedded.
- Every sound is a recording or an offline render. Nothing is synthesized in the browser. Only CC0 or CC-BY sources (attribution on the Sounds page), or our own renders; never "royalty-free" packs, which forbid passing the sounds on.
- YAGNI for the shared engine (platform first: Web Audio, SVG, CSS). Not for the craft of a lecture, which is allowed to be bespoke.
- Verify visually: screenshot every step you change and look at it.
- docs/plan.md, docs/findings.md and docs/progress.md are committed. Containers are thrown away; the repo is the memory.

## Map

- `src/audio/` engine (context, reverb, limiter), `sampler.ts` (velocity layers, round robin, pitched playback, choke groups), `voices.ts` (voice name → instrument and level), `samples.json` (generated manifest), `mixer.ts` (channels with mute, analyser, dusty and echo), `player.ts` (look-ahead scheduler, swing, solo/mute; loads its samples before it starts), `usePlayer.ts`
- `public/samples/` the audio (FLAC), built by `scripts/samples/build.py`
- `src/music/` pure logic: `model.ts` (Loop, Lane, Note), `patterns.ts` (pattern strings, humanize), `timing.ts` (swing, tap tempo, quantize), `checks.ts` (backbeat, fills…), `notation.ts` (drum notation layout)
- `src/ui/` shared pieces: StepGrid + DrumStaff (same column layout), Studio, Strips (mixer), Spectrum, BeatCircle, Choice
- `src/lectures/` `types.ts`, `LectureView.tsx` (cover → part intro → steps → homework), `RefresherView.tsx`, `registry.ts` (all eleven lectures, road order), one folder per built lecture
- `src/hub/` lecture cards; `previews.tsx` draws each built lecture's own stage in miniature as its card art

## Adding a lecture

1. Folder `src/lectures/<id>/` exporting a `LectureDef` (parts → steps, homework, refresher tasks).
2. Each step is a component that calls `complete(data)` when its task is met; stored data comes back as `saved`, other steps' data as `memory`.
3. Set `def` on its entry in `registry.ts`.
4. Add its card art to `PREVIEWS` in `src/hub/previews.tsx`: its own stage in miniature, not a standalone icon. Until then the card shows its number.
5. Screenshot every step; run the flows that touch it.
