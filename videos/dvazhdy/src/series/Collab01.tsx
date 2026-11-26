import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {KaraokeLine, Word} from '../subs/Karaoke';
import tl from '../../public/collab/timeline.json';
import rawWords from '../../public/collab/words.json';

// Колаба «Вселенная Шнурка × @multobiz», серия 1 «Договор». Flat 2D vector, dark night palette, big-eyed kids.

const FPS = 30;
const VW = 1080;
const VH = 1920;
const OL = '#1a1d2e';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.7))(clamp01(v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Seg = {who: string; start: number; end: number};
const SEGS = (tl as {segs: Seg[]}).segs;
const ENV = (tl as {env: number[]}).env;
export const COLLAB01_DURATION = Math.ceil((tl as {dur: number}).dur);
const seg = (who: string, n = 1) => SEGS.filter((s) => s.who === who)[n - 1];
const talkOf = (who: string, t: number) => {
	const s = SEGS.find((q) => q.who === who && t >= q.start - 0.02 && t <= q.end + 0.03);
	return s ? clamp01(((ENV[Math.round(t * FPS)] ?? 0) - 0.1) * 1.6) : 0;
};

type W = Word & {who: string};
const WORDS = rawWords as W[];
const CAPTIONS: Word[][] = (() => {
	const caps: W[][] = [];
	let cur: W[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const brk = prev && (cur.length >= 4 || /[.!?…»]$/.test(prev.text) || w.start - prev.end > 0.5 || prev.who !== w.who);
		if (brk) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();

// ------------------------------------------------------------------ kid (front-facing, his style)
type Face = 'neutral' | 'smirk' | 'laugh' | 'sad' | 'shock' | 'angry' | 'worried' | 'happy';
type KidP = {
	x: number;
	y: number;
	s?: number;
	t: number;
	hair?: string;
	top?: string;
	pants?: string;
	face?: Face;
	talk?: number;
	armL?: number; // angle deg (0 = down, 90 = sideways out, 160 = up)
	armR?: number;
	walk?: number;
	look?: number; // pupil x offset -1..1
	cap?: boolean;
	pj?: boolean;
	girl?: boolean;
	number?: string;
	beard?: boolean;
	whistle?: boolean;
	phone?: boolean;
	bald?: boolean;
	ph?: number;
};
const Kid: React.FC<KidP> = ({x, y, s = 1, t, hair = '#7a4a2a', top = '#e8a632', pants = '#262d4d', face = 'neutral', talk = 0, armL = 8, armR = 8, walk = 0, look = 0, pj, girl, number, beard, whistle, phone, bald, ph = 0}) => {
	const L = '#1c1d29';
	const SK = '#e9b98f';
	const SKD = '#d6a079';
	const blink = (t + ph) % 3.4 > 3.27 ? 0.1 : 1;
	const breathe = Math.sin(t * 2.4 + ph) * 2.5;
	const st = Math.sin(t * 9 + ph) * walk;
	const bob = -Math.abs(st) * 10;
	const dk = shade(top);
	const arm = (side: -1 | 1, ang: number) => {
		const a = ((ang + (side > 0 ? st : -st) * 18) * Math.PI) / 180;
		const sx = side * 104;
		const sy = -455;
		const ex = sx + side * Math.sin(a) * 150;
		const ey = sy + Math.cos(a) * 150;
		const hx = ex + side * Math.sin(a * 1.08) * 130;
		const hy = ey + Math.cos(a * 1.08) * 130;
		return (
			<g>
				<path d={`M ${sx} ${sy} L ${ex} ${ey} L ${hx} ${hy}`} stroke={L} strokeWidth={58} strokeLinecap="round" strokeLinejoin="round" fill="none" />
				<path d={`M ${sx} ${sy} L ${ex} ${ey} L ${hx} ${hy}`} stroke={side > 0 ? top : dk} strokeWidth={47} strokeLinecap="round" strokeLinejoin="round" fill="none" />
				<path d={`M ${hx - 22} ${hy - 4} L ${hx + 22} ${hy - 4}`} stroke={L} strokeWidth={5} />
				<ellipse cx={hx} cy={hy + 14} rx={22} ry={26} fill={SK} stroke={L} strokeWidth={5} />
				{phone && side > 0 && (
					<g transform={`translate(${hx} ${hy - 10})`}>
						<rect x={-20} y={-46} width={40} height={70} rx={8} fill="#1d2030" stroke={L} strokeWidth={5} />
						<rect x={-14} y={-39} width={28} height={50} rx={4} fill="#62b6ff" />
					</g>
				)}
			</g>
		);
	};
	const leg = (side: -1 | 1) => (
		<g transform={`rotate(${(side > 0 ? st : -st) * 12} ${side * 38} -300)`}>
			<path d={`M ${side * 38 - 30} -320 L ${side * 38 + 30} -320 L ${side * 38 + 25} -26 L ${side * 38 - 25} -26 Z`} fill={pants} stroke={L} strokeWidth={6} strokeLinejoin="round" />
			<path d={`M ${side * 38 - 36} -30 Q ${side * 38 - 36} -54 ${side * 38} -54 Q ${side * 38 + 44} -54 ${side * 38 + 46} -14 L ${side * 38 - 36} -6 Z`} fill="#eef0f4" stroke={L} strokeWidth={6} strokeLinejoin="round" />
			<path d={`M ${side * 38 - 36} -10 L ${side * 38 + 46} -14`} stroke="#b9bfca" strokeWidth={8} />
		</g>
	);
	const eye = (ex: number) => (
		<g>
			<ellipse cx={ex} cy={-560} rx={50} ry={55 * blink} fill="#fff" stroke={L} strokeWidth={6} />
			{blink > 0.5 && <circle cx={ex + look * 12 + (ex < 0 ? 4 : -4)} cy={-556 + (face === 'sad' ? 8 : 0)} r={face === 'shock' ? 13 : 18} fill={L} />}
		</g>
	);
	const brow = (ex: number, side: -1 | 1) => {
		const tilt = face === 'angry' || face === 'smirk' ? 10 * side : face === 'sad' || face === 'worried' ? -9 * side : 0;
		const yy = face === 'shock' ? -622 : -612;
		return <path d={`M ${ex - 22} ${yy + tilt} L ${ex + 22} ${yy - tilt}`} stroke={L} strokeWidth={7} strokeLinecap="round" />;
	};
	const mouth = () => {
		if (talk > 0.05) return <ellipse cx={0} cy={-482} rx={16 + talk * 6} ry={6 + talk * 15} fill="#8a2a2a" stroke={L} strokeWidth={5} />;
		if (face === 'laugh' || face === 'happy') return <path d="M -30 -492 Q 0 -446 30 -492 Z" fill="#8a2a2a" stroke={L} strokeWidth={5} strokeLinejoin="round" />;
		if (face === 'smirk') return <path d="M -18 -482 Q 8 -476 28 -494" stroke={L} strokeWidth={6} strokeLinecap="round" fill="none" />;
		if (face === 'sad' || face === 'worried') return <path d="M -20 -474 Q 0 -490 20 -474" stroke={L} strokeWidth={6} strokeLinecap="round" fill="none" />;
		if (face === 'shock') return <ellipse cx={0} cy={-480} rx={15} ry={19} fill="#8a2a2a" stroke={L} strokeWidth={5} />;
		if (face === 'angry') return <path d="M -20 -480 L 20 -480" stroke={L} strokeWidth={6} strokeLinecap="round" />;
		return <path d="M -16 -484 Q 0 -474 16 -484" stroke={L} strokeWidth={6} strokeLinecap="round" fill="none" />;
	};
	return (
		<g transform={`translate(${x} ${y + bob}) scale(${s * 0.86})`}>
			<ellipse cx={0} cy={2} rx={120} ry={16} fill="#000" opacity={0.28} />
			{leg(-1)}
			{leg(1)}
			<g transform="translate(0 -150)">
				{arm(-1, armL)}
				{/* hoodie: longer torso */}
				<path d={`M -96 -478 Q -112 -478 -112 -458 L ${-106 + breathe * 0.3} -150 L ${106 - breathe * 0.3} -150 L 112 -458 Q 112 -478 96 -478 Z`} fill={top} stroke={L} strokeWidth={6} strokeLinejoin="round" />
				<path d={`M -106 -150 L 106 -150 L 107 -172 L -107 -172 Z`} fill={dk} stroke={L} strokeWidth={5} />
				<path d={`M -112 -458 L -107 -172 L -78 -172 L -80 -470 Z`} fill={dk} opacity={0.6} />
				{!pj && !beard && !number && (
					<>
						<path d="M -58 -300 L 58 -300 Q 68 -225 60 -205 L -60 -205 Q -68 -225 -58 -300 Z" fill={dk} stroke={L} strokeWidth={5} strokeLinejoin="round" />
						<path d="M -64 -480 Q 0 -425 64 -480 Q 40 -515 0 -513 Q -40 -515 -64 -480 Z" fill={dk} stroke={L} strokeWidth={5} />
						<path d="M -20 -460 L -24 -360" stroke="#f4f4f4" strokeWidth={6} strokeLinecap="round" />
						<path d="M 20 -460 L 24 -360" stroke="#f4f4f4" strokeWidth={6} strokeLinecap="round" />
					</>
				)}
				{number && (
					<>
						<path d="M 0 -480 L 0 -150" stroke={L} strokeWidth={5} />
						<text x={50} y={-300} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#fff" stroke={L} strokeWidth={5} paintOrder="stroke">{number}</text>
					</>
				)}
				{pj && [0, 1, 2, 3].map((k) => <circle key={k} cx={-50 + k * 34} cy={-380 + (k % 2) * 70} r={10} fill="#fff" opacity={0.75} />)}
				{whistle && (
					<>
						<path d="M -30 -480 Q 0 -380 30 -480" stroke="#e8e8e8" strokeWidth={4} fill="none" />
						<rect x={-13} y={-405} width={26} height={20} rx={6} fill="#c9ced8" stroke={L} strokeWidth={4} />
					</>
				)}
				{arm(1, armR)}
				<g transform="translate(0 -75)">
					<rect x={-24} y={-445} width={48} height={50} fill={SKD} stroke={L} strokeWidth={5} />
					<g transform={`rotate(${Math.sin(t * 1.3 + ph) * 2} 0 -430) translate(0 -430) scale(1.14) translate(0 430)`}>
						<ellipse cx={-116} cy={-560} rx={16} ry={24} fill={SK} stroke={L} strokeWidth={5} />
						<ellipse cx={116} cy={-560} rx={16} ry={24} fill={SK} stroke={L} strokeWidth={5} />
						<ellipse cx={0} cy={-572} rx={118} ry={124} fill={SK} stroke={L} strokeWidth={6} />
						<ellipse cx={-64} cy={-506} rx={15} ry={8} fill="#e88b7a" opacity={0.45} />
						<ellipse cx={64} cy={-506} rx={15} ry={8} fill="#e88b7a" opacity={0.45} />
						{eye(-52)}
						{eye(52)}
						{brow(-42, -1)}
						{brow(42, 1)}
						{mouth()}
						{beard && <path d="M -64 -486 Q -40 -440 0 -446 Q 40 -440 64 -486 Q 50 -470 0 -470 Q -50 -470 -64 -486 Z" fill="#4a3a30" stroke={L} strokeWidth={5} />}
						{!bald && !girl && (
							<path
								d="M -112 -560 Q -122 -660 -80 -705 Q -40 -745 20 -740 Q 90 -738 112 -680 Q 124 -630 110 -560 L 100 -600 L 86 -580 L 80 -630 L 52 -612 L 46 -650 L 14 -626 L 4 -664 L -26 -630 L -40 -662 L -66 -624 L -84 -650 L -94 -596 Z"
								fill={hair}
								stroke={L}
								strokeWidth={6}
								strokeLinejoin="round"
							/>
						)}
						{girl && (
							<>
								<path d="M -116 -560 Q -130 -720 0 -726 Q 130 -720 116 -560 L 128 -440 Q 104 -450 98 -560 Q 40 -650 -98 -600 L -104 -440 Q -132 -450 -116 -560 Z" fill={hair} stroke={L} strokeWidth={6} strokeLinejoin="round" />
								<circle cx={86} cy={-690} r={18} fill="#ff7fb0" stroke={L} strokeWidth={5} />
							</>
						)}
						{bald && <path d="M -104 -590 Q -100 -680 -40 -690 L -34 -650 Q -80 -640 -104 -590 Z M 104 -590 Q 100 -680 40 -690 L 34 -650 Q 80 -640 104 -590 Z" fill={hair} stroke={L} strokeWidth={5} />}
						{face === 'shock' || face === 'worried' ? <path d="M 118 -640 Q 132 -610 118 -598 Q 104 -610 118 -640 Z" fill="#7cc4f0" stroke={L} strokeWidth={3} /> : null}
					</g>
				</g>
			</g>
		</g>
	);
};
const shade = (hex: string) => {
	if (!hex.startsWith('#')) return hex;
	const p = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.78));
	return `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// heroes
const DIMA = {hair: '#7a4a2a', top: '#e8a632', pants: '#262d4d'}; // «Лимон»: lemon hoodie
const ARTEM = {hair: '#8a5a2b', top: '#d9483b', pants: '#1f2438', number: '7'};
const SONYA = {hair: '#a0522d', top: '#f4a6c8', pants: '#f4a6c8', pj: true, girl: true};
const COACH = {hair: '#4a3a30', top: '#2f6fb5', pants: '#2f6fb5', beard: true, whistle: true, bald: true};
const VLAD = {hair: '#151515', top: '#3a3f55', pants: '#1f2438', phone: true};

// ------------------------------------------------------------------ backgrounds
const Night: React.FC<{t: number; warm?: boolean}> = ({t, warm}) => (
	<>
		<rect width={VW} height={VH} fill={warm ? '#232a4a' : '#141a33'} />
		{Array.from({length: 40}).map((_, i) => (
			<circle key={i} cx={(i * 263) % VW} cy={(i * 131) % 700} r={2 + (i % 3)} fill="#fff" opacity={0.3 + 0.3 * Math.sin(t * 2 + i)} />
		))}
	</>
);
const Building: React.FC<{x: number; w: number; h: number; t: number; seed?: number}> = ({x, w, h, t, seed = 0}) => (
	<g>
		<rect x={x} y={VH - h} width={w} height={h} fill="#1f2647" stroke={OL} strokeWidth={8} />
		{Array.from({length: Math.floor(w / 110) * Math.floor(h / 140)}).map((_, i) => {
			const cols = Math.floor(w / 110);
			const cx = x + 30 + (i % cols) * 110;
			const cy = VH - h + 40 + Math.floor(i / cols) * 140;
			const on = ((i * 7 + seed) % 5) < 2;
			return <rect key={i} x={cx} y={cy} width={60} height={86} rx={6} fill={on ? '#f5c86a' : '#2c355c'} stroke={OL} strokeWidth={5} opacity={on ? 0.85 + 0.15 * Math.sin(t * 3 + i) : 1} />;
		})}
	</g>
);
const Corridor: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={VW} height={VH} fill="#cfd6e6" />
		<rect y={0} width={VW} height={420} fill="#e7ecf5" />
		{[0, 1, 2].map((k) => (
			<g key={k}>
				<rect x={60 + k * 340} y={120} width={260} height={240} rx={12} fill="#9fd0f5" stroke={OL} strokeWidth={8} />
				<path d={`M ${190 + k * 340} 120 L ${190 + k * 340} 360 M ${60 + k * 340} 240 L ${320 + k * 340} 240`} stroke={OL} strokeWidth={6} />
			</g>
		))}
		{Array.from({length: 9}).map((_, i) => (
			<g key={i}>
				<rect x={i * 122} y={520} width={118} height={560} rx={8} fill={i % 2 ? '#3d6fb5' : '#4a7cc2'} stroke={OL} strokeWidth={7} />
				{[0, 1, 2].map((r) => (
					<rect key={r} x={i * 122 + 30} y={560 + r * 22} width={58} height={8} rx={4} fill={OL} opacity={0.5} />
				))}
				<rect x={i * 122 + 90} y={780} width={12} height={40} rx={4} fill="#c9ced8" stroke={OL} strokeWidth={4} />
			</g>
		))}
		<rect y={1080} width={VW} height={VH - 1080} fill="#b88b5e" />
		{Array.from({length: 8}).map((_, i) => (
			<path key={i} d={`M 0 ${1150 + i * 110} L ${VW} ${1150 + i * 110}`} stroke="#a37a50" strokeWidth={6} />
		))}
		<rect x={380} y={40} width={320} height={60} rx={14} fill="#2b3a67" stroke={OL} strokeWidth={6} />
		<text x={540} y={82} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={36} fill="#fff">9-Б</text>
	</>
);
const Room: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={VW} height={VH} fill="#2a2f55" />
		<rect x={640} y={180} width={360} height={420} rx={14} fill="#141a33" stroke={OL} strokeWidth={10} />
		{Array.from({length: 12}).map((_, i) => (
			<circle key={i} cx={660 + ((i * 97) % 330)} cy={200 + ((i * 53) % 380)} r={3} fill="#fff" opacity={0.6} />
		))}
		<path d="M 820 180 L 820 600 M 640 390 L 1000 390" stroke={OL} strokeWidth={8} />
		<rect x={40} y={260} width={320} height={40} rx={8} fill="#6b4a32" stroke={OL} strokeWidth={6} />
		{[0, 1, 2, 3].map((k) => (
			<rect key={k} x={60 + k * 60} y={180} width={40} height={80} rx={4} fill={['#d9483b', '#3d6fb5', '#f2c230', '#5f9e55'][k]} stroke={OL} strokeWidth={5} />
		))}
		<rect y={1180} width={VW} height={VH - 1180} fill="#3a3354" />
		<ellipse cx={540} cy={1500} rx={420} ry={90} fill="#4b4170" stroke={OL} strokeWidth={6} />
		{/* desk + PC */}
		<rect x={80} y={1020} width={620} height={40} rx={8} fill="#8a5a3a" stroke={OL} strokeWidth={7} />
		<rect x={110} y={1060} width={30} height={260} fill="#6b4a32" stroke={OL} strokeWidth={6} />
		<rect x={640} y={1060} width={30} height={260} fill="#6b4a32" stroke={OL} strokeWidth={6} />
		<rect x={170} y={700} width={440} height={300} rx={16} fill="#1b1e2b" stroke={OL} strokeWidth={8} />
		<rect x={270} y={1000} width={240} height={24} fill="#1b1e2b" />
		<rect x={0} y={0} width={VW} height={VH} fill="#5ab0ff" opacity={0.05 + 0.02 * Math.sin(t * 6)} />
	</>
);
/** pixel game on the monitor: knight vs boss in red jacket #7 */
const PixelGame: React.FC<{t: number}> = ({t}) => (
	<g transform="translate(190 720)">
		<rect width={400} height={260} fill="#2b4a7a" />
		<rect y={200} width={400} height={60} fill="#3f7a3f" />
		{/* knight */}
		<g transform={`translate(${70 + Math.sin(t * 4) * 6} 140)`}>
			<rect width={30} height={40} fill="#c9ced8" />
			<rect x={4} y={-22} width={22} height={22} fill="#f6c9a0" />
			<rect x={30} y={4} width={26} height={6} fill="#e8e8e8" />
			<rect x={-8} y={8} width={10} height={24} fill="#3d6fb5" />
		</g>
		{/* boss */}
		<g transform={`translate(260 ${100 + Math.sin(t * 3) * 4})`}>
			<rect width={70} height={80} fill="#d9483b" />
			<rect x={14} y={-40} width={42} height={40} fill="#f6c9a0" />
			<text x={35} y={58} textAnchor="middle" fontFamily="monospace" fontWeight={900} fontSize={34} fill="#fff">7</text>
		</g>
		<rect x={240} y={20} width={140} height={14} fill="#1b1e2b" />
		<rect x={242} y={22} width={110} height={10} fill="#d9483b" />
		<text x={20} y={34} fontFamily="monospace" fontWeight={700} fontSize={22} fill="#fff">LEMON KNIGHT</text>
	</g>
);
const Kitchen: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={VW} height={VH} fill="#1d2140" />
		<rect x={0} y={0} width={VW} height={VH} fill="#0b0e1f" opacity={0.25} />
		<rect x={700} y={420} width={300} height={720} rx={18} fill="#d9dde6" stroke={OL} strokeWidth={9} />
		<rect x={712} y={432} width={276} height={696} rx={12} fill="#e9f1ff" opacity={0.25 + 0.05 * Math.sin(t * 8)} />
		<path d="M 712 700 L 988 700 M 712 900 L 988 900" stroke={OL} strokeWidth={6} />
		<rect y={1180} width={VW} height={VH - 1180} fill="#2b2f4a" />
		<rect x={40} y={1060} width={560} height={40} rx={8} fill="#6b4a32" stroke={OL} strokeWidth={7} />
		<path d="M 520 300 L 520 420" stroke={OL} strokeWidth={6} />
		<circle cx={520} cy={440} r={30} fill="#f5c86a" opacity={0.85} stroke={OL} strokeWidth={6} />
		<ellipse cx={520} cy={760} rx={380} ry={420} fill="#f5c86a" opacity={0.06} />
	</>
);
const Gym: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={VW} height={VH} fill="#e6c98f" />
		<rect y={0} width={VW} height={260} fill="#c9a86a" />
		{[0, 1, 2, 3].map((k) => (
			<rect key={k} x={40 + k * 260} y={60} width={200} height={140} rx={10} fill="#cfe9ff" stroke={OL} strokeWidth={7} />
		))}
		<rect y={1160} width={VW} height={VH - 1160} fill="#c98c55" />
		<path d={`M 0 1400 L ${VW} 1400`} stroke="#fff" strokeWidth={8} opacity={0.7} />
		<circle cx={540} cy={1400} r={160} fill="none" stroke="#fff" strokeWidth={8} opacity={0.7} />
		<g transform={`translate(880 ${1080 - Math.abs(Math.sin(t * 4)) * 160})`}>
			<circle r={44} fill="#e8743b" stroke={OL} strokeWidth={7} />
			<path d="M -44 0 L 44 0 M 0 -44 L 0 44" stroke={OL} strokeWidth={5} />
		</g>
		<rect x={140} y={300} width={260} height={180} fill="#fff" stroke={OL} strokeWidth={7} />
		<rect x={220} y={480} width={100} height={20} fill="#d9483b" />
	</>
);
const BackWall: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={VW} height={VH} fill="#1b2140" />
		{Array.from({length: 16}).map((_, r) =>
			Array.from({length: 6}).map((__, c) => <rect key={`${r}-${c}`} x={c * 190 + (r % 2) * 95 - 60} y={r * 75 + 120} width={180} height={65} rx={6} fill="#8a4a3a" stroke={OL} strokeWidth={5} opacity={0.9} />),
		)}
		<rect y={1320} width={VW} height={VH - 1320} fill="#2b2f3a" />
		<path d="M 880 1320 L 880 300" stroke={OL} strokeWidth={14} />
		<rect x={800} y={260} width={180} height={60} rx={10} fill="#c9ced8" stroke={OL} strokeWidth={6} />
		<ellipse cx={540} cy={600} rx={420} ry={260} fill="#f5c86a" opacity={0.08 + 0.02 * Math.sin(t * 5)} />
	</>
);

// ------------------------------------------------------------------ UI pieces
const Plate: React.FC<{t: number; at: number; text: string; color?: string; y?: number; out?: number}> = ({t, at, text, color = '#d9483b', y = 330, out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.35)}) rotate(-2)`}>
			<rect x={-text.length * 19 - 40} y={-55} width={text.length * 38 + 80} height={110} rx={20} fill="#151826" stroke={color} strokeWidth={8} />
			<text y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill={color}>{text}</text>
		</g>
	);
const Rel: React.FC<{t: number; v: number; y?: number}> = ({t, v, y = 300}) => (
	<g transform={`translate(540 ${y})`}>
		<text y={-40} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" stroke={OL} strokeWidth={6} paintOrder="stroke">ОТНОШЕНИЯ</text>
		<rect x={-400} y={-20} width={800} height={60} rx={30} fill="#151826" stroke={OL} strokeWidth={7} />
		<rect x={-392} y={-12} width={784 * ((v + 100) / 200) + 10} height={44} rx={22} fill="#d9483b" />
		<text y={100} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#ff5a4f" stroke={OL} strokeWidth={8} paintOrder="stroke">{Math.round(v)}</text>
	</g>
);
const Phone: React.FC<{t: number; at: number; children: React.ReactNode; y?: number; s?: number}> = ({t, at, children, y = 880, s = 1}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y + 50 * (1 - ease((t - at) / 0.4))}) scale(${s * back((t - at) / 0.4)})`}>
			<rect x={-280} y={-500} width={560} height={1000} rx={60} fill="#151826" stroke={OL} strokeWidth={12} />
			<rect x={-252} y={-462} width={504} height={924} rx={34} fill="#0f1220" />
			{children}
		</g>
	);
const Msg: React.FC<{t: number; at: number; y: number; from?: string; text: string[]; mine?: boolean}> = ({t, at, y, from, text, mine}) =>
	t < at ? null : (
		<g transform={`translate(${mine ? -30 : -230} ${y}) scale(${back((t - at) / 0.3)})`}>
			{from && <text x={6} y={-14} fontFamily="Inter" fontWeight={800} fontSize={26} fill="#9fb7d6">{from}</text>}
			<rect width={420} height={34 + text.length * 40} rx={22} fill={mine ? '#3d6fb5' : '#f4f1ea'} />
			{text.map((l, i) => (
				<text key={i} x={22} y={46 + i * 40} fontFamily="Inter" fontWeight={700} fontSize={30} fill={mine ? '#fff' : OL}>{l}</text>
			))}
		</g>
	);
const Bubble: React.FC<{t: number; at: number; x: number; y: number; text: string[]; out?: number}> = ({t, at, x, y, text, out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(${x} ${y}) scale(${back((t - at) / 0.3)})`}>
			<rect x={-230} y={-60 - text.length * 30} width={460} height={60 + text.length * 50} rx={30} fill="#fff" stroke={OL} strokeWidth={8} />
			<path d="M -20 -2 L 0 40 L 30 -2 Z" fill="#fff" stroke={OL} strokeWidth={8} strokeLinejoin="round" />
			<path d="M -18 -8 L 28 -8" stroke="#fff" strokeWidth={10} />
			{text.map((l, i) => (
				<text key={i} y={-20 - (text.length - 1 - i) * 50} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={OL}>{l}</text>
			))}
		</g>
	);

