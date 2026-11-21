import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import rawWords from '../../public/shnurok/ep01-words.json';

// «Мне 16, и я открыл ПК-клуб» — Шнурок, выпуск 1.
// Word timings: public/shnurok/ep01-words.json (ElevenLabs alignment of the voiceover).

const FPS = 30;
export const PCCLUB_DURATION = 112;

// ------------------------------------------------------------------ captions
const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();

const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:]»?$/.test(prev.text);
		const ell = prev && /…$/.test(prev.text) && cur.length > 1;
		if (cur.length && (cur.length >= 5 || end || ell || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();

// ------------------------------------------------------------------ helpers
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const prog = (t: number, a: number, d: number) => clamp01((t - a) / d);
export const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
export const pop = (t: number, a: number) => Easing.out(Easing.back(2))(clamp01((t - a) / 0.35));

export const Cam: React.FC<{z: number; cx: number; cy: number; children: React.ReactNode}> = ({z, cx, cy, children}) => (
	<g transform={`translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>
);

export const KID = {
	a: {hair: 'curly' as const, hairColor: '#2b211d', jacket: '#5b86c4', pants: '#3a3f55'},
	b: {hair: 'capback' as const, hairColor: '#c98c55', jacket: '#d9483b', pants: '#4a4f5c'},
	c: {hair: 'sweep' as const, hairColor: '#e8c070', jacket: '#7fae6a', pants: '#3d5a8a'},
	d: {hair: 'buzz' as const, hairColor: '#4a3328', jacket: '#9b6fb0', pants: '#3a3f55'},
	e: {hair: 'shaggy' as const, hairColor: '#2b211d', jacket: '#f2c230', pants: '#4a4f5c'},
};
export type KidKey = keyof typeof KID;
export const Kid: React.FC<{k: KidKey; x: number; y: number; s?: number; face?: 'smile' | 'joy' | 'neutral' | 'think' | 'laugh'; legL?: number; legR?: number; armL?: [number, number]; armR?: [number, number]}> = ({k, ...p}) => (
	<Char {...KID[k]} {...p} headS={0.82} bodyS={1.0} headDrop={18} blinkSeed={k.charCodeAt(0)} />
);
export const Dad: React.FC<{x: number; y: number; s?: number; face?: 'smile' | 'neutral' | 'think'; armR?: [number, number]; armL?: [number, number]}> = (p) => (
	<Char {...p} hair="guy" hairColor="#4a3328" mustache glasses jacket="#6d5a4a" pants="#3d4a66" headS={0.82} bodyS={1.14} headDrop={18} />
);

/** HUD: club counter in the top-right corner. */
export const Hud: React.FC<{rows: [string, string, string?][]; t: number}> = ({rows, t}) => {
	const a = ease(t / 0.4);
	return (
		<g transform={`translate(${540 + (1 - a) * 80} 70)`} opacity={a}>
			<rect x={0} y={0} width={500} height={60 + rows.length * 58} rx={18} fill={C.paper} stroke={OL} strokeWidth={OW} />
			<rect x={0} y={0} width={30} height={60 + rows.length * 58} rx={10} fill={C.red} stroke={OL} strokeWidth={OW} />
			<text x={50} y={44} fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.red}>
				ШНУРОК·КЛУБ
			</text>
			{rows.map(([k, v, col], i) => (
				<g key={k}>
					<text x={50} y={96 + i * 58} fontFamily="Inter" fontWeight={700} fontSize={30} fill={OL}>
						{k}
					</text>
					<text x={478} y={96 + i * 58} textAnchor="end" fontFamily="Inter" fontWeight={900} fontSize={32} fill={col ?? OL}>
						{v}
					</text>
				</g>
			))}
		</g>
	);
};

// ------------------------------------------------------------------ props
export type Screen = 'off' | 'game' | 'blue' | 'black' | 'boot' | 'desktop';
export const Monitor: React.FC<{x: number; y: number; s?: number; screen: Screen; t: number}> = ({x, y, s = 1, screen, t}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-14} y={-20} width={28} height={40} fill="#3a3f55" stroke={OL} strokeWidth={6} />
		<rect x={-60} y={14} width={120} height={16} rx={6} fill="#3a3f55" stroke={OL} strokeWidth={6} />
		<rect x={-130} y={-190} width={260} height={170} rx={14} fill="#2a2e3d" stroke={OL} strokeWidth={OW} />
		<clipPath id={`scr${x}${y}`}><rect x={-116} y={-176} width={232} height={142} rx={6} /></clipPath>
		<g clipPath={`url(#scr${x}${y})`}>
			<rect x={-116} y={-176} width={232} height={142} fill={screen === 'blue' ? '#2b5bd7' : screen === 'off' || screen === 'black' ? '#14161f' : screen === 'desktop' ? '#5b86c4' : '#1d2b4f'} />
			{screen === 'game' && (
				<g>
					<rect x={-116} y={-90} width={232} height={56} fill="#5f9e55" />
					<circle cx={60} cy={-140} r={18} fill="#ffe08a" />
					{[0, 1, 2].map((i) => {
						const xx = ((t * 80 + i * 90) % 300) - 150;
						return <rect key={i} x={xx} y={-110} width={26} height={20} fill={[C.red, C.ochre, '#9b6fb0'][i]} stroke={OL} strokeWidth={3} />;
					})}
					<path d={`M -80 -60 l 14 -20 l 14 20 Z`} transform={`translate(${Math.sin(t * 3) * 30} 0)`} fill="#fff" stroke={OL} strokeWidth={3} />
				</g>
			)}
			{screen === 'blue' && (
				<text x={-90} y={-110} fontFamily="Inter" fontWeight={900} fontSize={48} fill="#fff">
					:(
				</text>
			)}
			{screen === 'boot' && <rect x={-60} y={-100} width={120 * clamp01((t % 2) / 1.6)} height={10} fill="#fff" />}
			{screen === 'desktop' && [0, 1, 2].map((i) => <rect key={i} x={-100} y={-160 + i * 34} width={22} height={22} rx={4} fill="#fff" />)}
		</g>
	</g>
);

export const Tower: React.FC<{x: number; y: number; s?: number; on?: boolean; led?: string; t: number; open?: boolean}> = ({x, y, s = 1, on = false, led, t, open = false}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-55} y={-200} width={110} height={200} rx={10} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
		{open ? (
			<g>
				<rect x={-44} y={-188} width={88} height={176} fill="#22263a" />
				<rect x={-36} y={-110} width={72} height={26} fill="#5b6f8f" stroke={OL} strokeWidth={4} />
				<rect x={-36} y={-50} width={50} height={30} fill="#6b6f78" stroke={OL} strokeWidth={4} />
			</g>
		) : (
			<g>
				{[-120, -60].map((yy) => (
					<g key={yy} transform={`translate(0 ${yy})`}>
						<circle r={28} fill="#22263a" stroke={on ? led ?? '#6fb4d0' : '#555a6e'} strokeWidth={6} />
						<g transform={`rotate(${on ? t * 900 : 0})`}>
							{[0, 120, 240].map((a) => (
								<path key={a} transform={`rotate(${a})`} d="M 0 0 Q 10 -10 4 -22 L -4 -20 Q 2 -10 0 0 Z" fill="#8a90a8" />
							))}
						</g>
					</g>
				))}
				<circle cx={0} cy={-170} r={7} fill={on ? led ?? '#7dbb6a' : '#555a6e'} />
			</g>
		)}
	</g>
);

export const Desk: React.FC<{x: number; y: number; w?: number}> = ({x, y, w = 300}) => (
	<g>
		<rect x={x - w / 2} y={y} width={w} height={26} rx={8} fill={C.wood} stroke={OL} strokeWidth={OW} />
		<rect x={x - w / 2 + 16} y={y + 26} width={22} height={150} fill={C.woodDark} stroke={OL} strokeWidth={6} />
		<rect x={x + w / 2 - 38} y={y + 26} width={22} height={150} fill={C.woodDark} stroke={OL} strokeWidth={6} />
	</g>
);

export const Box: React.FC<{x: number; y: number; w?: number; h?: number; label?: string}> = ({x, y, w = 160, h = 120, label}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-w / 2} y={-h} width={w} height={h} fill="#c9a06a" stroke={OL} strokeWidth={OW} />
		<rect x={-12} y={-h} width={24} height={h} fill="#e6c48e" stroke={OL} strokeWidth={4} />
		{label && (
			<text x={0} y={-h / 2 + 10} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={22} fill={OL} transform={`translate(${w / 4} 0)`}>
				{label}
			</text>
		)}
	</g>
);

export const GPU: React.FC<{x: number; y: number; s?: number; rot?: number; t: number}> = ({x, y, s = 1, rot = 0, t}) => (
	<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
		<rect x={-130} y={-45} width={260} height={90} rx={12} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
		{[-60, 60].map((cx) => (
			<g key={cx} transform={`translate(${cx} 0)`}>
				<circle r={34} fill="#22263a" stroke={OL} strokeWidth={5} />
				<g transform={`rotate(${t * 60})`}>
					{[0, 72, 144, 216, 288].map((a) => (
						<path key={a} transform={`rotate(${a})`} d="M 0 0 Q 12 -12 5 -28 L -4 -26 Q 3 -12 0 0 Z" fill="#8a90a8" />
					))}
				</g>
			</g>
		))}
		<rect x={-100} y={45} width={140} height={14} fill={C.ochre} stroke={OL} strokeWidth={4} />
	</g>
);

export const Phone: React.FC<{x: number; y: number; s?: number; children?: React.ReactNode}> = ({x, y, s = 1, children}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-110} y={-200} width={220} height={400} rx={30} fill="#2a2e3d" stroke={OL} strokeWidth={OW} />
		<rect x={-94} y={-176} width={188} height={352} rx={14} fill="#fffaf0" />
		{children}
	</g>
);

export const Badge: React.FC<{x: number; y: number; text: string; t: number; at: number; color?: string; size?: number}> = ({x, y, text, t, at, color = C.red, size = 64}) => {
	const k = pop(t, at);
	if (t < at) return null;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={OL} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);
};

export const QMark: React.FC<{x: number; y: number; s?: number; t: number; text?: string}> = ({x, y, s = 1, t, text = '?'}) => (
	<g transform={`translate(${x} ${y + Math.sin(t * 2.2) * 8}) rotate(${10 + Math.sin(t * 1.6) * 5}) scale(${s})`}>
		<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={200} fill={C.ochre} stroke={OL} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">
			{text}
		</text>
	</g>
);

// ------------------------------------------------------------------ backgrounds
export const Wall: React.FC<{color?: string; stripe?: string}> = ({color = '#efe0c2', stripe = '#e6d3ae'}) => (
	<>
		<rect width={1080} height={1920} fill={color} />
		{Array.from({length: 14}).map((_, i) => (
			<rect key={i} x={i * 80} y={0} width={34} height={1300} fill={stripe} />
		))}
	</>
);
export const Floor: React.FC<{y?: number; color?: string; line?: string}> = ({y = 1300, color = C.wood, line = '#a8713f'}) => (
	<>
		<rect x={0} y={y} width={1080} height={1920 - y} fill={color} stroke={OL} strokeWidth={OW} />
		{Array.from({length: 9}).map((_, i) => (
			<line key={i} x1={i * 140 - 60} y1={y} x2={i * 140 - 260} y2={1920} stroke={line} strokeWidth={6} />
		))}
	</>
);
export const Window: React.FC<{x: number; y: number; w?: number; h?: number; night?: boolean; t: number}> = ({x, y, w = 300, h = 340, night = false, t}) => (
	<g>
		<rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx={10} fill={C.wood} stroke={OL} strokeWidth={OW} />
		<rect x={x} y={y} width={w} height={h} fill={night ? '#1d2b4f' : '#9fd0e8'} stroke={OL} strokeWidth={6} />
		{night ? (
			<>
				<circle cx={x + w * 0.7} cy={y + h * 0.3} r={34} fill="#fff1c0" stroke={OL} strokeWidth={5} />
				{Array.from({length: 8}).map((_, i) => (
					<circle key={i} cx={x + hash(i + 3) * w} cy={y + hash(i + 9) * h * 0.8} r={3} fill="#fff6c8" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />
				))}
			</>
		) : (
			<path d={`M ${x + 30 + ((t * 10) % 40)} ${y + 90} q 20 -30 50 -10 q 30 -20 50 10 Z`} fill="#fffaf0" stroke={OL} strokeWidth={4} />
		)}
		<line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={C.wood} strokeWidth={14} />
		<line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={C.wood} strokeWidth={14} />
		<rect x={x - 30} y={y + h + 8} width={w + 60} height={22} rx={6} fill={C.wood} stroke={OL} strokeWidth={6} />
	</g>
);
export const Poster: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-90} y={-120} width={180} height={240} fill="#1d2b4f" stroke={OL} strokeWidth={OW} />
		<circle cx={0} cy={-10} r={46} fill={C.red} stroke={OL} strokeWidth={5} />
		<ellipse rx={78} ry={18} cy={-10} fill="none" stroke={C.ochre} strokeWidth={8} transform="rotate(-15 0 -10)" />
		<text x={0} y={95} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={26} fill="#fffaf0">
			GAME ON
		</text>
	</g>
);
export const Rug: React.FC<{x: number; y: number; rx?: number}> = ({x, y, rx = 300}) => (
	<g>
		<ellipse cx={x} cy={y} rx={rx} ry={46} fill="#3f6fb0" stroke={OL} strokeWidth={OW} />
		<ellipse cx={x} cy={y} rx={rx * 0.8} ry={32} fill="none" stroke={C.ochre} strokeWidth={8} strokeDasharray="30 18" />
	</g>
);
export const Plant: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => (
	<g transform={`translate(${x} ${y})`}>
		{[-30, 0, 30].map((a, i) => (
			<path key={i} d="M 0 -60 Q -10 -130 0 -170 Q 14 -130 0 -60 Z" transform={`rotate(${a + Math.sin(t * 1.5 + i) * 3} 0 -60)`} fill="#5f9e55" stroke={OL} strokeWidth={5} />
		))}
		<path d="M -40 -60 L 40 -60 L 30 0 L -30 0 Z" fill={C.red} stroke={OL} strokeWidth={OW} />
	</g>
);
export const Bulb: React.FC<{x: number; y: number; t: number; dim?: boolean}> = ({x, y, t, dim}) => (
	<g>
		<line x1={x} y1={0} x2={x} y2={y - 30} stroke={OL} strokeWidth={5} />
		<circle cx={x} cy={y} r={160} fill="#ffe89a" opacity={dim ? 0.08 : 0.14 + 0.03 * Math.sin(t * 9)} />
		<circle cx={x} cy={y} r={26} fill="#fff1b0" stroke={OL} strokeWidth={5} />
		<rect x={x - 12} y={y - 44} width={24} height={20} fill="#6b6f78" stroke={OL} strokeWidth={4} />
	</g>
);

