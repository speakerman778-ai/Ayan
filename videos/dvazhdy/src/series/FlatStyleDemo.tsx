import React from 'react';
import {AbsoluteFill, Easing, Sequence, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, OL, OW} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {Shnurok} from './Shnurok';

// Style demo: the «flat what-if» look — title + odometer, crowd street, time pill,
// push-in close-up, sound lines, thought bubble with a mini scene, side walk, object arc.

const O = OL;
const W = OW;
void C;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));

export const Pill: React.FC<{text: string; t: number; y?: number}> = ({text, t, y = 250}) => {
	const k = back(t / 0.35);
	const w = text.length * 30 + 80;
	return (
		<g transform={`translate(540 ${y}) scale(${k})`}>
			<rect x={-w / 2} y={-46} width={w} height={92} rx={46} fill="#f5c542" stroke={O} strokeWidth={6} />
			<text textAnchor="middle" y={18} fontFamily="Inter" fontWeight={900} fontSize={50} fill={O}>
				{text}
			</text>
		</g>
	);
};

export const Odometer: React.FC<{t: number; to: number; x: number; y: number}> = ({t, to, x, y}) => {
	const v = Math.floor(to * ease(t / 2.4));
	const s = v.toString().padStart(to.toString().length, '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect x={-300} y={-56} width={600} height={100} rx={14} fill="#3a2a22" stroke={O} strokeWidth={6} />
			<text textAnchor="middle" y={24} fontFamily="Inter" fontWeight={900} fontSize={64} fill="#fff3d0" letterSpacing={4}>
				{s}
			</text>
		</g>
	);
};

export const Title: React.FC<{lines: [string, string, string]; t: number}> = ({lines, t}) => (
	<g>
		{lines.map((l, i) => (
			<text
				key={i}
				x={540}
				y={470 + i * 110}
				textAnchor="middle"
				fontFamily="Inter"
				fontWeight={900}
				fontSize={i === 2 ? 104 : 86}
				fill={i === 2 ? '#f5c542' : '#fff'}
				stroke={O}
				strokeWidth={16}
				paintOrder="stroke"
				strokeLinejoin="round"
				opacity={clamp01((t - i * 0.15) / 0.3)}
			>
				{l}
			</text>
		))}
	</g>
);

// ------------------------------------------------------------------ shots
const Street: React.FC<{t: number}> = ({t}) => {
	const cols = ['#5b86c4', '#d9483b', '#7fae6a', '#9b6fb0', '#e8a93a', '#4a4f5c', '#c98c55', '#6fb4d0'];
	return (
		<>
			<rect width={1080} height={1920} fill="#c9b08a" />
			{[0, 1, 2].map((b) => (
				<g key={b}>
					<rect x={b * 380 - 30} y={60} width={360} height={1000} fill={['#d9c19a', '#c9a878', '#e0caa4'][b]} stroke={O} strokeWidth={W} />
					{Array.from({length: 4}).map((_, r) =>
						[0, 1].map((c) => <rect key={`${r}${c}`} x={b * 380 + 20 + c * 160} y={110 + r * 200} width={110} height={130} fill="#9fb3c8" stroke={O} strokeWidth={W} />),
					)}
				</g>
			))}
			<rect x={0} y={1060} width={1080} height={300} fill="#8f8f95" stroke={O} strokeWidth={W} />
			{Array.from({length: 7}).map((_, i) => (
				<rect key={i} x={i * 160 + 20} y={1120} width={100} height={200} fill="#f4f1ea" />
			))}
			<rect x={0} y={1360} width={1080} height={560} fill="#d9d4c8" stroke={O} strokeWidth={W} />
			{/* traffic light */}
			<rect x={950} y={720} width={14} height={640} fill="#3a3f55" />
			<rect x={915} y={600} width={84} height={220} rx={16} fill="#3a3f55" stroke={O} strokeWidth={W} />
			{['#d9483b', '#e8a93a', '#5f9e55'].map((c, i) => (
				<circle key={c} cx={957} cy={640 + i * 68} r={24} fill={c} opacity={i === 0 ? 1 : 0.35} stroke={O} strokeWidth={3} />
			))}
			{/* crowd: three rows */}
			{[0, 1, 2].map((row) =>
				Array.from({length: 7}).map((_, i) => {
					const k = row * 7 + i;
					return (
						<SideChar
							key={k}
							x={60 + i * 150 + (row % 2) * 70 + Math.sin(t * 2 + k) * 4}
							y={1180 + row * 150}
							s={0.5 + row * 0.08}
							dir={hash(k) > 0.5 ? 1 : -1}
							face={hash(k + 3) > 0.6 ? 'shock' : 'neutral'}
							jacket={cols[k % cols.length]}
							pants={['#3a3f55', '#4a4f5c', '#6d5a4a'][k % 3]}
							hair={(['short', 'curly', 'short', 'bun'] as const)[k % 4]}
							hairColor={['#2b211d', '#7a4a2a', '#c98c55', '#e8c070'][k % 4]}
							phase={k * 0.37}
						/>
					);
				}),
			)}
			<Shnurok x={540} y={1800} s={0.8} face="shock" />
			<Odometer t={t} to={8000000000} x={540} y={250} />
			<Title lines={['ЧТО ЕСЛИ БЫ', 'ШКОЛУ ВДРУГ', 'ОТМЕНИЛИ?']} t={t - 0.2} />
		</>
	);
};

