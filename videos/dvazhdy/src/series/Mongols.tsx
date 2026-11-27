import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, NameTag, OL, OW} from '../cartoon/parts';
import type {CharProps} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Horse, Yurt, Grass, Sheep, Scroll} from './Kypshak';
import {Pill} from './FlatStyleDemo';
import rawWords from '../../public/shnurok/mongols-words.json';

// «Монголы и Чингисхан» — мультик для урока, плоский 2D, без Шнурка.

const FPS = 30;
const O = OL;
const W = OW;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- words
const WORDS: Word[] = rawWords as Word[];
export const MONGOLS_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 1.8);
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:]»?$/.test(prev.text);
		if (cur.length && (cur.length >= 5 || end || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();
const norm = (s: string) => s.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && norm(x.text) === w);
const T = (w: string, from = 0) => {
	const i = idx(w, from);
	return i >= 0 ? WORDS[i].start : 0;
};
const St = (i: number) => Math.max(0, (WORDS[Math.max(0, i)]?.start ?? 0) - 0.2);

const B = [
	0,
	St(idx('его')),
	St(idx('он')),
	St(idx('у', idx('ханом'))),
	St(idx('а', idx('тысячи'))),
	St(idx('в', idx('километров'))),
	St(idx('в', idx('войны'))),
	St(idx('чингисхан', idx('самарканд'))),
	St(idx('империя')),
	St(idx('она', idx('европы'))),
];

// ---------------------------------------------------------------- small pieces
const Lbl: React.FC<{x?: number; y: number; text: string; t: number; at: number; size?: number; color?: string; out?: number}> = ({x = 540, y, text, t, at, size = 64, color = C.red, out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(${x} ${y}) scale(${back((t - at) / 0.35)})`}>
			{size < 100 && <rect x={-(text.length * size * 0.56 + 70) / 2} y={-size * 1.02} width={text.length * size * 0.56 + 70} height={size * 1.45} rx={size * 0.5} fill="#f7ecd6" stroke={O} strokeWidth={6} />}
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={size < 100 && color === '#fffaf0' ? C.red : color} stroke={size < 100 ? 'none' : O} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);
const Year: React.FC<{y?: number; text: string; t: number; at: number}> = ({y = 300, text, t, at}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.35)})`}>
			<rect x={-190} y={-70} width={380} height={130} rx={24} fill="#f7ecd6" stroke={O} strokeWidth={W} />
			<rect x={-190} y={-70} width={28} height={130} rx={10} fill={C.red} stroke={O} strokeWidth={W} />
			<text x={14} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={84} fill={O}>
				{text}
			</text>
		</g>
	);

type P = Partial<CharProps> & {x: number; y: number};
const Temujin: React.FC<P> = (p) => <Char kid hair="buzz" hairColor="#2b211d" hat="mongol" hatColor="#3d6fb5" jacket="#c0603e" pants="#5a3a28" {...p} />;
const Genghis: React.FC<P> = (p) => <Char hair="buzz" hairColor="#2b211d" mustache beard hat="mongol" hatColor="#d9483b" jacket="#2f4f86" pants="#5a3a28" headS={0.82} bodyS={1.14} headDrop={18} {...p} />;
const Noble: React.FC<P & {k: number}> = ({k, ...p}) => (
	<Char hair="buzz" hairColor="#2b211d" mustache={k % 2 === 0} hat="mongol" hatColor={['#5f9e55', '#e8a93a', '#8a5a9a', '#3d6fb5', '#c0603e'][k % 5]} jacket={['#9c6338', '#3d5a8a', '#7a4a2a', '#5a6f3a', '#8a3e3e'][k % 5]} pants="#3b2a22" headS={0.82} bodyS={1.14} headDrop={18} blinkSeed={k} {...p} />
);
const Warrior: React.FC<P & {k: number}> = ({k, ...p}) => <Char hair="buzz" mustache={k % 2 === 1} hat="helmet" hatColor="#8d8f98" jacket={['#8a3e3e', '#5a3a28', '#3d4a66'][k % 3]} pants="#3b2a22" headS={0.82} bodyS={1.14} headDrop={18} blinkSeed={k + 3} {...p} />;
const KairKhan: React.FC<P> = (p) => <Char hair="buzz" beard mustache hat="turban" hatColor="#f4f1ea" jacket="#3f7a4a" pants="#3b2a22" headS={0.82} bodyS={1.14} headDrop={18} {...p} />;
const Merchant: React.FC<P & {k: number}> = ({k, ...p}) => <Char hair="buzz" mustache hat="mongol" hatColor={['#e8a93a', '#3d6fb5', '#5f9e55'][k % 3]} jacket={['#7a4a2a', '#5a6f3a', '#8a5a9a'][k % 3]} pants="#3b2a22" headS={0.82} bodyS={1.14} headDrop={18} blinkSeed={k + 7} {...p} />;

const Camel: React.FC<{x: number; y: number; s?: number; t: number; walk?: number; load?: string; flip?: boolean}> = ({x, y, s = 1, t, walk = 1, load = '#d9483b', flip = false}) => {
	const sw = Math.sin(t * 5) * 14 * walk;
	return (
		<g transform={`translate(${x} ${y + Math.abs(Math.sin(t * 5)) * -4 * walk}) scale(${flip ? -s : s} ${s})`}>
			{[[-80, sw], [-50, -sw], [70, -sw], [100, sw]].map(([lx, a], i) => (
				<g key={i} transform={`rotate(${a} ${lx} -150)`}>
					<path d={`M ${lx - 11} -150 L ${lx - 9} 0 L ${lx + 9} 0 L ${lx + 11} -150 Z`} fill="#c9a06a" stroke={O} strokeWidth={6} strokeLinejoin="round" />
					<ellipse cx={lx} cy={-4} rx={16} ry={8} fill="#a07a48" stroke={O} strokeWidth={5} />
				</g>
			))}
			<path d="M -130 -150 Q -150 -230 -60 -250 Q -40 -320 0 -250 Q 30 -320 70 -250 Q 140 -240 140 -160 Q 130 -120 0 -125 Q -120 -120 -130 -150 Z" fill="#d6ac72" stroke={O} strokeWidth={W} strokeLinejoin="round" />
			{/* load between humps */}
			<rect x={-50} y={-300} width={90} height={60} rx={14} fill={load} stroke={O} strokeWidth={6} />
			<path d="M -50 -270 L 40 -270" stroke={O} strokeWidth={4} opacity={0.5} />
			<rect x={-90} y={-250} width={50} height={80} rx={12} fill="#e8a93a" stroke={O} strokeWidth={6} />
			{/* neck + head */}
			<path d={`M 120 -200 Q 190 -220 190 -300 Q 196 -340 240 -340 L 262 -326 Q 266 -306 240 -300 Q 222 -296 222 -270 Q 220 -170 140 -150 Z`} fill="#d6ac72" stroke={O} strokeWidth={W} strokeLinejoin="round" />
			<circle cx={236} cy={-326} r={6} fill={O} />
			<path d={`M -128 -170 q -30 ${20 + Math.sin(t * 3) * 6} -18 60`} stroke={O} strokeWidth={10} fill="none" strokeLinecap="round" />
		</g>
	);
};

/** Mounted warrior: Horse from the steppe set + a flat rider on top. */
const Rider: React.FC<{x: number; y: number; s?: number; t: number; flip?: boolean; gallop?: boolean; color?: string; deel?: string; flag?: string}> = ({x, y, s = 1, t, flip = false, gallop = true, color = '#5a3a28', deel = '#8a3e3e', flag}) => {
	const bob = gallop ? Math.abs(Math.sin(t * 14)) * -10 : 0;
	return (
		<g>
			<Horse x={x} y={y} s={s} t={t} flip={flip} gallop={gallop} color={color} />
			<g transform={`translate(${x} ${y + bob}) scale(${flip ? -s : s} ${s})`}>
				<path d="M -10 -230 L 30 -150 L 60 -160 L 34 -240 Z" fill="#3b2a22" stroke={O} strokeWidth={6} />
				<path d="M -40 -240 Q -40 -360 10 -370 Q 60 -360 50 -240 Z" fill={deel} stroke={O} strokeWidth={W} strokeLinejoin="round" />
				<circle cx={14} cy={-410} r={46} fill={C.skin} stroke={O} strokeWidth={W} />
				<circle cx={32} cy={-414} r={6} fill={O} />
				<path d="M -34 -420 Q -30 -490 14 -500 Q 58 -490 62 -420 Q 14 -440 -34 -420 Z" fill="#8d8f98" stroke={O} strokeWidth={6} />
				<path d="M 14 -500 L 14 -530" stroke={O} strokeWidth={6} />
				<path d="M 40 -320 L 150 -460" stroke="#7a4a2a" strokeWidth={10} strokeLinecap="round" />
				<path d="M 150 -460 l 14 -30 l 6 34 Z" fill="#c9ced6" stroke={O} strokeWidth={4} />
				{flag && <path d={`M 140 -450 L 70 ${-440 + Math.sin(t * 8) * 8} L 76 -400 L 120 -410 Z`} fill={flag} stroke={O} strokeWidth={4} />}
			</g>
		</g>
	);
};

const Dust: React.FC<{x: number; y: number; t: number; n?: number; op?: number}> = ({x, y, t, n = 8, op = 0.6}) => (
	<>
		{Array.from({length: n}).map((_, i) => {
			const k = (t * 0.8 + i / n) % 1;
			return <circle key={i} cx={x - k * 260 + hash(i) * 60} cy={y - k * 60 - hash(i + 2) * 30} r={30 + k * 50} fill="#c9b08a" opacity={op * (1 - k)} />;
		})}
	</>
);

const Smoke: React.FC<{x: number; y: number; t: number; s?: number; dark?: boolean}> = ({x, y, t, s = 1, dark = true}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{Array.from({length: 7}).map((_, i) => {
			const k = (t * 0.25 + i / 7) % 1;
			return <circle key={i} cx={Math.sin(i * 2 + t) * 30 + k * 60} cy={-k * 520} r={50 + k * 90} fill={dark ? '#4a4250' : '#b9b2a6'} opacity={0.75 * (1 - k)} />;
		})}
	</g>
);
const Fire: React.FC<{x: number; y: number; t: number; s?: number}> = ({x, y, t, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[0, 1, 2].map((i) => {
			const h = 120 + Math.sin(t * 11 + i * 2) * 26;
			return <path key={i} d={`M ${-50 + i * 50} 0 Q ${-70 + i * 50} ${-h * 0.6} ${-40 + i * 50 + Math.sin(t * 9 + i) * 10} ${-h} Q ${-10 + i * 50} ${-h * 0.5} ${0 + i * 50} 0 Z`} fill={i === 1 ? '#f2c230' : '#e8742a'} stroke={O} strokeWidth={5} strokeLinejoin="round" />;
		})}
	</g>
);

// ---------------------------------------------------------------- backgrounds
const SteppeBg: React.FC<{t: number; sky?: string; ground?: string; ground2?: string; sun?: boolean; night?: number}> = ({t, sky = '#9fd0e8', ground = '#b9b06a', ground2 = '#a8a05a', sun = true, night = 0}) => (
	<>
		<rect width={1080} height={1920} fill={sky} />
		{/* far mountains */}
		<path d="M -20 980 L 120 820 L 220 900 L 360 760 L 480 880 L 600 790 L 760 900 L 880 800 L 1100 950 L 1100 1000 L -20 1000 Z" fill="#8fa3bf" stroke={O} strokeWidth={W} strokeLinejoin="round" />
		<path d="M 330 790 L 360 760 L 392 792 Q 362 806 330 790 Z M 576 812 L 600 790 L 628 816 Q 600 826 576 812 Z M 852 822 L 880 800 L 910 826 Q 880 836 852 822 Z" fill="#f4f1ea" stroke={O} strokeWidth={4} />
		{sun && <circle cx={820} cy={330} r={80} fill="#ffe08a" stroke={O} strokeWidth={W} />}
		<path d={`M ${100 + t * 8} 340 q 30 -40 70 -16 q 40 -30 70 10 q 40 0 30 30 Z`} fill="#fffaf0" stroke={O} strokeWidth={5} opacity={sun ? 1 : 0.3} />
		<path d="M -20 990 Q 300 930 600 970 Q 850 1000 1100 950 L 1100 1940 L -20 1940 Z" fill={ground} stroke={O} strokeWidth={W} />
		<path d="M -20 1160 Q 300 1100 700 1140 Q 900 1160 1100 1120 L 1100 1940 L -20 1940 Z" fill={ground2} stroke={O} strokeWidth={W} />
		<Grass t={t} y={1140} n={30} />
		{night > 0 && <rect width={1080} height={1920} fill="#1d2b4f" opacity={night * 0.55} />}
	</>
);

const Otrar: React.FC<{t: number; dmg?: number; y?: number}> = ({t, dmg = 0, y = 1200}) => (
	<g>
		{/* houses + domes behind the wall */}
		{[[180, 120, 160], [360, 160, 200], [560, 140, 180], [760, 170, 150], [900, 130, 140]].map(([x, h, w], i) => (
			<g key={i}>
				<rect x={x - w / 2} y={y - 260 - h} width={w} height={h + 40} fill={i % 2 ? '#d9b07a' : '#c99d64'} stroke={O} strokeWidth={W} />
				{i === 2 && <path d={`M ${x - 70} ${y - 300 - h + 40} Q ${x} ${y - 430 - h + 40} ${x + 70} ${y - 300 - h + 40} Z`} fill="#3d8fb5" stroke={O} strokeWidth={W} />}
				<rect x={x - 18} y={y - 220 - h} width={36} height={50} rx={18} fill="#6b4a2a" stroke={O} strokeWidth={4} />
			</g>
		))}
		{/* minaret */}
		<rect x={680} y={y - 560} width={50} height={330} fill="#c99d64" stroke={O} strokeWidth={W} />
		<path d={`M 670 ${y - 560} L 705 ${y - 620} L 740 ${y - 560} Z`} fill="#3d8fb5" stroke={O} strokeWidth={W} />
		{/* the wall */}
		<rect x={-20} y={y - 260} width={1120} height={300} fill="#c9a46a" stroke={O} strokeWidth={W} />
		{Array.from({length: 14}).map((_, i) => (
			<rect key={i} x={-10 + i * 80} y={y - 300} width={44} height={44} fill="#c9a46a" stroke={O} strokeWidth={5} />
		))}
		{[120, 540, 960].map((x) => (
			<g key={x}>
				<rect x={x - 70} y={y - 380} width={140} height={420} fill="#bf9658" stroke={O} strokeWidth={W} />
				{[0, 1, 2].map((k) => (
					<rect key={k} x={x - 66 + k * 48} y={y - 420} width={36} height={44} fill="#bf9658" stroke={O} strokeWidth={5} />
				))}
				<rect x={x - 10} y={y - 320} width={20} height={50} rx={8} fill="#3b2a22" />
			</g>
		))}
		{/* gate */}
		<path d={`M 470 ${y + 40} L 470 ${y - 150} Q 540 ${y - 230} 610 ${y - 150} L 610 ${y + 40} Z`} fill="#6b4a2a" stroke={O} strokeWidth={W} />
		<path d={`M 540 ${y - 200} L 540 ${y + 40}`} stroke={O} strokeWidth={5} />
		{/* brick lines */}
		{Array.from({length: 4}).map((_, i) => (
			<path key={i} d={`M 0 ${y - 200 + i * 60} L 1080 ${y - 200 + i * 60}`} stroke="#a8844e" strokeWidth={3} />
		))}
		{dmg > 0 && (
			<g>
				<path d={`M 300 ${y - 260} L 330 ${y - 180} L 300 ${y - 120} L 340 ${y - 40}`} stroke={O} strokeWidth={6} fill="none" opacity={dmg} />
				<path d={`M 800 ${y - 260} L 770 ${y - 170} L 810 ${y - 90}`} stroke={O} strokeWidth={6} fill="none" opacity={dmg} />
				<path d={`M 220 ${y - 300} L 300 ${y - 300} L 280 ${y - 250} L 240 ${y - 260} Z`} fill="#8a6a40" opacity={dmg} />
			</g>
		)}
		<Grass t={t} y={y + 60} n={14} color="#a89a6a" />
	</g>
);

// Stylised Eurasia: sea, land, Caspian, Aral, Black sea. Coordinates in a 1080 × 1920 frame.
const LAND =
	'M 20 640 Q 140 560 300 600 Q 420 540 560 580 Q 700 520 860 560 Q 960 560 1000 640 Q 1030 720 990 800 Q 1010 880 960 960 Q 940 1060 860 1100 Q 760 1180 680 1150 Q 600 1200 520 1150 Q 440 1180 360 1120 Q 280 1160 200 1100 Q 120 1120 60 1060 Q 20 980 40 900 Q 0 800 20 640 Z';
const CITIES: Record<string, [number, number]> = {
	Каракорум: [790, 760],
	Отрар: [470, 900],
	Сыгнак: [450, 860],
	Бухара: [395, 975],
	Самарканд: [440, 1000],
};
const MapBg: React.FC<{t: number; children?: React.ReactNode}> = ({t, children}) => (
	<>
		<rect width={1080} height={1920} fill="#2b4a7a" />
		{Array.from({length: 18}).map((_, i) => (
			<path key={i} d={`M ${hash(i) * 1080} ${hash(i + 3) * 1900} q 20 -12 40 0 q 20 12 40 0`} stroke="#6f9ad0" strokeWidth={5} fill="none" opacity={0.6} transform={`translate(${Math.sin(t + i) * 10} 0)`} />
		))}
		<path d={LAND} fill="#e8d3a0" stroke={O} strokeWidth={W} strokeLinejoin="round" />
		{/* mountains strokes */}
		{[[600, 980], [660, 960], [720, 990], [560, 1010], [880, 700], [920, 740]].map(([x, y], i) => (
			<path key={i} d={`M ${x - 30} ${y} L ${x} ${y - 40} L ${x + 30} ${y}`} fill="#c9b07a" stroke={O} strokeWidth={4} />
		))}
		<ellipse cx={300} cy={900} rx={42} ry={90} fill="#2b4a7a" stroke={O} strokeWidth={5} />
		<ellipse cx={385} cy={860} rx={26} ry={22} fill="#2b4a7a" stroke={O} strokeWidth={4} />
		<ellipse cx={150} cy={880} rx={70} ry={34} fill="#2b4a7a" stroke={O} strokeWidth={5} />
		{children}
		<text x={1040} y={1350} textAnchor="end" fontFamily="Inter" fontWeight={800} fontSize={34} fill="#cfe3ff" opacity={0.8}>Тихий океан</text>
		<text x={60} y={560} fontFamily="Inter" fontWeight={800} fontSize={34} fill="#cfe3ff" opacity={0.8}>Европа</text>
	</>
);
const City: React.FC<{name: string; t: number; at: number; dark?: number; dx?: number; dy?: number}> = ({name, t, at, dark = 0, dx = 22, dy = 10}) => {
	const [x, y] = CITIES[name];
	if (t < at) return null;
	const k = back((t - at) / 0.35);
	return (
		<g>
			<circle cx={x} cy={y} r={14 * k} fill={dark > 0.5 ? '#3b2a22' : C.red} stroke={O} strokeWidth={5} />
			{dark > 0.5 && <Fire x={x} y={y - 8} t={t} s={0.22} />}
			<text x={x + dx} y={y + dy} fontFamily="Inter" fontWeight={900} fontSize={30} fill={O} stroke="#fffaf0" strokeWidth={6} paintOrder="stroke" opacity={k}>
				{name}
			</text>
		</g>
	);
};

// ---------------------------------------------------------------- scenes
// 1. Steppe, ~800 years ago, little Temujin
const S1: React.FC<{t: number}> = ({t}) => (
	<g transform={`translate(540 1300) scale(${1 + 0.08 * ease(t / 5)}) translate(-540 -1300)`}>
		<SteppeBg t={t} />
		<Yurt x={300} y={1180} s={0.9} t={t} />
		<Yurt x={820} y={1060} s={0.5} t={t + 1} />
		<Sheep x={760} y={1320} s={0.5} t={t} />
		<Sheep x={880} y={1360} s={0.45} t={t + 1} />
		<Horse x={140} y={1120} s={0.35} t={t} color="#7a4a2a" />
		<Char x={360} y={1850} s={0.95} hair="wife" hairColor="#2b211d" jacket="#5f9e55" skirt="#5f9e55" headS={0.82} bodyS={1.14} headDrop={18} face="smile" armR={[60, 40]} />
		<Temujin x={660} y={1850} s={0.8} face="smile" />
		<Year text="≈ 1162" t={t} at={0.6} />
		<NameTag name="Темучин" role="будущий Чингисхан" from={T('темучин') - 0.2} x={60} y={430} avatar={<Temujin x={0} y={270} s={0.28} />} />
	</g>
);

// 2. Father poisoned; mother and boy alone; he grows up
const S2: React.FC<{t: number}> = ({t}) => {
	const A = B[1];
	const gone = ease((t - (T('отравили') - A)) / 1.2);
	const alone = T('семья') - A;
	const grow = ease((t - (T('вырос') - A)) / 0.8);
	const night = ease((t - alone) / 1.5) * (1 - grow);
	return (
		<>
			<SteppeBg t={t} sun={false} sky={grow > 0.5 ? '#9fd0e8' : '#8a92b0'} night={night} />
			<Yurt x={760} y={1150} s={0.7} t={t} />
			{/* the father fades into a silhouette and disappears */}
			<g opacity={1 - gone}>
				<Char x={190} y={1850} s={0.95} hair="buzz" mustache hat="mongol" hatColor="#5a3a28" jacket="#3d4a66" pants="#3b2a22" headS={0.82} bodyS={1.14} headDrop={18} face={gone > 0.2 ? 'wince' : 'neutral'} tone={gone} />
				<path d="M 290 1360 l 40 0 l -8 54 l -24 0 Z" fill="#c9ced6" stroke={O} strokeWidth={5} />
			</g>
			<g opacity={1 - grow}>
				<Char x={500} y={1850} s={0.95} hair="wife" hairColor="#2b211d" jacket="#5f9e55" skirt="#5f9e55" headS={0.82} bodyS={1.14} headDrop={18} face="sad" />
				<Temujin x={790} y={1850} s={0.8} face={t > alone ? 'sad' : 'neutral'} />
			</g>
			<g opacity={grow} transform={`translate(600 1860) scale(${0.8 + 0.2 * grow}) translate(-600 -1860)`}>
				<Char x={600} y={1860} s={1.05} hair="buzz" hairColor="#2b211d" mustache hat="mongol" hatColor="#3d6fb5" jacket="#c0603e" pants="#5a3a28" headS={0.82} bodyS={1.14} headDrop={18} face="determined" />
			</g>
			{/* cold wind lines */}
			{night > 0.1 &&
				Array.from({length: 6}).map((_, i) => {
					const k = (t * 0.6 + i / 6) % 1;
					return <path key={i} d={`M ${1100 - k * 1300} ${900 + i * 90} q 60 -20 120 0`} stroke="#eef4ff" strokeWidth={5} fill="none" opacity={0.6 * night} />;
				})}
			{t > alone && grow < 0.5 && <Pill text="без защиты" t={t - alone} y={360} />}
		</>
	);
};

// 3. Tribes join; 1206 kurultai
const S3: React.FC<{t: number}> = ({t}) => {
	const A = B[2];
	const kur = T('тысяча') - A - 0.2;
	const join = ease(t / 2.6);
	const cols = ['#d9483b', '#3d6fb5', '#5f9e55', '#e8a93a', '#8a5a9a'];
	if (t < kur)
		return (
			<>
				<SteppeBg t={t} />
				{cols.map((c, i) => {
					const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
					const x = lerp(540 + Math.cos(a) * 400, 540 + (i - 2) * 150, join);
					const y = lerp(1480 + Math.sin(a) * 300, 1560 + Math.abs(i - 2) * 50, join);
					return <Rider key={i} x={x} y={y} s={0.5} t={t + i} gallop={join < 1} flip={Math.cos(a) > 0} deel={c} flag={c} />;
				})}
				{join > 0.9 && <Lbl y={560} text="одно войско" t={t} at={2.4} size={80} />}
			</>
		);
	const k = t - kur;
	const named = T('чингисханом') - A - kur;
	return (
		<g transform={`translate(540 1300) scale(${1 + 0.1 * ease(k / 6)}) translate(-540 -1300)`}>
			<SteppeBg t={t} />
			{/* big white yurt + nine-tailed banner */}
			<g transform="translate(540 1050) scale(1.3)">
				<path d="M -260 0 L -260 -150 Q -150 -300 0 -312 Q 150 -300 260 -150 L 260 0 Z" fill="#fbf7ef" stroke={O} strokeWidth={W} strokeLinejoin="round" />
				<path d="M -260 -150 Q 0 -190 260 -150" fill="none" stroke={C.ochre} strokeWidth={14} />
				<rect x={-60} y={-160} width={120} height={160} rx={8} fill={C.red} stroke={O} strokeWidth={W} />
			</g>
			<g transform="translate(900 1250)">
				<path d="M 0 0 L 0 -560" stroke="#7a4a2a" strokeWidth={14} />
				{Array.from({length: 9}).map((_, i) => (
					<path key={i} d={`M ${-40 + i * 10} -520 q ${-10 + Math.sin(t * 3 + i) * 10} 80 ${-6 + i * 2} 160`} stroke="#f4f1ea" strokeWidth={12} fill="none" strokeLinecap="round" />
				))}
				<circle cx={0} cy={-570} r={16} fill={C.ochre} stroke={O} strokeWidth={5} />
			</g>
			{/* nobles around */}
			{[[120, 1820, 0], [290, 1880, 1], [790, 1880, 2], [960, 1820, 3]].map(([x, y, i]) => (
				<Noble key={i} x={x} y={y} s={0.78} k={i} face={k > named ? 'smile' : 'neutral'} armR={k > named ? [150, -20] : undefined} armL={k > named ? [150, -20] : undefined} />
			))}
			{/* Genghis raised on white felt */}
			<g transform={`translate(0 ${-40 * ease((k - named + 0.3) / 0.8)})`}>
				<path d="M 360 1880 Q 540 1930 720 1880 L 700 1835 Q 540 1866 380 1835 Z" fill="#fbf7ef" stroke={O} strokeWidth={W} />
				<Genghis x={540} y={1850} s={0.95} face={k > named ? 'determined' : 'neutral'} />
			</g>
			<Year text="1206" t={k} at={0} y={300} />
			<Lbl y={470} text="курултай" t={k} at={0.8} size={60} color={C.ochre} />
			<Lbl y={620} text="ЧИНГИСХАН" t={k} at={named} size={110} />
		</g>
	);
};

// 4. Yasa and the decimal army
const S4: React.FC<{t: number}> = ({t}) => {
	const A = B[3];
	const army = T('армия') - A;
	const tens = T('десятки') - A;
	const hund = T('сотни') - A;
	const thou = T('тысячи') - A;
	const Dot: React.FC<{x: number; y: number; r?: number; c?: string}> = ({x, y, r = 12, c = '#8a3e3e'}) => (
		<g>
			<circle cx={x} cy={y - r * 1.6} r={r * 0.8} fill={C.skin} stroke={O} strokeWidth={3} />
			<path d={`M ${x - r} ${y} L ${x} ${y - r * 1.6} L ${x + r} ${y} Z`} fill={c} stroke={O} strokeWidth={3} />
		</g>
	);
	return (
		<>
			<rect width={1080} height={1920} fill="#f7ecd6" />
			{Array.from({length: 10}).map((_, i) => (
				<path key={i} d={`M 0 ${200 + i * 180} L 1080 ${200 + i * 180}`} stroke="#ead9b8" strokeWidth={4} />
			))}
			<g opacity={1 - ease((t - army + 0.3) / 0.4)}>
				<Scroll x={540} y={820} title="ЯСА" sub="законы Чингисхана" t={t} from={0.3} />
				<Genghis x={540} y={1880} s={0.95} face="determined" armR={[100, -40]} />
			</g>
			{t > army - 0.2 && (
				<g>
					<Lbl y={420} text="десятичная армия" t={t} at={army} size={66} />
					{/* 10 */}
					{t > tens && (
						<g transform={`translate(0 ${0})`}>
							<rect x={80} y={540} width={920} height={250} rx={24} fill="#fffaf0" stroke={O} strokeWidth={W} />
							{Array.from({length: 10}).map((_, i) => (
								<g key={i} transform={`scale(${back((t - tens - i * 0.04) / 0.3)})`} style={{transformOrigin: `${170 + i * 60}px 700px`}}>
									<Dot x={170 + i * 60} y={720} r={18} />
								</g>
							))}
							<text x={860} y={700} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red}>10</text>
							<text x={860} y={760} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={34} fill={O}>арбан</text>
						</g>
					)}
					{t > hund && (
						<g>
							<rect x={80} y={830} width={920} height={330} rx={24} fill="#fffaf0" stroke={O} strokeWidth={W} />
							{Array.from({length: 100}).map((_, i) => (
								<Dot key={i} x={130 + (i % 20) * 31} y={900 + Math.floor(i / 20) * 52} r={9} c="#3d4a66" />
							))}
							<text x={860} y={1000} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red}>100</text>
							<text x={860} y={1060} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={34} fill={O}>джаун</text>
						</g>
					)}
					{t > thou && (
						<g>
							<rect x={80} y={1200} width={920} height={260} rx={24} fill="#fffaf0" stroke={O} strokeWidth={W} />
							{Array.from({length: 10}).map((_, i) => (
								<rect key={i} x={120 + (i % 5) * 120} y={1240 + Math.floor(i / 5) * 100} width={100} height={80} rx={10} fill="#8a3e3e" stroke={O} strokeWidth={4} opacity={back((t - thou - i * 0.05) / 0.3)} />
							))}
							<text x={860} y={1340} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red}>1000</text>
							<text x={860} y={1400} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={34} fill={O}>мингган</text>
						</g>
					)}
				</g>
			)}
		</>
	);
};