// ------------------------------------------------------------------ scenes
type Scene = {at: number; draw: (t: number, abs: number) => React.ReactNode; zoom?: (t: number) => [number, number, number]};
const S: Scene[] = [];
const A = (who: string, n = 1) => seg(who, n)?.start ?? 0;

// 1. hook: two worlds, relationship −100
S.push({
	at: 0,
	zoom: (t) => [1 + 0.04 * t / 6, 540, 1100],
	draw: (t, abs) => (
		<>
			<Night t={t} />
			<Building x={-40} w={420} h={1100} t={t} seed={1} />
			<Building x={700} w={420} h={1200} t={t} seed={3} />
			<rect x={538} y={600} width={4} height={1320} fill="#ff5a4f" opacity={0.6} />
			<Kid x={300} y={1720} s={0.95} t={t} {...DIMA} face="worried" look={0.6} armL={10} armR={10} />
			<Kid x={800} y={1720} s={1.0} t={t} {...ARTEM} face="smirk" look={-0.6} armL={30} armR={30} ph={1} />
			<text x={300} y={1830} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill="#f2c230" stroke={OL} strokeWidth={7} paintOrder="stroke">ДИМА</text>
			<text x={800} y={1830} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill="#ff5a4f" stroke={OL} strokeWidth={7} paintOrder="stroke">АРТЁМ</text>
			<Rel t={t} v={-100} y={360} />
		</>
	),
});

