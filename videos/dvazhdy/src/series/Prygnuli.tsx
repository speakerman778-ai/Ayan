import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {OL, OW} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import {Odometer, Pill, Title} from './FlatStyleDemo';
import rawWords from '../../public/shnurok/ep04-words.json';

// «Что если бы все люди на Земле прыгнули одновременно?» — подача «что если»: табло, таблички, облако мыслей, герои боком.

const FPS = 30;
const O = OL;
const W = OW;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));

const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();
export const PRYG_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 60) + 2.2);
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
const norm = (s: string) => s.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && norm(x.text) === w);
const T = (w: string, from = 0) => {
	const i = idx(w, from);
	return i >= 0 ? WORDS[i].start : 0;
};
const S = (i: number) => Math.max(0, (WORDS[Math.max(0, i)]?.start ?? 0) - 0.2);
const iJump = idx('прыжок', idx('один'));
const B = [0, S(idx('допустим')), S(idx('три')), S(iJump), S(idx('шнурок', iJump)), S(idx('поэтому')), S(idx('землетрясения')), S(idx('шнурок', idx('землетрясения')) - 1), S(idx('какой'))];

// ------------------------------------------------------------------ shared pieces
const COLS = ['#5b86c4', '#d9483b', '#7fae6a', '#9b6fb0', '#e8a93a', '#4a4f5c', '#c98c55', '#6fb4d0'];
const StreetBg: React.FC<{t?: number}> = ({t = 0}) => {
	const light = Math.floor(t / 3) % 3; // traffic light cycles
	return (
		<>
			<rect width={1080} height={1920} fill="#9fd0e8" />
			{[0, 1, 2].map((i) => (
				<path key={i} transform={`translate(${((i * 420 + t * (14 + i * 6)) % 1500) - 250} ${20 + i * 14})`} d="M 0 30 q -10 -26 20 -30 q 10 -24 40 -14 q 30 -14 44 14 q 26 4 16 30 Z" fill="#fffaf0" stroke={O} strokeWidth={5} />
			))}
			{[0, 1, 2].map((b) => (
				<g key={b}>
					<rect x={b * 380 - 30} y={60} width={360} height={1000} fill={['#d9c19a', '#c9a878', '#e0caa4'][b]} stroke={O} strokeWidth={W} />
					<rect x={b * 380 - 40} y={50} width={380} height={26} fill="#9c6338" stroke={O} strokeWidth={W} />
					{Array.from({length: 4}).map((_, r) =>
						[0, 1].map((c) => {
							const k = b * 8 + r * 2 + c;
							const lit = hash(k + Math.floor(t / 2.5)) > 0.8;
							return (
								<g key={`${r}${c}`}>
									<rect x={b * 380 + 20 + c * 160} y={110 + r * 200} width={110} height={130} fill={lit ? '#ffe9a6' : '#9fb3c8'} stroke={O} strokeWidth={W} />
									<line x1={b * 380 + 75 + c * 160} y1={110 + r * 200} x2={b * 380 + 75 + c * 160} y2={240 + r * 200} stroke={O} strokeWidth={4} />
									<rect x={b * 380 + 12 + c * 160} y={238 + r * 200} width={126} height={14} fill="#f4f1ea" stroke={O} strokeWidth={4} />
									{hash(k + 9) > 0.6 && (
										<g transform={`translate(${b * 380 + 75 + c * 160} ${236 + r * 200})`}>
											<rect x={-26} y={-18} width={52} height={20} fill="#d9483b" stroke={O} strokeWidth={3} />
											{[-14, 0, 14].map((fx) => (
												<circle key={fx} cx={fx} cy={-26 + Math.sin(t * 2 + fx) * 2} r={8} fill={['#f5c542', '#f29b8a', '#fffaf0'][(k + fx) % 3 === 0 ? 0 : 1]} stroke={O} strokeWidth={3} />
											))}
										</g>
									)}
								</g>
							);
						}),
					)}
					{/* shop awning */}
					<g transform={`translate(${b * 380 - 20} 900)`}>
						{Array.from({length: 7}).map((_, i) => (
							<path key={i} d={`M ${i * 50} 0 L ${i * 50 + 50} 0 L ${i * 50 + 50} 50 Q ${i * 50 + 25} 66 ${i * 50} 50 Z`} fill={i % 2 ? '#fffaf0' : ['#d9483b', '#5b86c4', '#7fae6a'][b]} stroke={O} strokeWidth={4} />
						))}
					</g>
				</g>
			))}
			{/* birds */}
			{[0, 1, 2].map((i) => {
				const x = ((t * (60 + i * 15) + i * 300) % 1300) - 100;
				const f = Math.sin(t * 9 + i) * 10;
				return <path key={i} transform={`translate(${x} ${330 + i * 60 + Math.sin(t + i) * 20})`} d={`M -24 ${f} Q -12 -12 0 0 Q 12 -12 24 ${f}`} stroke={O} strokeWidth={5} fill="none" strokeLinecap="round" />;
			})}
			<rect x={0} y={1060} width={1080} height={300} fill="#8f8f95" stroke={O} strokeWidth={W} />
			{Array.from({length: 7}).map((_, i) => (
				<rect key={i} x={i * 160 + 20} y={1120} width={100} height={200} fill="#f4f1ea" />
			))}
			<rect x={0} y={1360} width={1080} height={560} fill="#d9d4c8" stroke={O} strokeWidth={W} />
			{Array.from({length: 8}).map((_, i) => (
				<line key={i} x1={i * 150} y1={1360} x2={i * 150 - 80} y2={1920} stroke="#c6c0b2" strokeWidth={4} />
			))}
			{/* street lamp */}
			<rect x={52} y={700} width={14} height={660} fill="#3a3f55" stroke={O} strokeWidth={3} />
			<path d="M 30 700 L 88 700 L 76 660 L 42 660 Z" fill="#3a3f55" stroke={O} strokeWidth={4} />
			<circle cx={59} cy={706} r={12} fill="#ffe08a" />
			{/* traffic light */}
			<rect x={950} y={720} width={14} height={640} fill="#3a3f55" />
			<rect x={915} y={600} width={84} height={220} rx={16} fill="#3a3f55" stroke={O} strokeWidth={W} />
			{['#d9483b', '#e8a93a', '#5f9e55'].map((c, i) => (
				<circle key={c} cx={957} cy={640 + i * 68} r={24} fill={c} opacity={i === light ? 1 : 0.3} stroke={O} strokeWidth={3} />
			))}
			{/* pigeons pecking in front */}
			{[[160, 1880], [900, 1890]].map(([px, py], i) => {
				const peck = Math.max(0, Math.sin(t * 5 + i * 2)) * 10;
				return (
					<g key={i} transform={`translate(${px + Math.sin(t * 0.7 + i) * 20} ${py})`}>
						<ellipse cx={0} cy={-20} rx={30} ry={20} fill="#9aa6b2" stroke={O} strokeWidth={4} />
						<circle cx={26} cy={-34 + peck} r={13} fill="#9aa6b2" stroke={O} strokeWidth={4} />
						<path d={`M 38 ${-34 + peck} l 10 4 l -10 4 Z`} fill="#e8a93a" />
						<circle cx={30} cy={-37 + peck} r={2.5} fill={O} />
					</g>
				);
			})}
		</>
	);
};