// 5. Yam: relay riders
const S5: React.FC<{t: number}> = ({t}) => {
	const A = B[4];
	const yam = T('ям') - A;
	const ride = (t * 520) % 1700;
	return (
		<>
			<SteppeBg t={t} />
			<path d="M -20 1700 Q 540 1650 1100 1720" stroke="#d8c08a" strokeWidth={110} fill="none" />
			{[180, 620, 1000].map((x, i) => (
				<g key={i}>
					<Yurt x={x} y={1330} s={0.42} t={t + i} />
					<Horse x={x + 140} y={1350} s={0.26} t={t + i} color="#e8d3a0" />
					<path d={`M ${x - 40} 1350 L ${x - 40} 1160`} stroke="#7a4a2a" strokeWidth={8} />
					<path d={`M ${x - 40} 1160 L ${x + 30} ${1175 + Math.sin(t * 4 + i) * 6} L ${x - 40} 1195 Z`} fill={C.red} stroke={O} strokeWidth={4} />
				</g>
			))}
			<g>
				<Rider x={-200 + ride} y={1730} s={0.62} t={t} deel="#3d6fb5" color="#7a4a2a" />
				<Dust x={-280 + ride} y={1720} t={t} n={6} op={0.5} />
				{[0, 1, 2].map((i) => (
					<path key={i} d={`M ${-420 + ride - i * 40} ${1460 + i * 50} l -180 0`} stroke="#fffaf0" strokeWidth={8} strokeLinecap="round" opacity={0.7} />
				))}
			</g>
			<Lbl y={520} text="«ЯМ» — почтовые станции" t={t} at={yam} size={60} />
			<Lbl y={660} text="сотни км за день" t={t} at={T('сотни', idx('день')) - A} size={70} color={C.ochre} />
		</>
	);
};

