"""«Овощ»: football SFX + music + mix → public/shnurok/ep06-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep06-words.json"))
DUR = float(int(W[-1]["end"] + 1.2) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, hp, bp, env, pluck, pad, hz = A.place, A.span, A.noise, A.lp, A.hp, A.bp, A.env, A.pluck, A.pad, A.hz


def norm(s):
    return re.sub(r"[^\w-]", "", s).lower()


def at(word, nth=1, after=None):
    k = 0
    start = 0
    if after:
        start = next(i for i, w in enumerate(W) if norm(w["text"]) == after)
    for w in W[start:]:
        if norm(w["text"]) == word:
            k += 1
            if k == nth:
                return w["start"]
    raise KeyError(word)


def kick():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (90 + 120 * np.exp(-t * 40)) * t) * np.exp(-t * 30) + lp(noise(n), 2500) * np.exp(-t * 60) * 0.6) * 0.9


def clang():
    t = np.arange(int(1.2 * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1180, 4), (1730, 5), (2650, 7), (3310, 9)))
    return s * 0.25


def whistle(d=0.7):
    t = np.arange(int(d * SR)) / SR
    f = 2900 + 120 * np.sin(2 * np.pi * 32 * t)
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * env(len(t), 0.02, 0.08) * 0.3


def heartbeat(t0, t1, bpm0=80, bpm1=130):
    out = np.zeros(N, np.float32)
    t = t0
    while t < t1:
        bpm = bpm0 + (bpm1 - bpm0) * (t - t0) / max(0.1, t1 - t0)
        for dt, g in ((0, 1.0), (0.2, 0.7)):
            n = int(0.18 * SR)
            tt = np.arange(n) / SR
            place(out, np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 22) * g, t + dt)
        t += 60 / bpm
    return out


def music(t_night, t_final, t_freeze):
    out = np.zeros(N, np.float32)
    beat = 60 / 100
    bar = beat * 4
    happy = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
    sad = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]), ("E", ["E", "G", "B"])]
    t, i = 0.0, 0
    while t < t_freeze:
        night = t_night <= t < t_final
        root, ch = (sad if t < t_night else happy)[i % 4]
        place(out, pad(hz(root, 2), bar + 0.8) * 0.35, t)
        pattern = [0, 1, 2, 1, 0, 2, 1, 2] if night or t >= t_final else [0, None, 2, None, 1, None, 2, None]
        for k, ix in enumerate(pattern):
            if ix is None or t + k * beat / 2 > t_freeze:
                continue
            place(out, pluck(hz(ch[ix], 4 if k % 4 else 3)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        if night or t >= t_final:
            for k in range(4):
                if t + k * beat > t_freeze:
                    break
                n = int(0.15 * SR)
                tt = np.arange(n) / SR
                place(out, np.sin(2 * np.pi * (60 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18) * 0.45, t + k * beat)
        t += bar
        i += 1
    return lp(out, 5000)


def main():
    tmp = PUB / "tmp6.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep06-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_lock = at("раздевалке") - 0.4
    t_bus = at("автобусе") - 0.4
    t_bench = at("тренер") - 0.5
    t_week = at("через") - 0.6
    t_night = at("только") - 0.2
    t_mont = at("сто") - 0.2
    t_fall = at("падаю")
    t_seven = at("семь")
    t_final = at("суббота") - 0.2
    t_89 = at("восемьдесят") - 0.2
    t_run = at("я", after="кричит") - 0.2
    t_freeze = at("и-и-и")

    s = np.zeros(N, np.float32)
    # training field: light wind + distant kids
    s += bp(noise(N), 200, 1200) * 0.05 * span(0, t_lock, 0.5)
    s += P.crowd(0.05) * span(0, t_lock, 0.5)
    place(s, kick(), at("убегает") + 0.05, 1.0)
    place(s, A.thud(), at("убегает") + 0.45, 0.8)
    place(s, kick(), at("аут") - 0.1, 0.6)
    place(s, P.crowd(1)[: int(1.5 * SR)] * env(int(1.5 * SR), 0.1, 0.8) * 0.15, at("кирюха") + 2.0, 1.0)
    # locker: door creak
    place(s, A.creak(), t_lock + 1.0, 0.7)
    s += bp(noise(N), 80, 400) * 0.03 * span(t_lock, t_bus, 0.3)
    # bus: engine rumble
    s += lp(noise(N), 140) * 0.35 * span(t_bus, t_bench, 0.3)
    # bench: training sounds + whistle
    s += P.crowd(0.05) * span(t_bench, t_week, 0.4)
    place(s, whistle(0.5), t_bench + 0.6, 0.7)
    for k in range(3):
        place(s, kick(), t_bench + 1.2 + k * 1.1, 0.4)
    # week/locker
    place(s, P.whoosh(0.4), t_week + 0.3, 0.4)
    # night: cold wind + lamp hum
    tt = np.arange(N) / SR
    s += A.wind(0.5) * 0.4 * span(t_night, t_final, 0.8)
    s += np.sin(2 * np.pi * 100 * tt) * 0.012 * span(t_night, t_final, 0.8)
    # montage kicks every 0.8 s until the fall
    k = 0
    while t_mont + k * 0.8 < t_fall:
        place(s, kick(), t_mont + k * 0.8 + 0.05, 0.8)
        place(s, A.thud() * 0.4, t_mont + k * 0.8 + 0.55, 0.4)  # net
        k += 1
    place(s, A.thud(), t_fall + 0.15, 0.9)
    place(s, kick(), at("перекладину") - 0.5, 0.8)
    place(s, clang(), at("перекладину") + 0.1, 0.9)
    for k in range(7):
        place(s, P.whoosh(0.15), t_seven + k * 0.18, 0.25)
    # final: stadium crowd
    hype = span(t_final, t_freeze, 0.6)
    s += P.crowd(0.35) * hype
    place(s, whistle(0.9), t_final + 0.2, 0.8)
    place(s, kick(), at("штангу") - 0.5, 0.9)
    place(s, clang(), at("штангу") + 0.1, 1.0)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.2) * 0.6, at("штангу") + 0.15, 1.0)
    place(s, kick(), at("перекладину", after="гроза") - 0.5, 0.9)
    place(s, clang(), at("перекладину", after="гроза") + 0.1, 1.0)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.2) * 0.6, at("перекладину", after="гроза") + 0.15, 1.0)
    place(s, whistle(0.4), at("падает") + 0.2, 0.9)
    place(s, P.crowd(1)[: int(2.5 * SR)] * env(int(2.5 * SR), 0.1, 1.5) * 0.7, at("смеются") - 0.1, 1.0)
    # the run-up: steps
    for k in range(int((at("мяч", after="атака") - t_run) / 0.32)):
        place(s, lp(noise(int(0.08 * SR)), 900) * np.exp(-np.arange(int(0.08 * SR)) / (SR * 0.02)) * 0.6, t_run + 0.6 + k * 0.32, 0.8)
    # heartbeat from the swing, everything else drops at the freeze
    s *= 1 - 0.9 * np.clip((tt - t_freeze) / 0.25, 0, 1)
    hb = heartbeat(at("замахиваюсь") - 0.3, DUR - 0.3, 90, 140)

    mus = music(t_night, t_final, t_freeze)
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14) + nm(hb, 0.35)
    mix *= np.clip((DUR - tt) / 0.4, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep06-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