/** Crowd; lift = jump height per person (0..1), crouch = 0..1, lookAt = x everyone turns to. */
const Crowd: React.FC<{t: number; lift?: (k: number) => number; crouch?: number; lookAt?: number; skip?: number}> = ({t, lift = () => 0, crouch = 0, lookAt, skip = -1}) => (
	<>
		{[0, 1, 2].map((row) =>
			Array.from({length: 7}).map((_, i) => {
				const k = row * 7 + i;
				if (k === skip) return null;
				const x = 60 + i * 150 + (row % 2) * 70 + Math.sin(t * 2 + k) * 4;
				const dir = lookAt !== undefined ? (lookAt > x ? 1 : -1) : hash(k) > 0.5 ? 1 : -1;
				return (
					<SideChar
						key={k}
						x={x}
						y={1180 + row * 150 + crouch * 18 - lift(k) * 220}
						s={0.5 + row * 0.08}
						dir={dir as 1 | -1}
						face={lift(k) > 0.2 ? 'joy' : hash(k + 3) > 0.6 ? 'shock' : 'neutral'}
						jacket={COLS[k % COLS.length]}
						pants={['#3a3f55', '#4a4f5c', '#6d5a4a'][k % 3]}
						hair={(['short', 'curly', 'short', 'bun'] as const)[k % 4]}
						hairColor={['#2b211d', '#7a4a2a', '#c98c55', '#e8c070'][k % 4]}
						phase={k * 0.37}
						armFront={lift(k) > 0.2 ? [125, 40] : undefined}
					/>
				);
			}),
		)}
	</>
);

