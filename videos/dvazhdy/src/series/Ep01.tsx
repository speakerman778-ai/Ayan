import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {Bubble, C, NameTag, OL, OW, Thought} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Cat, GrassTop, Keeper, Lighthouse, Outside, Room, Table} from './Keeper';
import {Boat, Compass, Plank, Saucer} from './Ep01Sheets';

// Episode 1 «Барсик — живой компас». Timings come from the voiceover
// public/keeper/ep01-voice.mp3 (phrase boundaries found by silence detection).

const FPS = 30;
export const EP01_DURATION = 80.4;

// [start, end, text] — one entry per spoken phrase
const SEG: [number, number, string][] = [
	[0.05, 2.42, 'Знакомьтесь, это дед Савелий.'],
	[2.92, 4.4, 'А это его кот Барсик.'],
	[4.81, 7.38, 'Этот кот ни разу в жизни не заблудился.'],
	[7.91, 9.95, 'А всё началось с одного шторма.'],
	[10.51, 12.92, 'Той осенью шторм не утихал три дня.'],
	[13.35, 16.4, 'Дед Савелий почти не спал — следил, чтобы маяк горел.'],
	[16.68, 19.44, 'А утром, как всегда, пошёл обходить берег.'],
	[19.95, 22.5, 'Доски, сети, обрывки верёвок…'],
	[22.93, 23.4, 'И вдруг —'],
	[23.8, 24.87, 'тихое «мяу».'],
	[25.39, 28.15, 'На обломке доски сидит мокрый серый котёнок.'],
	[28.54, 32.07, 'Дрожит, но не плачет. И смотрит строго в одну сторону.'],
	[32.64, 35.07, 'Савелий достаёт из кармана старый компас.'],
	[35.55, 37.06, 'Стрелка показывает туда же.'],
	[37.49, 38.32, 'Точно на север.'],
	[38.8, 43.83, 'Дома он заворачивает малыша в полотенце, сажает у печки и наливает тёплого молока.'],
	[44.36, 46.13, '«Ну что, моряк, — говорит дед, —'],
	[46.44, 47.59, 'будешь Барсиком».'],
	[47.98, 51.14, 'А про себя подумал: «Да ты ж у меня живой компас».'],
	[51.59, 53.64, 'Через год они вышли на лодке за рыбой.'],
	[53.98, 54.36, 'И тут —'],
	[54.73, 57.9, 'туман. Такой густой, что не видно собственных рук.'],
	[58.34, 61.56, 'Барсик встал на нос лодки и уставился в белую пелену.'],
	[62.08, 64.19, 'Дед повернул туда, куда смотрел кот…'],
	[64.63, 67.64, 'и вскоре лодка мягко ткнулась в родной причал.'],
	[68.13, 71.33, 'С тех пор каждую ночь они вместе зажигают маяк.'],
	[71.68, 74.47, 'И Барсик всегда первым находит дорогу наверх.'],
	[74.78, 76.85, 'Говорят, он ни разу не ошибся.'],
	[77.26, 77.7, 'Ну…'],
	[78.0, 78.39, 'почти.'],
];

const hasLetters = (s: string) => /[\p{L}\p{N}]/u.test(s);

/** Words with times: spread inside each phrase by length; lone dashes stick to the previous word. */
const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const [a, b, text] of SEG) {
		const toks: string[] = [];
		for (const tok of text.split(/\s+/).filter(Boolean)) {
			if (!hasLetters(tok) && toks.length) toks[toks.length - 1] += ' ' + tok;
			else toks.push(tok);
		}
		const wts = toks.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
		const tot = wts.reduce((x, y) => x + y, 0);
		let cur = a;
		toks.forEach((w, i) => {
			const d = ((b - a) * wts[i]) / tot;
			out.push({text: w, start: cur, end: cur + d});
			cur += d;
		});
	}
	return out;
})();

/** Group words into caption lines: ≤5 words, break after a sentence end or a long gap. */
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const sentenceEnd = prev && /[.!?]»?$/.test(prev.text);
		const ellipsisEnd = prev && /…$/.test(prev.text) && cur.length > 1;
		if (cur.length && (cur.length >= 5 || sentenceEnd || ellipsisEnd || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	// keep captions on screen across short gaps: stretch each word's end to the next word's start
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();

// ------------------------------------------------------------------ helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const prog = (t: number, a: number, d: number) => clamp01((t - a) / d);
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));

