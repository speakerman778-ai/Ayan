"""«Овощ», 6 серия «Контракт»: SFX + music + mix → public/shnurok/ep11-mix.wav (crowd ducked under voice)."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O
import build_ovoshch3_audio as O3

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep11-words.json"))
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


def beep_monitor(t0, t1):
    out = np.zeros(N, np.float32)
    n = int(0.09 * SR)
    q = np.arange(n) / SR
    b = np.sin(2 * np.pi * 980 * q) * env(n, 0.005, 0.05) * 0.25
    t = t0
    while t < t1:
        place(out, b, t, 1.0)
        t += 1.05
    return out


def main():
    tmp = PUB / "tmp11.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep11-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_hosp = T("больница") - 0.2
    t_if1 = T("если", idx("играть", idx("сам"))) - 0.2
    t_if2 = T("если", idx("палычем")) - 0.2
    t_choice = T("один", idx("закрыться")) - 0.2

    crowd = np.zeros(N, np.float32)
    s = np.zeros(N, np.float32)
    crowd += P.crowd(0.4) * span(0, t_hosp, 0.4)
    place(crowd, P.crowd(1)[: int(3 * SR)] * env(int(3 * SR), 0.05, 1.8) * 1.3, T("гол"), 1.0)
    place(s, A.thud() * 0.5, T("гол") - 0.1, 0.7)
    # hospital: monitor beeps + room hum, evening clock
    s += beep_monitor(t_hosp + 0.3, t_if1) * 0.8
    s += bp(noise(N), 100, 400) * 0.02 * span(t_hosp, t_if1, 0.4)
    place(s, A.creak(), T("первым") - 0.3, 0.5)
    place(s, P.whoosh(0.4), T("но", idx("бегать")) + 0.1, 0.4)
    place(s, A.thud() * 0.5, T("клуб", idx("изменится")) + 0.3, 0.7)
    place(s, A.chime(1567.98) * 0.5, T("этих") + 0.4, 0.6)
    # dream: stadium roar (ducked), then home night: wind + lamp
    crowd += P.crowd(0.6) * span(t_if1, t_if2, 0.5)
    s += A.wind(0.4) * 0.35 * span(t_if2, t_choice, 0.6)
    s += O.heartbeat(t_choice, DUR - 0.3, 80, 100) * 0.7
    s += beep_monitor(t_choice, DUR - 0.5) * 0.6

    venv = lp(np.abs(v), 6)
    venv /= venv.max() + 1e-9
    duck = lp(1 - 0.85 * np.clip(venv * 8, 0, 1), 3)
    crowd *= duck
    s *= 1 - 0.3 * np.clip(venv * 6, 0, 1)

    mus = O3.music([(0, t_hosp, "warm"), (t_hosp, t_if1, "sad"), (t_if1, t_if2, "warm"), (t_if2, t_choice, "sad"), (t_choice, DUR, "tense")])
    mus *= 1 - 0.5 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.92) + nm(crowd, 0.2) + nm(s, 0.26) + nm(mus, 0.12)
    mix *= np.clip((DUR - tt) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep11-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
