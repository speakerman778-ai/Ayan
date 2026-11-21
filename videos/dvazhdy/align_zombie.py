"""Align the known voiceover text to ep01-voice.mp3 by silences (no ASR available).
Speech segments come from ffmpeg silencedetect; words are split across segments with a DP
that matches segment length to syllable count and prefers breaks at punctuation."""
import json, re, subprocess, sys
AUD = 'public/zombie/ep01-voice.mp3'
TEXT = open('../zombi-poezd/01-scenariy.md').read().split('```')[1]
TEXT = re.sub(r'\[[^\]]*\]', ' ', TEXT)
words = TEXT.split()
out = subprocess.run(['ffmpeg', '-i', AUD, '-af', 'silencedetect=noise=-38dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', out)]
se = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', out)]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', AUD], capture_output=True, text=True).stdout)
# speech segments
segs = []
t = 0.0
for a, b in zip(ss, se):
    if a - t > 0.05:
        segs.append((t, a))
    t = b
if dur - t > 0.1:
    segs.append((t, dur))
V = set('аеёиоуыэюяАЕЁИОУЫЭЮЯ')
def syl(w):
    n = sum(c in V for c in w)
    return max(n, 1) + (0.6 if re.search(r'[0-9]', w) else 0)
S = [syl(w) for w in words]
brk = [bool(re.search(r'[.,!?…:—–»]$', w)) or (i + 1 < len(words) and words[i + 1] in '—–') for i, w in enumerate(words)]
rate = sum(b - a for a, b in segs) / sum(S)
N, M = len(words), len(segs)
INF = 1e18
import functools
sys.setrecursionlimit(100000)
pre = [0]
for s in S: pre.append(pre[-1] + s)
dp = [[INF] * (M + 1) for _ in range(N + 1)]
bk = [[0] * (M + 1) for _ in range(N + 1)]
dp[0][0] = 0
for j in range(1, M + 1):
    d = segs[j - 1][1] - segs[j - 1][0]
    for i in range(1, N + 1):
        best, arg = INF, 0
        for k in range(max(0, i - 25), i):
            if dp[k][j - 1] >= INF: continue
            pred = (pre[i] - pre[k]) * rate
            c = dp[k][j - 1] + ((d - pred) / (0.25 + 0.3 * d)) ** 2 + (0 if brk[i - 1] or i == N else 6)
            if c < best: best, arg = c, k
        dp[i][j], bk[i][j] = best, arg
res = []
i, j = N, M
parts = []
while j > 0:
    k = bk[i][j]; parts.append((k, i, segs[j - 1])); i, j = k, j - 1
for k, i, (a, b) in reversed(parts):
    tot = pre[i] - pre[k]; t = a
    for w in range(k, i):
        e = t + (b - a) * S[w] / tot
        res.append({'text': words[w], 'start': round(t, 3), 'end': round(e, 3)})
        t = e
json.dump(res, open('public/zombie/ep01-words.json', 'w'), ensure_ascii=False)
print(len(words), 'words', M, 'segs', 'cost', round(dp[N][M], 1))
for k, i, (a, b) in reversed(parts):
    print(f'{a:6.2f}-{b:6.2f}  ' + ' '.join(words[k:i]))