const Earth: React.FC<{x: number; y: number; r: number; t: number; crack?: number}> = ({x, y, r, t, crack = 0}) => (
	<g transform={`translate(${x} ${y}) rotate(${t * 6})`}>
		<circle r={r} fill="#5b86c4" stroke={O} strokeWidth={W} />
		<path d={`M ${-r * 0.6} ${-r * 0.3} q ${r * 0.3} ${-r * 0.4} ${r * 0.6} ${-r * 0.1} q ${r * 0.1} ${r * 0.4} ${-r * 0.2} ${r * 0.5} q ${-r * 0.4} ${r * 0.1} ${-r * 0.4} ${-r * 0.4} Z`} fill="#7fae6a" stroke={O} strokeWidth={5} />
		<path d={`M ${r * 0.2} ${r * 0.2} q ${r * 0.4} ${-r * 0.1} ${r * 0.5} ${r * 0.3} q ${-r * 0.2} ${r * 0.4} ${-r * 0.5} ${r * 0.1} Z`} fill="#7fae6a" stroke={O} strokeWidth={5} />
		{crack > 0 && <path d={`M ${-r * 0.1} ${-r} L 0 ${-r * 0.5} L ${-r * 0.2} ${-r * 0.2} L ${r * 0.1} ${r * 0.2} L ${-r * 0.05} ${r * 0.6}`} stroke={O} strokeWidth={10} fill="none" opacity={crack} />}
		<circle r={r} fill="none" stroke="#fff" strokeWidth={6} opacity={0.15 + 0.05 * Math.sin(t * 3)} />
	</g>
);