// ------------------------------------------------------------------ scenes (t = scene-local seconds)
const HomeRoom: React.FC<{t: number}> = ({t}) => (
	<>
		<Wall />
		<Window x={90} y={300} t={t} />
		<Poster x={800} y={420} />
		<rect x={560} y={620} width={300} height={22} fill={C.wood} stroke={OL} strokeWidth={6} />
		<rect x={590} y={560} width={40} height={60} rx={6} fill="#5b8f6a" stroke={OL} strokeWidth={5} />
		<rect x={640} y={575} width={34} height={45} rx={6} fill={C.red} stroke={OL} strokeWidth={5} />
		<circle cx={720} cy={595} r={24} fill={C.ochre} stroke={OL} strokeWidth={5} />
		<Floor />
		<Rug x={540} y={1360} />
		<Plant x={980} y={1300} t={t} />
	</>
);

// 1 · 0–7.3 «Мне было 16… Мой.»
const S1: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.04 + 0.04 * ease(t / 7)} cx={540} cy={1000}>
			<HomeRoom t={t} />
			<Desk x={720} y={1060} w={360} />
			<Monitor x={720} y={1060} s={0.9} screen="game" t={t} />
			<Tower x={860} y={1060} s={0.7} on t={t} />
			<Shnurok x={360} y={1320} s={0.95} face="smile" armR={[40, -30]} />
		</Cam>
		<NameTag name="Шнурок" role="16 лет, мечтатель" from={0.3} x={60} y={120} avatar={<Shnurok x={0} y={250} s={0.42} />} />
		<Hud t={t - 4.3} rows={[['ПК', '1 (мой)']]} />
	</>
);

