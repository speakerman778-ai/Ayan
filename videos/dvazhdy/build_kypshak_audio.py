"""«Кто такие кыпчаки?»: SFX + steppe music + mix. Input public/kypshak/voice.mp3 → public/kypshak/mix.wav."""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

import build_ep01_audio as A

PUB = Path(__file__).parent / "public" / "kypshak"
words = json.load(open(PUB / "words.json"))
DUR = float(int(words[-1]["end"] + 2.2) + 1)
A.DUR = DUR
A.N = N = int(DUR * A.SR)
SR = A.SR
lp, hp, bp, noise, place, span, env, tone, pluck, hz, pad = A.lp, A.hp, A.bp, A.noise, A.place, A.span, A.env, A.tone, A.pluck, A.hz, A.pad


def at(w, frm=0):
    for i, x in enumerate(words):
        if i >= frm and x["text"].strip("—–,.:;!?…«»").lower().startswith(w.lower()):
            return x["start"], i
    return 0.0, 0


def load_voice():
    tmp = PUB / "tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    return v


def hoof(n_hits, rate=6.0):
    out = np.zeros(int((n_hits / rate + 0.3) * SR), np.float32)
    for k in range(n_hits):
        n = int(0.06 * SR)
        place(out, lp(noise(n), 700) * np.exp(-np.arange(n) / (SR * 0.012)) * (1.0 if k % 2 else 0.7), k / rate)
    return out


def bleat():
    d = 0.7
    t = np.arange(int(d * SR)) / SR
    f = 420 + 40 * np.sin(2 * np.pi * 9 * t)
    ph = np.cumsum(2 * np.pi * f / SR)
    return bp(sum(np.sin(k * ph) / k for k in range(1, 6)), 400, 2500) * env(len(t), 0.05, 0.3) * 0.35


def drum(d=0.5):
    t = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 7) + lp(noise(len(t)), 300) * np.exp(-t * 25) * 0.4) * 0.8


def whoosh(d=0.7):
    n = int(d * SR)
    t = np.arange(n) / SR
    return bp(noise(n), 500, 5000) * np.sin(np.pi * t / d) * 0.5


def music(t_dark0, t_dark1):
    out = np.zeros(N, np.float32)
    beat = 60 / 84
    pent = [("A", 3), ("C", 4), ("D", 4), ("E", 4), ("G", 4), ("A", 4)]
    rng = np.random.default_rng(3)
    t = 0.0
    while t < DUR:
        dark = t_dark0 <= t < t_dark1
        place(out, pad(hz("A", 2), beat * 8 + 0.8) * 0.35, t)
        place(out, pad(hz("E", 3), beat * 8 + 0.8) * 0.2, t)
        for k in range(8 if not dark else 4):
            n, o = pent[rng.integers(0, len(pent))]
            # dombra-like double pluck
            place(out, pluck(hz(n, o), 1.2) * 0.55, t + k * beat * (1 if not dark else 2))
            place(out, pluck(hz(n, o), 1.0) * 0.3, t + k * beat * (1 if not dark else 2) + beat / 4)
        if dark:
            for k in range(8):
                place(out, drum() * 0.6, t + k * beat)
        t += beat * 8
    return lp(out, 5000)


def main():
    v = load_voice()
    s = np.zeros(N, np.float32)
    t_steppe, _ = at("моргает")
    t_back, i_back = at("Шнурок", 60)
    t_kalka, _ = at("монголы")
    t_lost, _ = at("проиграли")
    t_hors, _ = at("лошади")
    t_fall, _ = at("падает")
    # museum hush
    s += lp(noise(N), 400) * 0.02 * span(0, t_steppe + 0.5)
    place(s, whoosh(), t_steppe, 1.0)
    place(s, A.chime(1568), t_steppe + 0.3, 0.6)
    # steppe wind
    s += A.wind(0.18) * span(t_steppe + 0.5, t_back)
    for k in range(4):
        place(s, hoof(16, 7), t_steppe + 1.2 + k * 0.1, 0.4)
    place(s, bleat(), t_hors + 0.3, 0.8)
    place(s, bleat(), t_hors + 1.4, 0.6)
    place(s, hoof(8, 5), t_hors - 0.5, 0.6)
    place(s, A.thud(), t_fall + 0.4, 1.0)
    # Kalka: drums, galloping army
    for k in range(6):
        place(s, hoof(30, 9), t_kalka + k * 0.13, 0.5)
    place(s, drum() * 1.0, t_lost, 1.0)
    # back to museum
    place(s, whoosh(), t_back, 1.0)
    place(s, A.chime(1318.5), t_back + 0.3, 0.6)
    mus = music(t_kalka - 0.5, t_lost + 1.5)
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.55 * np.clip(venv * 6, 0, 1)

    def norm(x, p):
        m = np.abs(x).max()
        return x / m * p if m > 0 else x

    mix = norm(v, 0.89) + norm(s, 0.25) + norm(mus, 0.14)
    mix *= np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