// 6. Otrar 1218: caravan, Kair-khan, merchants killed → reason for war
const S6: React.FC<{t: number}> = ({t}) => {
	const A = B[5];
	const kair = T('правитель') - A;
	const kill = T('убить') - A;
	const war = T('это', idx('купцов')) - A;
	const arrive = ease(t / 4);
	if (t < kair - 0.2)
		return (
			<>
				<rect width={1080} height={1920} fill="#f2d49a" />
				<rect width={1080} height={1000} fill="#9fd0e8" />
				<circle cx={860} cy={300} r={70} fill="#ffe08a" stroke={O} strokeWidth={W} />
				<g transform="translate(0 -120) scale(1) ">
					<Otrar t={t} y={1240} />
				</g>
				<rect x={-20} y={1160} width={1120} height={800} fill="#e2c48a" stroke={O} strokeWidth={W} />
				{[0, 1, 2].map((i) => (
					<Camel key={i} x={lerp(-300, 420, arrive) - i * 300} y={1640 + i * 20} s={0.62} t={t + i * 0.4} walk={arrive < 1 ? 1 : 0.1} load={['#d9483b', '#3d6fb5', '#5f9e55'][i]} />
				))}
				{[0, 1].map((i) => (
					<Merchant key={i} k={i} x={lerp(-60, 640, arrive) + i * 190} y={1870 + i * 10} s={0.82} face="smile" />
				))}
				<Year text="1218" t={t} at={0.4} y={300} />
				<Lbl y={470} text="ОТРАР" t={t} at={T('отрар') - A} size={110} />
				<Pill text="торговый караван" t={t - 1.2} y={600} />
			</>
		);
	const red = ease((t - kill) / 0.4);
	const angry = t > war;
	return (
		<g transform={`translate(540 1100) scale(${1.05 + 0.08 * ease((t - kair) / 5)}) translate(-540 -1100)`}>
			<rect width={1080} height={1920} fill="#d9b07a" />
			{/* palace interior */}
			<rect x={0} y={0} width={1080} height={1300} fill="#e8c890" />
			{[160, 540, 920].map((x) => (
				<path key={x} d={`M ${x - 120} 1300 L ${x - 120} 700 Q ${x} 520 ${x + 120} 700 L ${x + 120} 1300`} fill="#c99d64" stroke={O} strokeWidth={W} />
			))}
			<rect x={0} y={1300} width={1080} height={620} fill="#8a3e3e" stroke={O} strokeWidth={W} />
			<path d="M 0 1380 L 1080 1380 M 0 1520 L 1080 1520" stroke="#e8a93a" strokeWidth={10} strokeDasharray="30 20" />
			<KairKhan x={angry ? 280 : 540} y={1880} s={1.0} face={t > kill ? 'determined' : 'neutral'} armR={t > kill - 0.4 ? [150, -40] : undefined} />
			{!angry && <NameTag name="Каир-хан" role="правитель Отрара" from={kair} x={60} y={160} avatar={<KairKhan x={0} y={250} s={0.3} />} />}
			{angry && (
				<g opacity={ease((t - war) / 0.5)}>
					<Genghis x={800} y={1880} s={1.0} face="determined" />
					<Lbl x={780} y={600} text="!" t={t} at={war + 0.1} size={200} />
				</g>
			)}
			<rect width={1080} height={1920} fill="#8a1a1a" opacity={red * 0.35} />
			{t > kill && <Lbl y={420} text="купцов казнили" t={t} at={kill + 0.2} size={74} color="#fffaf0" out={war} />}
			{angry && <Lbl y={420} text="повод для войны" t={t} at={war + 0.3} size={80} />}
		</g>
	);
};

