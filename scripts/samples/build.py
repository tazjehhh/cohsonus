"""Builds the app's sample set from open libraries.

Fetches only the files we use (blob-less git clones), mixes drum microphones,
trims, measures the real pitch of every tonal sample, and writes:

  public/samples/<instrument>/*.flac   the audio
  src/audio/samples.json               which file plays for which note and velocity
  CREDITS.md                           where every sound comes from

Run:  python3 scripts/samples/build.py            (all)
      python3 scripts/samples/build.py kit.snare  (one instrument)

Surge XT renders need SURGEPY (folder with surgepy*.so) and SURGE_PATCHES
(Surge's resources/data/patches_factory; the third-party bank is found next to it).
Without them those instruments are skipped.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(os.environ.get("SAMPLE_CACHE", ROOT / ".cache" / "samples"))
OUT = ROOT / "public" / "samples"
MANIFEST = ROOT / "src" / "audio" / "samples.json"
CREDITS = ROOT / "CREDITS.md"

SOURCES = {
    "virtuosity": {
        "url": "https://github.com/sfzinstruments/virtuosity_drums",
        "title": "Virtuosity Drums",
        "author": "Versilian Studios and Karoryfer Samples",
        "license": "CC0 1.0",
    },
    "vcsl": {
        "url": "https://github.com/sgossner/VCSL",
        "title": "Versilian Community Sample Library",
        "author": "Versilian Studios",
        "license": "CC0 1.0",
    },
    "bbbass": {
        "url": "https://github.com/sfzinstruments/karoryfer.black-and-blue-basses",
        "title": "Black And Blue Basses",
        "author": "Karoryfer Samples",
        "license": "CC0 1.0",
    },
    "bgguitars": {
        "url": "https://github.com/sfzinstruments/karoryfer.black-and-green-guitars",
        "title": "Black And Green Guitars",
        "author": "Karoryfer Samples, recorded by Brian Wood",
        "license": "CC0 1.0",
    },
    "epianos": {
        "url": "https://github.com/sfzinstruments/GregSullivan.E-Pianos",
        "title": "Wurlitzer EP200 (from E-Pianos)",
        "author": "Greg Sullivan, SFZ mapping by kinwie",
        "license": "CC BY 3.0",
    },
    "surge": {
        "url": "https://github.com/surge-synthesizer/surge",
        "title": "Surge XT factory patches, rendered offline",
        "author": "Surge Synth Team",
        "license": "Rendered audio; Surge XT is GPL-3.0",
    },
    "surge-emu": {
        "url": "https://github.com/surge-synthesizer/surge/tree/main/resources/data/patches_3rdparty/Emu/Drums",
        "title": "Surge XT third-party patches, Emu drums, rendered offline",
        "author": "The Emu (patches), Surge Synth Team (synth)",
        "license": "Rendered audio; Surge XT and its bundled patches are GPL-3.0",
    },
}

NOTE = {"c": 0, "db": 1, "d": 2, "eb": 3, "e": 4, "f": 5, "gb": 6, "g": 7, "ab": 8, "a": 9, "bb": 10, "b": 11}


def note_to_midi(name: str) -> int:
    m = re.fullmatch(r"([a-g]b?)(-?\d)", name.lower())
    return NOTE[m.group(1)] + (int(m.group(2)) + 1) * 12


# ---------------------------------------------------------------- git access


def repo(name: str) -> Path:
    path = CACHE / "repos" / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["git", "clone", "-q", "--filter=blob:none", "--no-checkout", "--depth", "1", SOURCES[name]["url"], str(path)], check=True)
    return path


_listing: dict[str, list[str]] = {}


def files(name: str) -> list[str]:
    if name not in _listing:
        out = subprocess.run(["git", "-C", str(repo(name)), "ls-tree", "-r", "--name-only", "HEAD"], check=True, capture_output=True, text=True).stdout
        _listing[name] = out.splitlines()
    return _listing[name]


def text(name: str, path: str) -> str:
    return subprocess.run(["git", "-C", str(repo(name)), "show", f"HEAD:{path}"], check=True, capture_output=True).stdout.decode("utf-8", "replace")


def fetch(name: str, path: str) -> Path:
    dest = CACHE / "files" / name / path
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = subprocess.run(["git", "-C", str(repo(name)), "show", f"HEAD:{path}"], check=True, capture_output=True).stdout
        dest.write_bytes(data)
    return dest


# ---------------------------------------------------------------- audio


def load(path: Path, mono=False) -> tuple[np.ndarray, int]:
    x, sr = sf.read(str(path), always_2d=True, dtype="float64")
    if mono:
        x = x.mean(axis=1, keepdims=True)
    return x, sr


def mix(parts: list[tuple[Path, float]], mono=False) -> tuple[np.ndarray, int]:
    """Sums the parts. Stereo sources stay stereo (mono parts sit in the middle); a pair
    whose sides are identical is stored as mono."""
    loaded = [(load(path, mono), w) for path, w in parts]
    sr0 = loaded[0][0][1]
    assert all(sr == sr0 for (_, sr), _ in loaded), f"sample rates differ in {parts}"
    ch = max(x.shape[1] for (x, _), _ in loaded)
    n = max(len(x) for (x, _), _ in loaded)
    out = np.zeros((n, ch))
    for (x, _), w in loaded:
        out[: len(x)] += (x if x.shape[1] == ch else np.repeat(x, ch, axis=1)) * w
    if ch == 2 and np.abs(out[:, 0] - out[:, 1]).max() < 1e-6:
        out = out[:, :1]
    return out, sr0


# ---------------------------------------------------------------- filters (RBJ biquads, run causally)


def biquad(kind: str, f0: float, sr: int, q: float = 0.7071) -> tuple[np.ndarray, np.ndarray]:
    w = 2 * np.pi * f0 / sr
    alpha = np.sin(w) / (2 * q)
    c = np.cos(w)
    if kind == "highpass":
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    elif kind == "notch":
        b = [1, -2 * c, 1]
    else:
        raise ValueError(kind)
    a = [1 + alpha, -2 * c, 1 - alpha]
    return np.array(b) / a[0], np.array(a) / a[0]


def run_biquad(x: np.ndarray, b: np.ndarray, a: np.ndarray) -> np.ndarray:
    y = np.zeros_like(x)
    for ch in range(x.shape[1]):
        xs, ys = x[:, ch].tolist(), [0.0] * len(x)
        x1 = x2 = y1 = y2 = 0.0
        b0, b1, b2, a1, a2 = b[0], b[1], b[2], a[1], a[2]
        for i, v in enumerate(xs):
            out = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, v, y1, out
            ys[i] = out
        y[:, ch] = ys
    return y


def highpass(x: np.ndarray, sr: int, f0: float) -> np.ndarray:
    """4th-order Butterworth high-pass (two biquads)."""
    for q in (0.5412, 1.3066):
        x = run_biquad(x, *biquad("highpass", f0, sr, q))
    return x


def dehum(x: np.ndarray, sr: int, base=60.0) -> np.ndarray:
    """Narrow notches on mains hum and its first two harmonics."""
    for k in (1, 2, 3):
        x = run_biquad(x, *biquad("notch", base * k, sr, 30.0))
    return x


def saturate(x: np.ndarray, drive: float) -> np.ndarray:
    """tanh saturation at a fixed drive on the note's own peak, so every note gets the same harmonics."""
    peak = np.abs(x).max() or 1.0
    return np.tanh(drive * x / peak) / np.tanh(drive) * peak