// 2. corridor: Artem knocks the backpack, class laughs, «Лимон»
S.push({
	at: A('art') - 0.5,
	zoom: (t) => [1 + 0.1 * ease((t - 2) / 3), 600, 1100],
	draw: (t, abs) => {
		const hit = 0.9;
		const bp = clamp01((t - hit) / 0.6);
		return (
			<>
				<Corridor t={t} />
				{[0, 1, 2].map((k) => (
					<g key={k} transform={`translate(${120 + k * 120} 0)`} opacity={0.55}>
						<Kid x={0} y={1420} s={0.55} t={t} hair="#2b2b2b" top={['#5f9e55', '#8a5a9a', '#3d6fb5'][k]} face={t > hit + 0.3 ? 'laugh' : 'neutral'} ph={k} />
					</g>
				))}
				<Kid x={lerp(520, 470, bp)} y={1700} s={0.95} t={t} {...DIMA} face={t > hit ? 'shock' : 'neutral'} armL={8} armR={t > hit ? 40 : 8} look={0.7} />
				{/* backpack */}
				<g transform={`translate(${lerp(560, 300, bp)} ${lerp(1340, 1560, bp) - Math.sin(bp * Math.PI) * 260}) rotate(${bp * -200})`}>
					<rect x={-70} y={-90} width={140} height={170} rx={30} fill="#5f9e55" stroke={OL} strokeWidth={8} />
					<rect x={-46} y={-20} width={92} height={60} rx={14} fill="#4a8a44" stroke={OL} strokeWidth={6} />
				</g>
				<Kid x={850} y={1720} s={1.02} t={t} {...ARTEM} face={t > hit + 0.4 ? 'laugh' : 'smirk'} armL={t > hit - 0.3 && t < hit + 0.4 ? 95 : 15} armR={15} look={-0.7} talk={talkOf('art', abs)} />
				<Plate t={t} at={A('art') - (A('art') - 0.5) + 2.4} text="ПОДКОЛОВ ЗА НЕДЕЛЮ: 14" y={1000} />
				{/* raise hand at the end — the freeze point before the banner */}
				{t > 5.2 && <text x={900} y={980} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill="#ff5a4f">!</text>}
			</>
		);
	},
});