// 7. 1219 siege of Otrar, ~6 months, falls; then Sygnak, Bukhara, Samarkand
const S7: React.FC<{t: number}> = ({t}) => {
	const A = B[6];
	const half = T('защищался') - A;
	const fell = T('пал') - A;
	const next = T('вслед') - A;
	if (t < next - 0.2) {
		const months = clamp01((t - half) / Math.max(0.8, fell - half - 0.2));
		const fall = ease((t - fell) / 0.6);
		return (
			<g transform={`translate(${Math.sin(t * 30) * 4 * fall} 0)`}>
				<rect width={1080} height={1920} fill={fall > 0.5 ? '#8a6a5a' : '#c9a98a'} />
				<Otrar t={t} y={1150} dmg={Math.max(months * 0.6, fall)} />
				{fall > 0 && (
					<>
						<Smoke x={300} y={900} t={t} s={1.1} />
						<Smoke x={760} y={880} t={t + 2} s={1.2} />
						<Fire x={300} y={920} t={t} s={0.9} />
						<Fire x={780} y={900} t={t} s={1} />
					</>
				)}
				<rect x={-20} y={1150} width={1120} height={800} fill="#b9a06a" stroke={O} strokeWidth={W} />
				{Array.from({length: 9}).map((_, i) => (
					<Rider key={i} x={60 + (i % 5) * 240 + Math.sin(t + i) * 10} y={1560 + Math.floor(i / 5) * 300} s={0.46} t={t + i} gallop={t < 1.6 || fall > 0} flip={false} deel={['#8a3e3e', '#5a3a28', '#3d4a66'][i % 3]} flag={i % 4 === 0 ? '#2f4f86' : undefined} />
				))}
				<Year text="1219" t={t} at={0.3} y={260} />
				{t > half && (
					<g transform={`translate(540 520) scale(${back((t - half) / 0.3)})`}>
						<rect x={-200} y={-90} width={400} height={170} rx={24} fill="#fbf3e2" stroke={O} strokeWidth={W} />
						<text x={0} y={-20} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={O}>осада</text>
						<text x={0} y={52} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={66} fill={C.red}>
							{Math.max(1, Math.ceil(months * 6))} мес.
						</text>
					</g>
				)}
				{fall > 0 && <Lbl y={760} text="ПАЛ" t={t} at={fell} size={150} color="#fffaf0" />}
			</g>
		);
	}
	const k = t - next;
	const cities = ['Сыгнак', 'Бухара', 'Самарканд'];
	const ats = cities.map((c) => T(norm(c)) - A);
	return (
		<g transform={`translate(430 940) scale(${2.1 + 0.15 * ease(k / 4)}) translate(-430 -940)`}>
			<MapBg t={t}>
				<path d="M 790 760 Q 640 760 470 900" stroke={C.red} strokeWidth={10} fill="none" strokeDasharray="22 14" strokeDashoffset={-t * 40} />
				<City name="Отрар" t={t} at={0} dark={1} />
				{cities.map((c, i) => (
					<City key={c} name={c} t={t} at={ats[i]} dark={1} dx={c === 'Сыгнак' ? -130 : 22} dy={c === 'Бухара' ? 10 : c === 'Самарканд' ? 34 : -6} />
				))}
			</MapBg>
		</g>
	);
};

