"""Шнурок, выпуск 1 «Мне 16, и я открыл ПК-клуб»: SFX + music + mix.

Input:  public/shnurok/ep01-voice-full.mp3
Output: public/shnurok/ep01-mix.wav
Reuses the synth helpers from build_ep01_audio.py.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

import build_ep01_audio as A

ROOT = Path(__file__).parent
PUB = ROOT / "public" / "shnurok"
DUR = 112.0
A.DUR = DUR
A.N = N = int(DUR * A.SR)
SR = A.SR
lp, hp, bp, noise, place, span, env, tone, pluck, hz, pad = A.lp, A.hp, A.bp, A.noise, A.place, A.span, A.env, A.tone, A.pluck, A.hz, A.pad


def load_voice():
    wav = PUB / "tmp-voice.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep01-voice-full.mp3"), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
    _, x = wavfile.read(wav)
    wav.unlink()
    x = x.astype(np.float32) / 32768.0
    v = np.zeros(N, np.float32)
    v[: min(N, len(x))] = x[:N]
    return v


def click():
    n = int(0.02 * SR)
    return hp(noise(n), 2500) * np.exp(-np.arange(n) / (SR * 0.003)) * 0.7


def beep(f=1800, d=0.25):
    t = np.arange(int(d * SR)) / SR
    return np.sign(np.sin(2 * np.pi * f * t)) * env(len(t), 0.005, 0.02) * 0.12


def whoosh(d=0.4):
    n = int(d * SR)
    t = np.arange(n) / SR
    return bp(noise(n), 400, 3000) * np.sin(np.pi * t / d) * 0.4


def fanhum(level):
    t = np.arange(N) / SR
    return (lp(noise(N), 300) + 0.3 * np.sin(2 * np.pi * 120 * t)) * level


def screw():
    out = np.zeros(int(0.6 * SR), np.float32)
    for k in range(6):
        place(out, click(), k * 0.09, 0.6)
    return out


def coin():
    return (tone(1975.5, 0.5, 6, (1, 0.3)) + np.pad(tone(2637, 0.5, 6, (1, 0.3)), (int(0.08 * SR), 0))[: int(0.5 * SR)]) * 0.25


def knock():
    out = np.zeros(int(0.8 * SR), np.float32)
    for k in range(3):
        n = int(0.12 * SR)
        place(out, lp(noise(n), 500) * np.exp(-np.arange(n) / (SR * 0.02)) * 1.2, k * 0.22)
    return out


def bluescreen():
    t = np.arange(int(0.6 * SR)) / SR
    f = 300 - 150 * t
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * env(len(t), 0.01, 0.3) * 0.25


def crowd(level):
    return bp(noise(N), 300, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * np.arange(N) / SR * 0.7)) * level


def music():
    out = np.zeros(N, np.float32)
    beat = 60 / 96
    bar = beat * 4
    happy = [("C", ["C", "E", "G"]), ("G", ["G", "B", "D"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"])]
    minor = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G", "B"])]
    t, i = 0.0, 0
    while t < DUR:
        tense = 81.9 <= t < 102.6
        sad = 39.2 <= t < 58.5
        root, ch = (minor if (tense or sad) else happy)[i % 4]
        place(out, pad(hz(root, 2), bar + 0.8) * 0.35, t)
        pattern = [0, 1, 2, 1, 0, 2, 1, 2] if not tense else [0, None, 0, None, 0, None, 1, None]
        for k, idx in enumerate(pattern):
            if idx is None:
                continue
            place(out, pluck(hz(ch[idx], 4 if k % 4 else 3)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        # soft kick on beats for drive
        if not sad:
            for k in range(4):
                n = int(0.15 * SR)
                tt = np.arange(n) / SR
                place(out, np.sin(2 * np.pi * (60 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18) * 0.5, t + k * beat)
        t += bar
        i += 1
    return lp(out, 5000)


def main():
    voice = load_voice()
    sfx = np.zeros(N, np.float32)
    # 1–2 room: mouse clicks, game blips
    for at in (1.0, 1.4, 2.2, 3.1, 5.0):
        place(sfx, click(), at, 0.8)
    place(sfx, whoosh(), 7.3, 0.6)
    for k in range(3):
        place(sfx, tone(1318.5, 0.3, 10, (1,)) * 0.2, 8.4 + k * 0.6)
    # 3 boxes falling in
    for k in range(10):
        place(sfx, A.thud(), 13.9 + k * 0.7, 0.35)
    # 4 assembly at night: screwdriver
    for at in (23.4, 24.6, 25.8, 27.0, 28.2):
        place(sfx, screw(), at, 0.9)
    # 5 contract, pen scribble
    place(sfx, bp(noise(int(0.6 * SR)), 2000, 6000) * 0.15, 33.6)
    # 6 switching on
    sfx += fanhum(0.03) * span(41.5, 81.9)
    place(sfx, click(), 41.6, 1.0)
    place(sfx, tone(1046.5, 0.6, 4, (1, 0.4)) * 0.3, 41.7)
    place(sfx, click(), 43.0, 1.0)
    place(sfx, bluescreen(), 43.1, 1.0)
    place(sfx, click(), 44.8, 1.0)
    place(sfx, click(), 46.6, 1.0)
    for k in range(4):
        place(sfx, beep(), 46.7 + k * 0.45, 1.0)
    place(sfx, click(), 48.3, 1.0)
    place(sfx, tone(1046.5, 0.6, 4, (1, 0.4)) * 0.3, 48.4)
    # 7 selling GPU: notification
    place(sfx, screw(), 53.0, 0.8)
    place(sfx, coin(), 57.3, 1.0)
    # 8 renting out: footsteps, knock, coins
    for k in range(8):
        place(sfx, A.step_sand(), 58.6 + k * 0.45, 0.8)
    place(sfx, knock(), 61.4, 0.9)
    place(sfx, coin(), 63.9, 1.0)
    place(sfx, coin(), 66.4, 0.8)
    # 9 repairs → each PC boots
    for at in (68.6, 69.8, 71.2, 72.3):
        place(sfx, tone(1046.5, 0.5, 4, (1, 0.4)) * 0.3, at)
    place(sfx, A.chime(1568.0), 72.4, 0.8)
    # 10 opening: crowd grows
    sfx += crowd(0.05) * span(76.0, 81.9) * np.clip((np.arange(N) / SR - 76) / 4, 0, 1)
    place(sfx, A.sparkle() if hasattr(A, "sparkle") else A.chime(), 73.8, 0.6)
    # 11 competitor: neon buzz, steps away
    t = np.arange(N) / SR
    sfx += (np.sign(np.sin(2 * np.pi * 100 * t)) * 0.02 + bp(noise(N), 80, 200) * 0.04) * span(82.3, 91.8)
    for k in range(8):
        place(sfx, A.step_sand(), 87.6 + k * 0.4, 0.6)
    # 12 choice: whooshes
    place(sfx, whoosh(), 93.6, 0.8)
    place(sfx, whoosh(), 97.5, 0.8)
    # 13 ticking clock under the question
    for k in range(16):
        place(sfx, click(), 102.8 + k * 0.5, 0.35)

    mus = music()
    venv = lp(np.abs(voice), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.55 * np.clip(venv * 6, 0, 1)

    def norm(x, peak):
        m = np.abs(x).max()
        return x / m * peak if m > 0 else x

    mix = norm(voice, 0.89) + norm(sfx, 0.26) + norm(mus, 0.13)
    mix *= np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep01-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok")


if __name__ == "__main__":
    main()