// 3. online: meme posted, likes and comments
S.push({
	at: A('nar', 2) - 0.6,
	draw: (t) => {
		const likes = Math.floor(120 * Math.pow(clamp01((t - 1.2) / 3.5), 1.6) * 1000);
		return (
			<>
				<Night t={t} warm />
				<Phone t={t} at={0} y={860} s={1.1}>
					<rect x={-252} y={-462} width={504} height={70} fill="#1b1e2b" />
					<text x={0} y={-416} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={28} fill="#fff">@artem_7 · сейчас</text>
					<rect x={-230} y={-380} width={460} height={420} rx={20} fill="#f2c230" />
					<Kid x={0} y={30} s={0.5} t={t} {...DIMA} face="shock" armR={40} />
					<text x={0} y={-320} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>ЛИМОН 🍋</text>
					<text x={-200} y={110} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#ff5a7a">♥ {likes.toLocaleString('ru-RU')}</text>
					<Msg t={t} at={1.6} y={170} from="kirill" text={['ахахах лимон']} />
					<Msg t={t} at={2.4} y={290} from="lena" text={['бедный 😬']} />
					<Msg t={t} at={3.2} y={410} from="dimon" text={['🍋🍋🍋']} />
				</Phone>
				<Plate t={t} at={2.6} text="24/7" color="#f5c542" y={260} />
			</>
		);
	},
});