// 8. 1227 death; uluses of the sons; Ulus of Jochi → Golden Horde
const S8: React.FC<{t: number}> = ({t}) => {
	const A = B[7];
	const split = T('разделили') - A;
	const jochi = T('джучи') - A;
	const ulus = T('улус') - A;
	const horde = T('золотой') - A;
	if (t < split - 0.3)
		return (
			<>
				<rect width={1080} height={1920} fill="#2a2438" />
				<rect x={180} y={480} width={720} height={1120} rx={40} fill="#3a3450" stroke={O} strokeWidth={W} />
				<g opacity={0.85}>
					<Genghis x={540} y={1560} s={1.1} face="closed" />
				</g>
				{[[300, 1600], [780, 1600]].map(([x, y], i) => (
					<g key={i}>
						<rect x={x - 12} y={y - 120} width={24} height={120} fill="#f4f1ea" stroke={O} strokeWidth={4} />
						<path d={`M ${x} ${y - 120} q ${Math.sin(t * 8 + i) * 6} -30 0 -46 q 10 20 0 46`} fill="#f2c230" stroke={O} strokeWidth={3} />
					</g>
				))}
				<Year text="1227" t={t} at={0.3} y={330} />
			</>
		);
	const regions: [string, string, string, number, number][] = [
		// name, color, path, label x, label y
		['Джучи', '#e8a93a', 'M 60 660 Q 200 600 320 640 Q 460 600 600 660 L 620 900 Q 520 940 460 930 Q 380 960 300 1000 Q 180 990 90 960 Q 40 820 60 660 Z', 330, 760],
		['Чагатай', '#7fae6a', 'M 460 930 Q 520 940 620 900 L 660 1060 Q 560 1110 470 1080 Q 400 1060 370 1000 Z', 520, 1010],
		['Угэдэй', '#6fb4d0', 'M 600 660 Q 660 620 720 640 L 740 900 L 620 900 Z', 670, 770],
		['Толуй', '#c97b6a', 'M 720 640 Q 820 600 920 640 Q 960 720 940 820 L 740 900 Z', 830, 740],
	];
	const kj = ease((t - jochi) / 0.6);
	return (
		<g transform={`translate(380 800) scale(${lerp(1.2, 1.55, kj)}) translate(-380 -800)`}>
			<MapBg t={t}>
				{regions.map(([n, c, d, lx, ly], i) => {
					const k = back((t - split - i * 0.35) / 0.35);
					const dim = jochi > 0 && t > jochi && n !== 'Джучи' ? 0.45 : 1;
					return (
						<g key={n} opacity={clamp01(k) * dim}>
							<path d={d} fill={c} stroke={O} strokeWidth={5} opacity={0.85} />
							<text x={lx} y={ly} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={O} stroke="#fffaf0" strokeWidth={5} paintOrder="stroke">{n}</text>
						</g>
					);
				})}
				{t > jochi && (
					<text x={330} y={830} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={24} fill={O} opacity={kj}>
						Казахстан
					</text>
				)}
			</MapBg>
			{t > ulus && <Lbl x={380} y={540} text="Улус Джучи" t={t} at={ulus} size={58} />}
			{t > horde && (
				<g>
					<path d="M 60 660 Q 200 600 320 640 Q 460 600 600 660 L 620 900 Q 520 940 460 930 Q 380 960 300 1000 Q 180 990 90 960 Q 40 820 60 660 Z" fill="none" stroke="#ffd36a" strokeWidth={10 + 4 * Math.sin(t * 5)} opacity={0.9} />
					<Lbl x={380} y={1080} text="Золотая Орда" t={t} at={horde} size={64} color="#f2c230" />
				</g>
			)}
		</g>
	);
};

