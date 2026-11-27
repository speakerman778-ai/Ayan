"""«Стена», серия 1: SFX + music + mix → public/shnurok/stena01-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "stena01-words.json"))
DUR = float(int(W[-1]["end"] + 3.2) + 1)
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


def music(sections):
    """sections: list of (t0, t1, mood) with mood in tense/warm/sad."""
    out = np.zeros(N, np.float32)
    beat = 60 / 92
    bar = beat * 4
    moods = {
        "tense": [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G", "B"])],
        "warm": [("C", ["C", "E", "G"]), ("G", ["G", "B", "D"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"])],
        "sad": [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]), ("G", ["G", "B", "D"])],
    }
    for t0, t1, mood in sections:
        t, i = t0, 0
        while t < t1 - 0.3:
            root, ch = moods[mood][i % 4]
            place(out, pad(hz(root, 2), bar + 0.8) * (0.45 if mood != "warm" else 0.3), t)
            pat = [0, 1, 2, 1, 0, 2, 1, 2] if mood == "warm" else [0, None, 2, None, 1, None, None, None]
            for k, ix in enumerate(pat):
                if ix is None or t + k * beat / 2 > t1:
                    continue
                place(out, pluck(hz(ch[ix], 4 if k % 4 else 3)) * (0.45 if k % 2 else 0.65), t + k * beat / 2)
            t += bar
            i += 1
    return lp(out, 4500)


def main():
    tmp = PUB / "tmpst.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "stena01-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    duck = lp(1 - 0.85 * np.clip(venv * 8, 0, 1), 3)

    t_cls = at("каждое")
    t_oink = at("хрюкает")
    t_pe = at("на", after="слышу")
    t_tour = at("а", after="форму")
    t_laugh = at("все", after="влезет")
    t_toss = at("кидает")
    t_first = at("первый")
    s1 = at("прыгаю"); s2 = at("отбиваю"); s3 = at("лицо")
    t_quiet = at("в", after="прошёл")
    t_fin = at("мы", after="смеётся")
    t_write = at("написать")
    t_tap = at("одна", after="ares")
    t_fly = at("сообщение", after="кнопка")
    t_card = at("ares", after="улетает")
    t_rep = at("я", after="сразу")
    t_final = at("финал", after="бегу")
    t_run = at("разбег")
    t_kick = at("удар", after="разбег")
    t_freeze = t_kick + 0.35

    s = np.zeros(N, np.float32)
    s += P.crowd(0.15) * span(t_cls, t_pe, 0.4) * duck
    n = int(0.35 * SR); q = np.arange(n) / SR
    oink = np.sin(2 * np.pi * (180 + 60 * np.sin(q * 40)) * q) * np.exp(-q * 6) * 0.5 + lp(noise(n), 900) * np.exp(-q * 8) * 0.3
    place(s, oink, t_oink, 0.9)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.2) * 0.5, t_oink + 0.3, 0.8)
    place(s, O.whistle(0.6), t_pe + 0.2, 0.7)
    s += P.crowd(0.5) * span(t_tour, t_quiet, 0.4) * duck
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.2) * 0.7, t_laugh, 0.9)
    place(s, P.whoosh(0.5), t_toss + 0.1, 0.6)
    for k_, t_ in enumerate((s1, s2, s3)):
        place(s, O.kick(), t_ - 0.55, 0.9)
        place(s, A.thud() * (1.0 if k_ == 2 else 0.6), t_, 1.0)
    place(s, P.crowd(1)[: int(1.5 * SR)] * env(int(1.5 * SR), 0.05, 0.8) * 0.5, s1 + 0.2, 0.8)
    for k in range(10):
        place(s, lp(noise(int(0.03 * SR)), 4000) * 0.3, t_write + 0.3 + k * 0.12, 0.5)
    place(s, A.thud() * 0.5, t_tap + 0.25, 0.8)
    place(s, A.chime(1975.5), t_tap + 0.3, 0.6)
    place(s, P.whoosh(0.4), t_fly, 0.6)
    place(s, A.chime(1318.5) * 0.6, t_card, 0.6)
    place(s, A.chime(1567.98), t_rep, 0.6)
    s += P.crowd(0.8) * span(t_final, t_freeze, 0.4) * duck
    for k in range(int((t_kick - t_run) / 0.28)):
        place(s, lp(noise(int(0.06 * SR)), 900) * np.exp(-np.arange(int(0.06 * SR)) / (SR * 0.02)) * 0.6, t_run + 0.2 + k * 0.28, 0.7)
    place(s, O.kick(), t_kick, 1.0)
    s *= 1 - 0.9 * np.clip((tt - t_freeze) / 0.25, 0, 1)
    hb = O.heartbeat(at("на", after="мама") - 0.5, DUR - 0.4, 85, 135) * 0.8

    mus = music([(0.0, t_tour, "sad"), (t_tour, t_first, "tense"), (t_first, t_quiet, "warm"), (t_fin, t_final, "warm"), (t_final, t_freeze, "tense")])
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)
    mus *= 1 - span(t_quiet, t_fin, 0.2) * 0.9

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14) + nm(hb, 0.28)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "stena01-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