// 4. Dima's night: the game, Sonya at the door
S.push({
	at: seg('son').start - 1.4,
	zoom: (t) => [1 + 0.06 * t / 9, 400, 1000],
	draw: (t, abs) => {
		const son0 = seg('son').start - (seg('son').start - 1.4);
		return (
			<>
				<Room t={t} />
				<PixelGame t={t} />
				<Kid x={380} y={1560} s={0.85} t={t} {...DIMA} face={t > son0 + 2 ? 'sad' : 'neutral'} armL={130} armR={130} look={t > son0 ? 0.8 : -0.2} talk={talkOf('dim', abs)} />
				<g transform={`translate(${lerp(1200, 880, ease((t - son0 + 0.8) / 0.8))} 0)`}>
					<rect x={-150} y={760} width={300} height={720} fill="#4b4170" stroke={OL} strokeWidth={8} />
					<Kid x={0} y={1560} s={0.68} t={t} {...SONYA} face="worried" look={-0.8} armL={20} armR={20} ph={2} />
				</g>
				<Bubble t={t} at={son0} out={son0 + 3.4} x={780} y={620} text={['Тебя опять', 'обижают?']} />
				<Plate t={t} at={abs >= A('nar', 3) ? t - (abs - A('nar', 3)) : 1e9} text="ВРАЛ" y={300} />
			</>
		);
	},
});