// 9. The empire: largest contiguous empire, Pacific to Europe
const S9: React.FC<{t: number}> = ({t}) => {
	const A = B[8];
	const ends = T('от', idx('истории')) - A;
	const grow = ease(t / 3.2);
	return (
		<g transform={`translate(540 860) scale(${1.15 - 0.1 * ease(t / 6)}) translate(-540 -860)`}>
			<MapBg t={t}>
				<clipPath id="emp">
					<circle cx={790} cy={760} r={60 + grow * 900} />
				</clipPath>
				<path clipPath="url(#emp)" d="M 120 640 Q 300 580 560 600 Q 760 540 960 600 Q 1010 700 990 800 Q 1000 880 950 960 Q 900 1060 820 1100 Q 700 1140 620 1100 Q 520 1150 420 1100 Q 330 1090 280 1040 Q 200 1000 150 940 Q 110 800 120 640 Z" fill={C.red} opacity={0.55} stroke={O} strokeWidth={6} />
				<circle cx={790} cy={760} r={14} fill={O} />
				<text x={790} y={730} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={O} stroke="#fffaf0" strokeWidth={5} paintOrder="stroke">Каракорум</text>
				{t > ends && (
					<g opacity={ease((t - ends) / 0.5)}>
						<path d="M 820 800 L 1030 860" stroke={O} strokeWidth={12} markerEnd="url(#arr)" />
						<path d="M 700 820 L 90 760" stroke={O} strokeWidth={12} />
						<path d="M 1030 860 l -30 -30 l -6 44 Z M 90 760 l 34 -26 l 0 50 Z" fill={O} />
					</g>
				)}
			</MapBg>
			<Lbl y={360} text="самая большая" t={t} at={0.6} size={84} />
			<Lbl y={460} text="сплошная империя в истории" t={t} at={1.2} size={52} color={O} />
			{t > ends && <Lbl y={1300} text="от Тихого океана до Европы" t={t} at={ends + 0.3} size={50} color="#fffaf0" />}
		</g>
	);
};

