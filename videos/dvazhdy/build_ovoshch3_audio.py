"""«Овощ», 3 серия «Вердура»: SFX + music + mix → public/shnurok/ep08-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep08-words.json"))
DUR = float(int(W[-1]["end"] + 1.2) + 1)
for m in (A, P, O):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, bp, env, pluck, pad, hz = A.place, A.span, A.noise, A.lp, A.bp, A.env, A.pluck, A.pad, A.hz
tt = np.arange(N) / SR
n_ = lambda s: re.sub(r"[^\w-]", "", s).lower()


def idx(w, fr=0):
    return next(k for k in range(fr, len(W)) if n_(W[k]["text"]) == w)


def T(w, fr=0):
    return W[idx(w, fr)]["start"]


def crickets(t0, t1):
    out = np.zeros(N, np.float32)
    n = int(0.05 * SR)
    q = np.arange(n) / SR
    chirp = np.sin(2 * np.pi * 4300 * q) * np.exp(-q * 60) * 0.25
    t = t0
    k = 0
    while t < t1:
        for j in range(3):
            place(out, chirp, t + j * 0.06, 1.0)
        t += 0.6 + (k % 3) * 0.13
        k += 1
    return out


def music(sections):
    out = np.zeros(N, np.float32)
    beat = 60 / 92
    bar = beat * 4
    warm = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
    sad = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G", "B"])]
    t, i = 0.0, 0
    while t < DUR - 0.5:
        mood = next((m for a, b, m in sections if a <= t < b), "warm")
        root, ch = (sad if mood != "warm" else warm)[i % 4]
        place(out, pad(hz(root, 2), bar + 0.8) * 0.38, t)
        pat = [0, 1, 2, 1, 0, 2, 1, 2] if mood == "warm" else [0, None, 2, None, 1, None, 2, None] if mood == "sad" else [0, None, None, None, 2, None, None, None]
        for k, ix in enumerate(pat):
            if ix is None:
                continue
            place(out, pluck(hz(ch[ix], 4 if k % 4 else 3)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        t += bar
        i += 1
    return lp(out, 5000)


def main():
    tmp = PUB / "tmp8.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep08-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_night = T("ночь") - 0.2
    t_spain = T("испания") - 0.2
    t_bad = T("но", idx("сказка")) - 0.2
    t_coach = T("через", idx("овощ", idx("по-испански"))) - 0.2
    t_eve = T("вечером") - 0.2
    t_duel = T("дуэль", idx("дом")) - 0.2
    t_my = T("остался") - 0.2
    t_if1 = T("если", idx("землю")) - 0.2
    t_if2 = T("если", idx("дома", idx("семья"))) - 0.2
    t_choice = T("один", idx("шанс", idx("зато"))) - 0.2

    s = np.zeros(N, np.float32)
    # 1–2 night with Palych: wind, lamp hum, light kicks
    s += A.wind(0.4) * 0.35 * span(0, t_spain, 0.6)
    s += np.sin(2 * np.pi * 100 * tt) * 0.01 * span(0, t_spain, 0.6)
    k = 0
    while t_night + 0.6 + k * 1.43 < t_spain - 0.5:
        place(s, O.kick() * 0.6, t_night + 0.6 + k * 1.43, 0.6)
        k += 1
    # 3–5 Spain: crickets? no — daytime: seagulls + light training ambience
    for k in range(4):
        place(s, A.gull(), t_spain + 0.8 + k * 1.9, 0.35)
    s += P.crowd(0.05) * span(t_spain, t_eve, 0.5)
    for k in range(8):
        place(s, O.kick() * 0.5, t_bad + 0.6 + k * 1.1, 0.5)
    place(s, P.crowd(1)[: int(1.6 * SR)] * env(int(1.6 * SR), 0.05, 0.9) * 0.4, T("смеются"), 1.0)
    place(s, O.whistle(0.5), t_coach + 0.3, 0.6)
    # 6 evening locker: quiet hum
    s += bp(noise(N), 80, 300) * 0.04 * span(t_eve, t_duel, 0.4)
    # 7 duel at sunset: crickets + kicks + net + miss
    s += crickets(t_duel, DUR - 0.5) * 0.6
    for w, fr in (("гол", idx("мы")), ("гол", idx("я", idx("гол", idx("мы"))))):
        tg = T(w, fr)
        place(s, O.kick(), tg - 0.45, 1.0)
        place(s, A.thud() * 0.5, tg - 0.05, 0.6)
    place(s, O.kick(), T("мимо") - 0.6, 1.0)
    place(s, P.whoosh(0.5), T("мимо") - 0.2, 0.6)
    # 8 my shot: heartbeat
    s += O.heartbeat(t_my, t_if1, 70, 100) * 0.9
    # 9 dream: stadium roar softly
    s += P.crowd(0.6) * span(t_if1, T("но", idx("гордиться")), 0.5) * 0.8
    # 10 miss: kick + whoosh; then heartbeat into choice
    place(s, O.kick(), t_if2 + 0.6, 0.9)
    place(s, P.whoosh(0.6), t_if2 + 0.8, 0.6)
    s += O.heartbeat(t_choice, DUR - 0.5, 90, 120) * 0.8

    mus = music([(t_bad, t_coach, "sad"), (t_eve, t_if1, "sad"), (t_if2, t_choice, "sad"), (t_choice, DUR, "tense")])
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep08-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