const Waves: React.FC<{t: number; y: number; rows: number; color: string; gap?: number; amp?: number; speed?: number; w?: number}> = ({t, y, rows, color, gap = 110, amp = 30, speed = 30, w = 7}) => (
	<>
		{Array.from({length: rows}).map((_, r) => (
			<path
				key={r}
				d={`M ${-140 + (r % 2) * 70 - ((t * speed) % 140)} ${y + r * gap} ` + Array.from({length: 10}).map(() => `q 35 ${-amp} 70 0 q 35 ${amp} 70 0`).join(' ')}
				fill="none"
				stroke={color}
				strokeWidth={w}
				strokeLinecap="round"
			/>
		))}
	</>
);

const Cloud: React.FC<{x: number; y: number; s?: number; fill?: string}> = ({x, y, s = 1, fill = '#fffaf0'}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -120 30 Q -150 -20 -90 -30 Q -80 -90 -10 -80 Q 30 -120 80 -70 Q 150 -70 140 -10 Q 170 30 120 40 Z" fill={fill} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
	</g>
);

const Gull: React.FC<{x: number; y: number; t: number; s?: number}> = ({x, y, t, s = 1}) => {
	const f = Math.sin(t * 7) * 12;
	return <path transform={`translate(${x} ${y}) scale(${s})`} d={`M -40 ${f} Q -20 -20 0 0 Q 20 -20 40 ${f}`} fill="none" stroke={OL} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />;
};