// 10. Destruction and fear, but roads opened; caravans again; final title
const S10: React.FC<{t: number}> = ({t}) => {
	const A = B[9];
	const roads = T('но', idx('страх')) - A;
	const fin = T('такой') - A;
	const k = ease((t - roads) / 1.2);
	return (
		<>
			{/* ruins */}
			<g opacity={1 - k}>
				<rect width={1080} height={1920} fill="#6b5d6e" />
				<rect y={1150} width={1080} height={800} fill="#7a6a5a" stroke={O} strokeWidth={W} />
				{[[150, 220], [420, 160], [700, 260], [920, 180]].map(([x, h], i) => (
					<path key={i} d={`M ${x - 90} 1160 L ${x - 90} ${1160 - h} L ${x - 40} ${1160 - h + 40} L ${x} ${1160 - h - 20} L ${x + 50} ${1160 - h + 30} L ${x + 90} ${1160 - h} L ${x + 90} 1160 Z`} fill="#8a7a64" stroke={O} strokeWidth={W} strokeLinejoin="round" />
				))}
				<Smoke x={300} y={1000} t={t} s={1.2} />
				<Smoke x={780} y={980} t={t + 3} s={1.1} />
				<Lbl y={500} text="разрушение и страх" t={t} at={0.4} size={70} color="#fffaf0" />
			</g>
			{/* caravans on the road at sunset */}
			<g opacity={k}>
				<rect width={1080} height={1920} fill="#f2b46a" />
				<circle cx={540} cy={900} r={180} fill="#ffd36a" stroke={O} strokeWidth={W} />
				<path d="M -20 1000 L 140 880 L 300 960 L 460 860 L 640 970 L 820 880 L 1100 990 L 1100 1060 L -20 1060 Z" fill="#c97b5a" stroke={O} strokeWidth={W} strokeLinejoin="round" />
				<rect y={1040} width={1080} height={900} fill="#e2b47a" stroke={O} strokeWidth={W} />
				<path d="M -20 1700 Q 540 1620 1100 1720" stroke="#c99a5a" strokeWidth={120} fill="none" />
				{[0, 1, 2, 3].map((i) => (
					<Camel key={i} x={((t - roads) * 80 + i * 330) % 1650 - 300} y={1740 + (i % 2) * 14} s={0.58} t={t + i * 0.3} load={['#d9483b', '#3d6fb5', '#5f9e55', '#e8a93a'][i]} />
				))}
				<Lbl y={560} text="дороги открылись" t={t} at={roads + 0.4} size={72} />
				{t > fin && (
					<g transform={`translate(540 360) scale(${back((t - fin) / 0.4)})`}>
						<rect x={-430} y={-90} width={860} height={160} rx={30} fill="#f7ecd6" stroke={O} strokeWidth={W} />
						<text x={0} y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red}>Эпоха Чингисхана</text>
					</g>
				)}
			</g>
		</>
	);
};

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];