// 2 · 7.3–13.8 plan
const S2: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.06} cx={540} cy={1000}>
			<HomeRoom t={t} />
			<Shnurok x={300} y={1320} s={0.95} thinking />
			<QMark x={330} y={520} t={t} s={0.7} />
			<g transform={`translate(720 ${980 - ease(t / 0.6) * 40}) rotate(-4)`}>
				<rect x={-200} y={-260} width={400} height={480} fill={C.paper} stroke={OL} strokeWidth={OW} />
				<text x={0} y={-190} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={C.red}>
					ПЛАН
				</text>
				{['1. Собрать 5 ПК', '2. Снять помещение', '3. Открыть клуб'].map((l, i) => (
					<text key={l} x={-170} y={-110 + i * 90} fontFamily="Inter" fontWeight={800} fontSize={34} fill={OL} opacity={clamp01((t - 1 - i * 0.6) / 0.3)}>
						{l}
					</text>
				))}
				<Badge x={110} y={180} text="×5" t={t} at={4.6} size={80} />
			</g>
		</Cam>
		<Hud t={1} rows={[['ПК', '1 (мой)']]} />
	</>
);

// 3 · 13.8–23.05 buying parts
const S3: React.FC<{t: number}> = ({t}) => {
	const boxes = [
		[220, 1330, 'КОРПУС'],
		[420, 1330, 'ПЛАТА'],
		[620, 1330, 'БП'],
		[820, 1330, 'GPU'],
		[320, 1210, 'КОРПУС'],
		[520, 1210, 'ПЛАТА'],
		[720, 1210, 'БП'],
		[420, 1090, 'КОРПУС'],
		[620, 1090, 'GPU'],
		[520, 970, 'ПЛАТА'],
	] as const;
	const n = Math.floor(clamp01(t / 7) * boxes.length);
	return (
		<>
			<Cam z={1.02 + 0.05 * ease(t / 9)} cx={540} cy={1100}>
				<HomeRoom t={t} />
				{boxes.slice(0, n + 1).map(([x, y, l], i) => (
					<g key={i} transform={`translate(0 ${-(1 - pop(t, (i * 7) / boxes.length)) * 120})`}>
						<Box x={x} y={y} label={l} />
					</g>
				))}
				<Shnurok x={930} y={1340} s={0.8} face={t > 7 ? 'shock' : 'smile'} handOnHead={t > 7.2} />
			</Cam>
			<Hud t={1} rows={[['Деталей', `${Math.min(n + 1, boxes.length) * 3}`], ['Собрано ПК', '0 / 5']]} />
		</>
	);
};

