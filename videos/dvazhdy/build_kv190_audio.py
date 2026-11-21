"""«Квартира 190»: horror SFX + dark drone + mix → public/shnurok/ep05-mix.wav."""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep05-words.json"))
DUR = float(int(W[-1]["end"] + 2.5) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, bp, env = A.place, A.span, A.noise, A.lp, A.bp, A.env


def at(word, nth=1):
    k = 0
    for w in W:
        if w["text"].strip("—–,.:;!?…«»").lower() == word:
            k += 1
            if k == nth:
                return w["start"]
    return 0.0


def howl():
    t = np.arange(N) / SR
    f = 260 + 90 * np.sin(2 * np.pi * t * 0.11) + 40 * np.sin(2 * np.pi * t * 0.37)
    tone = np.sin(np.cumsum(2 * np.pi * f / SR)) * 0.15
    return bp(noise(N), 250, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * t * 0.17) ** 2) + tone * (0.4 + 0.6 * np.sin(2 * np.pi * t * 0.05) ** 2)


def drone():
    t = np.arange(N) / SR
    s = sum(np.sin(2 * np.pi * f * t + i) / (i + 1) for i, f in enumerate([55, 55.4, 82.4, 110.2]))
    return lp(s, 400) * (0.7 + 0.3 * np.sin(2 * np.pi * t * 0.07))


def heartbeat(t0, t1, bpm=70):
    out = np.zeros(N, np.float32)
    t = t0
    while t < t1:
        for dt, g in ((0, 1.0), (0.22, 0.7)):
            n = int(0.18 * SR)
            tt = np.arange(n) / SR
            place(out, np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 22) * g, t + dt)
        t += 60 / bpm
    return out


def knock3(t0):
    out = np.zeros(N, np.float32)
    for k in range(3):
        place(out, P.knock()[: int(0.15 * SR)], t0 + k * 0.45, 1.2)
    return out


def hiss(t0, t1):
    return bp(noise(N), 3000, 8000) * 0.12 * span(t0, t1, 0.5)


def ding():
    return (A.tone(1318.5, 1.5, 3, (1, 0.3)) + np.pad(A.tone(987.8, 1.5, 3, (1, 0.3)), (int(0.3 * SR), 0))[: int(1.5 * SR)]) * 0.4


def buzz():
    t = np.arange(int(0.5 * SR)) / SR
    return np.sign(np.sin(2 * np.pi * 180 * t)) * (np.sin(2 * np.pi * 8 * t) > 0) * 0.08


def step():
    n = int(0.09 * SR)
    return lp(noise(n), 900) * np.exp(-np.arange(n) / (SR * 0.02)) * 0.9


def main():
    tmp = PUB / "tmp5.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep05-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    s = np.zeros(N, np.float32)
    s += howl() * 0.22
    # window: creak + ghost whisper-ish noise
    place(s, P.creak() if hasattr(P, 'creak') else A.creak(), at("тётей") - 0.3, 1.5)
    # chat message buzz
    place(s, buzz(), at("сообщение") - 0.2, 1.0)
    place(s, buzz(), at("инструкция") - 0.3, 0.8)
    # curtain swoosh + hit on six
    place(s, P.whoosh(0.8), at("задёрнул"), 0.8)
    place(s, A.thud(), at("шестой"), 1.0)
    # knock at Vera's
    s += knock3(at("постучала") - 0.1)
    # gas hiss + heartbeat while dizzy
    s += hiss(at("горели") - 0.2, at("выключил"))
    s += heartbeat(at("заболела") - 0.5, at("выключил"), 84) * 0.8
    # window flung open: gust
    place(s, bp(noise(int(1.5 * SR)), 300, 3000) * env(int(1.5 * SR), 0.05, 1.0) * 0.6, at("распахнул"), 1.0)
    place(s, P.beep(425, 0.6), at("набрал") + 0.3, 0.6)
    place(s, P.beep(425, 0.6), at("набрал") + 1.3, 0.6)
    # lift
    place(s, ding(), at("приехал") - 0.1, 1.0)
    s += bp(noise(N), 60, 200) * 0.25 * span(at("открылись") - 0.2, at("открылись") + 1.4, 0.3)
    # footsteps counting up
    t0 = at("снизу")
    for k in range(int((at("дворник") - t0) / 0.5)):
        place(s, step(), t0 + k * 0.5, 0.9)
    # heartbeat on no-breath reveal and final choice
    s += heartbeat(at("заметил") - 0.3, at("вздрогнул"), 92)
    place(s, buzz(), at("вздрогнул") - 0.2, 1.2)
    place(s, A.thud(), at("замёрз"), 0.8)
    s += heartbeat(at("зовёт") - 0.3, DUR - 1.5, 100) * 0.8
    for k in range(6):
        place(s, P.click(), at("один", 3) + k * 0.5, 0.3)
    dr = drone()
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    dr *= 1 - 0.4 * np.clip(venv * 6, 0, 1)

    def norm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = norm(v, 0.89) + norm(s, 0.28) + norm(dr, 0.16)
    mix *= np.clip((DUR - np.arange(N) / SR) / 1.0, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep05-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
