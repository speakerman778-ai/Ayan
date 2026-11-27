"""Episode 1 «Барсик — живой компас»: sound effects + background music + mix.

Input:  public/keeper/ep01-voice.mp3   (ElevenLabs, Pavel, eleven_v4)
Output: public/keeper/ep01-mix.wav     (voice + SFX + music, 48 kHz stereo)

Steps 5 and 6 of the channel workflow. Voice is always the loudest layer;
music is ducked under it.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).parent
PUB = ROOT / "public" / "keeper"
SR = 48000
DUR = 80.4
N = int(DUR * SR)
rng = np.random.default_rng(11)


# ---------------------------------------------------------------- helpers
def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env(n, a, r):
    e = np.ones(n, np.float32)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def span(t0, t1, fade=0.4):
    """Gain curve: 1 inside [t0, t1] with soft fades, 0 elsewhere."""
    t = np.arange(N) / SR
    up = np.clip((t - t0) / fade + 1, 0, 1)
    dn = np.clip((t1 - t) / fade + 1, 0, 1)
    return np.minimum(up, dn).astype(np.float32)


def tone(f, dur, decay=3.0, harm=(1, 0.5, 0.25)):
    t = np.arange(int(dur * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(harm))
    return (s * np.exp(-t * decay)).astype(np.float32)


# ---------------------------------------------------------------- voice
def load_voice():
    wav = PUB / "ep01-voice.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep01-voice.mp3"), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
    sr, x = wavfile.read(wav)
    wav.unlink()
    x = x.astype(np.float32) / 32768.0
    v = np.zeros(N, np.float32)
    v[: min(N, len(x))] = x[:N]
    return v


# ---------------------------------------------------------------- ambiences
def sea(level):
    """Slow surf: low-passed noise with a breathing envelope."""
    t = np.arange(N) / SR
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 5.5) ** 2
    return lp(noise(N), 500) * swell * level


def wind(level):
    t = np.arange(N) / SR
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * t * 0.31) * np.sin(2 * np.pi * t * 0.13 + 1)
    return bp(noise(N), 300, 1400) * mod * level


def rain():
    return hp(noise(N), 2500) * 0.6 + bp(noise(N), 800, 2500) * 0.3


def crackle():
    out = np.zeros(N, np.float32)
    for at in np.cumsum(rng.exponential(0.09, 2000)):
        if at >= DUR:
            break
        n = int(SR * 0.006)
        place(out, hp(noise(n), 2000) * np.exp(-np.arange(n) / (SR * 0.0015)), at, rng.uniform(0.2, 1.0))
    return lp(noise(N), 200) * 0.25 + out


def purr(t0, t1):
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    am = (0.5 + 0.5 * np.sin(2 * np.pi * 25 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 2.2) ** 2)
    s = lp(noise(n), 160, 4) * am * env(n, 0.5, 0.6)
    return s


def thunder(dur=3.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    crack = hp(noise(n), 1500) * np.exp(-t * 18) * 0.6
    rumble = lp(noise(n), 120, 4) * np.exp(-t * 1.1) * 3.0
    return (crack + rumble) * env(n, 0.005, 0.8)


def gull():
    d = 0.35
    t = np.arange(int(d * SR)) / SR
    f = 1500 + 900 * np.exp(-t * 9) - 500 * t
    ph = np.cumsum(2 * np.pi * f / SR)
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env(len(t), 0.02, 0.15) * 0.25


def meow():
    d = 0.6
    t = np.arange(int(d * SR)) / SR
    f = 600 + 350 * np.sin(np.pi * t / d) ** 1.5
    ph = np.cumsum(2 * np.pi * f / SR)
    raw = sum(np.sin(k * ph) / k for k in range(1, 7))
    return bp(raw, 500, 3000) * env(len(t), 0.05, 0.25) * 0.5


def step_sand():
    n = int(0.12 * SR)
    return bp(noise(n), 300, 2500) * np.exp(-np.arange(n) / (SR * 0.03)) * 0.35


def tick():
    n = int(0.03 * SR)
    return hp(noise(n), 3000) * np.exp(-np.arange(n) / (SR * 0.004)) * 0.6


def chime(f=1318.5):
    return tone(f, 2.0, 2.2, (1, 0.3, 0.15)) * 0.35


def thud():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 90 * t) * np.exp(-t * 12) + lp(noise(n), 400) * np.exp(-t * 20) * 0.5) * 0.8


def drip():
    d = 0.18
    t = np.arange(int(d * SR)) / SR
    f = 900 + 1400 * t / d
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t * 30) * 0.2


def creak():
    d = 0.5
    t = np.arange(int(d * SR)) / SR
    f = 180 + 60 * np.sin(np.pi * t / d)
    s = np.sign(np.sin(np.cumsum(2 * np.pi * f / SR)))
    return bp(s, 300, 1800) * env(len(t), 0.05, 0.2) * 0.08


# ---------------------------------------------------------------- music
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def pluck(f, dur=2.0):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return (s * np.exp(-t * 2.6) * env(len(t), 0.004, 0.3)).astype(np.float32)


def pad(f, dur):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * k * t + k) / k for k in (1, 2, 3))
    return lp(s, 1200) * env(len(t), 0.8, 1.0) * 0.5


def music():
    """Warm, gentle loop: C – Am – F – G, plucked arpeggio + soft pad.
    Storm: minor and sparse. Fog: pad only. Finale: full again."""
    out = np.zeros(N, np.float32)
    beat = 60 / 84
    bar = beat * 4
    happy = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
    minor = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G", "B"])]
    t = 0.0
    i = 0
    while t < DUR:
        storm = 10.0 <= t < 16.5
        fog = 51.3 <= t < 64.5
        root, ch = (minor if storm else happy)[i % 4]
        out_pad = pad(hz(root, 2), bar + 0.8) * (0.6 if fog else 0.35)
        place(out, out_pad, t)
        place(out, pad(hz(ch[1], 3), bar + 0.8) * 0.25, t)
        if not fog:
            pattern = [0, 1, 2, 1, 0, 2, 1, 2] if not storm else [0, None, 2, None, 0, None, 1, None]
            for k, idx in enumerate(pattern):
                if idx is None:
                    continue
                o = 4 if k % 4 else 3
                place(out, pluck(hz(ch[idx], o)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        t += bar
        i += 1
    out = lp(out, 5000)
    return out


# ---------------------------------------------------------------- build
def main():
    voice = load_voice()
    sfx = np.zeros(N, np.float32)

    # scene 1–2: day sea, gulls, wind rising toward the storm
    sfx += sea(0.09) * span(0, 10.3)
    for at in (0.8, 3.4, 6.2):
        place(sfx, gull(), at, 0.8)
    sfx += wind(0.25) * span(4.6, 10.3) * np.clip((np.arange(N) / SR - 6.5) / 3.5, 0.15, 1)
    # scene 3: storm outside, then muffled inside
    storm_out = span(10.2, 13.2, 0.3)
    storm_in = span(13.2, 16.55, 0.3)
    r = rain()
    sfx += (r * 0.12 + sea(0.2) + wind(0.3)) * storm_out
    sfx += lp(r * 0.12 + sea(0.2), 700) * storm_in
    place(sfx, thunder(), 11.3, 0.55)
    place(sfx, lp(thunder(), 300), 14.8, 0.3)
    sfx += crackle() * 0.04 * storm_in
    # scene 4: morning beach, footsteps, meow
    sfx += sea(0.08) * span(16.55, 32.4)
    for k in range(13):
        place(sfx, step_sand(), 16.7 + k * 0.45, 0.9)
    place(sfx, gull(), 18.0, 0.6)
    place(sfx, meow(), 24.95, 0.7)
    # scene 5: kitten drips
    for at in (25.6, 26.9, 28.3, 29.4, 31.0):
        place(sfx, drip(), at, 1.0)
    # scene 6: compass — click, needle ticks, chime on «Точно на север»
    place(sfx, tick(), 32.6, 1.2)
    for k in range(8):
        place(sfx, tick(), 33.3 + k * 0.28 + k * k * 0.015, 0.5 * (1 - k / 9))
    place(sfx, chime(1318.5), 37.5, 1.0)
    place(sfx, chime(1975.5), 37.62, 0.5)
    # scene 7: home — fire crackle, milk pour-ish drip, purring
    sfx += crackle() * 0.06 * span(38.55, 51.35)
    place(sfx, drip(), 41.9, 0.8)
    place(sfx, purr(44.0, 51.3), 44.0, 0.35)
    place(sfx, chime(1568.0), 48.0, 0.5)
    # scene 8: fog — soft lapping water, oar creaks, bump into the pier
    sfx += lp(sea(0.07), 350) * span(51.35, 67.9)
    for at in (52.0, 53.6, 62.4, 63.9, 65.3):
        place(sfx, creak(), at, 1.0)
    place(sfx, thud(), 66.95, 0.6)
    # scene 9: night by the lighthouse
    sfx += sea(0.07) * span(67.9, 74.6)
    sfx += bp(noise(N), 4000, 6000) * 0.012 * (np.sin(2 * np.pi * np.arange(N) / SR * 18) > 0.6) * span(67.9, 74.6)
    place(sfx, chime(1046.5), 71.75, 0.6)
    # scene 10: finale — purr and a playful pluck on «почти»
    place(sfx, purr(74.7, 80.2), 74.7, 0.3)
    place(sfx, pluck(hz("G", 4)), 78.05, 0.35)
    place(sfx, pluck(hz("C", 5)), 78.25, 0.35)

    mus = music()
    # duck music under the voice
    venv = lp(np.abs(voice), 4)
    venv = venv / (venv.max() + 1e-9)
    duck = 1 - 0.55 * np.clip(venv * 6, 0, 1)
    mus *= duck

    def norm(x, peak):
        m = np.abs(x).max()
        return x / m * peak if m > 0 else x

    voice = norm(voice, 0.89)
    mix = voice + norm(sfx, 0.26) + norm(mus, 0.14)
    # end fade
    mix *= np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    st = np.stack([mix, mix], axis=1)
    wavfile.write(PUB / "ep01-mix.wav", SR, (st * 32767).astype(np.int16))
    print("ok", (PUB / "ep01-mix.wav"), f"{DUR}s")


if __name__ == "__main__":
    main()