// 4 · 23.05–29.55 night kitchen assembly
export const Kitchen: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#d8e6e0" />
		{Array.from({length: 12}).map((_, r) =>
			Array.from({length: 9}).map((__, c) => (r + c) % 2 === 0 && <rect key={`${r}-${c}`} x={c * 120} y={r * 110} width={120} height={110} fill="#c6d9d0" />),
		)}
		<Window x={110} y={260} night t={t} />
		<rect x={760} y={420} width={260} height={880} rx={24} fill="#f4f1ea" stroke={OL} strokeWidth={OW} />
		<line x1={760} y1={760} x2={1020} y2={760} stroke={OL} strokeWidth={6} />
		<rect x={790} y={600} width={16} height={120} rx={6} fill="#9aa6b2" stroke={OL} strokeWidth={4} />
		<rect x={790} y={800} width={16} height={120} rx={6} fill="#9aa6b2" stroke={OL} strokeWidth={4} />
		<circle cx={890} cy={500} r={16} fill={C.red} stroke={OL} strokeWidth={4} />
		<rect x={850} y={540} width={60} height={40} fill={C.ochre} stroke={OL} strokeWidth={4} />
		<Floor color="#b9a07a" line="#9c845e" />
		<line x1={480} y1={0} x2={480} y2={420} stroke={OL} strokeWidth={5} />
		<path d="M 400 420 L 560 420 L 520 360 L 440 360 Z" fill={C.red} stroke={OL} strokeWidth={OW} />
		<circle cx={480} cy={430} r={300} fill="#ffe89a" opacity={0.16 + 0.02 * Math.sin(t * 8)} />
	</>
);
const S4: React.FC<{t: number}> = ({t}) => {
	const built = Math.min(5, Math.floor(clamp01((t - 0.3) / 5.6) * 5) + 1);
	return (
		<>
			<Cam z={1.03} cx={540} cy={1100}>
				<Kitchen t={t} />
				<Desk x={480} y={1080} w={760} />
				{Array.from({length: built}).map((_, i) => (
					<g key={i} transform={`translate(0 ${-(1 - pop(t, i * 1.1)) * 40})`}>
						<Tower x={190 + i * 140} y={1080} s={0.62} t={t} />
					</g>
				))}
				<Shnurok x={760} y={1360} s={0.85} face="determined" armL={[60 + Math.sin(t * 10) * 10, 40]} />
				<g transform={`translate(640 ${1010 + Math.sin(t * 10) * 6}) rotate(${-40 + Math.sin(t * 10) * 15})`}>
					<rect x={-8} y={-60} width={16} height={60} fill="#9aa6b2" stroke={OL} strokeWidth={4} />
					<rect x={-16} y={0} width={32} height={60} rx={8} fill={C.red} stroke={OL} strokeWidth={5} />
				</g>
				<Phone x={250} y={900} s={0.45}>
					<rect x={-94} y={-176} width={188} height={110} fill="#1d2b4f" />
					<path d="M -10 -140 L 14 -122 L -10 -104 Z" fill="#fff" />
					<text x={0} y={-20} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={26} fill={OL}>
						Как собрать ПК
					</text>
				</Phone>
			</Cam>
			<Hud t={1} rows={[['Собрано ПК', `${built} / 5`]]} />
		</>
	);
};

