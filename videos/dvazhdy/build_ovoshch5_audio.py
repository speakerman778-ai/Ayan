"""«Овощ», 5 серия «Аренда»: SFX + music + mix → public/shnurok/ep10-mix.wav.
Crowd/stadium noise is ducked hard under the voice so Pavel is always on top."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O
import build_ovoshch3_audio as O3

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep10-words.json"))
DUR = float(int(W[-1]["end"] + 1.2) + 1)
for m in (A, P, O, O3):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, bp, env = A.place, A.span, A.noise, A.lp, A.bp, A.env
tt = np.arange(N) / SR
n_ = lambda s: re.sub(r"[^\w-]", "", s).lower()


def idx(w, fr=0):
    return next(k for k in range(fr, len(W)) if n_(W[k]["text"]) == w)


def T(w, fr=0):
    return W[idx(w, fr)]["start"]


def burst(dur, gain):
    n = int(dur * SR)
    return P.crowd(1)[:n] * env(n, 0.05, dur * 0.6) * gain


def main():
    tmp = PUB / "tmp10.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep10-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_locker = T("но", idx("квиты")) - 0.2
    t_bench = T("три") - 0.2
    t_office = T("а", idx("поле", idx("минуты"))) - 0.2
    t_home = T("я", idx("метеор", idx("клуб"))) - 0.2
    t_band = T("кирюха", idx("команда")) - 0.2
    t_cup = T("четвертьфинал") - 0.2
    t_hit = T("бью")
    t_crack = T("хруст")
    t_end = T("к", idx("опускается")) + 0.4

    crowd = np.zeros(N, np.float32)   # all stadium noise goes here → ducked under voice
    s = np.zeros(N, np.float32)       # other sfx
    # 1–2 Meteor vs Barça: roar on the goal
    crowd += P.crowd(0.5) * span(0, t_locker, 0.4)
    place(s, O.kick(), T("бьёт") + 0.05, 1.0)
    place(crowd, burst(3.0, 1.2), T("гол"), 1.0)
    place(crowd, burst(2.5, 1.0), T("родной"), 1.0)
    # 3 locker quiet hum, 4 bench (seagulls), 5 office (clock)
    s += bp(noise(N), 80, 300) * 0.03 * span(t_locker, t_bench, 0.3)
    for k in range(3):
        place(s, A.gull(), t_bench + 0.5 + k * 1.5, 0.3)
    for k in range(int((t_home - t_office) / 1.0)):
        place(s, A.tick(), t_office + k * 1.0, 0.4)
    place(s, P.whoosh(0.5), T("мы", idx("директору")) - 0.1, 0.5)
    # 6 airport: plane
    place(s, lp(noise(int(2.5 * SR)), 400) * env(int(2.5 * SR), 0.6, 1.2) * 0.7, t_home, 1.0)
    place(s, A.chime(1318.5) * 0.4, T("протянул") + 0.3, 0.6)
    # 8–11 cup night: crowd, hush before the kick, heartbeat, crack
    crowd += P.crowd(0.55) * span(t_cup, t_hit - 2.5, 0.6)
    crowd += P.crowd(0.12) * span(t_hit - 2.5, t_end, 0.6)
    s += O.heartbeat(T("отхожу"), t_hit, 80, 120) * 0.8
    place(s, O.kick(), t_hit + 0.1, 1.0)
    n = int(0.25 * SR)
    q = np.arange(n) / SR
    crack = (bp(noise(n), 1500, 6000) * np.exp(-q * 40) + np.sin(2 * np.pi * 90 * q) * np.exp(-q * 20) * 0.6) * 1.2
    place(s, crack, t_crack - 0.1, 1.0)
    place(s, A.thud(), T("падаю") + 0.2, 1.0)
    s += O.heartbeat(t_crack + 0.5, t_end + 1.0, 70, 110) * 0.9
    for k in range(int((T("поле", idx("бежит")) - T("бежит")) / 0.3) + 4):
        place(s, lp(noise(int(0.08 * SR)), 900) * np.exp(-np.arange(int(0.08 * SR)) / (SR * 0.02)) * 0.5, T("бежит") - 0.5 + k * 0.3, 0.7)

    # duck the crowd hard under the voice (Pavel always on top)
    venv = lp(np.abs(v), 6)
    venv /= venv.max() + 1e-9
    duck = 1 - 0.85 * np.clip(venv * 8, 0, 1)
    duck = lp(duck, 3)
    crowd *= duck
    s *= 1 - 0.35 * np.clip(venv * 6, 0, 1)

    mus = O3.music([(0, t_locker, "warm"), (t_locker, t_home, "sad"), (t_home, t_cup, "warm"), (t_cup, DUR, "tense")])
    mus *= 1 - 0.5 * np.clip(venv * 6, 0, 1)
    mus *= np.where(tt > t_end, 0.0, 1.0)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.92) + nm(crowd, 0.22) + nm(s, 0.28) + nm(mus, 0.12)
    mix *= np.clip((DUR - tt) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep10-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
