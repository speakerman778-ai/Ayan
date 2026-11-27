"""«Овощ», 4 серия «Против Метеора»: SFX + music + mix → public/shnurok/ep09-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O
import build_ovoshch3_audio as O3

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep09-words.json"))
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


def main():
    tmp = PUB / "tmp9.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep09-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_marco = T("марко") - 0.2
    t_rise = T("дальше") - 0.2
    t_news = T("а", idx("футболках")) - 0.2
    t_home = T("наш") - 0.2
    t_89 = T("восемьдесят") - 0.2
    t_out = T("выбиваю")
    t_sub = T("палыч", idx("палец")) - 0.2
    t_last = T("компенсированное") - 0.2
    t_fr = T("и-и-и")

    s = np.zeros(N, np.float32)
    # 1 penalty at sunset: crickets + heartbeat, kick, net, cheer
    s += O3.crickets(0, t_rise) * 0.5
    s += O.heartbeat(0, T("пробил"), 90, 120) * 0.8
    place(s, O.kick(), T("пробил") + 0.2, 1.0)
    place(s, A.thud() * 0.6, T("пробил") + 0.7, 0.7)
    # 3 rise: crowd + goals
    s += P.crowd(0.8) * span(t_rise, t_news, 0.4)
    place(s, O.kick(), T("гол", idx("основу")) - 0.35, 0.9)
    place(s, P.crowd(1)[: int(1.5 * SR)] * env(int(1.5 * SR), 0.05, 0.8) * 0.8, T("гол", idx("основу")) + 0.1, 1.0)
    place(s, P.crowd(1)[: int(1.5 * SR)] * env(int(1.5 * SR), 0.05, 0.8) * 0.8, T("второй") + 0.4, 1.0)
    # 4 news: plane
    place(s, lp(noise(int(2.5 * SR)), 400) * env(int(2.5 * SR), 0.8, 1.2) * 0.8, T("против", idx("метеор") + 1) + 0.6, 1.0)
    # 5–10 home stadium crowd
    s += P.crowd(0.6) * span(t_home, t_fr, 0.6)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.0) * 1.0, T("стадион", idx("ноль")), 1.0)
    place(s, O.kick(), T("кирюха", idx("кирюха") + 1) + 0.3, 0.9)
    place(s, O.kick(), T("один", idx("сравниваю")) - 0.6, 0.9)
    place(s, P.crowd(1)[: int(2 * SR)] * env(int(2 * SR), 0.05, 1.0) * 0.8, T("половина"), 1.0)
    place(s, O.whistle(0.5) * 0.6, T("половина") + 0.4, 0.7)
    # 7 breakaway: steps, collision thud, heartbeat
    for k in range(int((T("сталкиваемся") - T("убегаю")) / 0.3)):
        place(s, lp(noise(int(0.08 * SR)), 900) * np.exp(-np.arange(int(0.08 * SR)) / (SR * 0.02)) * 0.6, T("убегаю") + k * 0.3, 0.8)
    place(s, A.thud(), T("сталкиваемся"), 1.0)
    s += O.heartbeat(T("сталкиваемся") + 0.5, t_out, 90, 120) * 0.8
    # 8 kick out + applause
    place(s, O.kick(), t_out + 0.1, 0.9)
    claps = np.zeros(N, np.float32)
    for k in range(400):
        tc = T("встаёт") + (k / 400) * 4.0 + (k * 0.6180339) % 0.2
        n = int(0.03 * SR)
        place(claps, bp(noise(n), 1200, 5000) * np.exp(-np.arange(n) / (SR * 0.008)), tc, 0.5)
    s += claps
    # 9 substitution whistle
    place(s, O.whistle(0.6), t_sub + 0.3, 0.7)
    # 10 last attack: heartbeat, drop at freeze
    s += O.heartbeat(t_last + 1, DUR - 0.3, 100, 140) * 0.9
    s *= np.where(tt > t_fr, 0.15, 1.0)

    mus = O3.music([(t_marco, t_rise, "warm"), (t_89, t_out, "tense"), (t_out, t_sub, "warm"), (t_sub, DUR, "tense")])
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)
    mus *= np.where(tt > t_fr + 0.2, 0.0, 1.0)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep09-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