// 5 · 29.55–39.25 premises, dad signs
export const Basement: React.FC<{t: number; dim?: boolean}> = ({t, dim}) => (
	<>
		<rect width={1080} height={1920} fill="#cfc6b6" />
		{Array.from({length: 13}).map((_, r) =>
			Array.from({length: 6}).map((__, c) => (
				<rect key={`${r}-${c}`} x={c * 200 - (r % 2) * 100 + 4} y={r * 100 + 4} width={192} height={92} rx={8} fill="#d8cfbf" stroke="#bdb3a1" strokeWidth={4} />
			)),
		)}
		<rect x={380} y={170} width={320} height={110} fill="#9fd0e8" stroke={OL} strokeWidth={OW} />
		<line x1={540} y1={170} x2={540} y2={280} stroke={OL} strokeWidth={6} />
		<path d="M 860 300 q 30 60 -10 120 q 40 30 10 80" fill="none" stroke="#a89e8c" strokeWidth={6} />
		<Floor color="#a9a39a" line="#8f897f" />
		<Bulb x={540} y={420} t={t} dim={dim} />
		<g transform="translate(980 1240)">
			<rect x={-26} y={-90} width={52} height={90} rx={14} fill={C.red} stroke={OL} strokeWidth={OW} />
			<rect x={-12} y={-112} width={24} height={24} fill="#3a3f55" stroke={OL} strokeWidth={4} />
		</g>
	</>
);
const S5: React.FC<{t: number}> = ({t}) => {
	const sign = prog(t, 3.9, 0.6);
	return (
		<>
			<Cam z={1.02 + 0.04 * ease(t / 9.7)} cx={540} cy={1100}>
				<Basement t={t} />
				<Dad x={300} y={1370} s={0.95} face={t > 4.6 ? 'smile' : 'neutral'} armR={t > 3.9 && t < 6 ? [70, -60] : undefined} />
				<Shnurok x={760} y={1370} s={0.9} face="joy" armL={t > 5 ? [150, 20] : undefined} />
				<g transform={`translate(520 ${1120 - sign * 10}) rotate(-6)`} opacity={clamp01(t / 0.6)}>
					<rect x={-110} y={-140} width={220} height={280} fill="#fffaf0" stroke={OL} strokeWidth={OW} />
					<text x={0} y={-90} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={OL}>
						ДОГОВОР
					</text>
					{[0, 1, 2, 3].map((i) => (
						<line key={i} x1={-80} y1={-40 + i * 34} x2={80} y2={-40 + i * 34} stroke="#c9c4bd" strokeWidth={6} />
					))}
					<path d={`M -60 110 q 20 -30 40 0 q 20 30 40 -10 q 20 -30 40 0`} fill="none" stroke="#2b5bd7" strokeWidth={6} strokeDasharray={200} strokeDashoffset={200 * (1 - sign)} />
				</g>
			</Cam>
			<Hud t={t - 0.5} rows={[['Собрано ПК', '5 / 5'], ['Помещение', t > 4.6 ? 'есть' : '—', C.red], ['Платёж', 'через 7 дн.', C.red]]} />
		</>
	);
};

// 6 · 39.25–50.2 switching on
export const CLUB_X = [150, 330, 510, 690, 870];
export const Row: React.FC<{t: number; screens: Screen[]; ons: boolean[]; leds?: string[]}> = ({t, screens, ons, leds}) => (
	<>
		<Desk x={540} y={1080} w={1000} />
		{CLUB_X.map((x, i) => (
			<g key={i}>
				<Monitor x={x} y={1080} s={0.62} screen={screens[i]} t={t} />
				<Tower x={x} y={1290} s={0.55} on={ons[i]} led={leds?.[i]} t={t} />
			</g>
		))}
	</>
);
const S6: React.FC<{t: number}> = ({t}) => {
	// voice: «Первый» 41.68 → 2.43; «Второй» 43.08 → 3.83; «Третий» 44.92 → 5.67; «Четвёртый» 46.68 → 7.43; «Из пяти» 48.4 → 9.15
	const s: Screen[] = ['off', 'off', 'off', 'off', 'off'];
	const on = [false, false, false, false, false];
	if (t > 2.3) (s[0] = 'desktop'), (on[0] = true);
	if (t > 3.7) (s[1] = 'blue'), (on[1] = true);
	if (t > 5.5) s[2] = 'off';
	if (t > 7.3) (s[3] = 'black'), (on[3] = true);
	if (t > 9.0) (s[4] = 'desktop'), (on[4] = true);
	const work = (t > 2.3 ? 1 : 0) + (t > 9.0 ? 1 : 0);
	const beep = t > 7.3 && t < 9 && Math.floor(t * 4) % 2 === 0;
	return (
		<>
			<Cam z={1.02 + 0.03 * ease(t / 10)} cx={540} cy={1100}>
				<Basement t={t} />
				<Row t={t} screens={s} ons={on} leds={['#7dbb6a', '#7dbb6a', '#555a6e', C.red, '#7dbb6a']} />
				<Badge x={CLUB_X[0]} y={820} text="✓" t={t} at={2.4} color="#5f9e55" size={90} />
				<Badge x={CLUB_X[1]} y={820} text="✗" t={t} at={3.9} size={90} />
				<Badge x={CLUB_X[2]} y={820} text="✗" t={t} at={5.7} size={90} />
				{beep && <Badge x={CLUB_X[3]} y={820} text="БИП!" t={t} at={7.3} size={54} color={C.ochre} />}
				<Badge x={CLUB_X[3]} y={820} text={t > 9 ? '✗' : ''} t={t} at={9} size={90} />
				<Badge x={CLUB_X[4]} y={820} text="✓" t={t} at={9.1} color="#5f9e55" size={90} />
				<Shnurok x={540} y={1700} s={0.75} face={t > 3.8 ? 'shock' : 'smile'} handOnHead={t > 9.2} />
			</Cam>
			<Hud t={1} rows={[['Собрано ПК', '5 / 5'], ['Работают', `${work} / 5`, work < 5 ? C.red : '#5f9e55'], ['Платёж', 'через 7 дн.', C.red]]} />
		</>
	);
};

