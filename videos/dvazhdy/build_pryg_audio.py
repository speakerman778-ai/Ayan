"""«Что если все прыгнули»: SFX + music + mix → public/shnurok/ep04-mix.wav."""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep04-words.json"))
DUR = float(int(W[-1]["end"] + 2.2) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp = A.place, A.span, A.noise, A.lp


def at(word, nth=1):
    k = 0
    for w in W:
        if w["text"].strip("—–,.:;!?…«»").lower() == word:
            k += 1
            if k == nth:
                return w["start"]
    return 0.0


def music():
    out = np.zeros(N, np.float32)
    beat = 60 / 118
    bar = beat * 4
    prog = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
    t, i = 0.0, 0
    while t < DUR:
        root, ch = prog[i % 4]
        place(out, A.pad(A.hz(root, 2), bar + 0.8) * 0.3, t)
        for k, idx in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
            place(out, A.pluck(A.hz(ch[idx], 5 if k % 2 else 4), 0.7) * (0.4 if k % 2 else 0.55), t + k * beat / 2)
        for k in range(4):
            n = int(0.12 * SR)
            tt = np.arange(n) / SR
            place(out, np.sin(2 * np.pi * (55 + 50 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 20) * 0.5, t + k * beat)
        t += bar
        i += 1
    return lp(out, 6000)


def main():
    tmp = PUB / "tmp4.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep04-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    s = np.zeros(N, np.float32)
    s += P.crowd(0.05) * span(0, at("допустим"))
    for k in range(12):
        place(s, P.click(), 0.3 + k * 0.18, 0.5)  # odometer ticks
    place(s, P.coin(), at("допустим") + 0.6, 0.8)  # phone notification
    for w in ("три", "два", "один"):
        place(s, P.beep(880, 0.25), at(w), 0.9)
    place(s, P.beep(1760, 0.5), at("прыжок", 2), 1.0)
    place(s, P.whoosh(0.8), at("прыжок", 2), 1.0)
    for k in range(10):
        place(s, P.click(), at("восемь", 2) + k * 0.15, 0.4)
    place(s, A.thud(), at("представил") + 0.8, 0.8)
    place(s, A.thud(), at("тяжелее"), 0.6)
    place(s, P.whoosh(1.2), at("поэтому"), 0.7)
    place(s, A.chime(1975.5), at("атома"), 0.6)
    for k in range(6):
        place(s, A.thud(), at("землетрясения") + 0.4 + k * 0.06, 0.6)
    place(s, P.whoosh(), at("прыгнул"), 0.8)
    s += P.crowd(0.04) * span(at("весь", 2) - 0.3, at("какой"))
    for k in range(6):
        place(s, P.click(), at("какой") + k * 0.5, 0.3)
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
    wavfile.write(PUB / "ep04-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