def trim(x: np.ndarray, sr: int, max_len: float, fade=0.04) -> np.ndarray:
    level = np.abs(x).max(axis=1)
    peak = level.max() or 1.0
    above = np.nonzero(level > peak * 10 ** (-42 / 20))[0]
    start = max(0, int(above[0]) - int(0.002 * sr)) if len(above) else 0
    x = x[start : start + int(max_len * sr)].copy()
    # drop a quiet tail
    above = np.nonzero(np.abs(x).max(axis=1) > peak * 10 ** (-60 / 20))[0]
    if len(above):
        x = x[: min(len(x), int(above[-1]) + int(0.05 * sr))]
    f = min(len(x), int(fade * sr))
    x[len(x) - f :] *= np.linspace(1, 0, f)[:, None]
    i = min(len(x), int(0.001 * sr))
    x[:i] *= np.linspace(0, 1, i)[:, None]
    return x


def measure_f0(x: np.ndarray, sr: int, lo=28.0, hi=2500.0) -> float | None:
    """Fundamental as the lowest clear peak of the spectrum, taken after the attack."""
    y = x.mean(axis=1)
    a = int(0.12 * sr)
    seg = y[a : a + int(0.6 * sr)]
    if len(seg) < 4096:
        seg = y[: int(0.6 * sr)]
    seg = seg * np.hanning(len(seg))
    n = 1 << 18
    spec = np.abs(np.fft.rfft(seg, n))
    freqs = np.fft.rfftfreq(n, 1 / sr)
    band = (freqs >= lo) & (freqs <= hi)
    s = np.where(band, spec, 0)
    top = s.max()
    if top <= 0:
        return None
    # local maxima above 25% of the strongest peak; the lowest one is the fundamental
    peaks = np.nonzero((s[1:-1] > s[:-2]) & (s[1:-1] >= s[2:]) & (s[1:-1] > 0.25 * top))[0] + 1
    if not len(peaks):
        return None
    k = peaks[0]
    l, c, r = np.log(spec[k - 1] + 1e-12), np.log(spec[k] + 1e-12), np.log(spec[k + 1] + 1e-12)
    k = k + 0.5 * (l - r) / (l - 2 * c + r + 1e-12)
    return float(k * sr / n)