// 7 · 50.2–58.5 selling own GPU
const S7: React.FC<{t: number}> = ({t}) => {
	const out = ease((t - 5.6) / 1.0);
	const sold = t > 7.0;
	return (
		<>
			<Cam z={1.04} cx={540} cy={1000}>
				<HomeRoom t={t} />
				<Desk x={700} y={1060} w={400} />
				<Tower x={760} y={1060} s={0.85} open t={t} />
				<Shnurok x={360} y={1330} s={0.95} face={t > 3.4 ? 'sad' : 'think'} armR={[90 + out * 20, -20]} />
				{!sold && <GPU x={760 - out * 300} y={890 - out * 90} s={0.7} rot={-out * 10} t={0} />}
				{sold && (
					<Phone x={760} y={820} s={0.8}>
						<rect x={-94} y={-176} width={188} height={160} fill="#3a3f55" />
						<GPU x={0} y={-96} s={0.55} t={0} />
						<text x={0} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={26} fill={OL}>
							Видеокарта
						</text>
						<g transform={`scale(${pop(t, 7.1)})`}>
							<rect x={-80} y={70} width={160} height={60} rx={14} fill="#5f9e55" stroke={OL} strokeWidth={5} />
							<text x={0} y={112} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill="#fff">
								ПРОДАНО
							</text>
						</g>
					</Phone>
				)}
			</Cam>
			<Hud t={1} rows={[['Работают', '2 / 5', C.red], ['Деньги', sold ? 'есть ✓' : 'нет', sold ? '#5f9e55' : C.red], ['Мой ПК', sold ? 'без GPU' : 'целый']]} />
		</>
	);
};

// 8 · 58.5–68.2 renting PCs out
const S8: React.FC<{t: number}> = ({t}) => {
	const walk = clamp01(t / 3.4);
	const x = 120 + ease(walk) * 360;
	const ph = t * 7;
	const st = walk < 1 ? Math.sin(ph) * 16 : 0;
	const opened = t > 3.4;
	const delivered = t > 5.3;
	return (
		<>
			<Cam z={1.02 + 0.04 * ease(t / 9.7)} cx={540} cy={1100}>
				<Wall color="#e9d6c0" stripe="#e0cab0" />
				<Floor color="#b98a5e" line="#9c6f48" />
				{/* apartment door */}
				<g transform="translate(820 1300)">
					<rect x={-150} y={-560} width={300} height={560} fill="#9c6338" stroke={OL} strokeWidth={OW} />
					<rect x={-130} y={-540} width={260} height={540} fill={opened ? '#2a2e3d' : '#c98c55'} stroke={OL} strokeWidth={6} />
					{!opened && <circle cx={90} cy={-270} r={14} fill={C.ochre} stroke={OL} strokeWidth={5} />}
					<text x={0} y={-600} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={OL}>
						кв. 12
					</text>
				</g>
				{opened && <Kid k="a" x={830} y={1300} s={0.78} face={delivered ? 'joy' : 'smile'} armL={delivered ? [150, 20] : undefined} armR={delivered ? [150, 20] : undefined} />}
				<Shnurok x={x} y={1330 - (walk < 1 ? Math.abs(Math.cos(ph)) * 6 : 0)} s={0.8} legL={3 + st} legR={3 + st} armL={[40, -80]} armR={[40, -80]} face="smile" />
				{!delivered && <Tower x={x} y={1050} s={0.6} t={t} />}
				{delivered && <Tower x={680} y={1310} s={0.6} t={t} />}
				{delivered && (
					<g transform={`translate(${x + 20} ${960 - ease(t - 5.4) * 30}) scale(${pop(t, 5.4)})`}>
						<rect x={-60} y={-36} width={120} height={72} rx={8} fill="#f4efe4" stroke={OL} strokeWidth={5} />
						<path d="M -60 -36 L 0 6 L 60 -36" fill="none" stroke={OL} strokeWidth={5} />
						<text x={0} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={22} fill="#5f9e55">
							₽
						</text>
					</g>
				)}
			</Cam>
			<Hud t={1} rows={[['ПК в аренде', delivered ? '2' : '1'], ['Доход', 'каждую нед.', '#5f9e55'], ['Работают', '2 / 5', C.red]]} />
		</>
	);
};

// 9 · 68.2–73.6 repairs
const S9: React.FC<{t: number}> = ({t}) => {
	// «Новый блок питания» 68.32 → .1; «Переустановка» 69.52 → 1.3; «Ещё одна плата» 71.04 → 2.8; «Пять из пяти» 72.32 → 4.1
	const fixed = [true, t > 0.4, t > 1.6, t > 3.0, true];
	const s: Screen[] = fixed.map((f, i) => (f ? (i === 2 && t < 2.6 ? 'boot' : 'desktop') : 'off'));
	const work = fixed.filter(Boolean).length;
	return (
		<>
			<Cam z={1.03} cx={540} cy={1100}>
				<Basement t={t} />
				<Row t={t} screens={s} ons={fixed} />
				<Badge x={540} y={760} text="5 / 5" t={t} at={4.1} color="#5f9e55" size={110} />
				<Shnurok x={540} y={1700} s={0.75} face={t > 4.1 ? 'joy' : 'determined'} armL={t > 4.1 ? [150, 20] : undefined} armR={t > 4.1 ? [150, 20] : undefined} />
			</Cam>
			<Hud t={1} rows={[['Работают', `${work} / 5`, work === 5 ? '#5f9e55' : C.red]]} />
		</>
	);
};