// 5. Artem's night: empty fridge, debt, mum's message, coins
S.push({
	at: A('nar', 4) - 1.6,
	zoom: (t) => [1 + 0.05 * t / 5, 540, 900],
	draw: (t) => (
		<>
			<Kitchen t={t} />
			<Kid x={360} y={1640} s={0.9} t={t} {...ARTEM} face="sad" armL={60} armR={60} look={0.3} ph={1} />
			{[0, 1, 2, 3, 4].map((k) => (
				<circle key={k} cx={200 + k * 50} cy={1040 - (t > 0.5 + k * 0.4 ? 0 : 400)} r={18} fill="#e8c35a" stroke={OL} strokeWidth={5} />
			))}
			<g transform={`translate(560 1010) rotate(-6) scale(${back((t - 0.3) / 0.4)})`}>
				<rect x={-150} y={-60} width={300} height={110} rx={10} fill="#fff" stroke={OL} strokeWidth={6} />
				<rect x={-130} y={-10} width={260} height={46} rx={8} fill="#d9483b" />
				<text y={24} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={32} fill="#fff">ДОЛГ: 23 000 ₸</text>
				<text y={-24} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={24} fill={OL}>КВИТАНЦИЯ</text>
			</g>
			{t > 1.0 && (
				<g transform={`translate(780 360) scale(${back((t - 1.0) / 0.35)})`}>
					<rect x={-250} y={-70} width={500} height={140} rx={24} fill="#f4f1ea" stroke={OL} strokeWidth={7} />
					<text x={-220} y={-24} fontFamily="Inter" fontWeight={800} fontSize={26} fill="#3d6fb5">Мама</text>
					<text x={-220} y={20} fontFamily="Inter" fontWeight={700} fontSize={28} fill={OL}>Прости, в этом месяце</text>
					<text x={-220} y={56} fontFamily="Inter" fontWeight={700} fontSize={28} fill={OL}>не смогу…</text>
				</g>
			)}
		</>
	),
});

