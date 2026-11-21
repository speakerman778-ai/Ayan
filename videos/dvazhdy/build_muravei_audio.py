"""«Шнурок размером с муравья»: SFX + music + mix → public/shnurok/ep03-mix.wav."""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep03-words.json"))
DUR = float(int(W[-1]["end"] + 2.2) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, bp = A.place, A.span, A.noise, A.lp, A.bp


def at(word, nth=1):
    k = 0
    for w in W:
        if w["text"].strip("—–,.:;!?…«»").lower() == word:
            k += 1
            if k == nth:
                return w["start"]
    return 0.0


def slide(f0, f1, d):
    t = np.arange(int(d * SR)) / SR
    f = f0 + (f1 - f0) * t / d
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * A.env(len(t), 0.01, 0.1) * 0.3


def gulp():
    out = np.zeros(int(0.9 * SR), np.float32)
    for k in range(3):
        place(out, slide(300, 150, 0.15), k * 0.25, 1.0)
    return out


def music():
    out = np.zeros(N, np.float32)
    beat = 60 / 112
    bar = beat * 4
    prog = [("C", ["C", "E", "G"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"]), ("C", ["C", "E", "G"])]
    t, i = 0.0, 0
    while t < DUR:
        root, ch = prog[i % 4]
        place(out, A.pad(A.hz(root, 2), bar + 0.8) * 0.3, t)
        for k, idx in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
            place(out, A.pluck(A.hz(ch[idx], 5 if k % 2 else 4), 0.8) * (0.45 if k % 2 else 0.6), t + k * beat / 2)
        t += bar
        i += 1
    return lp(out, 6000)


def main():
    tmp = PUB / "tmp3.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep03-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    s = np.zeros(N, np.float32)
    place(s, gulp(), 0.9, 1.0)
    place(s, slide(1400, 200, 0.8), at("стал") - 0.2, 1.0)          # shrinking
    place(s, A.sparkle() if hasattr(A, "sparkle") else A.chime(), at("стал"), 0.5)
    s += A.wind(0.05) * span(3.5, at("тут"))                          # outdoor micro world
    place(s, slide(200, 500, 0.6), at("поднял"), 0.8)                # lift
    for k in range(6):
        place(s, A.thud(), at("смог") + k * 0.18, 0.15)              # struggling
    for k in range(8):
        place(s, lp(noise(int(0.3 * SR)), 800) * 0.3, at("запыхался") + k * 0.35)  # panting
    for k in range(5):
        place(s, A.tone(1760 + k * 200, 0.3, 8, (1,)) * 0.15, at("запахами") + k * 0.12)
    place(s, P.beep(500, 0.3), at("фу"), 0.8)
    place(s, A.chime(1046.5), at("королеве"), 0.7)
    place(s, P.whoosh(), at("рассказала"), 0.6)
    place(s, A.thud(), at("динозавров") - 0.4, 1.0)
    place(s, A.thud(), at("динозавров") + 0.2, 1.0)
    place(s, slide(200, 1400, 0.8), at("стал", 2) - 0.6, 1.0)        # growing back
    for k in range(10):
        place(s, P.click(), at("какой") + k * 0.5, 0.3)
    for f in (at("десятки"), at("лёгких"), at("запахами"), at("второй"), at("тридцать"), at("шесть"), at("ста")):
        place(s, A.chime(1975.5), f, 0.35)                            # FACT card ping
    mus = music()
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.55 * np.clip(venv * 6, 0, 1)

    def norm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = norm(v, 0.89) + norm(s, 0.25) + norm(mus, 0.13)
    mix *= np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep03-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
