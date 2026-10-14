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
- Card art is now placeholder images (src/hub/cards) for the owner to replace by hand; the miniatures are gone.
- All motion runs at 12 drawings a second at most, at real-time speed: stepped easing tokens in CSS, held keyframes for the beat ring, and a drawing clock (useDrawings) for meters, spectrum and the beat circle, locked to the beat. Measured: meters redraw 10.3 times a second at 124 BPM, never closer than 1/12 s.
- Hub rebuilt as a tree that branches down from Anatomy, with lines routed through their own gaps; plus All and Released views, remembered per browser.
- Path view reworked to guide the eye: one big card for the lecture to do next (the map is centred on it), small title cards down to one row below it, dots further down drawn in toward the centre, line brightness by role (walked, ahead, far), hovering a lecture lights its branches.
- Motion moved from 12 to 24 drawings a second (owner: 12 did not look right); same durations, tokens and the beat ring redrawn for 24.
- Pulse part 2 A/B fixed: both versions now carry a bass line and chords that start each bar, so the swapped snare in A is audible as wrong.
- Pages: `Page`, `Spread`, `Figure`, `Art` (owner picture slots) and four composed pages: building a track in layers (Anatomy 1), frequency (Anatomy 2), tempo ranges by genre (Pulse 1), the origins of swing (Pulse 4). Each has a figure that moves or plays on the 24-a-second clock.
- Text rewritten in a textbook voice (draft rules in the session; rule doc after owner approval): prompts as complete sentences, neutral one-line feedback, `Explain` blocks with defined terms after each attempt.
- Audio rework from measurements: stereo samples (side was 34 dB under mid, now 9–15), an audible reverb with pre-delay and a darker tail (return −19 to −20 dB under the direct sound on harmony and melody), hats without hum (house hats below 100 Hz from −69 to −104 dB), drum-machine hats and clap for house, the house lead lowpassed, the boom bap sub saturated so small speakers hear it, a varied guitar strum, the 808 retrigger fix, and a master chain with no overs (true peak −0.4 to −0.6 dBFS, limiter at most 0.4 dB). All Anatomy channels within the level targets. Pulse's drum-machine set uses the new hats and clap; trap hats brought down to −34 dB.
- Lecture preview in the hub: a click lifts the card out; it dips, grows to about half the screen, settles, the hub blurs behind it, and title, description and actions come in one after another (24 drawings a second, counted from the clock so a slow frame skips a drawing instead of slowing the move). Escape, the background or × close it the same way back. Start goes to the part intro; Continue resumes at the saved step. Every lecture has a summary in the registry.
- Removed sentences in which the app described its own figures and screens, per the owner's clarified rule.

