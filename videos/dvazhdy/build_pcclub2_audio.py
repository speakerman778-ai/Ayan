"""ПК-клуб, серия 2: SFX + music + mix. Input public/shnurok/ep02-voice.mp3 → public/shnurok/ep02-mix.wav."""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

import build_ep01_audio as A
import build_pcclub_audio as P

PUB = Path(__file__).parent / "public" / "shnurok"
W = json.load(open(PUB / "ep02-words.json"))
DUR = float(int(W[-1]["end"] + 2.2) + 1)
for m in (A, P):
    m.DUR = DUR
    m.N = int(DUR * A.SR)
N, SR = A.N, A.SR
place, span, noise, lp = A.place, A.span, A.noise, A.lp


def at(word, nth=1):
    k = 0
    for w in W:
        if w["text"].strip("—–,.:;!?…«»").lower() == word:
            k += 1
            if k == nth:
                return w["start"]
    return 0.0


def music():
    out = np.zeros(N, np.float32)
    beat = 60 / 104
    bar = beat * 4
    happy = [("C", ["C", "E", "G"]), ("G", ["G", "B", "D"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"])]
    minor = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G", "B"])]
    tense0, tense1 = at("потом") - 0.3, at("вытаскивает") - 0.2
    sad0, sad1 = at("проигрывали") - 0.5, at("потом") - 0.3
    t, i = 0.0, 0
    while t < DUR:
        tense = tense0 <= t < tense1
        sad = sad0 <= t < sad1
        root, ch = (minor if (tense or sad) else happy)[i % 4]
        place(out, A.pad(A.hz(root, 2), bar + 0.8) * 0.35, t)
        pat = [0, 1, 2, 1, 0, 2, 1, 2] if not tense else [0, None, 0, None, 0, 0, None, 0]
        for k, idx in enumerate(pat):
            if idx is not None:
                place(out, A.pluck(A.hz(ch[idx], 4 if k % 4 else 3)) * (0.5 if k % 2 else 0.7), t + k * beat / 2)
        if not sad:
            for k in range(4):
                n = int(0.15 * SR)
                tt = np.arange(n) / SR
                place(out, np.sin(2 * np.pi * (60 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18) * (0.7 if tense else 0.5), t + k * beat)
        t += bar
        i += 1
    return lp(out, 5000)


def main():
    tmp = PUB / "tmp2.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(PUB / "ep02-voice.mp3"), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    _, x = wavfile.read(tmp)
    tmp.unlink()
    v = np.zeros(N, np.float32)
    x = x.astype(np.float32) / 32768
    v[: min(N, len(x))] = x[:N]
    s = np.zeros(N, np.float32)
    # 1 choice: chime + confetti pop
    place(s, A.chime(1568), 0.6, 0.8)
    place(s, P.whoosh(), 0.5, 0.6)
    # 2 poster + crowd arriving
    place(s, P.click(), 7.2, 1.0)
    s += P.crowd(0.05) * span(at("субботу") + 0.3, at("шёл") + 2)
    # 3 selection: game clicks, shout, ✓ ✗
    for k in range(20):
        place(s, P.click(), at("шёл") + k * 0.4, 0.4)
    place(s, P.beep(900, 0.4), at("кричал"), 0.8)
    place(s, A.chime(1318.5), at("тихо") + 0.6, 0.6)
    # 4 team name
    place(s, A.chime(1046.5), at("шнурки"), 0.8)
    # 5 training losses: low buzzes
    for k in range(10):
        place(s, P.bluescreen(), at("проигрывали") + k * 0.45, 0.5)
    # 6 tournament: whoosh, VS hit
    place(s, P.whoosh(), at("потом"), 0.8)
    place(s, A.thud(), at("финале"), 1.0)
    # 7 final: heartbeat
    for k in range(10):
        place(s, A.thud(), at("финал") + k * 0.75, 0.35)
    # 8 victory: crowd + coins
    s += P.crowd(0.09) * span(at("выиграли") - 0.2, at("следующий"))
    place(s, P.coin(), at("выиграли"), 1.0)
    # 9 door opens
    place(s, P.knock(), at("следующий") + 0.8, 0.8)
    # 10 crowded basement + whooshes for choices
    s += P.crowd(0.05) * span(at("маленький") - 0.3, at("первый") - 0.2)
    place(s, P.whoosh(), at("первый") - 0.2, 0.8)
    place(s, P.whoosh(), at("второй", 2) - 0.2, 0.8)
    # 11 ticking
    for k in range(10):
        place(s, P.click(), at("выбираешь") + k * 0.5, 0.35)
    mus = music()
    venv = lp(np.abs(v), 4)
    venv /= venv.max() + 1e-9
    mus *= 1 - 0.55 * np.clip(venv * 6, 0, 1)

    def norm(a, p):
        m = np.abs(a).max()
        return a / m * p if m > 0 else a

    mix = norm(v, 0.89) + norm(s, 0.26) + norm(mus, 0.13)
    mix *= np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    wavfile.write(PUB / "ep02-mix.wav", SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("ok", DUR)


if __name__ == "__main__":
    main()