def to_midi(f: float) -> float:
    return 69 + 12 * np.log2(f / 440)


# ---------------------------------------------------------------- instruments
# Each instrument returns zones: dict(parts=[(path, weight)], root=None|midi, vlo, vhi, rr, max, mono)


def vir(mic: str, piece_dir: str, name: str) -> Path:
    return fetch("virtuosity", f"Samples/{mic}/{piece_dir}/{mic}_{name}.flac")


KIT_MICS = {
    "kick": [("kickmic", 1.0), ("oh", 0.5), ("room", 0.35)],
    "snare": [("snaremic", 1.0), ("oh", 0.6), ("room", 0.4)],
    # the room pair carries 60 Hz hum and the kit's low ring; hats are the overhead pair alone
    "hh": [("oh", 1.0)],
    "htom": [("oh", 1.0), ("mid", 0.6), ("room", 0.4)],
    "ltom": [("oh", 1.0), ("mid", 0.6), ("room", 0.4)],
    "crash": [("oh", 1.0), ("room", 0.5)],
}


def kit_parts(piece: str, name: str, lofi: bool):
    if lofi:
        return [(vir("lofi", piece, name), 1.0)]
    return [(vir(mic, piece, name), w) for mic, w in KIT_MICS[piece]]


def layers(edges):
    return list(zip(edges[:-1], edges[1:]))


def drum_kick(lofi):
    vls = [2, 3, 4] if lofi else [1, 2, 3, 4]
    edges = [0, 0.35, 0.6, 0.85, 1.0] if not lofi else [0, 0.5, 0.8, 1.0]
    zones = []
    for (lo, hi), vl in zip(layers(edges), vls):
        for rr in (1, 2):
            zones.append(dict(parts=kit_parts("kick", f"kick_snoff_vl{vl}_rr{rr}", lofi), vlo=lo, vhi=hi, rr=rr, max=1.2))
    return zones


def drum_snare(lofi):
    picks = [5, 12, 19, 25, 31, 36]
    edges = [0, 0.3, 0.5, 0.65, 0.8, 0.92, 1.0]
    zones = []
    for (lo, hi), vl in zip(layers(edges), picks):
        for rr, v in enumerate((vl, vl - 1), start=1):
            zones.append(dict(parts=kit_parts("snare", f"snare_center_vl{v}", lofi), vlo=lo, vhi=hi, rr=rr, max=1.0))
    return zones


def drum_hat(lofi):
    zones = []
    for (lo, hi), vl in zip(layers([0, 0.35, 0.6, 0.85, 1.0]), [1, 2, 3, 4]):
        for rr in (1, 2) if not lofi else (1,):
            zones.append(dict(parts=kit_parts("hh", f"hh_closed_vl{vl}_rr{rr}", lofi), vlo=lo, vhi=hi, rr=rr, max=0.6))
    return zones


