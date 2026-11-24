"""«Стрим»: horror SFX + music + mix → public/shnurok/ep12-mix.wav."""
import json, subprocess, re
from pathlib import Path
import numpy as np
from scipy.io import wavfile
import build_ep01_audio as A
import build_pcclub_audio as P
import build_ovoshch_audio as O
import build_kv190_audio as K

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep12-words.json"))
DUR = float(int(W[-1]["end"] + 1.2) + 1)
for m in (A, P, O, K):
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


def ding(f=1318.5):
    n = int(0.4 * SR)
    q = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * q) + 0.5 * np.sin(2 * np.pi * f * 1.5 * q)) * np.exp(-q * 9) * 0.35


def buzzer(d=1.2):
    n = int(d * SR)
    q = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * 440 * q)) * (np.sin(2 * np.pi * 6 * q) > -0.2) * 0.12 * env(n, 0.01, 0.05)


def main():
    tmp = PUB / "tmp12.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep12-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]

    s = np.zeros(N, np.float32)
    # PC hum + game clicks at the start
    s += bp(noise(N), 100, 600) * 0.03
    for k in range(int(T("и", idx("игра")) / 0.35)):
        place(s, P.click() * 0.3, 0.2 + k * 0.35, 0.4)
    # chat spam: notification pings
    for k in range(14):
        place(s, ding(1760 + (k % 3) * 120) * 0.5, T("и", idx("игра")) + 0.4 + k * 0.28, 0.5)
    # night wind outside
    s += A.wind(0.4) * 0.35 * span(T("я", idx("тобой")), T("он", idx("меня", idx("прямо"))), 0.6)
    # the clip: knife sting + fall thud + heartbeat
    place(s, K.ding() * 0.6 if hasattr(K, "ding") else ding(2400), T("блеснуло"), 0.7)
    place(s, A.thud(), T("она", idx("нож")) + 0.3, 1.0)
    s += K.heartbeat(T("а", idx("встаёт")), T("я", idx("эфире")), 90) * 0.8
    # phone dial
    for k in range(3):
        place(s, P.beep(425, 0.6), T("звоню") + 0.4 + k * 1.0, 0.5)
    # donation alert sound
    place(s, ding(988) + np.pad(ding(1318.5), (int(0.15 * SR), 0))[: int(0.4 * SR)], T("пятьдесят") - 0.2, 0.9)
    # flashback whoosh
    place(s, P.whoosh(0.6), T("красный", idx("стрим", idx("выключи"))), 0.5)
    # intercom buzzer twice + door
    place(s, buzzer(1.4), T("звонит") - 0.1, 0.9)
    place(s, A.creak(), T("а", idx("зрителей", idx("доставка"))) + 0.3, 0.6)
    # end: lift hum rising + buzzer again + heartbeat
    s += lp(noise(N), 120) * 0.3 * span(T("лифт"), DUR - 0.5, 0.4)
    for k in range(6):
        place(s, ding(660) * 0.4, T("лифт") + 0.6 + k * 0.62, 0.5)
    place(s, buzzer(1.6), T("один", idx("этаж", idx("лифт"))) - 0.5, 0.8)
    s += K.heartbeat(T("если", idx("подъезда")), DUR - 0.4, 100) * 0.7

    dr = K.drone()
    venv = lp(np.abs(v), 6)
    venv /= venv.max() + 1e-9
    dr *= 1 - 0.4 * np.clip(venv * 6, 0, 1)
    s *= 1 - 0.3 * np.clip(venv * 6, 0, 1)

    def nm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = nm(v, 0.92) + nm(s, 0.28) + nm(dr, 0.14)
    mix *= np.clip((DUR - tt) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep12-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
