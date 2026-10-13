# Findings and decisions

## From the owner

- Big music fan, no craft knowledge. Wants to understand, not collect facts. "Strictly educational": no feeling of having understood the world after skimming.
- Lectures are closed packages that can span several sessions. Short refreshers for later.
- Not learning to play an instrument: learning what instruments do in music, their role, how they are handled, and the move into the digital world.
- Listens to hip-hop/beats, electronic music, indie/rock/band music. Has no DAW yet.
- Wants to build first for themselves, later publicly.
- No AI at runtime; content is curated.
- Notation: piano roll / step grid and staff notation shown in parallel.
- Learns irregularly: short closable parts, warm re-entry, no streaks.
- Road between lectures: recommendation only.
- Each lecture gets its own mode and look ("not every one fancy, every one fitting"). Examples given: Sampling in an early-2000s MPC / hip-hop / electro / breaks look, beige-grey with strong contrasts, a touch of Y2K. Early piano white on black, slow, classy.
- Wants to give the design input themselves. Finished design solutions handed over make it harder to be creative. Collect their references first; do not pre-chew looks.
- "Anatomy" should not look medical or anatomical.
- No self-referential text: no meta explanations of what something is for.
- Everything centered, desktop browser, hub scrolls horizontally, lectures are closed experiences.
- Song examples: genre classics.
- Card art: the owner makes it by hand. Single hairline objects did not fit, and neither did miniatures of each lecture's stage. Placeholders until then.
- Into animation and knows the craft. Motion at most 12 drawings a second (on twos), real-time speed kept: fewer drawings, not slower playback. The card miniatures moved far too quickly.
- The hub is a tree, not a line: Anatomy branches into strands that branch again. Switch between the recommended path, all lectures, and by release.
- Wants text, images and moving images in the lectures too, composed to fit: an interactive e-learning, not only exercises.
- Found the sample version still sounding bad ("the song works, but it sounds really bad").
- Name: cohsonus, from coherent; co-sonus and co- as in cooperative were also in mind.

## Repos the owner likes, and what was taken

- lucasmarkes/hairline: isometric line figures that answer the pointer. Tried as hub card art and dropped: the owner found single objects wrong for a card. A card shows the lecture's whole world, so each card now draws that lecture's own stage in miniature (Anatomy: the strips with live meters; Pulse: the step grid over the staff, running). The tour idea (a figure shows itself, then hands over) still fits the listen phase.
- wheresryan22/anatomy: agent skill that explains an idea as a working machine. Taken: one model drives everything shown; screenshot verification. Candidate for hero objects later (MPC, 808, tape reel, piano action).
- ManimCommunity/manim: taken as a grammar (one shape transforms into another), built live in the browser: the bar circle unrolls into a line.
- dmtrKovalenko/fframes: Rust framework that renders video from SVG frames. Not used; lectures need interaction rather than video.
- DietrichGebert/ponytail: YAGNI ladder, applied to the shared engine.
- OthmanAdi/planning-with-files: the three planning files in docs/, committed.
- rebelytics/one-skill-to-rule-them-all: later, for the curator loop.
- sickn33/agentic-awesome-skills: candidates against generic UI (anti-ui-slop, tastegate), not installed. No Web Audio skill exists there.
- RyanAlberts/best-of-Agent-Harnesses: pointers only (Playwright for checks, Context7 for library docs).

## Map decisions

- The tree has single-row branches wherever it can, so it reads as branching: Anatomy → Pulse & Groove and Keys I. Pulse → Sampling I and Bass; Keys I → Bass, Keys II and Melody; Sampling I → Sampling II; Keys II → Keys III. Sampling II, Bass, Keys III and Melody meet in Arrangement, which leads to Into the DAW.
- Earlier prerequisites that were dropped from the map (Bass after Keys II, Melody after Keys II, Sampling II after Keys I) are covered by each lecture's own warm-up: every lecture works on its own.

## Teaching decisions

- Rhythm first: needs no pitch knowledge, fastest first success, and every later topic sits on the grid. Same order as Ableton's Learning Music.
- Pulse & Groove ends on a question (some 808 notes fit the chord, others don't) that Keys I answers.
- Three worlds (sample, synth, band) show that a role is a job, not an instrument.
- Every step is built around a likely wrong belief: more hats = faster, on the grid = better, a role = an instrument.

## Sounds

- The owner does not want sounds synthesized in the browser: coded audio sounded poor. Sources must allow later commercial use.
- Allowed: CC0, CC-BY (with attribution on the Sounds page), own offline renders. Not allowed: "royalty-free" packs (99Sounds, Wave Alchemy, Looperman and the like) since they forbid redistributing the sounds, and anything NC (e.g. jRhodes).
- Used: Virtuosity Drums (CC0, kit and lo-fi mic), VCSL (CC0: claps, woodblock, vibraphone; also has grand and upright pianos for Keys), Black And Blue Basses and Black And Green Guitars (Karoryfer, CC0), Greg Sullivan's Wurlitzer EP200 (CC BY 3.0), Surge XT factory patches rendered offline.
- More CC0 in the sfzinstruments org: Osiris Piano, Big Rusty / Swirly / Unruly drums, Frankensnare, Meatbass, Emily Guitar, Bear Sax, and others.
- No verified CC0 recordings of real 808/909 hardware were found; Freesound (CC0 filter) is the plan.
- Library quirks found by measuring pitch: Black And Blue Basses sound an octave below their file names (five-string with low B); VCSL vibraphone files are named an octave low; Surge patches often carry octave offsets (bass and lead patches -12, House Organ -24). Detuned synth voices mislead fine-pitch measurement, so Surge renders keep exact roots.