def drum_open(lofi):
    zones = []
    for (lo, hi), vl in zip(layers([0, 0.5, 0.8, 1.0]), [2, 3, 4]):
        zones.append(dict(parts=kit_parts("hh", f"hh_open_vl{vl}_rr1", lofi), vlo=lo, vhi=hi, rr=1, max=1.6))
    return zones


def drum_tom(piece):
    return [dict(parts=kit_parts(piece, f"{piece}_center_vl{vl}", False), vlo=lo, vhi=hi, rr=1, max=1.4) for (lo, hi), vl in zip(layers([0, 0.5, 0.8, 1.0]), [6, 11, 16])]


def drum_crash():
    return [dict(parts=kit_parts("crash", f"crash_crash_vl{vl}_rr1", False), vlo=lo, vhi=hi, rr=1, max=3.5) for (lo, hi), vl in zip(layers([0, 0.6, 1.0]), [2, 3])]


VCSL = "Idiophones/Struck Idiophones"


def clap():
    return [dict(parts=[(fetch("vcsl", f"{VCSL}/Claps/Clap_rr{rr}.wav"), 1.0)], vlo=0, vhi=1, rr=rr, max=0.8) for rr in (1, 2, 3, 4)]


def click():
    return [
        dict(parts=[(fetch("vcsl", f"{VCSL}/Woodblock/wood_click_mp.wav"), 1.0)], vlo=0, vhi=0.8, rr=1, max=0.3),
        dict(parts=[(fetch("vcsl", f"{VCSL}/Woodblock/wood_click_f_rr1.wav"), 1.0)], vlo=0.8, vhi=1, rr=1, max=0.3),
    ]


def vibes():
    names = [p for p in files("vcsl") if p.startswith(f"{VCSL}/Vibraphone/") and "/Vibes_soft_" in p]
    zones = []
    for p in sorted(names):
        m = re.search(r"Vibes_soft_([A-G]b?)(\d)_v(\d)_rr(\d)", p)
        if not m:
            continue
        note, octv, v, rr = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))
        key = (note, octv, v)
        if any(z["_key"] == key for z in zones):
            continue
        # VCSL names vibraphone notes an octave low (C3 = middle C); the pitch check confirms.
        root = note_to_midi(f"{note.lower()}{octv + 1}")
        lo, hi = (0, 0.6) if v == 1 else (0.6, 1.0)
        zones.append(dict(_key=key, parts=[(fetch("vcsl", p), 1.0)], root=root, vlo=lo, vhi=hi, rr=1, max=3.5))
    return zones


def sfz_regions(sfz: str):
    """Very small SFZ reader: yields dicts of opcodes per <region>, merged with the current <group>."""
    group: dict = {}
    cur = None
    for raw in sfz.splitlines():
        line = raw.split("//")[0].strip()
        if not line:
            continue
        for tok in re.split(r"(?=<\w+>)", line):
            tok = tok.strip()
            if not tok:
                continue
            m = re.match(r"<(\w+)>(.*)", tok)
            if m:
                if cur is not None:
                    yield cur
                    cur = None
                head, rest = m.group(1), m.group(2)
                if head in ("group", "master", "global"):
                    group = {} if head != "group" else {}
                    target = group
                elif head == "region":
                    cur = dict(group)
                    target = cur
                else:
                    target = {}
                tok = rest
            else:
                target = cur if cur is not None else group
            for k, v in re.findall(r"(\w+)=(.+?)(?=\s+\w+=|$)", tok):
                target[k] = v.strip()
    if cur is not None:
        yield cur


