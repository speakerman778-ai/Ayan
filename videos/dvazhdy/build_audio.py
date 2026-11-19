"""Builds the timeline and the full soundtrack (voice + synthesized music + SFX).

Output:
  public/timeline.json  - line start times, scene boundaries, event times (seconds)
  public/soundtrack.wav - final stereo mix, 48 kHz
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).parent
TTS = ROOT / "tts"
PUB = ROOT / "public"
PUB.mkdir(exist_ok=True)
SR = 48000
TEMPO = 1.08
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- voice lines
# (line id, pause BEFORE this line in seconds)
SCHEDULE = [
    ("01", 0.35), ("02", 0.55), ("03", 0.9), ("04", 0.3), ("05", 0.5),
    ("06", 0.5), ("07", 1.3), ("08", 0.35), ("09", 0.55), ("10", 0.9),
    ("11", 0.6), ("12", 0.3), ("13", 0.6), ("14", 1.9), ("15", 0.45),
    ("16", 0.8), ("17", 1.2), ("18", 0.35), ("19", 0.7),
]
TAIL = 2.6


def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return x / 32768.0


lines = {}
for lid, _ in SCHEDULE:
    src, dst = TTS / f"v_{lid}.wav", TTS / f"f_{lid}.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(src),
                    "-af", f"atempo={TEMPO}", "-ar", str(SR), "-ac", "1", str(dst)], check=True)
    lines[lid] = load(dst)

t = 0.0
starts, ends = {}, {}
for lid, gap in SCHEDULE:
    t += gap
    starts[lid] = t
    t += len(lines[lid]) / SR
    ends[lid] = t
TOTAL = t + TAIL
N = int(TOTAL * SR)

# Key moments
ev = {
    "flash1": starts["07"] - 0.75,     # Hiroshima flash, in the silence after "8:15"
    "flash2": starts["14"] - 0.35,     # Nagasaki flash, after the long silence
    "reveal": starts["16"] - 0.05,     # "НАГАСАКИ"
}

# Scenes: [start, end) in seconds. Boundaries sit in pauses before lines.
def before(lid, k=0.5):
    return starts[lid] - min(k, dict(SCHEDULE)[lid] * 0.6)

bounds = [
    ("hook", 0.0),
    ("calendar", before("03")),
    ("packing", before("04", 0.15)),
    ("photo", starts["04"] + 3.1),
    ("seal", before("05")),
    ("clock", before("06")),
    ("flash", ev["flash1"]),
    ("thrown", starts["08"] - 0.15),
    ("alive", before("09", 0.3)),
    ("shelter", before("10")),
    ("train", starts["10"] + 1.45),
    ("trainwin", starts["10"] + 3.3),
    ("aug9", before("11")),
    ("office", starts["11"] + 2.5),
    ("boss", before("12", 0.15)),
    ("window", before("13")),
    ("nagasaki", ev["flash2"]),
    ("again", before("17")),
    ("life", before("18", 0.15)),
    ("ending", before("19")),
]
scenes = []
for i, (name, s) in enumerate(bounds):
    e = bounds[i + 1][1] if i + 1 < len(bounds) else TOTAL
    scenes.append({"name": name, "start": round(s, 3), "end": round(e, 3)})

S = {sc["name"]: sc for sc in scenes}
timeline = {
    "fps": 30,
    "total": round(TOTAL, 3),
    "lines": {k: {"start": round(starts[k], 3), "end": round(ends[k], 3)} for k in starts},
    "events": {k: round(v, 3) for k, v in ev.items()},
    "scenes": scenes,
}
(PUB / "timeline.json").write_text(json.dumps(timeline, indent=1, ensure_ascii=False))

# ---------------------------------------------------------------- helpers
tt = np.arange(N) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env_ar(n, a, r):
    e = np.ones(n, dtype=np.float32)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def ramp(t0, t1, v0, v1):
    """Piecewise automation value over the whole timeline."""
    out = np.full(N, v0, dtype=np.float32)
    i0, i1 = int(t0 * SR), int(t1 * SR)
    i1 = min(i1, N)
    out[i0:i1] = np.linspace(v0, v1, max(1, i1 - i0))
    out[i1:] = v1
    return out


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def reverb(x, secs=2.5, mix=0.35):
    n = int(secs * SR)
    ir = noise(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, 5000)
    ir /= np.abs(ir).sum() ** 0.5 * 30
    wet = np.convolve(x, ir)[: len(x)] if len(x) < 200000 else fft_conv(x, ir)
    return x * (1 - mix) + wet * mix


def fft_conv(x, h):
    n = len(x) + len(h)
    m = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)
    return y[: len(x)].astype(np.float32)


# ---------------------------------------------------------------- music
F, L = ev["flash1"], ev["flash2"]
music = np.zeros(N, dtype=np.float32)

# 1) Drone pad (A minor), breathing LFO. Muted right after each flash.
pad = np.zeros(N, dtype=np.float32)
for f, g in [(55, 0.5), (82.41, 0.3), (110, 0.25), (130.81, 0.12), (164.81, 0.1)]:
    det = 1 + 0.002 * np.sin(2 * np.pi * 0.07 * tt + f)
    pad += g * np.sin(2 * np.pi * f * det * tt)
pad = lp(pad, 900) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.12 * tt))
pad_auto = (ramp(0, 3, 0.25, 0.55)
            * np.where((tt > F) & (tt < F + 3.2), 0.0, 1.0)
            * np.where((tt > L) & (tt < L + 2.2), 0.0, 1.0))
# swell toward each flash
pad_auto *= 1 + 0.9 * np.clip((tt - (F - 6)) / 6, 0, 1) * (tt < F)
pad_auto *= 1 + 1.2 * np.clip((tt - (L - 9)) / 9, 0, 1) * (tt < L)
pad_auto = lp(pad_auto, 8)
music += pad * pad_auto * 0.22

# 2) Soft piano-like plucks (A minor arpeggio), calm parts only
notes = [220.0, 261.63, 329.63, 392.0, 329.63, 261.63, 246.94, 196.0]
beat = 0.62


def pluck(f, dur=2.2):
    n = int(dur * SR)
    x = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x))
    return (s * np.exp(-x * 2.6) * env_ar(n, 0.004, 0.3)).astype(np.float32)


def arp(t0, t1, gain):
    k, tcur = 0, t0
    while tcur < t1:
        place(music, pluck(notes[k % len(notes)]), tcur, gain)
        k += 1
        tcur += beat


arp(0.9, F - 3.0, 0.06)                          # calm before Hiroshima
arp(S["train"]["start"], S["boss"]["start"], 0.045)   # train + office (sparser feel)
arp(S["again"]["start"] + 1.5, TOTAL - 1.0, 0.065)             # life / ending

# 3) Heartbeat building tension in office and window scenes
hb_t = S["office"]["start"] + 0.5
period = 0.95
while hb_t < L - 0.2:
    for off, g in [(0, 1.0), (0.17, 0.7)]:
        n = int(0.25 * SR)
        x = np.arange(n) / SR
        thump = np.sin(2 * np.pi * (52 - 20 * x) * x) * np.exp(-x * 22)
        place(music, thump.astype(np.float32), hb_t + off,
              0.25 * g * (0.4 + 0.6 * np.clip((hb_t - S["office"]["start"]) / 10, 0, 1)))
    period = max(0.6, period * 0.985)
    hb_t += period

# 4) Risers into each flash
for at, dur, g in [(F, 4.0, 0.25), (L, 3.5, 0.32)]:
    n = int(dur * SR)
    x = np.arange(n) / SR
    r = bp(noise(n), 400, 6000) * (x / dur) ** 2.5
    tone = np.sin(2 * np.pi * (200 + 500 * (x / dur) ** 2) * x) * (x / dur) ** 3 * 0.4
    place(music, ((r + tone) * env_ar(n, 0.01, 0.02)).astype(np.float32), at - dur, g)

# ---------------------------------------------------------------- SFX
sfx = np.zeros(N, dtype=np.float32)


def boom(dur=6.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (60 * np.exp(-x * 1.2) + 25) * x) * np.exp(-x * 0.9)
    body = lp(noise(n), 700) * np.exp(-x * 1.4) * 1.6
    crack = hp(noise(n), 1500) * np.exp(-x * 9) * 0.8
    s = (sub * 1.2 + body + crack) * env_ar(n, 0.003, 1.5)
    return np.tanh(s * 1.5).astype(np.float32)


def tinnitus(dur=3.2, f=5200):
    n = int(dur * SR)
    x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) * env_ar(n, 0.05, 2.0)).astype(np.float32)


def whoosh(dur=0.6, up=True):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    nz = noise(n)
    out = np.zeros(n, dtype=np.float32)
    seg = 8
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg
        c = 500 + (3500 if up else -0) * (k / seg) if up else 4000 - 3500 * (k / seg)
        out[a:b] = bp(nz[a:b], c * 0.6, c * 1.4)
    return (out * np.sin(np.pi * x) ** 2).astype(np.float32)


def tick(hi=True):
    n = int(0.05 * SR)
    x = np.arange(n) / SR
    return (bp(noise(n), 2500 if hi else 1800, 7000) * np.exp(-x * 160)).astype(np.float32)


def chime(f=1318.5, dur=1.6):
    n = int(dur * SR)
    x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 4)
    return (s * np.exp(-x * 3.2)).astype(np.float32)


def sparkle(dur=0.9):
    out = np.zeros(int(dur * SR), dtype=np.float32)
    for k in range(9):
        c = chime(rng.uniform(2000, 4200), 0.5)
        i = int(rng.uniform(0, dur - 0.5) * SR)
        out[i:i + len(c)] += c * 0.25
    return out


def stamp():
    n = int(0.3 * SR)
    x = np.arange(n) / SR
    return (lp(noise(n), 900) * np.exp(-x * 40) * 1.5 + np.sin(2 * np.pi * 90 * x) * np.exp(-x * 30)).astype(np.float32)


def thud():
    n = int(0.6 * SR)
    x = np.arange(n) / SR
    return (np.sin(2 * np.pi * (80 - 40 * x) * x) * np.exp(-x * 9) + lp(noise(n), 400) * np.exp(-x * 14) * 0.6).astype(np.float32)


# Scene transitions: dots scatter -> whoosh
for sc in scenes[1:]:
    if sc["name"] in ("flash", "nagasaki", "thrown"):
        continue
    place(sfx, whoosh(0.55), sc["start"] - 0.25, 0.22)

# Hook: tiny flash on "Дважды"
place(sfx, sparkle(), 0.1, 0.25)
place(sfx, thud(), starts["02"] - 0.05, 0.6)
place(sfx, hp(boom(1.6), 200), starts["02"] - 0.05, 0.25)

# Calendar circle being drawn
place(sfx, bp(noise(int(0.7 * SR)), 2000, 6000) * 0.08, S["calendar"]["start"] + 1.0, 1.0)
# Packing: suitcase latch clicks
place(sfx, tick(False), S["packing"]["start"] + 2.2, 0.7)
place(sfx, tick(False), S["packing"]["start"] + 2.35, 0.7)
# Seal: chime when found
place(sfx, chime(1046.5), starts["05"] + 2.6, 0.18)
place(sfx, stamp(), starts["05"] + 3.8, 0.5)

# Clock: ticking through the clock scene, louder each second
ct = S["clock"]["start"] + 0.1
k = 0
while ct < F - 0.05:
    place(sfx, tick(k % 2 == 0), ct, 0.35 + 0.04 * k)
    ct += 0.5
    k += 1

# Flash 1 (Hiroshima)
place(sfx, boom(7.0), F, 1.0)
place(sfx, tinnitus(3.6), F + 0.4, 0.06)
# body thrown
place(sfx, thud(), starts["08"] + 0.4, 0.7)
# "alive": heartbeat comes back softly + chime
place(sfx, chime(880, 2.5), starts["09"] - 0.1, 0.15)

# Train: rhythmic clacks during the train scene
tr = S["train"]["start"] + 0.2
while tr < S["trainwin"]["end"] - 0.3:
    for off in (0, 0.12):
        place(sfx, lp(tick(False), 2000) * 3, tr + off, 0.18)
    tr += 0.72
# whistle
n = int(1.4 * SR)
x = np.arange(n) / SR
whistle = (np.sin(2 * np.pi * 740 * x) + 0.6 * np.sin(2 * np.pi * 880 * x)) * env_ar(n, 0.1, 0.6)
place(sfx, (whistle * (0.6 + 0.4 * lp(np.abs(noise(n)), 30) )).astype(np.float32), S["train"]["start"] + 0.6, 0.05)

# Office: boss laughs -> soft "ha" pulses
for k in range(3):
    n = int(0.12 * SR)
    place(sfx, bp(noise(n), 300, 1200) * env_ar(n, 0.01, 0.08), starts["12"] + 0.25 + k * 0.17, 0.25)
# speech bubble pop
place(sfx, chime(660, 0.3), starts["12"] + 1.4, 0.15)

# Flash 2 (Nagasaki) - bigger
place(sfx, boom(8.0), L, 1.15)
place(sfx, tinnitus(3.0, 6100), L + 0.3, 0.06)
# Reveal hit
place(sfx, thud(), ev["reveal"], 1.0)
place(sfx, hp(boom(2.5), 120), ev["reveal"], 0.35)

# Life: years ticking (soft chimes on each milestone)
for k, off in enumerate([0.8, 2.6, 4.4, 6.2, 8.0]):
    place(sfx, chime(1318.5 * (1 + k * 0.06), 1.2), S["life"]["start"] + off, 0.08)

# Ending: stamp + final sparkle
place(sfx, stamp(), starts["19"] + 3.0, 0.5)
place(sfx, sparkle(1.2), ends["19"] + 0.3, 0.3)

# ---------------------------------------------------------------- voice + mix
voice = np.zeros(N, dtype=np.float32)
for lid, sig in lines.items():
    place(voice, sig, starts[lid], 1.0)
voice = reverb(voice, 0.9, 0.08)

# Sidechain: music down while the voice speaks
venv = lp(np.abs(voice), 6)
duck = 1 - 0.55 * np.clip(venv / (venv.max() * 0.25 + 1e-9), 0, 1)
music = reverb(music, 3.0, 0.4) * duck
sfx = reverb(sfx, 2.2, 0.25)

L_ch = voice * 1.0 + music * 0.9 + sfx * 0.85
# light stereo width for music/sfx
delay = int(0.012 * SR)
R_ch = voice * 1.0 + np.roll(music, delay) * 0.9 + np.roll(sfx, delay // 2) * 0.85
mix = np.stack([L_ch, R_ch], axis=1)
fade = int(1.2 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= max(1e-9, np.abs(mix).max()) / 0.95
wavfile.write(PUB / "soundtrack_raw.wav", SR, (mix * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(PUB / "soundtrack_raw.wav"),
                "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", str(SR), str(PUB / "soundtrack.wav")], check=True)
(PUB / "soundtrack_raw.wav").unlink()
print(json.dumps({"total": TOTAL, "scenes": [(s["name"], s["start"], s["end"]) for s in scenes]}, ensure_ascii=False))