/** Camera: zoom around a point. */
const Cam: React.FC<{z: number; cx: number; cy: number; children: React.ReactNode}> = ({z, cx, cy, children}) => (
	<g transform={`translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>
);

const Cliff: React.FC<{t: number}> = ({t}) => (
	<>
		<path d="M -20 1000 C 220 930 560 940 760 1000 C 840 1080 800 1300 850 1500 C 880 1700 820 1850 800 1940 L -20 1940 Z" fill="#7a6a5a" stroke={OL} strokeWidth={OW} />
		{[[120, 1250, 90], [380, 1420, 70], [200, 1650, 110], [560, 1300, 60], [600, 1700, 80]].map(([x, y, r], i) => (
			<path key={i} d={`M ${x - r} ${y} Q ${x - r * 0.6} ${y - r * 0.7} ${x} ${y - r * 0.6} Q ${x + r * 0.8} ${y - r * 0.5} ${x + r} ${y}`} fill="none" stroke="#5f5246" strokeWidth={8} strokeLinecap="round" />
		))}
		<GrassTop t={t} />
	</>
);

// ------------------------------------------------------------------ scene 1: introduction (day)
const S1Intro: React.FC<{t: number}> = ({t}) => {
	const z = 1.15 + 0.1 * ease(t / 4.6);
	return (
		<>
			<Cam z={z} cx={600} cy={900}>
				<rect width={1080} height={1920} fill="#9fd0e8" />
				<circle cx={880} cy={250} r={90} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
				<Cloud x={200 + t * 8} y={260} s={0.9} />
				<Cloud x={760 - t * 6} y={470} s={0.6} />
				<Gull x={420 + t * 30} y={380} t={t} s={0.8} />
				<Gull x={560 + t * 24} y={300} t={t + 1} s={0.6} />
				<rect x={0} y={1060} width={1080} height={860} fill="#2b4a7a" />
				<Waves t={t} y={1110} rows={7} color="#6f9ad0" />
				<Cliff t={t} />
				<Lighthouse x={230} y={990} t={t} />
				<Keeper x={590} y={1012} s={0.52} face="smile" armR={[150 + Math.sin(t * 9) * 14, 30]} talk={0} />
				<Cat x={720} y={1016} s={0.34} t={t} look={-1} />
			</Cam>
			<NameTag name="Дед Савелий" role="смотритель маяка" from={0.3} x={60} y={130} avatar={<Keeper x={0} y={236} s={0.42} />} />
			<NameTag name="Барсик" role="кот, живой компас" from={2.9} x={60} y={300} avatar={<Cat x={0} y={88} s={0.36} t={t} />} />
		</>
	);
};

// ------------------------------------------------------------------ scene 2: hook — Barsik on the gallery railing
const S2Hook: React.FC<{t: number}> = ({t}) => {
	const storm = ease((t - 3.2) / 2.2); // sky darkens on «с одного шторма»
	const sky = interpolateColor(storm, '#9fd0e8', '#5d6a86');
	return (
		<Cam z={1 + 0.06 * ease(t / 5.6)} cx={560} cy={1000}>
			<rect width={1080} height={1920} fill={sky} />
			<circle cx={860} cy={300} r={80} fill="#ffe08a" stroke={OL} strokeWidth={OW} opacity={1 - storm} />
			<Cloud x={250 + t * 14} y={260} s={0.8} />
			<Cloud x={-200 + storm * 420} y={420} s={1.4} fill="#7c8299" />
			<Cloud x={1300 - storm * 420} y={330} s={1.2} fill="#6c7189" />
			<rect x={0} y={1250} width={1080} height={670} fill="#2b4a7a" />
			<Waves t={t} y={1300} rows={6} color="#6f9ad0" amp={18 + storm * 22} speed={30 + storm * 40} />
			{/* lantern room */}
			<rect x={-60} y={300} width={300} height={720} fill="#f6efe2" stroke={OL} strokeWidth={OW} />
			<rect x={-60} y={300} width={300} height={70} fill={C.red} stroke={OL} strokeWidth={OW} />
			<rect x={30} y={430} width={150} height={260} rx={12} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
			<circle cx={105} cy={560} r={50} fill="#fffbe6" stroke={OL} strokeWidth={6} />
			{/* gallery floor + railing */}
			<rect x={-20} y={1150} width={1120} height={50} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
			<rect x={-20} y={1010} width={1120} height={22} rx={10} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
			{Array.from({length: 9}).map((_, i) => (
				<rect key={i} x={20 + i * 130} y={1030} width={18} height={122} fill="#3a3f55" stroke={OL} strokeWidth={5} />
			))}
			{/* wind streaks */}
			{[0, 1, 2, 3].map((i) => {
				const k = (t * 0.8 + i * 0.27) % 1;
				return <path key={i} d={`M ${1100 - k * 900} ${700 + i * 70} q 60 -16 120 0`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7 * Math.sin(k * Math.PI)} />;
			})}
			<Cat x={600} y={1012} s={0.95} t={t} look={1} />
		</Cam>
	);
};

function interpolateColor(k: number, a: string, b: string) {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(k)).toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------ scene 3: storm
const Rain: React.FC<{t: number; n?: number; clip?: string}> = ({t, n = 70, clip}) => (
	<g clipPath={clip}>
		{Array.from({length: n}).map((_, i) => {
			const sp = 1.4 + hash(i + 40) * 0.6;
			const k = (t * sp + hash(i)) % 1;
			const x = hash(i + 9) * 1300 - 100 - k * 200;
			const y = k * 2100 - 100;
			return <line key={i} x1={x} y1={y} x2={x - 18} y2={y + 70} stroke="#bcd3f0" strokeWidth={5} strokeLinecap="round" opacity={0.7} />;
		})}
	</g>
);

const flash = (t: number, at: number) => (t > at && t < at + 0.35 ? (1 - (t - at) / 0.35) * 0.7 : 0);

const S3Storm: React.FC<{t: number}> = ({t}) => {
	const inside = t > 3.0;
	const f = flash(t, 1.1) + flash(t, 1.5) * 0.6 + flash(t, 4.6) * 0.5;
	if (!inside) {
		return (
			<Cam z={1.05 + 0.05 * ease(t / 3)} cx={540} cy={900}>
				<rect width={1080} height={1920} fill="#141d36" />
				<Cloud x={200 + t * 20} y={220} s={1.6} fill="#2d3550" />
				<Cloud x={800 - t * 15} y={320} s={1.4} fill="#262d45" />
				<rect x={0} y={1060} width={1080} height={860} fill="#22406b" />
				<Waves t={t} y={1100} rows={7} color="#6f9ad0" amp={46} speed={90} gap={120} w={9} />
				<Cliff t={t} />
				<Lighthouse x={330} y={990} t={t * 1.4} />
				<path d={`M 640 ${120} L 600 330 L 660 330 L 610 520`} fill="none" stroke="#fff6c8" strokeWidth={10} strokeLinejoin="round" opacity={f > 0.2 ? 1 : 0} />
				<Rain t={t} />
				<rect width={1080} height={1920} fill="#fff" opacity={f} />
			</Cam>
		);
	}
	const lt = t - 3.0;
	return (
		<Cam z={1.04 + 0.04 * ease(lt / 3.4)} cx={600} cy={800}>
			<Room t={lt} />
			<clipPath id="portRain"><circle cx={760} cy={520} r={150} /></clipPath>
			<g clipPath="url(#portRain)">
				<rect x={600} y={360} width={320} height={320} fill="#141d36" opacity={0.65} />
				<rect x={600} y={360} width={320} height={320} fill="#fff" opacity={f} />
			</g>
			<Rain t={lt} n={30} clip="url(#portRain)" />
			<Table t={lt} />
			<Keeper x={560} y={1310} s={1.0} face="think" armR={[60, -70]} look={1} />
			<g transform="translate(718 1030)">
				<rect x={-26} y={-34} width={52} height={60} rx={8} fill="#fff" stroke={OL} strokeWidth={6} />
				<path d="M 26 -20 Q 44 -16 26 10" fill="none" stroke={OL} strokeWidth={6} />
				<rect x={-26} y={-14} width={52} height={10} fill={C.red} />
				{[0, 1].map((i) => {
					const p = (lt * 0.8 + i * 0.5) % 1;
					return <path key={i} d={`M ${-8 + i * 14} ${-40 - p * 60} q 10 -14 0 -28`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={1 - p} />;
				})}
			</g>
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 4: beach in the morning
const Rope: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<path transform={`translate(${x} ${y}) scale(${s})`} d="M -60 0 C -60 -40 20 -40 20 -10 C 20 20 -30 20 -30 -5 C -30 -25 0 -25 0 -8 M 20 -10 C 40 10 70 0 90 10" fill="none" stroke={OL} strokeWidth={16} strokeLinecap="round" />
);
const RopeFill: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<>
		<Rope x={x} y={y} s={s} />
		<path transform={`translate(${x} ${y}) scale(${s})`} d="M -60 0 C -60 -40 20 -40 20 -10 C 20 20 -30 20 -30 -5 C -30 -25 0 -25 0 -8 M 20 -10 C 40 10 70 0 90 10" fill="none" stroke="#d9b77a" strokeWidth={8} strokeLinecap="round" />
	</>
);
const Net: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}>
		<path d="M -110 0 Q -90 -60 -10 -70 Q 80 -60 110 0 Z" fill="#6b7f6e" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		{[-70, -35, 0, 35, 70].map((dx) => (
			<line key={dx} x1={dx} y1={-60} x2={dx * 1.3} y2={0} stroke="#3e4d40" strokeWidth={4} />
		))}
		{[-45, -22].map((dy) => (
			<line key={dy} x1={-100} y1={dy} x2={100} y2={dy} stroke="#3e4d40" strokeWidth={4} />
		))}
		<circle cx={60} cy={-20} r={14} fill={C.red} stroke={OL} strokeWidth={5} />
	</g>
);
const Starfish: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = 26}) => (
	<path transform={`translate(${x} ${y})`} d={Array.from({length: 10}).map((_, i) => {
		const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
		const rr = i % 2 ? r * 0.45 : r;
		return `${i ? 'L' : 'M'} ${Math.cos(a) * rr} ${Math.sin(a) * rr}`;
	}).join(' ') + ' Z'} fill={C.ochre} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
);

const S4Beach: React.FC<{t: number}> = ({t}) => {
	// voice: 16.68 «А утром…», 22.93 «И вдруг», 23.8 «мяу» → local = abs − 16.55
	const walkEnd = 6.3;
	const wk = clamp01(t / walkEnd);
	const x = 140 + ease(wk) * 380;
	const walking = t < walkEnd;
	const ph = t * 7;
	const step = walking ? Math.sin(ph) * 18 : 0; // one leg forward, then the other
	const bob = walking ? -Math.abs(Math.cos(ph)) * 7 : 0;
	const surprised = t > 7.25;
	return (
		<Cam z={1.02 + 0.05 * ease(t / 8.5)} cx={540} cy={1100}>
			<rect width={1080} height={1920} fill="#bfe3f0" />
			<circle cx={180} cy={360} r={80} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
			<Cloud x={700 + t * 6} y={280} s={0.7} />
			<Gull x={300 + t * 20} y={500} t={t} s={0.7} />
			<rect x={0} y={820} width={1080} height={380} fill="#2b4a7a" />
			<Waves t={t} y={860} rows={3} color="#6f9ad0" gap={100} amp={18} />
			{/* distant lighthouse on its cliff */}
			<g transform="translate(860 840) scale(0.42)">
				<path d="M -300 0 Q -240 -120 -60 -140 Q 160 -150 300 0 Z" fill="#7a6a5a" stroke={OL} strokeWidth={OW / 0.42} />
				<Lighthouse x={0} y={-130} t={t} />
			</g>
			{/* sand */}
			<path d="M -20 1150 Q 200 1110 420 1140 Q 700 1180 1100 1130 L 1100 1940 L -20 1940 Z" fill="#e8cf9a" stroke={OL} strokeWidth={OW} />
			<path d={`M -20 1170 Q 200 ${1135 + Math.sin(t * 1.5) * 8} 420 1160 Q 700 1200 1100 1150`} fill="none" stroke="#fffaf0" strokeWidth={10} strokeLinecap="round" />
			{[[120, 1500], [330, 1700], [700, 1560], [900, 1760], [520, 1820], [980, 1420]].map(([sx, sy], i) => (
				<ellipse key={i} cx={sx} cy={sy} rx={14} ry={6} fill="#cdb07a" />
			))}
			<g transform="translate(250 1500) rotate(-8)"><Plank x={0} y={0} s={0.55} t={0} /></g>
			<g transform="translate(780 1650) rotate(12)"><Plank x={0} y={0} s={0.45} t={0} /></g>
			<Net x={860} y={1460} />
			<RopeFill x={420} y={1720} s={1} />
			<RopeFill x={120} y={1820} s={0.8} />
			<Starfish x={640} y={1440} />
			<Starfish x={980} y={1860} r={20} />
			<path d="M 60 1400 q 20 -40 0 -80 M 80 1400 q -10 -30 10 -60" fill="none" stroke="#5f9e55" strokeWidth={9} strokeLinecap="round" />
			<Keeper x={x} y={1390 + bob} s={0.66} face={surprised ? 'shock' : 'smile'} legL={3 + step} legR={3 + step} armL={walking ? [12 + step * 0.7, -10] : undefined} handOnHead={surprised} armR={walking ? [12 - step * 0.7, -10] : undefined} look={surprised ? 1 : 0} />
			<Bubble x={880} y={1180} text="мяу" from={7.25} size={56} tail={[40, 120]} />
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 5: the kitten on the plank
const S5Kitten: React.FC<{t: number}> = ({t}) => {
	const gaze = prog(t, 4.8, 0.8);
	return (
		<Cam z={1.0 + 0.12 * ease(t / 7.2)} cx={520} cy={1000}>
			<rect width={1080} height={1920} fill="#bfe3f0" />
			<Cloud x={300 - t * 5} y={300} s={0.9} />
			<rect x={0} y={700} width={1080} height={1220} fill="#2b4a7a" />
			<Waves t={t} y={760} rows={3} color="#6f9ad0" gap={110} amp={20} />
			<path d="M -20 1500 Q 300 1440 600 1480 Q 850 1510 1100 1460 L 1100 1940 L -20 1940 Z" fill="#e8cf9a" stroke={OL} strokeWidth={OW} />
			<path d={`M -20 ${1490 + Math.sin(t * 1.4) * 10} Q 300 1430 600 1470 Q 850 1500 1100 1450`} fill="none" stroke="#fffaf0" strokeWidth={12} strokeLinecap="round" />
			<Plank x={480} y={1180} s={1.5} t={t}>
				<Cat x={-20} y={-26} s={0.62} t={t} kitten wet look={t > 4.6 ? 1 : 0} />
			</Plank>
			<Waves t={t + 0.5} y={1260} rows={2} color="#6f9ad0" gap={100} amp={22} w={9} />
			{gaze > 0 && (
				<path d={`M 640 960 L ${640 + 380 * gaze} 960`} stroke="#fffaf0" strokeWidth={10} strokeDasharray="26 22" strokeLinecap="round" opacity={0.9} />
			)}
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 6: the compass
const S6Compass: React.FC<{t: number}> = ({t}) => {
	// local 0 = 32.35; «Стрелка показывает» 35.55 → 3.2; «Точно на север» 37.49 → 5.1
	const lift = ease(t / 0.8);
	const swingT = Math.min(Math.max(t - 0.9, 0), 3.99);
	const north = prog(t, 5.1, 0.3);
	const kitGaze = prog(t, 3.3, 0.8);
	return (
		<Cam z={1 + 0.05 * ease(t / 6)} cx={540} cy={800}>
			<rect width={1080} height={1920} fill="#efe0c2" />
			{/* keeper's coat in the background */}
			<rect x={140} y={300} width={800} height={1700} rx={120} fill="#f2c230" stroke={OL} strokeWidth={OW} />
			<line x1={540} y1={300} x2={540} y2={1920} stroke={OL} strokeWidth={6} />
			{[0, 1, 2].map((i) => (
				<circle key={i} cx={500} cy={500 + i * 300} r={14} fill={OL} />
			))}
			<rect x={600} y={1100} width={260} height={200} rx={20} fill="none" stroke={OL} strokeWidth={6} />
			<g transform={`translate(0 ${(1 - lift) * 500})`}>
				{/* palm */}
				<ellipse cx={540} cy={1060} rx={240} ry={150} fill={C.skin} stroke={OL} strokeWidth={OW} />
				<Compass x={540} y={880} s={1.25} t={swingT} />
				{[-1, 0, 1].map((k) => (
					<ellipse key={k} cx={360 + (k + 1) * 10} cy={960 + k * 70} rx={60} ry={34} fill={C.skin} stroke={OL} strokeWidth={OW} />
				))}
			</g>
			{/* red north flag */}
			<g opacity={north} transform={`translate(540 ${260 - north * 20})`}>
				<path d="M -60 40 L 0 -40 L 60 40 Z" fill={C.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<text x={0} y={-60} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red} stroke={OL} strokeWidth={4} paintOrder="stroke">
					СЕВЕР
				</text>
			</g>
			{/* the kitten looks the same way */}
			<g opacity={kitGaze}>
				<circle cx={880} cy={430} r={130} fill="#9fd0e8" stroke={OL} strokeWidth={OW} />
				<clipPath id="kitc"><circle cx={880} cy={430} r={124} /></clipPath>
				<g clipPath="url(#kitc)">
					<rect x={740} y={470} width={280} height={100} fill="#2b4a7a" />
					<Cat x={880} y={590} s={0.5} t={t} kitten wet look={-0.2} />
				</g>
				<path d="M 880 290 L 880 220" stroke={OL} strokeWidth={8} strokeDasharray="14 12" strokeLinecap="round" />
			</g>
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 7: home
const Stove: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-30} y={-760} width={60} height={480} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
		<rect x={-120} y={-300} width={240} height={300} rx={20} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
		<rect x={-80} y={-210} width={160} height={110} rx={14} fill="#1d1f2b" stroke={OL} strokeWidth={6} />
		<circle cx={0} cy={-150} r={60} fill="#ffb23a" opacity={0.25 + 0.08 * Math.sin(t * 11)} />
		<path d={`M -50 -110 Q -40 ${-170 + Math.sin(t * 13) * 8} -10 -150 Q 0 ${-200 + Math.sin(t * 9) * 10} 20 -150 Q 40 ${-175 + Math.sin(t * 15) * 6} 50 -110 Z`} fill={C.ochre} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
		<path d="M -30 -110 Q -10 -140 0 -125 Q 10 -145 30 -110 Z" fill="#ffe08a" />
		<rect x={-130} y={-310} width={260} height={30} rx={10} fill="#545a72" stroke={OL} strokeWidth={6} />
		<rect x={-110} y={0} width={30} height={20} fill={OL} />
		<rect x={80} y={0} width={30} height={20} fill={OL} />
	</g>
);

const Towel: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -120 0 Q -130 -120 -60 -150 Q 0 -170 60 -150 Q 130 -120 120 0 Z" fill="#f2c230" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		<path d="M -122 -40 Q 0 -70 122 -40 M -115 -90 Q 0 -120 115 -90" fill="none" stroke={C.red} strokeWidth={12} />
		<path d="M -60 -150 Q 0 -110 60 -150" fill="none" stroke={OL} strokeWidth={6} />
	</g>
);

const S7Home: React.FC<{t: number}> = ({t}) => {
	// local 0 = 38.55; dialogue 44.36–47.59 → 5.8–9.05; thought 47.98 → 9.45
	const talking = t > 5.8 && t < 9.05 ? Math.abs(Math.sin(t * 14)) : 0;
	const milk = prog(t, 3.2, 0.5);
	return (
		<Cam z={1.02 + 0.06 * ease(t / 12.8)} cx={420} cy={1100}>
			<Room t={t} />
			<Stove x={150} y={1300} t={t} />
			<Table t={t} />
			{/* kitten wrapped in towel by the stove */}
			<Cat x={360} y={1330} s={0.55} t={t} kitten look={1} />
			<Towel x={360} y={1340} s={0.6} />
			<g opacity={milk} transform={`translate(0 ${(1 - milk) * -30})`}>
				<Saucer x={300} y={1420} s={0.55} t={t} />
			</g>
			<Keeper x={620} y={1330} s={1.0} face={t > 9.4 ? 'smile' : 'smile'} armL={[50, 30]} talk={talking} look={-1} />
			<Thought x={700} y={300} r={150} from={9.45} tailTo={[640, 640]}>
				<Compass x={0} y={10} s={0.55} t={Math.min(t - 9.45, 3.99)} />
				<g transform="translate(90 120)">
					<Cat x={0} y={0} s={0.25} t={t} />
				</g>
			</Thought>
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 8: fog
const Pier: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}>
		{[0, 120, 240, 360].map((dx) => (
			<rect key={dx} x={dx + 10} y={-20} width={30} height={240} fill={C.woodDark} stroke={OL} strokeWidth={6} />
		))}
		<rect x={-10} y={-50} width={500} height={40} fill={C.wood} stroke={OL} strokeWidth={OW} />
		{[60, 180, 300, 420].map((dx) => (
			<line key={dx} x1={dx} y1={-50} x2={dx} y2={-10} stroke={OL} strokeWidth={5} />
		))}
		<circle cx={30} cy={-80} r={34} fill="#fff" stroke={OL} strokeWidth={6} />
		<circle cx={30} cy={-80} r={16} fill="#e6e8ea" stroke={OL} strokeWidth={5} />
		<path d="M 6 -98 L 18 -86 M 54 -62 L 42 -74" stroke={C.red} strokeWidth={10} />
	</g>
);

const S8Fog: React.FC<{t: number}> = ({t}) => {
	// local 0 = 51.35; «Через год они вышли на лодке» → they stand on the pier and climb into the boat (0–2.3);
	// «туман» 54.73 → 3.4; cat stands up 58.34 → 7.0; turn 62.08 → 10.7; pier 64.63 → 13.3; bump ~66.95 → 15.6
	const board = ease((t - 0.9) / 1.1); // keeper climbs in
	const boardCat = ease((t - 1.4) / 0.8); // cat hops in
	const depart = ease((t - 2.3) / 1.8);
	const fog = ease((t - 2.6) / 1.6) * (1 - ease((t - 6.6) / 1.2) * 0.35) * (1 - ease((t - 13.0) / 2.0) * 0.75);
	const turn = ease((t - 10.7) / 1.5);
	const arrive = ease((t - 13.0) / 2.6);
	const bump = t > 15.6 && t < 16.2 ? Math.sin((t - 15.6) * 20) * 6 * (1 - (t - 15.6) / 0.6) : 0;
	const bx = 500 - depart * 170 + arrive * 170 + bump;
	const by = 1180;
	const rot = -turn * 4 + Math.sin(t * 1.4) * 1.5;
	const handUp = t > 4.2 && t < 7.0;
	const gaze = prog(t, 7.4, 0.8);
	const pierVis = Math.max(1 - depart, arrive);
	const sky = interpolateColor(depart, '#bfe3f0', '#dfe3e6');
	const sea = interpolateColor(depart, '#5d84ad', '#b8c4cc');
	// keeper: standing on the pier → seated in the boat (only his upper body shows above the side)
	const kPier: [number, number] = [830, 1150];
	const kSeat: [number, number] = [bx - 110, by + 250];
	const hopK = Math.sin(board * Math.PI) * 70;
	const kx = kPier[0] + (kSeat[0] - kPier[0]) * board;
	const ky = kPier[1] + (kSeat[1] - kPier[1]) * board - hopK;
	// cat: on the pier → sitting inside at the bow → stands up on the bow on «Барсик встал»
	const stand = ease((t - 7.0) / 0.6);
	const cPier: [number, number] = [950, 1150];
	const cSeat: [number, number] = [bx + 170, by + 40 - stand * 70];
	const hopC = Math.sin(boardCat * Math.PI) * 90;
	const cx = cPier[0] + (cSeat[0] - cPier[0]) * boardCat;
	const cy = cPier[1] + (cSeat[1] - cPier[1]) * boardCat - hopC;
	return (
		<Cam z={1.0 + 0.06 * ease(t / 16)} cx={540} cy={1100}>
			<rect width={1080} height={1920} fill={sky} />
			<rect x={0} y={1000} width={1080} height={920} fill={sea} />
			<Waves t={t} y={1050} rows={8} color={interpolateColor(depart, '#6f9ad0', '#9aa6b2')} gap={110} amp={14} speed={20} />
			<g opacity={pierVis}>
				<Pier x={700} y={1200} />
			</g>
			<clipPath id="aboveHull"><rect x={-200} y={0} width={1480} height={by + 60} /></clipPath>
			<g clipPath="url(#aboveHull)">
			<Keeper x={kx} y={ky} s={0.6} face={t > 13.3 ? 'smile' : t > 3.6 ? 'think' : 'smile'} armR={handUp ? [150, 20] : board < 1 ? [40, -20] : [70, -40]} look={t > 7.4 ? 1 : 0} />
			<Cat x={cx} y={cy} s={0.42} t={t} look={1} />
			</g>
			<g transform={`translate(${bx} ${by}) rotate(${rot})`}>
				<Boat x={0} y={40} s={0.95} t={t} />
			</g>
			{gaze > 0 && <path d={`M ${bx + 260} 1010 L ${bx + 260 + 300 * gaze} 1010`} stroke="#fffaf0" strokeWidth={10} strokeDasharray="26 22" strokeLinecap="round" opacity={0.9 * (1 - arrive)} />}
			{/* fog banks */}
			<g opacity={fog}>
				{Array.from({length: 7}).map((_, i) => {
					const y = 520 + i * 190;
					const dx = ((t * (12 + i * 4) + i * 300) % 1600) - 300;
					return <ellipse key={i} cx={dx} cy={y} rx={520} ry={110} fill="#f4f6f7" opacity={0.85} />;
				})}
				{Array.from({length: 6}).map((_, i) => {
					const y = 600 + i * 210;
					const dx = 1300 - ((t * (10 + i * 5) + i * 270) % 1600);
					return <ellipse key={i} cx={dx} cy={y} rx={460} ry={90} fill="#ffffff" opacity={0.75} />;
				})}
			</g>
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 9: together (night)
const S9Together: React.FC<{t: number}> = ({t}) => {
	// local 0 = 67.9; «И Барсик всегда первым…» 71.68 → 3.8
	const up = prog(t, 3.8, 0.4);
	const z = 1 + 0.25 * ease((t - 3.6) / 2.6);
	return (
		<Cam z={z} cx={240} cy={330}>
			<Outside t={t} />
			{up > 0 && (
				<g transform={`translate(330 ${360 + (1 - up) * 20}) scale(${0.16 * (0.6 + 0.4 * up)})`} opacity={up}>
					<Cat x={0} y={0} s={1} t={t} look={-1} />
				</g>
			)}
		</Cam>
	);
};

// ------------------------------------------------------------------ scene 10: finale
const S10Final: React.FC<{t: number}> = ({t}) => {
	// local 0 = 74.6; «Ну…» 77.26 → 2.66; «почти» 78.0 → 3.4
	const atCamera = t > 2.6;
	return (
		<Cam z={1.02 + 0.04 * ease(t / 5.8)} cx={540} cy={1100}>
			<Room t={t} />
			{/* north sign on the wall pointing left */}
			<g transform="translate(560 900)">
				<rect x={-150} y={-60} width={300} height={120} rx={14} fill={C.wood} stroke={OL} strokeWidth={OW} />
				<path d="M -110 0 L -50 -40 L -50 -16 L 90 -16 L 90 16 L -50 16 L -50 40 Z" fill={C.red} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
				<text x={60} y={-24} fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fffaf0" stroke={OL} strokeWidth={3} paintOrder="stroke">
					С
				</text>
			</g>
			{/* bowl with a fish */}
			<g transform="translate(860 1350)">
				<path d="M -30 -50 Q 0 -90 30 -50 L 50 -66 L 46 -30 L 30 -44 Q 0 -10 -30 -50 Z" fill="#8fa3bf" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
				<path d="M -110 -40 L 110 -40 Q 100 20 0 24 Q -100 20 -110 -40 Z" fill={C.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<text x={0} y={2} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill="#fffaf0">
					БАРСИК
				</text>
			</g>
			<Cat x={640} y={1360} s={0.75} t={t} look={atCamera ? 0 : 1} />
			<Keeper x={260} y={1340} s={0.95} face={t > 3.4 ? 'laugh' : 'smile'} armR={[30, -40]} />
		</Cam>
	);
};

// ------------------------------------------------------------------ assembly
const SCENES: {from: number; to: number; C: React.FC<{t: number}>}[] = [
	{from: 0, to: 4.6, C: S1Intro},
	{from: 4.6, to: 10.2, C: S2Hook},
	{from: 10.2, to: 16.55, C: S3Storm},
	{from: 16.55, to: 25.1, C: S4Beach},
	{from: 25.1, to: 32.35, C: S5Kitten},
	{from: 32.35, to: 38.55, C: S6Compass},
	{from: 38.55, to: 51.35, C: S7Home},
	{from: 51.35, to: 67.9, C: S8Fog},
	{from: 67.9, to: 74.6, C: S9Together},
	{from: 74.6, to: EP01_DURATION, C: S10Final},
];

const FADE = 0.25;

const SceneLayer: React.FC<{lead: number; C: React.FC<{t: number}>}> = ({lead, C: Scene}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS - lead; // scene-local time, 0 = scene start
	const a = lead === 0 ? 1 : clamp01((t + lead) / FADE);
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: a}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Scene t={t} />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const Ep01: React.FC<{audio?: string}> = ({audio = 'keeper/ep01-mix.wav'}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const endFade = interpolate(t, [EP01_DURATION - 0.6, EP01_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			{SCENES.map((s, i) => {
				const start = Math.max(0, Math.round((s.from - (i ? FADE : 0)) * FPS));
				const end = Math.round(s.to * FPS);
				return (
					<Sequence key={i} from={start} durationInFrames={end - start}>
						<SceneLayer lead={s.from - start / FPS} C={s.C} />
					</Sequence>
				);
			})}
			{(() => {
				// only one caption at a time: the latest one that has started appearing
				let idx = -1;
				CAPTIONS.forEach((c, i) => {
					if (c[0].start - 0.25 <= t) idx = i;
				});
				return idx >= 0 ? <KaraokeLine key={idx} words={CAPTIONS[idx]} t={t} /> : null;
			})()}
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			<Audio src={staticFile(audio)} />
		</AbsoluteFill>
	);
};