def bass():
    keyc = {}
    for dyn in ("mp", "f"):
        for r in sfz_regions(text("bbbass", f"Programs/maps/darkblack_reg_{dyn}_map.sfz")):
            s = r["sample"].replace("\\", "/").split("/")[-1]
            keyc[s] = int(r.get("pitch_keycenter") or r.get("key") or r["lokey"])
    zones = []
    for name, root in sorted(keyc.items(), key=lambda kv: kv[1]):
        m = re.match(r"darkblack_([a-g]b?\d)_(mp|f)_rr(\d)\.wav", name)
        # the library names notes an octave above how they sound; the pitch check corrects the root
        if not m or root not in (38, 41, 44, 47, 50, 53, 56, 59, 62) or int(m.group(3)) > 2:
            continue
        lo, hi = (0, 0.65) if m.group(2) == "mp" else (0.65, 1.0)
        zones.append(dict(parts=[(fetch("bbbass", f"Samples/darkblack/reg/{name}"), 1.0)], root=root, vlo=lo, vhi=hi, rr=int(m.group(3)), max=2.2))
    return zones


def guitar():
    keyc = {}
    for r in sfz_regions(text("bgguitars", "Programs/modules/maps_green/ord.sfz")):
        s = r["sample"].split("/")[-1]
        keyc[s] = int(r.get("pitch_keycenter") or r.get("key") or r["lokey"])
    zones = []
    wanted = set(range(40, 80, 3))
    for name, root in sorted(keyc.items(), key=lambda kv: kv[1]):
        m = re.match(r"twang_([a-g]b?\d)_(mf|f)_rr1\.wav", name)
        if not m or root not in wanted:
            continue
        lo, hi = (0, 0.7) if m.group(2) == "mf" else (0.7, 1.0)
        zones.append(dict(parts=[(fetch("bgguitars", f"Samples/green/ord/{name}"), 1.0)], root=root, vlo=lo, vhi=hi, rr=1, max=2.8))
    return zones


def wurli():
    sfz = text("epianos", "Wurlitzer EP200/Wurlitzer EP200.sfz")
    zones = []
    for r in sfz_regions(sfz):
        s = r.get("sample", "").replace("$EXT", "flac")
        m = re.match(r"([a-g]b?\d)(pp|mp|f|ff)\.flac", s)
        if not m or m.group(2) not in ("mp", "f"):
            continue
        lo, hi = (0, 0.6) if m.group(2) == "mp" else (0.6, 1.0)
        root = int(r["pitch_keycenter"]) - float(r.get("tune", 0)) / 100
        gain = 10 ** (float(r.get("volume", 0)) / 20)
        zones.append(dict(parts=[(fetch("epianos", f"Wurlitzer EP200/Samples/{s}"), gain)], root=root, vlo=lo, vhi=hi, rr=1, max=4.0, trust_root=True))
    return zones


def surge(patch: str, keys, hold: float, tail: float, vel=110, bank="patches_factory"):
    sp, pp = os.environ.get("SURGEPY"), os.environ.get("SURGE_PATCHES")
    if not sp or not pp:
        return None
    sys.path.insert(0, str(Path(__file__).parent))
    from surge_render import render  # noqa: E402

    out = CACHE / "surge" / re.sub(r"\W+", "_", patch)
    rendered = render(str(Path(pp).parent / bank / f"{patch}.fxp"), keys, vel, hold, tail, str(out), "n")
    return [dict(parts=[(Path(p), 1.0)], root=k, vlo=0, vhi=1, rr=1, max=hold + tail) for k, p in rendered]


def surge_drum(patch: str, hold: float, tail: float, vels=(60, 90, 120), takes=2, bank="patches_3rdparty"):
    """A drum patch at a few velocities, rendered more than once: noise differs per take (round robin)."""
    sp, pp = os.environ.get("SURGEPY"), os.environ.get("SURGE_PATCHES")
    if not sp or not pp:
        return None
    sys.path.insert(0, str(Path(__file__).parent))
    from surge_render import Renderer, SR  # noqa: E402

    out = CACHE / "surge" / re.sub(r"\W+", "_", patch)
    out.mkdir(parents=True, exist_ok=True)
    r = Renderer(str(Path(pp).parent / bank / f"{patch}.fxp"))
    edges = np.linspace(0, 1, len(vels) + 1)
    zones = []
    for i, vel in enumerate(vels):
        for take in range(1, takes + 1):
            p = out / f"v{vel}_rr{take}.wav"
            sf.write(str(p), r.note(60, vel, hold, tail).T, SR, subtype="FLOAT")
            zones.append(dict(parts=[(p, 1.0)], vlo=float(edges[i]), vhi=float(edges[i + 1]), rr=take, max=hold + tail))
    return zones


