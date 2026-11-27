"""«Овощ», 7 серия «Финал»: SFX + music + mix → public/shnurok/ep13-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep13-words.json"))
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
    tmp = PUB / "tmp13.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep13-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    duck = lp(1 - 0.85 * np.clip(venv * 8, 0, 1), 3)

    t_rew = at("сейчас")
    t_you = at("вы")
    t_sign = at("подпись")
    t_pal = at("палыч")
    t_saved = at("спасён")
    t_op = at("операция")
    t_steps = at("первые")
    t_kick = at("первый")
    t_home = at("а", after="мячу")
    t_back = at("вернулся")
    t_g1 = at("гол")
    t_g2 = at("гол", after="ещё")
    t_vs = at("против")
    t_but = at("но")
    t_door = at("закрыл")
    t_night = at("ночью")
    t_msg = at("палычу")
    t_reply = at("что", after="утра")
    t_morn = at("утро")
    t_anthem = at("гимн")
    t_tun = at("иду")
    t_ask = at("как", after="говорит")
    t_three = at("про")
    t_palq = at("палыч", after="трое")
    t_step = at("делаю")
    t_freeze = at("замираю") + 0.45

    s = np.zeros(N, np.float32)
    # hook: night stadium hum, heartbeat, then rewind whoosh
    s += P.crowd(0.5) * span(0, t_rew, 0.4) * duck
    s += O.heartbeat(0.2, t_rew, 70, 90) * 0.7
    for k in range(6):
        place(s, P.whoosh(0.25), t_rew + 0.3 + k * 0.22, 0.4)
    # contract: pen scratch
    n = int(0.9 * SR)
    place(s, bp(noise(n), 2500, 7000) * env(n, 0.05, 0.3) * 0.25, t_sign + 0.1, 0.7)
    place(s, A.chime(1318.5), t_saved, 0.6)
    # hospital beeps
    for k in range(int((t_steps - t_op) / 1.0)):
        place(s, np.sin(2 * np.pi * 1000 * np.arange(int(0.08 * SR)) / SR) * 0.15, t_op + 0.3 + k, 0.5)
    # Spanish sun: birds-ish chimes + kick
    place(s, O.kick(), t_kick + 0.4, 0.9)
    # phone: notification
    place(s, A.chime(1567.98), t_home + 0.2, 0.5)
    place(s, A.chime(1975.5), at("ждём") - 0.1, 0.5)
    # back in the team: crowd + goals
    s += P.crowd(0.4) * span(t_back, t_but, 0.4) * duck
    for g in (t_g1, t_g2):
        place(s, O.kick(), g - 0.6, 0.9)
        place(s, A.thud() * 0.5, g - 0.05, 0.6)
        place(s, P.crowd(1)[: int(1.6 * SR)] * env(int(1.6 * SR), 0.05, 0.9) * 0.8, g, 1.0)
    place(s, O.whistle(0.8), t_vs - 0.3, 0.6)
    # doctor: door slam, low drone
    place(s, A.thud(), t_door + 0.25, 1.0)
    s += A.wind(0.2) * 0.15 * span(t_but, t_night, 0.5)
    # night: clock + message pings
    for k in range(int((t_morn - t_night) / 1.0)):
        place(s, lp(noise(int(0.03 * SR)), 3000) * 0.4, t_night + 0.2 + k, 0.4)
    place(s, A.chime(1318.5), t_msg, 0.5)
    place(s, A.chime(1567.98), t_reply - 0.15, 0.6)
    # final morning: big crowd + anthem-ish pad, friends
    s += P.crowd(0.8) * span(t_morn, t_tun, 0.5) * duck
    # tunnel: muffled crowd, footsteps, heartbeat rising
    s += lp(P.crowd(0.9), 500) * span(t_tun, t_three, 0.5) * duck
    for k in range(int((t_ask - t_tun) / 0.55)):
        place(s, lp(noise(int(0.08 * SR)), 900) * np.exp(-np.arange(int(0.08 * SR)) / (SR * 0.02)) * 0.6, t_tun + 0.2 + k * 0.55, 0.7)
    hb = O.heartbeat(t_tun, t_freeze, 85, 140) * 0.8
    place(s, A.thud() * 0.7, t_palq, 0.9)
    # exit: roar swells to the freeze, then silence + single heartbeat
    roar = P.crowd(1.0) * np.clip((tt - t_step) / 1.5, 0, 1) * span(t_step, t_freeze, 0.2)
    s += roar * 0.9 * duck
    s *= 1 - 0.9 * np.clip((tt - t_freeze) / 0.25, 0, 1)
    hb *= 1 - 0.6 * np.clip((tt - t_freeze - 1.5) / 0.5, 0, 1)

    mus = music([(0.0, t_rew, "tense"), (t_you, t_but, "warm"), (t_but, t_morn, "sad"), (t_morn, t_freeze, "tense")])
    mus *= 1 - 0.45 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.9) + nm(s, 0.3) + nm(mus, 0.14) + nm(hb, 0.3)
    mix *= np.clip((DUR - tt) / 0.6, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep13-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