// 10 · 73.6–81.9 opening
export const ClubInside: React.FC<{t: number; glow?: number}> = ({t, glow = 1}) => (
	<>
		<rect width={1080} height={1920} fill="#2a2e45" />
		{Array.from({length: 13}).map((_, r) =>
			Array.from({length: 6}).map((__, c) => (
				<rect key={`${r}-${c}`} x={c * 200 - (r % 2) * 100 + 4} y={r * 100 + 4} width={192} height={92} rx={8} fill="#323754" stroke="#3b4163" strokeWidth={4} />
			)),
		)}
		<g opacity={glow}>
			<rect x={240} y={260} width={600} height={140} rx={24} fill="#1d2b4f" stroke={OL} strokeWidth={OW} />
			<text x={540} y={355} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={76} fill={C.ochre} stroke={OL} strokeWidth={4} paintOrder="stroke">
				ШНУРОК·КЛУБ
			</text>
			{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
				<circle key={i} cx={260 + i * 80} cy={430} r={10} fill={[C.red, C.ochre, '#6fb4d0', '#7dbb6a'][i % 4]} opacity={0.5 + 0.5 * Math.sin(t * 5 + i)} />
			))}
		</g>
		<Floor color="#5a4a52" line="#4a3c44" />
	</>
);
const S10: React.FC<{t: number}> = ({t}) => {
	// «Сначала пришли друзья» 76.16 → 2.56; «Потом друзья друзей» 77.68 → 4.08; «те, кого я не знал» 79.35 → 5.75
	const seat = (k: KidKey, at: number, x: number) => t > at && (
		<g transform={`translate(0 ${(1 - pop(t, at)) * 60})`} opacity={clamp01((t - at) / 0.3)}>
			<Kid k={k} x={x} y={1560} s={0.62} face="joy" />
		</g>
	);
	return (
		<>
			<Cam z={1.02 + 0.04 * ease(t / 8)} cx={540} cy={1100}>
				<ClubInside t={t} glow={prog(t, 0.1, 0.4)} />
				<Row t={t} screens={['game', 'game', 'game', 'game', 'game']} ons={[true, true, true, true, true]} />
				{seat('a', 2.6, 150)}
				{seat('b', 2.9, 330)}
				{seat('c', 4.1, 510)}
				{seat('d', 4.4, 690)}
				{seat('e', 5.8, 870)}
				{t > 6.2 && <Kid k="c" x={980} y={1800} s={0.55} face="smile" />}
				{t > 6.5 && <Kid k="b" x={80} y={1800} s={0.55} face="smile" />}
			</Cam>
			<Hud t={1} rows={[['Работают', '5 / 5', '#5f9e55'], ['Гостей', `${t > 5.8 ? 20 : t > 4.1 ? 9 : t > 2.6 ? 4 : 0}`, '#5f9e55']]} />
		</>
	);
};

// 11 · 81.9–91.8 competitor
const S11: React.FC<{t: number}> = ({t}) => {
	const neon = prog(t, 0.4, 0.6) * (0.85 + 0.15 * Math.sin(t * 12));
	const leaving = clamp01((t - 5.6) / 3.6);
	const guests = Math.round(20 - leaving * 17);
	return (
		<>
			<Cam z={1.0 + 0.05 * ease(t / 9.6)} cx={540} cy={1000}>
				<rect width={1080} height={1920} fill="#1d2b4f" />
				{Array.from({length: 24}).map((_, i) => (
					<circle key={i} cx={hash(i) * 1080} cy={hash(i + 5) * 500} r={3} fill="#fff6c8" opacity={0.5 + 0.5 * Math.sin(t * 2 + i)} />
				))}
				{/* our small club */}
				<rect x={20} y={900} width={380} height={520} fill="#7a6a5a" stroke={OL} strokeWidth={OW} />
				<rect x={60} y={1260} width={300} height={130} fill="#ffe08a" stroke={OL} strokeWidth={6} opacity={0.5 + 0.5 * (1 - leaving)} />
				<rect x={50} y={1180} width={320} height={60} rx={10} fill="#1d2b4f" stroke={OL} strokeWidth={6} />
				<text x={210} y={1222} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.ochre}>
					ШНУРОК·КЛУБ
				</text>
				{/* big network club */}
				<rect x={500} y={520} width={560} height={900} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
				{Array.from({length: 4}).map((_, r) =>
					Array.from({length: 3}).map((__, c) => <rect key={`${r}${c}`} x={540 + c * 170} y={760 + r * 140} width={140} height={100} fill="#6fb4d0" stroke={OL} strokeWidth={5} opacity={0.6 + 0.4 * neon} />),
				)}
				<g opacity={neon}>
					<rect x={520} y={560} width={520} height={150} rx={20} fill="#14161f" stroke="#ff4fd8" strokeWidth={10} />
					<text x={780} y={660} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={68} fill="#ff4fd8">
						КИБЕР·АРЕНА
					</text>
				</g>
				<g transform={`translate(800 470) rotate(-6) scale(${pop(t, 3.2)})`}>
					<rect x={-150} y={-50} width={300} height={90} rx={14} fill="#7dbb6a" stroke={OL} strokeWidth={OW} />
					<text x={0} y={18} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill="#fff">
						ДЕШЕВЛЕ!
					</text>
				</g>
				<rect x={0} y={1420} width={1080} height={500} fill="#4a4f5c" stroke={OL} strokeWidth={OW} />
				{[0, 1, 2, 3].map((i) => (
					<rect key={i} x={i * 300 + 40} y={1660} width={160} height={20} fill="#f4efe4" />
				))}
				{(['a', 'b', 'c', 'd', 'e'] as KidKey[]).map((k, i) => {
					const kk = clamp01(leaving * 1.4 - i * 0.12);
					const ph = t * 7 + i;
					const st = kk > 0 && kk < 1 ? Math.sin(ph) * 14 : 0;
					return <Kid key={k} k={k} x={200 + i * 40 + kk * (560 - i * 20)} y={1600 + (i % 2) * 40} s={0.5} face="smile" legL={3 + st} legR={3 + st} />;
				})}
				<Shnurok x={210} y={1540} s={0.55} face={t > 5.6 ? 'shock' : 'neutral'} handOnHead={t > 7} />
			</Cam>
			<Hud t={1} rows={[['Гостей', `${guests}`, guests < 10 ? C.red : '#5f9e55'], ['Конкурент', 'напротив', C.red]]} />
		</>
	);
};

