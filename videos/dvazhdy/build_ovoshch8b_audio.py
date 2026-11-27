"""«Овощ», 8 серия «Предатель»: SFX + music + mix → public/shnurok/ep14b-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep14b-words.json"))
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
    tmp = PUB / "tmp14b.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep14b-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    duck = lp(1 - 0.85 * np.clip(venv * 8, 0, 1), 3)

    t_wh = at("свисток")
    fouls = [at("бьют"), at("снова"), at("опять")]
    t_kir = at("а", after="знали")
    t_20 = at("двадцатая")
    t_jump = at("прыжок")
    t_hit = at("удар")
    t_goal = at("гол")
    t_no = at("но", after="овощ")
    t_foul = at("удар", after="новый")
    t_fall = at("падаю")
    t_eq = at("а", after="падаю")
    t_one = at("один", after="забивает")
    t_ht = at("свисток", after="забивает")
    t_lock = at("в", after="перерыв")
    t_call = at("пишу")
    t_tap = at("одна", after="ares")
    t_fly = at("сообщение", after="кнопка")
    t_card = at("ares", after="галочки")
    t_shot = at("скрин")
    t_who = at("тогда", after="шоке")
    t_dan = at("даню")
    t_snatch = at("выхватываю")
    t_msg = at("у", after="экране")
    t_door = at("дверь")
    t_choice = at("если", after="один")
    t_end = at("что", after="предал")

    s = np.zeros(N, np.float32)
    s += P.crowd(0.8) * span(0, t_lock, 0.5) * duck
    place(s, O.whistle(0.9), t_wh + 0.1, 0.8)
    for f in fouls + [t_foul]:
        place(s, A.thud(), f, 1.0)
        place(s, O.kick() * 0.6, f + 0.05, 0.7)
        place(s, P.crowd(1)[: int(1.2 * SR)] * env(int(1.2 * SR), 0.05, 0.8) * 0.4, f + 0.1, 0.8)
    for k in range(int((t_jump - t_20) / 0.3)):
        place(s, lp(noise(int(0.06 * SR)), 900) * np.exp(-np.arange(int(0.06 * SR)) / (SR * 0.02)) * 0.6, t_20 + 0.3 + k * 0.3, 0.7)
    place(s, P.whoosh(0.4), t_jump + 0.1, 0.5)
    place(s, O.kick(), t_hit, 1.0)
    place(s, A.thud() * 0.5, t_goal, 0.7)
    place(s, P.crowd(1)[: int(3 * SR)] * env(int(3 * SR), 0.05, 2.0), t_goal, 1.0)
    place(s, A.thud(), t_fall + 0.2, 0.9)
    place(s, O.kick(), t_eq + 0.4, 0.9)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.4) * 0.6, t_one, 0.9)
    place(s, O.whistle(0.5), t_ht + 0.1, 0.8)
    place(s, O.whistle(0.5), t_ht + 0.7, 0.8)
    place(s, O.whistle(1.0), t_ht + 1.3, 0.8)
    s += lp(P.crowd(0.6), 400) * span(t_lock, DUR, 0.5) * duck * 0.6
    for k in range(10):
        place(s, lp(noise(int(0.03 * SR)), 4000) * 0.3, t_call + 0.3 + k * 0.12, 0.5)
    place(s, A.thud() * 0.5, t_tap + 0.25, 0.8)
    place(s, A.chime(1975.5), t_tap + 0.3, 0.6)
    place(s, P.whoosh(0.4), t_fly, 0.6)
    place(s, A.chime(1567.98), t_fly + 1.4, 0.6)
    place(s, A.chime(1318.5) * 0.6, t_card, 0.6)
    place(s, A.chime(1318.5), t_shot, 0.6)
    place(s, A.thud() * 0.6, t_who, 0.8)
    place(s, P.whoosh(0.3), t_snatch + 0.1, 0.6)
    for k in range(3):
        place(s, A.chime(1567.98), t_msg + k * 0.8, 0.5)
    place(s, A.creak(), t_door + 0.1, 0.8)
    hb = O.heartbeat(t_dan - 0.5, DUR - 0.5, 80, 125) * 0.7

    mus = music([(0.0, t_wh, "warm"), (t_wh, t_20, "tense"), (t_20, t_no, "warm"), (t_no, t_lock, "tense"), (t_lock, DUR, "sad")])
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14) + nm(hb, 0.28)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep14b-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