// 6. test grades → gym, coach
S.push({
	at: A('coach') - 1.6,
	zoom: (t) => [t < 1.6 ? 1 : 1 + 0.05 * (t - 1.6) / 7, 540, 1100],
	draw: (t, abs) =>
		t < 1.6 ? (
			<>
				<rect width={VW} height={VH} fill="#e7ecf5" />
				{[0, 1].map((k) => (
					<g key={k} transform={`translate(${290 + k * 500} 900) rotate(${k ? 4 : -4}) scale(${back((t - k * 0.4) / 0.35)})`}>
						<rect x={-200} y={-280} width={400} height={560} rx={10} fill="#fff" stroke={OL} strokeWidth={8} />
						{[0, 1, 2, 3, 4].map((r) => (
							<rect key={r} x={-160} y={-180 + r * 60} width={260} height={12} rx={6} fill="#c9ced8" />
						))}
						<text x={0} y={-200} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={38} fill={OL}>{k ? 'Артём' : 'Дима'}</text>
						<text x={110} y={200} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={180} fill={k ? '#d9483b' : '#2b9a3b'}>{k ? '2' : '5'}</text>
					</g>
				))}
			</>
		) : (
			<>
				<Gym t={t} />
				<Kid x={330} y={1720} s={1.0} t={t} {...COACH} face="angry" armL={20} armR={abs < seg('coach').end ? 75 : 20} look={0.7} talk={talkOf('coach', abs)} />
				<Kid x={790} y={1720} s={0.92} t={t} {...ARTEM} face={abs > A('art', 2) - 0.3 ? 'sad' : 'worried'} armL={10} armR={10} look={-0.7} talk={talkOf('art', abs)} ph={1} />
				<Plate t={t} at={seg('coach').end - (A('coach') - 1.6) - 0.2} text="ДО ИСКЛЮЧЕНИЯ: 1 ДВОЙКА" y={330} />
			</>
		),
});