// ---------------------------------------------------------------- layers
const FADE = 0.35;
const Layer: React.FC<{idx: number; lead: number; dur: number; first: boolean; C: React.FC<{t: number}>}> = ({idx: i, lead, dur, first, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
	const a = first ? 1 : clamp01((t + lead) / FADE);
	const enter = first ? 0 : 1 - Easing.out(Easing.cubic)(clamp01((t + lead) / 0.6));
	const exit = Easing.in(Easing.cubic)(clamp01((t - (dur - FADE)) / FADE));
	const dir = i % 2 ? -1 : 1;
	const drift = ease(t / Math.max(1, dur));
	const z = 1.02 + 0.06 * (dir > 0 ? drift : 1 - drift) + 0.18 * enter + 0.2 * exit;
	const px = 540 + dir * 80 * (drift - 0.5);
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: a}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<g transform={`translate(${px} 1000) scale(${z}) translate(${-px} -1000)`}>
						<Scene t={t} />
					</g>
					<defs>
						<radialGradient id="vigM" cx="50%" cy="50%" r="72%">
							<stop offset="62%" stopColor="#000" stopOpacity={0} />
							<stop offset="100%" stopColor="#000" stopOpacity={0.3} />
						</radialGradient>
					</defs>
					<rect width={1080} height={1920} fill="url(#vigM)" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const Mongols: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	const endFade = interpolate(t, [MONGOLS_DURATION - 0.6, MONGOLS_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((Sc, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : MONGOLS_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round(to * FPS) - start)}>
						<Layer idx={i} lead={from - start / FPS} dur={to - from} first={i === 0} C={Sc} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} keepSpoken />}
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