SUB_DRIVE = 2.5

INSTRUMENTS = {
    "kit.kick": dict(src="virtuosity", make=lambda: drum_kick(False)),
    "kit.snare": dict(src="virtuosity", make=lambda: drum_snare(False)),
    "kit.hat": dict(src="virtuosity", make=lambda: drum_hat(False), choke="hat", highpass=300, layer_span=12),
    "kit.open": dict(src="virtuosity", make=lambda: drum_open(False), choke="hat", chokedBy=True, highpass=200, layer_span=9),
    "kit.tomHigh": dict(src="virtuosity", make=lambda: drum_tom("htom")),
    "kit.tomLow": dict(src="virtuosity", make=lambda: drum_tom("ltom")),
    "kit.crash": dict(src="virtuosity", make=drum_crash),
    "lofi.kick": dict(src="virtuosity", make=lambda: drum_kick(True)),
    "lofi.snare": dict(src="virtuosity", make=lambda: drum_snare(True)),
    "lofi.hat": dict(src="virtuosity", make=lambda: drum_hat(True), choke="lofihat", dehum=True, highpass=300, layer_span=12),
    "perc.clap": dict(src="vcsl", make=clap),
    "perc.click": dict(src="vcsl", make=click),
    "keys.vibes": dict(src="vcsl", make=vibes, pitched=True, release=1.2),
    "bass.electric": dict(src="bbbass", make=bass, pitched=True, release=0.08),
    "guitar.electric": dict(src="bgguitars", make=guitar, pitched=True, release=0.12),
    "keys.wurli": dict(src="epianos", make=wurli, pitched=True, release=0.35),
    "synth.bass": dict(src="surge", make=lambda: surge("Basses/Rubber Bass", list(range(38, 66, 4)), 0.8, 0.3), pitched=True, release=0.06),
    "synth.organ": dict(src="surge", make=lambda: surge("Keys/House Organ", list(range(72, 104, 4)), 0.9, 0.4), pitched=True, release=0.08),
    "synth.lead": dict(src="surge", make=lambda: surge("Leads/Classic Lead 1", list(range(68, 104, 4)), 1.2, 0.5), pitched=True, release=0.1),
    "synth.pad": dict(src="surge", make=lambda: surge("Pads/MKS-70 Warm Pad", list(range(56, 92, 4)), 4.0, 1.5), pitched=True, release=0.9),
    # a pure sine vanishes on laptop speakers; saturation gives it harmonics above 150 Hz
    "synth.sub": dict(src="surge", make=lambda: surge("Basses/Sub 1", list(range(38, 66, 4)), 2.0, 0.3), pitched=True, release=0.08, saturate=SUB_DRIVE),
    "machine.kick": dict(src="surge", make=lambda: surge("Percussion/Kick 909ish", [60], 0.6, 0.4)),
    "machine.hat": dict(src="surge-emu", make=lambda: surge_drum("Emu/Drums/Hat Closed", 0.1, 0.4), choke="mhat"),
    # held, then an exponential fall like a drum machine's decay knob
    "machine.open": dict(src="surge-emu", make=lambda: surge_drum("Emu/Drums/Hat Open", 0.7, 0.2), choke="mhat", chokedBy=True, decay=0.12),
    "machine.clap": dict(src="surge-emu", make=lambda: surge_drum("Emu/Drums/T8 Clap", 0.15, 0.5)),
}


