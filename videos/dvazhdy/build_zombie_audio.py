"""Сериал «Зомби», серия 1: SFX + dark drone + mix -> public/zombie/ep01-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "zombie"
W = json.load(open(PUB / "ep01-words.json"))
DUR = float(int(W[-1]["end"] + 2) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, hp, bp, env = A.place, A.span, A.noise, A.lp, A.hp, A.bp, A.env
tt = np.arange(N) / SR


def at(word, nth=1):
    k = 0
    for w in W:
        if re.sub(r"[^\w-]", "", w["text"]).lower() == word:
            k += 1
            if k == nth:
                return w["start"]
    raise KeyError(word)


def train_run(t_stop):
    """Rumble + wheel clacks ('ту-дух') that slow down and stop at t_stop."""
    rum = lp(noise(N), 140) * 1.2 + bp(noise(N), 200, 700) * 0.25
    gain = np.clip((t_stop - tt) / 1.6, 0, 1).astype(np.float32)
    out = rum * gain
    t, gap = 0.0, 0.55
    while t < t_stop:
        slow = max(0.0, 1 - (t_stop - t) / 2.0)
        for dt in (0, 0.13):
            n = int(0.07 * SR)
            place(out, lp(noise(n), 900) * np.exp(-np.arange(n) / (SR * 0.012)) * 2.2 * (1 - 0.7 * slow), t + dt)
        t += gap * (1 + 1.5 * slow)
    return out


def brakes(t0, d=1.6):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = 2300 - 500 * t / d
    sq = np.sin(np.cumsum(2 * np.pi * f / SR)) * 0.25 + bp(noise(n), 1800, 3200) * 0.4
    out = np.zeros(N, np.float32)
    place(out, sq * env(n, 0.2, 0.6), t0)
    return out


def scream(t0, d=1.1):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = 620 + 160 * np.sin(np.pi * t / d) - 120 * t
    v = np.sin(np.cumsum(2 * np.pi * f / SR)) + 0.5 * np.sin(np.cumsum(2 * np.pi * 2 * f / SR)) + 0.4 * bp(noise(n), 500, 2500)
    v = lp(v, 1400) * env(n, 0.06, 0.5) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))  # muffled: behind the wall
    out = np.zeros(N, np.float32)
    place(out, v.astype(np.float32) * 0.5, t0)
    return out


def buzz_flicker(t0, t1, seed=3):
    """Fluorescent lamp buzz that cuts out with the flicker."""
    k = np.sin(tt * 23.1 + seed) + np.sin(tt * 7.7 + 1 + seed) * 0.8 + np.sin(tt * 41 + seed * 2) * 0.4
    on = (k > -0.7).astype(np.float32)
    hum = np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.05 + bp(noise(N), 2000, 6000) * 0.03
    return lp(hum * on, 4000) * span(t0, t1, 0.3)


def drag_steps(t0, t1, every=0.75):
    out = np.zeros(N, np.float32)
    t = t0
    while t < t1:
        n = int(0.35 * SR)
        place(out, bp(noise(n), 150, 1200) * env(n, 0.05, 0.25) * 0.5, t)
        m = int(0.08 * SR)
        place(out, lp(noise(m), 600) * np.exp(-np.arange(m) / (SR * 0.02)), t + 0.3, 0.8)
        t += every
    return out


def slowing_steps(t0, t1):
    out = np.zeros(N, np.float32)
    t, gap = t0, 0.6
    while t < t1:
        m = int(0.08 * SR)
        k = 1 - (t - t0) / (t1 - t0)
        place(out, lp(noise(m), 600) * np.exp(-np.arange(m) / (SR * 0.02)), t, 0.4 + 0.6 * k)
        gap *= 1.28
        t += gap
    return out


def heartbeat(t0, t1, bpm=80):
    out = np.zeros(N, np.float32)
    t = t0
    while t < t1:
        for dt, g in ((0, 1.0), (0.22, 0.7)):
            n = int(0.18 * SR)
            x = np.arange(n) / SR
            place(out, np.sin(2 * np.pi * 50 * x) * np.exp(-x * 22) * g, t + dt)
        t += 60 / bpm
    return out


def bang(t0, g=1.0):
    """Fist on a compartment door: heavy thud + rattle."""
    out = np.zeros(N, np.float32)
    n = int(0.25 * SR)
    x = np.arange(n) / SR
    place(out, (lp(noise(n), 300) * 2 + np.sin(2 * np.pi * 70 * x)) * np.exp(-x * 18) * g, t0)
    place(out, bp(noise(n), 1500, 5000) * np.exp(-x * 25) * 0.3 * g, t0 + 0.01)
    return out


def ice_crack(t0):
    out = np.zeros(N, np.float32)
    for k in range(7):
        n = int(0.05 * SR)
        place(out, hp(noise(n), 2500) * np.exp(-np.arange(n) / (SR * 0.006)), t0 + k * 0.045 + 0.01 * np.sin(k * 3), 0.9 - k * 0.08)
    n = int(0.6 * SR)
    place(out, bp(noise(n), 800, 4000) * np.exp(-np.arange(n) / (SR * 0.15)) * 0.4, t0)
    return out


def horn(t0, d=1.8):
    n = int(d * SR)
    x = np.arange(n) / SR
    s = sum(np.sign(np.sin(2 * np.pi * f * x)) * 0.12 for f in (277.2, 349.2, 415.3))
    s = lp(s, 1500) * env(n, 0.08, 0.5) * np.exp(-x * 0.2)
    out = np.zeros(N, np.float32)
    place(out, s.astype(np.float32), t0)
    out = out * 0.6 + np.roll(lp(out, 800), int(0.25 * SR)) * 0.35  # distant echo
    return out


def drone():
    s = sum(np.sin(2 * np.pi * f * tt + i) / (i + 1) for i, f in enumerate([55, 55.3, 82.4, 110.2, 65.4]))
    return lp(s, 450) * (0.7 + 0.3 * np.sin(2 * np.pi * tt * 0.07))


def main():
    tmp = PUB / "tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep01-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    s = np.zeros(N, np.float32)
    t_stop = at("стоит") + 0.4
    s += train_run(t_stop) * 0.55
    s += brakes(at("стоит") - 0.8) * 0.6
    # wind outside: always, louder outdoors and after doors open
    lvl = 0.35 + 0.4 * span(0, at("три") - 0.3) + 0.5 * span(at("и", 2) - 0.2, at("шнурок", 2) - 0.2) + 0.8 * span(at("открывает"), at("стихают") + 0.5, 0.6) + 0.4 * span(at("к") - 0.2, at("один") - 0.2)
    s += A.wind(1.0) * lvl * 0.5
    s += buzz_flicker(at("свет") - 0.1, at("первая") - 0.3) * 1.2
    s += scream(at("крик") - 0.05) * 0.9
    s += drag_steps(at("по") - 0.1, at("она"), 0.8) * 0.9
    s += heartbeat(at("проводница"), at("первая") - 0.2, 88) * 0.9
    # cold hit
    place(s, P.whoosh(0.9), at("холод") - 0.3, 0.9)
    # compartment
    place(s, P.click(), at("замок") + 0.05, 1.4)
    n = int(0.6 * SR)
    place(s, lp(noise(n), 700) * env(n, 0.05, 0.2) * 0.6, at("чемодан"), 1.0)
    s += bang(at("стук")) + bang(at("стук", 2), 1.2)
    s += heartbeat(at("стук") + 0.2, at("и", 2), 104) * 0.8
    s += ice_crack(at("замёрзли") + 0.1) * 0.9
    # doors slide open + gust
    n = int(1.0 * SR)
    place(s, bp(noise(n), 200, 1200) * env(n, 0.05, 0.4) * 0.6, at("открывает") + 0.1)
    place(s, bp(noise(int(2 * SR)), 300, 3000) * env(int(2 * SR), 0.2, 1.2) * 0.6, at("все") - 0.2)
    s += slowing_steps(at("шаги") - 0.2, at("стихают"))
    s += horn(at("гудок") - 0.1) * 1.1
    s += heartbeat(at("вот"), at("свет", 2) + 1.5, 70) * 0.8
    s += buzz_flicker(at("один") - 0.3, DUR, 5) * 0.8

    dr = drone()
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    dr *= 1 - 0.4 * np.clip(venv * 6, 0, 1)
    dr *= 0.5 + 0.5 * span(at("три"), DUR)  # starts quieter under the train noise

    def norm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = norm(v, 0.89) + norm(s, 0.3) + norm(dr, 0.15)
    mix *= np.clip((DUR - tt) / 1.0, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep01-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