export const Bedroom: React.FC<{t: number; zoom?: boolean; empty?: boolean}> = ({t, zoom, empty}) => {
	const z = zoom ? 1 + 1.3 * ease(t / 0.8) : 1;
	const ring = t > (zoom ? 0 : 1.2);
	const shake = ring ? Math.sin(t * 60) * 5 : 0;
	return (
		<g transform={`translate(250 1040) scale(${z}) translate(-250 -1040)`}>
			<rect width={1080} height={1920} fill="#a9bfd6" />
			{Array.from({length: 14}).map((_, i) => (
				<rect key={i} x={i * 80} y={0} width={26} height={1300} fill="#b6cadf" />
			))}
			<rect x={120} y={420} width={190} height={240} fill="#1d2b4f" stroke={O} strokeWidth={W} />
			<circle cx={215} cy={520} r={44} fill="#d9483b" stroke={O} strokeWidth={4} />
			<ellipse cx={215} cy={520} rx={74} ry={16} fill="none" stroke="#f5c542" strokeWidth={6} transform="rotate(-15 215 520)" />
			<rect x={360} y={440} width={170} height={200} fill="#e8a93a" stroke={O} strokeWidth={W} />
			<circle cx={445} cy={540} r={50} fill="#2b5bd7" stroke={O} strokeWidth={4} />
			<rect x={600} y={560} width={300} height={18} fill="#c98c55" stroke={O} strokeWidth={W} />
			{['#d9483b', '#5b86c4', '#7fae6a', '#e8a93a', '#9b6fb0'].map((c, i) => (
				<rect key={c} x={620 + i * 34} y={490} width={28} height={70} fill={c} stroke={O} strokeWidth={3} />
			))}
			<rect x={820} y={300} width={240} height={520} fill="#f5c542" stroke={O} strokeWidth={W} />
			<rect x={860} y={340} width={200} height={440} fill="#bfe3f0" stroke={O} strokeWidth={W} />
			<rect x={0} y={1300} width={1080} height={620} fill="#b98a5e" stroke={O} strokeWidth={W} />
			{Array.from({length: 10}).map((_, i) => (
				<line key={i} x1={0} y1={1340 + i * 60} x2={1080} y2={1340 + i * 60} stroke="#a3764d" strokeWidth={4} />
			))}
			{/* bed */}
			<rect x={60} y={1060} width={620} height={160} rx={12} fill="#c98c55" stroke={O} strokeWidth={W} />
			<rect x={40} y={940} width={40} height={300} rx={8} fill="#9c6338" stroke={O} strokeWidth={W} />
			<rect x={90} y={1000} width={170} height={70} rx={30} fill="#f4f1ea" stroke={O} strokeWidth={W} />
			{/* sleeping kid: lying head on pillow */}
			{!empty && (
				<g transform="translate(570 1045) rotate(-90)">
					<Shnurok x={0} y={0} s={0.5} face={t > (zoom ? 0.6 : 99) ? 'shock' : 'closed'} />
				</g>
			)}
			<path d={empty ? 'M 230 1040 Q 400 1030 660 1040 L 670 1090 Q 400 1110 230 1090 Z' : 'M 330 990 Q 450 960 660 990 L 670 1100 Q 450 1120 330 1100 Z'} fill="#5b86c4" stroke={O} strokeWidth={W} strokeLinejoin="round" />
			{/* nightstand + alarm clock */}
			<rect x={720} y={1080} width={160} height={220} fill="#c98c55" stroke={O} strokeWidth={W} />
			<g transform={`translate(${800 + shake} 1040)`}>
				<rect x={-60} y={-46} width={120} height={84} rx={14} fill="#d9483b" stroke={O} strokeWidth={W} />
				<rect x={-44} y={-30} width={88} height={50} rx={6} fill="#14161f" />
				<text textAnchor="middle" y={5} fontFamily="Inter" fontWeight={900} fontSize={32} fill="#ff7a5a">
					07:00
				</text>
			</g>
			{/* sound lines toward the kid */}
			{ring &&
				[0, 1, 2].map((i) => {
					const k = (t * 1.6 + i / 3) % 1;
					return <path key={i} d={`M ${720 - k * 400} ${1000 - Math.sin(k * 6) * 20} q 20 -30 40 0 q 20 30 40 0`} stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={1 - k} />;
				})}
			{!zoom && t < 1.2 && [0, 1, 2].map((i) => <text key={i} x={300 + i * 30} y={940 - ((t * 60 + i * 30) % 90)} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" opacity={0.8}>z</text>)}
		</g>
	);
};

const Thought: React.FC<{t: number}> = ({t}) => {
	const k = back((t - 0.3) / 0.5);
	return (
		<>
			<Bedroom t={9} empty />
			<ShnurokSide x={330} y={1580} s={0.85} face="think" />
			{[0.3, 0.55].map((p, i) => (
				<circle key={i} cx={360 + p * 60} cy={640 - p * 200} r={14 + i * 10} fill="#fff" stroke={O} strokeWidth={W} opacity={k} />
			))}
			<g transform={`translate(560 360) scale(${k})`}>
				<path d="M -300 60 C -360 0 -320 -110 -220 -110 C -200 -190 -60 -200 -20 -140 C 40 -210 190 -190 210 -110 C 330 -120 360 20 280 70 C 300 160 160 190 100 140 C 40 200 -120 200 -150 130 C -260 170 -340 120 -300 60 Z" fill="#fffaf0" stroke={O} strokeWidth={W} />
				{/* mini scene: classroom, test on the board */}
				<rect x={-230} y={-110} width={460} height={200} rx={10} fill="#2f4a3a" stroke={O} strokeWidth={W} />
				<text textAnchor="middle" y={-30} fontFamily="Inter" fontWeight={900} fontSize={50} fill="#fffaf0">
					КОНТРОЛЬНАЯ
				</text>
				<text textAnchor="middle" y={40} fontFamily="Inter" fontWeight={700} fontSize={40} fill="#fffaf0">
					2 + 2 · x = ?
				</text>
			</g>
			<Pill text="сегодня контрольная" t={t - 0.6} y={180} />
		</>
	);
};

export const Hall: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#9fb3c8" />
		<rect x={0} y={760} width={1080} height={520} fill="#f4f1ea" />
		{[0, 1, 2, 3].map((i) => (
			<rect key={i} x={40 + i * 260} y={820} width={220} height={420} rx={10} fill="none" stroke="#d9d4c8" strokeWidth={6} />
		))}
		<rect x={40} y={420} width={300} height={22} fill="#9c6338" stroke={O} strokeWidth={W} />
		{['#f5c542', '#5f9e55', '#d9483b'].map((c, i) => (
			<path key={c} d={`M ${80 + i * 90} 442 l -20 230 l 70 0 l -20 -230 Z`} fill={c} stroke={O} strokeWidth={W} />
		))}
		<rect x={540} y={440} width={150} height={130} fill="#fffaf0" stroke={O} strokeWidth={W} />
		<rect x={570} y={470} width={90} height={70} fill="#bfe3f0" />
		<path d="M 780 1280 L 780 520 Q 780 380 930 380 Q 1080 380 1080 520 L 1080 1280 Z" fill="#fff1c0" stroke={O} strokeWidth={W} />
		<circle cx={960} cy={760} r={300} fill="#fff6d0" opacity={0.5 + 0.1 * Math.sin(t * 4)} />
		<rect x={0} y={1280} width={1080} height={640} fill="#e8d8bc" />
		{Array.from({length: 6}).map((_, r) =>
			Array.from({length: 9}).map((__, c) => <path key={`${r}${c}`} d={`M ${c * 130 + (r % 2) * 65} ${1320 + r * 100} l 20 30 l -20 30 l -20 -30 Z`} fill="#5b86c4" opacity={0.45} />),
		)}
		<rect x={60} y={1420} width={600} height={110} fill="#b0453a" stroke={O} strokeWidth={W} />
		<ShnurokSide x={-120 + t * 260} y={1500} s={0.95} walk={1} face="neutral" />
	</>
);

const Kitchen: React.FC<{t: number}> = ({t}) => {
	const pop = clamp01((t - 0.5) / 1.1);
	const tx = 760 - pop * 330;
	const ty = 1010 - Math.sin(pop * Math.PI) * 420 + pop * 120;
	return (
		<>
			<rect width={1080} height={1920} fill="#f1e4c8" />
			{Array.from({length: 7}).map((_, r) =>
				Array.from({length: 9}).map((__, c) => (
					<rect key={`${r}${c}`} x={c * 120} y={640 + r * 70} width={120} height={70} fill={(r + c) % 3 === 0 ? '#e8a93a' : (r + c) % 3 === 1 ? '#fffaf0' : '#f2b8a0'} stroke="#e6dcc8" strokeWidth={3} />
				)),
			)}
			<rect x={0} y={260} width={1080} height={260} fill="#c98c55" stroke={O} strokeWidth={W} />
			{[0, 1, 2, 3].map((i) => (
				<rect key={i} x={20 + i * 265} y={280} width={245} height={220} rx={8} fill="#d9a066" stroke={O} strokeWidth={W} />
			))}
			<rect x={0} y={1130} width={1080} height={790} fill="#c98c55" stroke={O} strokeWidth={W} />
			{[0, 1, 2, 3].map((i) => (
				<rect key={i} x={20 + i * 265} y={1170} width={245} height={300} rx={8} fill="#d9a066" stroke={O} strokeWidth={W} />
			))}
			<rect x={0} y={1100} width={1080} height={40} fill="#f4f1ea" stroke={O} strokeWidth={W} />
			{/* toaster */}
			<rect x={680} y={980} width={170} height={120} rx={26} fill="#d9483b" stroke={O} strokeWidth={W} />
			<rect x={715} y={970} width={100} height={14} rx={6} fill="#3a3f55" />
			{/* toast flying in an arc, spinning */}
			<g transform={`translate(${tx} ${ty}) rotate(${pop * 540})`}>
				<path d="M -50 -40 Q -60 -70 -30 -70 Q 0 -90 30 -70 Q 60 -70 50 -40 L 50 40 L -50 40 Z" fill="#e8b46a" stroke={O} strokeWidth={W} />
				<path d="M -38 -34 L 38 -34 L 38 30 L -38 30 Z" fill="#f6d79a" />
			</g>
			<ShnurokSide x={360} y={1560} s={0.95} face={pop > 0.9 ? 'joy' : 'shock'} armFront={pop > 0.8 ? [110, -30] : undefined} />
		</>
	);
};

const SHOTS: [number, number, React.FC<{t: number}>, string?][] = [
	[0, 3.2, Street],
	[3.2, 6.0, (p) => <Bedroom t={p.t} />, 'ПОНЕДЕЛЬНИК · 7:00'],
	[6.0, 7.8, (p) => <Bedroom t={p.t} zoom />],
	[7.8, 10.8, Thought],
	[10.8, 13.4, Hall],
	[13.4, 16.0, Kitchen, 'завтрак за 30 секунд'],
];

export const FlatStyleDemo: React.FC = () => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SHOTS.map(([a, b, S, pill], i) => (
				<Sequence key={i} from={Math.round(a * 30)} durationInFrames={Math.round((b - a) * 30)}>
					<Shot S={S} pill={pill} />
				</Sequence>
			))}
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #0008'}}>@вселенная_шнурка</div>
			{void f}
		</AbsoluteFill>
	);
};

const Shot: React.FC<{S: React.FC<{t: number}>; pill?: string}> = ({S, pill}) => {
	const t = useCurrentFrame() / 30;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<S t={t} />
					{pill && <Pill text={pill} t={t - 0.2} />}
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
