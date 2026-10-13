"""Render single notes from Surge XT factory patches to WAV, offline.

Needs the surgepy module (Surge XT built with -DSURGE_BUILD_PYTHON_BINDINGS=ON).
Set SURGEPY to the folder that contains surgepy*.so.
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.environ.get("SURGEPY", "."))
import surgepy  # noqa: E402

SR = 44100


class Renderer:
    def __init__(self, patch_path: str):
        self.s = surgepy.createSurge(SR)
        self.s.loadPatch(patch_path)
        self.bs = self.s.getBlockSize()
        self._silence(1.0)

    def _blocks(self, seconds: float):
        n = max(1, int(seconds * SR / self.bs))
        buf = self.s.createMultiBlock(n)
        self.s.processMultiBlock(buf)
        return buf

    def _silence(self, seconds: float):
        self._blocks(seconds)

    def note(self, key: int, vel: int, hold: float, tail: float) -> np.ndarray:
        self.s.allNotesOff()
        for _ in range(20):
            if np.max(np.abs(self._blocks(0.25))) < 1e-5:
                break
        self.s.playNote(0, key, vel, 0)
        a = self._blocks(hold)
        self.s.releaseNote(0, key, 0)
        b = self._blocks(tail)
        return np.concatenate([a, b], axis=1)


def render(patch_path: str, keys, vel: int, hold: float, tail: float, out_dir: str, prefix: str):
    r = Renderer(patch_path)
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for k in keys:
        audio = r.note(k, vel, hold, tail)
        p = os.path.join(out_dir, f"{prefix}_{k}.wav")
        sf.write(p, audio.T, SR, subtype="FLOAT")
        paths.append((k, p))
    return paths


if __name__ == "__main__":
    patch, key = sys.argv[1], int(sys.argv[2])
    out = render(patch, [key], 110, 1.0, 1.0, sys.argv[3] if len(sys.argv) > 3 else ".", "test")
    print(out)