// 12 · 91.8–102.6 the choice
const S12: React.FC<{t: number}> = ({t}) => {
	// «Первый» 93.77 → 1.97; «Второй» 97.7 → 5.9
	const l = ease((t - 1.7) / 0.5);
	const r = ease((t - 5.6) / 0.5);
	return (
		<>
			<rect width={1080} height={1920} fill="#efe0c2" />
			<g opacity={l} transform={`translate(${(1 - l) * -80} 0)`}>
				<rect x={20} y={200} width={510} height={1500} rx={30} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
				<text x={275} y={400} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={180} fill={C.red} stroke={OL} strokeWidth={8} paintOrder="stroke">
					1
				</text>
				<Dad x={200} y={1000} s={0.62} face="think" />
				<Box x={400} y={1000} w={150} h={110} label="GPU" />
				<Box x={400} y={890} w={150} h={110} label="GPU" />
				<GPU x={300} y={1090} s={0.6} t={t} />
				<text x={275} y={1220} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill={OL}>
					занять у папы
				</text>
				<text x={275} y={1270} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill={OL}>
					и обновить ПК
				</text>
			</g>
			<g opacity={r} transform={`translate(${(1 - r) * 80} 0)`}>
				<rect x={550} y={200} width={510} height={1500} rx={30} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
				<text x={805} y={400} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={180} fill="#2b5bd7" stroke={OL} strokeWidth={8} paintOrder="stroke">
					2
				</text>
				{/* bracket */}
				<g stroke={OL} strokeWidth={6} fill="none">
					<path d="M 620 520 h 60 v 80 h 60 M 620 680 h 60 v -80 M 620 760 h 60 v 80 h 60 M 620 920 h 60 v -80 M 740 600 v 120 h 50 M 740 840 v -120" />
				</g>
				<g transform={`translate(910 720) scale(${0.9 + 0.05 * Math.sin(t * 4)})`}>
					<path d="M -60 -80 L 60 -80 Q 60 10 0 30 Q -60 10 -60 -80 Z" fill={C.ochre} stroke={OL} strokeWidth={OW} />
					<path d="M -60 -60 Q -100 -60 -90 -20 Q -80 10 -50 0 M 60 -60 Q 100 -60 90 -20 Q 80 10 50 0" fill="none" stroke={OL} strokeWidth={8} />
					<rect x={-14} y={30} width={28} height={40} fill={C.ochre} stroke={OL} strokeWidth={6} />
					<rect x={-50} y={70} width={100} height={26} rx={6} fill={C.woodDark} stroke={OL} strokeWidth={6} />
				</g>
				{([['a', 650], ['c', 805], ['e', 960]] as [KidKey, number][]).map(([k, x]) => (
					<Char key={k} {...KID[k]} jacket={C.ochre} x={x} y={1150} s={0.42} headS={0.82} headDrop={18} face="joy" armR={[150, 20]} />
				))}
				<text x={805} y={1220} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill={OL}>
					клуб турниров
				</text>
				<text x={805} y={1270} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill={OL}>
					своя команда
				</text>
			</g>
		</>
	);
};

// 13 · 102.6–112 viewer
const S13: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.05 + 0.05 * ease(t / 9)} cx={540} cy={900}>
			<ClubInside t={t} />
			<Row t={t} screens={['game', 'off', 'game', 'off', 'off']} ons={[true, false, true, false, false]} />
			<Shnurok x={540} y={1700} s={1.0} thinking />
			<QMark x={250} y={780} t={t} s={0.75} text="1?" />
			<QMark x={830} y={780} t={t + 1} s={0.75} text="2?" />
		</Cam>
	</>
);

// ------------------------------------------------------------------ assembly
const SCENES: {from: number; to: number; C: React.FC<{t: number}>}[] = [
	{from: 0, to: 7.3, C: S1},
	{from: 7.3, to: 13.8, C: S2},
	{from: 13.8, to: 23.05, C: S3},
	{from: 23.05, to: 29.55, C: S4},
	{from: 29.55, to: 39.25, C: S5},
	{from: 39.25, to: 50.2, C: S6},
	{from: 50.2, to: 58.5, C: S7},
	{from: 58.5, to: 68.2, C: S8},
	{from: 68.2, to: 73.6, C: S9},
	{from: 73.6, to: 81.9, C: S10},
	{from: 81.9, to: 91.8, C: S11},
	{from: 91.8, to: 102.6, C: S12},
	{from: 102.6, to: PCCLUB_DURATION, C: S13},
];
const FADE = 0.25;

const Layer: React.FC<{lead: number; C: React.FC<{t: number}>}> = ({lead, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
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

export const PcClub: React.FC<{audio?: string}> = ({audio = 'shnurok/ep01-mix.wav'}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [PCCLUB_DURATION - 0.6, PCCLUB_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let idx = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) idx = i;
	});
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			{SCENES.map((s, i) => {
				const start = Math.max(0, Math.round((s.from - (i ? FADE : 0)) * FPS));
				const end = Math.round(s.to * FPS);
				return (
					<Sequence key={i} from={start} durationInFrames={end - start}>
						<Layer lead={s.from - start / FPS} C={s.C} />
					</Sequence>
				);
			})}
			{idx >= 0 && <KaraokeLine key={idx} words={CAPTIONS[idx]} t={t} />}
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			<Audio src={staticFile(audio)} />
		</AbsoluteFill>
	);
};