def build(inst_id: str, spec: dict, manifest: dict):
    zones = spec["make"]()
    if zones is None:
        print(f"skip {inst_id} (renderer not configured)")
        return
    folder = OUT / inst_id
    folder.mkdir(parents=True, exist_ok=True)
    for f in folder.glob("*.flac"):
        f.unlink()
    audio = []
    for z in zones:
        x, sr = mix(z["parts"], mono=z.get("mono", False))
        if spec.get("highpass"):
            x = highpass(x, sr, spec["highpass"])
        if spec.get("dehum"):
            x = dehum(x, sr)
        if spec.get("saturate"):
            x = saturate(x, spec["saturate"])
        if spec.get("decay"):
            x = x * np.exp(-np.arange(len(x)) / sr / spec["decay"])[:, None]
        x = trim(x, sr, z["max"])
        audio.append((x, sr))
    if spec.get("layer_span"):
        # recorded layers can lie 25 dB apart; spread their peaks evenly over layer_span dB instead
        layers = sorted({z["vlo"] for z in zones})
        peaks = {lo: np.mean([np.abs(x).max() for z, (x, _) in zip(zones, audio) if z["vlo"] == lo]) for lo in layers}
        top = peaks[layers[-1]]
        for i, (z, (x, sr)) in enumerate(zip(zones, audio)):
            k = layers.index(z["vlo"])
            want = top * 10 ** (-spec["layer_span"] * (len(layers) - 1 - k) / max(1, len(layers) - 1) / 20)
            audio[i] = (x * want / peaks[z["vlo"]], sr)
    peak = max(np.abs(x).max() for x, _ in audio) or 1.0
    gain = 10 ** (-1 / 20) / peak
    # pitch: measure every sample, settle the octave by majority, fine-tune each one
    shift = 0
    measured = []
    if spec.get("pitched"):
        for z, (x, sr) in zip(zones, audio):
            if z.get("trust_root"):
                measured.append(None)
                continue
            f0 = measure_f0(x, sr)
            measured.append(to_midi(f0) if f0 else None)
        votes = [round((m - z["root"]) / 12) for m, z in zip(measured, zones) if m is not None]
        if votes:
            shift = 12 * max(set(votes), key=votes.count)
            if shift:
                print(f"  {inst_id}: sounds {shift:+d} semitones from its names")
    out_zones = []
    for i, (z, (x, sr)) in enumerate(zip(zones, audio)):
        name = f"{i:02d}.flac"
        sf.write(str(folder / name), np.clip(x * gain, -1, 1), sr, subtype="PCM_16")
        entry = dict(file=f"samples/{inst_id}/{name}", vlo=round(z["vlo"], 3), vhi=round(z["vhi"], 3), rr=z["rr"])
        if spec.get("pitched"):
            expect = float(z["root"]) + shift
            m = measured[i]
            # synth renders are tuned exactly; their detuned voices would only mislead the measurement
            root = expect if spec["src"] == "surge" else (m if m is not None and abs(m - expect) < 0.5 else expect)
            if m is not None and abs(m - expect) >= 0.5:
                print(f"  {inst_id} {name}: measured {m:.2f}, expected {expect:.2f}; using expected")
            entry["root"] = round(root, 3)
        out_zones.append(entry)
    manifest["instruments"][inst_id] = {
        k: v for k, v in dict(source=spec["src"], pitched=bool(spec.get("pitched")), release=spec.get("release"), choke=spec.get("choke"), chokedBy=spec.get("chokedBy"), zones=out_zones).items() if v not in (None, False) or k == "pitched"
    }
    size = sum(f.stat().st_size for f in folder.glob("*.flac"))
    print(f"{inst_id}: {len(out_zones)} files, {size / 1024:.0f} KB")


def write_credits(manifest: dict):
    used = sorted({i["source"] for i in manifest["instruments"].values()})
    lines = ["# Sound credits", "", "Every sound in cohsonus is a recording or an offline render from these sources.", ""]
    for key in used:
        s = SOURCES[key]
        inst = sorted(k for k, v in manifest["instruments"].items() if v["source"] == key)
        lines.append(f"- **{s['title']}** by {s['author']}. License: {s['license']}. {s['url']}  ")
        lines.append(f"  Used for: {', '.join(inst)}")
    CREDITS.write_text("\n".join(lines) + "\n")


def main():
    only = set(sys.argv[1:])
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"instruments": {}}
    for inst_id, spec in INSTRUMENTS.items():
        if only and inst_id not in only:
            continue
        build(inst_id, spec, manifest)
    manifest["sources"] = {k: {kk: vv for kk, vv in v.items()} for k, v in SOURCES.items() if any(i["source"] == k for i in manifest["instruments"].values())}
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n")
    write_credits(manifest)


if __name__ == "__main__":
    main()