// 7. behind the gym: the deal
S.push({
	at: A('art', 3) - 0.9,
	zoom: (t) => [1.04 + 0.08 * ease(t / 3), 640, 1050],
	draw: (t, abs) => {
		const deal = A('art', 4) - (A('art', 3) - 0.9);
		const ding = A('ding') - (A('art', 3) - 0.9);
		const debt = seg('dim', 3).end - (A('art', 3) - 0.9) + 0.2;
		const v = t > ding ? lerp(-100, -95, ease((t - ding) / 0.6)) : -100;
		return (
			<>
				<BackWall t={t} />
				<Kid x={360} y={1720} s={0.92} t={t} {...DIMA} face={abs > A('dim', 2) - 0.2 ? 'neutral' : 'worried'} armL={10} armR={10} look={0.7} talk={talkOf('dim', abs)} />
				<Kid x={lerp(760, 690, ease(t / 0.6))} y={1720} s={1.02} t={t} {...ARTEM} face={t > deal - 0.2 ? 'worried' : abs > A('dim', 2) ? 'shock' : 'angry'} armL={t < deal ? 72 : 15} armR={15} look={-0.7} talk={talkOf('art', abs)} ph={1} />
				<Plate t={t} at={debt} text="АРТЁМ ДОЛЖЕН ДИМЕ: 1" color="#f5c542" y={620} />
				{t > ding - 0.3 && <Rel t={t} v={v} y={330} />}
				{t > ding && t < ding + 0.8 && <text x={540} y={500} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#f5c542" opacity={1 - (t - ding) / 0.8}>+5 · дзынь!</text>}
			</>
		);
	},
});

// 8. cliffhanger: Vlad films from around the corner
S.push({
	at: A('vlad') - 1.0,
	zoom: (t) => [lerp(1.15, 1, ease(t / 1.5)), 540, 1100],
	draw: (t, abs) => {
		const end = A('nar', 5) - (A('vlad') - 1.0);
		return (
			<>
				<BackWall t={t} />
				<g opacity={0.9}>
					<Kid x={240} y={1600} s={0.6} t={t} {...DIMA} face="neutral" look={0.7} />
					<Kid x={470} y={1600} s={0.64} t={t} {...ARTEM} face="worried" look={-0.7} ph={1} />
				</g>
				<rect x={760} y={300} width={340} height={1400} fill="#151a30" stroke={OL} strokeWidth={10} />
				<Kid x={860} y={1720} s={0.95} t={t} {...VLAD} face="smirk" armR={150} armL={10} look={-1} talk={talkOf('vlad', abs)} ph={3} />
				<g opacity={0.6 + 0.4 * Math.sin(t * 6)}>
					<circle cx={90} cy={260} r={18} fill="#ff3b3b" />
					<text x={120} y={274} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff">REC</text>
				</g>
				{t > end + 5.8 && (
					<g opacity={clamp01((t - end - 5.8) / 0.4)}>
						<rect width={VW} height={VH} fill="#0b0e1f" opacity={0.7} />
						<text x={540} y={760} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#fff">ПРОДОЛЖЕНИЕ</text>
						<text x={540} y={850} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#fff">В СЛЕДУЮЩЕЙ СЕРИИ</text>
						<text x={540} y={960} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill="#f5c542">серия 2 · «ШПАРГАЛКА»</text>
						<text x={540} y={1080} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill="#fff">Подпишись на обоих 👇</text>
					</g>
				)}
			</>
		);
	},
});

// ------------------------------------------------------------------ composition
const FADE = 0.25;
export const Collab01: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.05 <= t) ci = i;
	});
	const tagA = clamp01(t / 0.3) * (1 - clamp01((t - 2.6) / 0.4));
	return (
		<AbsoluteFill style={{background: '#0b0e1f'}}>
			{S.map((sc, i) => {
				const from = Math.round(sc.at * FPS);
				const to = i < S.length - 1 ? Math.round((S[i + 1].at + FADE) * FPS) : COLLAB01_DURATION * FPS;
				return (
					<Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
						<SceneLayer sc={sc} first={i === 0} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} y={1620} keepSpoken />}
			<div style={{position: 'absolute', left: 36, top: 36, fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #000a'}}>Вселенная Шнурка × @multobiz</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', opacity: tagA}}>
				<div style={{background: '#151826', border: '6px solid #f5c542', borderRadius: 28, padding: '20px 40px', fontFamily: 'Inter', fontWeight: 900, fontSize: 52, color: '#fff', transform: `scale(${0.8 + 0.2 * tagA})`}}>
					ВСЕЛЕННАЯ ШНУРКА <span style={{color: '#f5c542'}}>×</span> @MULTOBIZ
				</div>
			</div>
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
const SceneLayer: React.FC<{sc: Scene; first: boolean}> = ({sc, first}) => {
	const lt = useCurrentFrame() / FPS;
	const t = lt;
	const abs = sc.at + lt;
	const [z, cx, cy] = sc.zoom ? sc.zoom(t) : [1, 540, 960];
	const enter = first ? 1 : clamp01(lt / FADE);
	return (
		<AbsoluteFill style={{opacity: enter}}>
			<svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
				<g transform={`translate(${cx} ${cy}) scale(${z * (first ? 1 : 1 + 0.06 * (1 - ease(lt / 0.5)))}) translate(${-cx} ${-cy})`}>{sc.draw(t, abs)}</g>
				<defs>
					<radialGradient id="cv" cx="50%" cy="50%" r="75%">
						<stop offset="60%" stopColor="#000" stopOpacity={0} />
						<stop offset="100%" stopColor="#000" stopOpacity={0.35} />
					</radialGradient>
				</defs>
				<rect width={VW} height={VH} fill="url(#cv)" />
			</svg>
		</AbsoluteFill>
	);
};
