"""«Овощ», 2 серия: SFX + music + mix → public/shnurok/ep07-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep07-words.json"))
DUR = float(int(W[-1]["end"] + 1.2) + 1)
for m in (A, P, O):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, bp, env, pluck, pad, hz = A.place, A.span, A.noise, A.lp, A.bp, A.env, A.pluck, A.pad, A.hz
tt = np.arange(N) / SR


def norm(s):
    return re.sub(r"[^\w-]", "", s).lower()


def at(word, after=None):
    start = 0
    if after:
        start = next(i for i, w in enumerate(W) if norm(w["text"]) == after)
    return next(w["start"] for w in W[start:] if norm(w["text"]) == word)


def music(t_happy, t_night, t_dawn, t_choice):
    out = np.zeros(N, np.float32)
    beat = 60 / 104
    bar = beat * 4
    happy = [("C", ["C", "E", "G"]), ("G", ["G", "B", "D"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"])]
    calm = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]), ("G", ["G", "B", "D"])]
    t, i = t_happy, 0
    while t < DUR - 0.5:
        mood = happy if t < t_dawn else calm
        root, ch = mood[i % 4]
        place(out, pad(hz(root, 2), bar + 0.8) * 0.35, t)
        sparse = t_dawn <= t < t_choice
        pat = [0, 1, 2, 1, 0, 2, 1, 2] if not sparse else [0, None, 2, None, 1, None, None, None]
        for k, ix in enumerate(pat):
            if ix is None:
                continue
            place(out, pluck(hz(ch[ix], 4 if k % 4 else 3)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        if t < t_dawn:
            for k in range(4):
                n = int(0.15 * SR)
                q = np.arange(n) / SR
                place(out, np.sin(2 * np.pi * (60 + 60 * np.exp(-q * 30)) * q) * np.exp(-q * 18) * 0.45, t + k * beat)
        t += bar
        i += 1
    return lp(out, 5000)


def main():
    tmp = PUB / "tmp7.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep07-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_hit = at("бью")
    t_bar = at("перекладину") + 0.35
    t_fin = at("добиваю") + 0.1
    t_goal = at("гол")
    t_more = at("потом")
    t_night = at("но", after="снова")
    t_dawn = at("однажды")
    t_man = at("мужчина")
    t_ticket = at("протягивает")
    t_choice = at("один", after="билет")

    s = np.zeros(N, np.float32)
    # stadium: tense hush → roar
    s += P.crowd(0.25) * span(0, t_goal, 0.2)
    s += O.heartbeat(0, t_goal - 0.2, 110, 130) * 0.6
    place(s, O.kick(), t_hit + 0.1, 1.0)
    place(s, O.clang(), t_bar, 1.0)
    place(s, O.kick(), t_fin, 1.0)
    place(s, A.thud() * 0.6, t_fin + 0.45, 0.7)
    roar = P.crowd(1.0) * np.clip((tt - t_goal + 0.1) / 0.4, 0, 1) * np.clip((t_night - tt) / 1.0, 0, 1)
    s += roar * 0.9
    place(s, O.whistle(0.8), t_goal + 0.6, 0.7)
    # montage: kicks + roars per goal
    for w, aft in (("гол", "матчи"), ("два", None), ("хет-трик", None)):
        tw = at(w, aft) if aft else at(w)
        place(s, O.kick(), tw + 0.25, 0.9)
        place(s, P.crowd(1)[: int(1.5 * SR)] * env(int(1.5 * SR), 0.05, 0.8) * 0.8, tw + 0.6, 1.0)
    place(s, A.chime(1567.98), at("mvp") if any(norm(w["text"]) == "mvp" for w in W) else t_more + 6, 0.6)
    # night: wind + lamp hum + kicks
    s += A.wind(0.5) * 0.4 * span(t_night, t_dawn, 0.6)
    s += np.sin(2 * np.pi * 100 * tt) * 0.01 * span(t_night, t_dawn, 0.6)
    k = 0
    while t_night + 0.4 + k * 0.8 < t_dawn - 0.4:
        place(s, O.kick(), t_night + 0.4 + k * 0.8, 0.6)
        k += 1
    # dawn street: snow crunch steps, quiet wind
    s += A.wind(0.3) * 0.25 * span(t_dawn, DUR, 0.8)
    n = int(0.12 * SR)
    q = np.arange(n) / SR
    crunch = bp(noise(n), 1500, 6000) * np.exp(-q * 30) * 0.5
    k = 0
    while t_dawn + 0.3 + k * 0.55 < t_man + 0.6:
        place(s, crunch, t_dawn + 0.3 + k * 0.55, 0.8)
        k += 1
    place(s, P.whoosh(0.6), t_ticket + 0.2, 0.5)
    s += O.heartbeat(t_ticket + 0.5, t_choice + 0.5, 80, 100) * 0.5

    mus = music(t_goal - 0.1, t_night, t_dawn, t_choice)
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep07-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
