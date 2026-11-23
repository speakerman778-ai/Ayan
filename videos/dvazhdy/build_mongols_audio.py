"""«Монголы и Чингисхан»: steppe SFX + epic music + mix → public/shnurok/mongols-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "mongols-words.json"))
DUR = float(int(W[-1]["end"] + 1.8) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp, hp, bp, env, pluck, pad, hz = A.place, A.span, A.noise, A.lp, A.hp, A.bp, A.env, A.pluck, A.pad, A.hz
tt = np.arange(N) / SR


def norm(s):
    return re.sub(r"[^\w-]", "", s).lower()


def at(word, after=None):
    start = 0
    if after:
        start = next(i for i, w in enumerate(W) if norm(w["text"]) == after)
    return next(w["start"] for w in W[start:] if norm(w["text"]) == word)


def hoof(t0, t1, rate=7.0, gain=1.0):
    out = np.zeros(N, np.float32)
    n = int(0.06 * SR)
    k = np.arange(n) / SR
    click = lp(noise(n), 700) * np.exp(-k * 70)
    t = t0
    i = 0
    while t < t1:
        for dt in (0, 0.07, 0.15):
            place(out, click * (0.7 + 0.3 * ((i * 7) % 3) / 2), t + dt, gain)
        t += 1 / rate * 3
        i += 1
    return out


def drum(t0, t1, bpm=90, gain=1.0):
    out = np.zeros(N, np.float32)
    n = int(0.45 * SR)
    k = np.arange(n) / SR
    hit = np.sin(2 * np.pi * (55 + 50 * np.exp(-k * 18)) * k) * np.exp(-k * 7) + lp(noise(n), 300) * np.exp(-k * 25) * 0.4
    t = t0
    b = 0
    while t < t1:
        place(out, hit * (1.0 if b % 4 == 0 else 0.6), t, gain)
        t += 60 / bpm
        b += 1
    return out


def gong():
    k = np.arange(int(3.5 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k) * np.exp(-k * d) for f, d in ((110, 0.9), (167, 1.2), (231, 1.6), (347, 2.2))) * 0.25


def music(sections):
    """Low pentatonic pad + plucked lute-like line; tense in war parts."""
    out = np.zeros(N, np.float32)
    beat = 60 / 80
    bar = beat * 4
    calm = [("D", ["D", "F", "A"]), ("A", ["A", "C", "E"]), ("C", ["C", "E", "G"]), ("D", ["D", "F", "A"])]
    war = [("D", ["D", "F", "A"]), ("C", ["C", "E", "G"]), ("F", ["F", "A", "C"]), ("A", ["A", "C", "E"])]
    t, i = 0.0, 0
    while t < DUR - 1:
        tense = any(a <= t < b for a, b in sections)
        root, ch = (war if tense else calm)[i % 4]
        place(out, pad(hz(root, 2), bar + 0.8) * 0.4, t)
        pat = [0, 2, 1, 2, 0, 2, 1, 2] if not tense else [0, 0, 2, 0, 1, 0, 2, 1]
        for k, ix in enumerate(pat):
            place(out, pluck(hz(ch[ix], 3 if k % 4 == 0 else 4), 1.4) * (0.55 if k % 2 else 0.7), t + k * beat / 2)
        t += bar
        i += 1
    return lp(out, 4500)


def main():
    tmp = PUB / "tmpm.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "mongols-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    t_sons = at("его")
    t_he = at("он")
    t_kur = at("тысяча")
    t_yasa = at("у", after="ханом")
    t_yam = at("а", after="тысячи")
    t_otr = at("в", after="километров")
    t_kill = at("убить")
    t_war = at("в", after="войны")
    t_half = at("защищался")
    t_fell = at("пал")
    t_next = at("вслед")
    t_1227 = at("чингисхан", after="самарканд")
    t_emp = at("империя")
    t_fear = at("она", after="европы")
    t_roads = at("но", after="страх")

    s = np.zeros(N, np.float32)
    # steppe wind everywhere, louder at night/fear
    s += A.wind(0.5) * 0.35
    s += A.wind(0.5) * 0.5 * span(t_sons + 1.5, t_he, 0.6)
    # tribes gallop together
    s += hoof(t_he, t_kur - 0.3, 7, 0.8)
    # kurultai: crowd + gong when named
    s += P.crowd(0.3) * span(t_kur, t_yasa, 0.4)
    place(s, gong(), at("чингисханом") - 0.05, 1.0)
    # yasa: scroll whoosh; army counts
    place(s, P.whoosh(0.5), t_yasa + 0.3, 0.6)
    for w in ("десятки", "сотни", "тысячи"):
        place(s, A.thud(), at(w), 0.7)
    # yam: relay rider
    s += hoof(t_yam, t_otr - 0.2, 8, 1.0)
    # Otrar: caravan bells
    for k in range(10):
        place(s, A.chime(1567.98 if k % 2 else 1318.5) * 0.25, t_otr + 0.6 + k * 0.7, 0.5)
    place(s, A.thud(), t_kill, 1.0)
    place(s, gong(), t_war - 0.2, 0.8)
    # war: drums + hooves + fire
    s += drum(t_war, t_1227 - 0.4, 92, 1.0)
    s += hoof(t_war, t_half, 7, 0.9)
    s += A.crackle() * 0.8 * span(t_fell - 0.2, t_1227, 0.5)
    place(s, A.thunder(2.5), t_fell, 0.8)
    for k in range(3):
        place(s, A.thud(), t_next + 0.8 + k * 0.9, 0.6)
    # 1227 + maps: soft gongs
    place(s, gong(), t_1227 + 0.1, 0.6)
    place(s, gong() * 0.6, at("золотой"), 0.6)
    place(s, P.whoosh(0.8), t_emp + 0.2, 0.6)
    # fear: fire + wind, then caravan bells on the open road
    s += A.crackle() * 0.6 * span(t_fear, t_roads, 0.5)
    for k in range(int((DUR - 1 - t_roads) / 0.8)):
        place(s, A.chime(1318.5 if k % 2 else 1174.66) * 0.2, t_roads + 0.4 + k * 0.8, 0.5)
    place(s, gong(), at("такой") - 0.1, 0.9)

    mus = music([(t_war - 0.3, t_1227), (t_fear, t_roads)])
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.15)
    mix *= np.clip((DUR - tt) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "mongols-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