const Big: React.FC<{text: string; t: number; at: number; y?: number; size?: number; color?: string}> = ({text, t, at, y = 820, size = 300, color = '#f5c542'}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.3)})`}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={O} strokeWidth={18} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);

// ------------------------------------------------------------------ scenes (t = local)
const S1: React.FC<{t: number}> = ({t}) => (
	<>
		<StreetBg t={t} />
		<Crowd t={t} />
		<Shnurok x={540} y={1800} s={0.8} face="shock" />
		<Odometer t={t} to={8000000000} x={540} y={250} />
		<Title lines={['ЧТО ЕСЛИ БЫ', 'ВСЕ ЛЮДИ', 'ПРЫГНУЛИ?']} t={t - 0.2} />
	</>
);

const S2: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#a9bfd6" />
		{Array.from({length: 14}).map((_, i) => (
			<rect key={i} x={i * 80} y={0} width={26} height={1300} fill="#b6cadf" />
		))}
		<rect x={560} y={360} width={420} height={560} fill="#f5c542" stroke={O} strokeWidth={W} />
		<rect x={600} y={400} width={340} height={480} fill="#bfe3f0" stroke={O} strokeWidth={W} />
		<line x1={770} y1={400} x2={770} y2={880} stroke="#f5c542" strokeWidth={14} />
		<circle cx={880} cy={480} r={40} fill="#ffe08a" stroke={O} strokeWidth={5} />
		<rect x={0} y={1300} width={1080} height={620} fill="#b98a5e" stroke={O} strokeWidth={W} />
		<ShnurokSide x={430} y={1560} s={0.9} face="shock" armFront={[110, -30]} />
		<g transform={`translate(640 1000) rotate(-8) scale(${back((t - 0.6) / 0.4)})`}>
			<rect x={-110} y={-190} width={220} height={380} rx={26} fill="#2a2e3d" stroke={O} strokeWidth={W} />
			<rect x={-94} y={-166} width={188} height={330} rx={12} fill="#fffaf0" />
			<rect x={-94} y={-166} width={188} height={60} fill="#d9483b" />
			<text textAnchor="middle" y={-124} fontFamily="Inter" fontWeight={900} fontSize={26} fill="#fff">НОВОСТИ</text>
			<text textAnchor="middle" y={-40} fontFamily="Inter" fontWeight={900} fontSize={25} fill={O}>ВСЕ ПРЫГАЮТ</text>
			<text textAnchor="middle" y={10} fontFamily="Inter" fontWeight={900} fontSize={44} fill="#d9483b">В 12:00</text>
		</g>
		<Pill text="СУББОТА · 12:00" t={t - 0.2} />
	</>
);

const S3: React.FC<{t: number}> = ({t}) => {
	const A = B[2];
	const n3 = T('три') - A;
	const n2 = T('два') - A;
	const n1 = T('один') - A;
	return (
		<>
			<StreetBg t={t} />
			<Crowd t={t} crouch={ease((t - n1) / 0.4)} />
			<ShnurokSide x={540} y={1800 + ease((t - n1) / 0.4) * 20} s={0.8} face="think" />
			{t < n2 && <Big text="3" t={t} at={n3} />}
			{t >= n2 && t < n1 && <Big text="2" t={t} at={n2} color="#e8a93a" />}
			{t >= n1 && <Big text="1" t={t} at={n1} color="#d9483b" />}
		</>
	);
};

const S4: React.FC<{t: number}> = ({t}) => {
	// anticipation → takeoff → slow-motion hang in the air
	const air = (k: number) => {
		const tau = t - hash(k) * 0.18;
		if (tau < 0.15) return 0;
		return ease((tau - 0.15) / 0.55) * (1 + Math.sin(t * 2.2 + k) * 0.04);
	};
	const crouch = t < 0.2 ? Math.sin((t / 0.2) * Math.PI) : 0;
	return (
		<>
			<StreetBg t={t} />
			{t > 0.15 && t < 1 && Array.from({length: 14}).map((_, i) => <line key={i} x1={60 + i * 75} y1={1300} x2={60 + i * 75} y2={1300 + 120 * (1 - (t - 0.15) / 0.85)} stroke="#fffaf0" strokeWidth={6} strokeLinecap="round" opacity={0.7} />)}
			<Crowd t={t} lift={air} crouch={crouch} />
			<g transform={`translate(0 ${-air(99) * 260})`}>
				<ShnurokSide x={540} y={1800} s={0.8} face="joy" armFront={[125, 40]} />
			</g>
			<Odometer t={t - 1.2} to={500000000} x={540} y={250} />
			<Pill text="≈ полмиллиарда тонн" t={t - 1.4} y={380} />
		</>
	);
};

const S5: React.FC<{t: number}> = ({t}) => {
	const A = B[4];
	const heavy = T('тяжелее') - A;
	const k = back((t - 0.2) / 0.5);
	if (t < heavy - 0.2)
		return (
			<>
				<rect width={1080} height={1920} fill="#9fd0e8" />
				<ShnurokSide x={300} y={1500 + Math.sin(t * 3) * 10} s={0.9} face="think" />
				{[0.3, 0.55].map((p, i) => (
					<circle key={i} cx={380 + p * 80} cy={760 - p * 160} r={16 + i * 10} fill="#fff" stroke={O} strokeWidth={W} opacity={k} />
				))}
				<g transform={`translate(600 420) scale(${k})`}>
					<path d="M -320 60 C -380 0 -340 -130 -230 -130 C -210 -210 -60 -220 -20 -160 C 40 -230 200 -210 220 -130 C 340 -140 370 20 290 70 C 310 170 160 200 100 150 C 40 210 -120 210 -150 140 C -270 180 -350 130 -320 60 Z" fill="#fffaf0" stroke={O} strokeWidth={W} />
					<Earth x={0} y={-10} r={130} t={t} crack={clamp01((t - 0.8) / 0.5)} />
					<text x={0} y={-150} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill="#d9483b" opacity={clamp01(t - 1)}>
						БАБАХ?!
					</text>
				</g>
				<Pill text="землетрясение?" t={t - 0.4} y={140} />
			</>
		);
	const s = t - heavy + 0.2;
	return (
		<>
			<rect width={1080} height={1920} fill="#f4ecd8" />
			{/* balance */}
			<rect x={530} y={700} width={20} height={700} fill="#9c6338" stroke={O} strokeWidth={W} />
			<g transform={`rotate(${-12 * ease(s / 0.8)} 540 700)`}>
				<rect x={120} y={690} width={840} height={24} rx={10} fill="#c98c55" stroke={O} strokeWidth={W} />
				<path d="M 160 714 L 120 900 L 400 900 L 360 714" fill="none" stroke={O} strokeWidth={5} />
				<rect x={110} y={900} width={300} height={20} fill="#c98c55" stroke={O} strokeWidth={W} />
				<path d="M 720 714 L 680 900 L 960 900 L 920 714" fill="none" stroke={O} strokeWidth={5} />
				<rect x={670} y={900} width={300} height={20} fill="#c98c55" stroke={O} strokeWidth={W} />
				{Array.from({length: 6}).map((_, i) => (
					<circle key={i} cx={180 + (i % 3) * 70} cy={880 - Math.floor(i / 3) * 40} r={22} fill={COLS[i]} stroke={O} strokeWidth={4} />
				))}
			</g>
			<g transform={`translate(0 ${ease(s / 0.8) * 120})`}>
				<Earth x={820} y={760} r={150} t={t} />
			</g>
			<rect x={380} y={1400} width={320} height={40} rx={12} fill="#9c6338" stroke={O} strokeWidth={W} />
			<Pill text="тяжелее в 10 трлн раз" t={s - 0.3} y={260} />
		</>
	);
};

const S6: React.FC<{t: number}> = ({t}) => {
	const z = 1 + 2 * ease((t - 0.6) / 1.4);
	return (
		<>
			<rect width={1080} height={1920} fill="#1d2b4f" />
			{Array.from({length: 40}).map((_, i) => (
				<circle key={i} cx={hash(i) * 1080} cy={hash(i + 4) * 1920} r={3} fill="#fff6c8" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
			))}
			<g transform={`translate(540 900) scale(${z}) translate(-540 -900)`}>
				<Earth x={540} y={900} r={300} t={t} />
			</g>
			{/* magnifier */}
			<g transform={`translate(${700 - ease(t / 1) * 100} ${1250 - ease(t / 1) * 150}) rotate(-30)`}>
				<circle r={160} fill="#bfe3f0" opacity={0.4} stroke={O} strokeWidth={14} />
				<rect x={-20} y={160} width={40} height={220} rx={14} fill="#9c6338" stroke={O} strokeWidth={W} />
			</g>
			<Pill text="сдвиг меньше одного атома" t={t - 1.2} y={260} />
		</>
	);
};

const S7: React.FC<{t: number}> = ({t}) => {
	const land = (k: number) => 1 - ease((t - hash(k) * 0.1) / 0.4);
	const sh = t > 0.38 && t < 0.9 ? (1 - (t - 0.38) / 0.52) * 14 : 0;
	return (
		<g transform={`translate(${Math.sin(t * 70) * sh} ${Math.cos(t * 55) * sh})`}>
			<StreetBg t={t} />
			<Crowd t={t} lift={land} crouch={t > 0.4 && t < 0.8 ? 1 : 0} />
			<ShnurokSide x={540} y={1800} s={0.8} face="joy" />
			{t > 0.4 &&
				[[200, 1250], [520, 1350], [820, 1260]].map(([x, y], i) => (
					<g key={i} transform={`translate(${x} ${y}) scale(${back((t - 0.4 - i * 0.08) / 0.3)})`}>
						<path d="M -90 20 Q -110 -30 -60 -40 Q -50 -90 0 -80 Q 40 -100 70 -60 Q 120 -50 100 0 Q 110 40 60 40 L -60 40 Q -100 40 -90 20 Z" fill="#fffaf0" stroke={O} strokeWidth={W} />
						<text textAnchor="middle" y={14} fontFamily="Inter" fontWeight={900} fontSize={50} fill="#d9483b">БУМ!</text>
					</g>
				))}
			{[0, 1, 2, 3].map((i) => (
				<path key={i} transform={`translate(${200 + i * 200 + t * 120} ${500 - t * 160 - i * 30})`} d={`M -30 ${Math.sin(t * 12 + i) * 10} Q -15 -15 0 0 Q 15 -15 30 ${Math.sin(t * 12 + i) * 10}`} stroke={O} strokeWidth={7} fill="none" strokeLinecap="round" />
			))}
			{t > 0.38 &&
				Array.from({length: 12}).map((_, i) => {
					const k = clamp01((t - 0.38) / 1.2);
					return <circle key={i} cx={80 + i * 85 + (i % 2 ? 1 : -1) * k * 40} cy={1500 - k * 60 + (i % 3) * 140} r={18 + k * 30} fill="#e6dfd0" opacity={0.8 * (1 - k)} />;
				})}
		</g>
	);
};

const S8: React.FC<{t: number}> = ({t}) => (
	<>
		<StreetBg t={t} />
		<Crowd t={t} lookAt={540} />
		<g transform={`translate(0 ${-ease((t - 0.4) / 0.6) * 320 + Math.sin(t * 3) * 8})`}>
			<ShnurokSide x={540} y={1800} s={0.8} face="joy" armFront={[125, 40]} />
		</g>
		<Pill text="на секунду позже" t={t - 0.3} />
	</>
);

const S9: React.FC<{t: number}> = ({t}) => (
	<>
		<StreetBg t={t} />
		<rect width={1080} height={1920} fill="#fffaf0" opacity={0.35} />
		<Shnurok x={540} y={1750} s={1.0} thinking />
		<Big text="?" t={t} at={0.3} y={760} size={320} />
	</>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9];

const FADE = 0.3;
const Layer: React.FC<{lead: number; dur: number; first: boolean; C: React.FC<{t: number}>}> = ({lead, dur, first, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
	const a = first ? 1 : clamp01((t + lead) / FADE);
	const z = 1.0 + 0.06 * ease(t / Math.max(1, dur)); // slow push-in on every shot
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: a}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<g transform={`translate(540 1000) scale(${z}) translate(-540 -1000)`}>
						<Scene t={t} />
					</g>
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const Prygnuli: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [PRYG_DURATION - 0.6, PRYG_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((Sc, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : PRYG_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round(to * FPS) - start)}>
						<Layer lead={from - start / FPS} dur={to - from} first={i === 0} C={Sc} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} />}
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #0008'}}>Вселенная Шнурка</div>
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
