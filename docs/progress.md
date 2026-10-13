# Progress

## 2026-10-13

- Scaffolded Vite + React + TypeScript; fonts IBM Plex Sans/Mono; hairline for hub figures.
- Built the audio engine: synthesized kick/snare/clap/hats/toms/crash/808, synth bass, sub bass, plucked bass (Karplus–Strong), stabs, electric piano (FM), pad, lead, flute, strummed and lead guitar. Mixer channels with meters, dusty record treatment, echo; master compressor and limiter.
- Built hub, lecture shell, refresher shell, progress in localStorage.
- Built 00 Anatomy of a Track and 01 Pulse & Groove.
- Mix balanced by measurement (scripts/measure.js).
- Verified: unit tests (timing, checks, notation), screenshots of every step, flows in Chromium (tap tempo, find the one, rebuild, live record + quantize, final beat rules).

- Replaced browser synthesis with samples: built Surge XT Python bindings from source, wrote scripts/samples/build.py (fetch, mic mixing, trimming, pitch check, FLAC, manifest, credits), wrote the sampler (velocity layers, round robin, pitched playback, hi-hat choke, mono 808), rebalanced all mixes by measurement, added the Sounds page.
- Hub card art: replaced hairline figures with live miniatures of each lecture's stage; unbuilt lectures show their number. Dropped the hairline dependency, loaded latin-only font subsets, set a relative base so the build runs from any folder.
- Published a desktop preview as a private artifact (samples converted to WAV for it, since artifacts do not serve FLAC).
