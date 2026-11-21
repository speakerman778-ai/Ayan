import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, CharProps, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, timeWords} from '../subs/Karaoke';

const COAT = '#f2c230';

/** Kitten "Kompas": chubby grey-blue cat, white chest, red sailor scarf. (x,y) = bottom centre. */
export const Cat: React.FC<{x: number; y: number; s?: number; t: number; look?: number; kitten?: boolean; wet?: boolean}> = ({x, y, s = 1, t, look = 0, kitten = false, wet = false}) => {
	const bk = kitten ? 0.7 : 1; // kitten: small body, big head
	const headY = kitten ? -195 : -250;
	const shiver = wet ? Math.sin(t * 40) * 2 : 0;
	const blink = (t % 3.1) > 2.95 ? 0.15 : 1;
	const tail = Math.sin(t * 2.4) * 10;
	const fur = '#8fa3bf';
	const furDark = '#6f829e';
	return (
		<g transform={`translate(${x + shiver} ${y}) scale(${s})`}>
			<ellipse cx={0} cy={6} rx={120 * bk} ry={16} fill="#000" opacity={0.13} />
			<g transform={`scale(${bk})`}>
			{/* tail */}
			<g transform={`rotate(${tail} 70 -40)`}>
				<path d="M 70 -40 C 170 -40 190 -150 140 -190" fill="none" stroke={OL} strokeWidth={46} strokeLinecap="round" />
				<path d="M 70 -40 C 170 -40 190 -150 140 -190" fill="none" stroke={fur} strokeWidth={32} strokeLinecap="round" />
				<path d="M 160 -110 l 22 -4 M 170 -150 l 20 6" stroke={furDark} strokeWidth={10} strokeLinecap="round" />
			</g>
			{/* body */}
			<path d="M -100 0 C -110 -120 -70 -190 0 -190 C 70 -190 110 -120 100 0 Z" fill={fur} stroke={OL} strokeWidth={OW} />
			<path d="M -50 0 C -60 -80 -30 -130 0 -130 C 30 -130 60 -80 50 0 Z" fill="#f6f2ea" />
			{/* paws */}
			<ellipse cx={-42} cy={-8} rx={30} ry={20} fill="#f6f2ea" stroke={OL} strokeWidth={OW} />
			<ellipse cx={42} cy={-8} rx={30} ry={20} fill="#f6f2ea" stroke={OL} strokeWidth={OW} />
			{/* scarf (adult only) */}
			{!kitten && (
				<>
					<path d="M -70 -170 Q 0 -140 70 -170 L 62 -146 Q 0 -120 -62 -146 Z" fill={C.red} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
					<path d="M 10 -140 L 40 -95 L 0 -112 Z" fill={C.red} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
				</>
			)}
			</g>
			{/* head */}
			<g transform={`translate(0 ${headY}) rotate(${look * 6})`}>
				{wet && (
					<path d="M -60 -78 L -48 -112 L -30 -86 L -14 -120 L 4 -88 L 22 -118 L 36 -86 L 56 -108 L 62 -74 Z" fill={fur} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
				)}
				<path d="M -95 -40 L -100 -125 L -40 -82 Z" fill={fur} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<path d="M 95 -40 L 100 -125 L 40 -82 Z" fill={fur} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<path d="M -84 -60 L -86 -104 L -56 -82 Z M 84 -60 L 86 -104 L 56 -82 Z" fill="#f2a6a6" />
				<ellipse cx={0} cy={0} rx={115} ry={95} fill={fur} stroke={OL} strokeWidth={OW} />
				<path d="M -20 -92 L -12 -62 M 0 -95 L 0 -62 M 20 -92 L 12 -62" stroke={furDark} strokeWidth={9} strokeLinecap="round" />
				<ellipse cx={0} cy={36} rx={58} ry={40} fill="#f6f2ea" />
				{[-1, 1].map((k) => (
					<g key={k}>
						<ellipse cx={k * 44} cy={-6} rx={26} ry={30 * blink} fill="#fff" stroke={OL} strokeWidth={6} />
						<ellipse cx={k * 44 + look * 8} cy={-2} rx={15} ry={20 * blink} fill="#2e7d5b" />
						<ellipse cx={k * 44 + look * 8} cy={-2} rx={7} ry={14 * blink} fill={OL} />
						<circle cx={k * 44 + look * 8 + 6} cy={-10} r={5 * blink} fill="#fff" />
					</g>
				))}
				<path d="M -12 22 L 12 22 L 0 34 Z" fill="#f28a9a" stroke={OL} strokeWidth={4} strokeLinejoin="round" />
				<path d="M 0 34 Q -10 50 -22 44 M 0 34 Q 10 50 22 44" fill="none" stroke={OL} strokeWidth={5} strokeLinecap="round" />
				<g stroke={OL} strokeWidth={4} strokeLinecap="round">
					<line x1={-60} y1={30} x2={-140} y2={18} />
					<line x1={-60} y1={42} x2={-138} y2={50} />
					<line x1={60} y1={30} x2={140} y2={18} />
					<line x1={60} y1={42} x2={138} y2={50} />
				</g>
			</g>
			{wet &&
				[[-90, -150, 0], [96, -120, 0.4], [-60, -40, 0.8], [70, -30, 0.2]].map(([dx, dy, ph], i) => {
					const k = (t * 0.9 + ph) % 1;
					return <path key={i} transform={`translate(${dx} ${dy + k * 60})`} opacity={1 - k} d="M 0 -16 Q 11 0 0 8 Q -11 0 0 -16 Z" fill="#9fd0e8" stroke={OL} strokeWidth={4} />;
				})}
		</g>
	);
};

export const Keeper: React.FC<Partial<CharProps> & {x: number; y: number; handOnHead?: boolean}> = ({handOnHead = false, armR, face = 'smile', ...rest}) => (
	<Char {...rest} face={face} armR={handOnHead ? [150, 72] : armR} armROver={handOnHead} headS={0.82} bodyS={1.14} headDrop={18} hair="old" beard nose hat="souwester" hatColor={COAT} jacket={COAT} pants="#3d4a66" />
);

// ------------------------------------------------------------------ scene 1: inside the lighthouse
export const Room: React.FC<{t: number}> = ({t}) => {
	const sweep = (t * 0.6) % 1;
	return (
		<g>
			<rect width={1080} height={1920} fill="#e9dcc4" />
			{/* stone blocks */}
			{Array.from({length: 14}).map((_, r) =>
				Array.from({length: 6}).map((__, c) => (
					<rect key={`${r}-${c}`} x={c * 200 - (r % 2) * 100 + 4} y={r * 100 + 4} width={192} height={92} rx={14} fill="#e2d2b6" stroke="#cdb994" strokeWidth={4} />
				)),
			)}
			<rect x={0} y={0} width={1080} height={70} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
			{/* porthole */}
			<circle cx={760} cy={520} r={190} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
			<clipPath id="port"><circle cx={760} cy={520} r={150} /></clipPath>
			<g clipPath="url(#port)">
				<rect x={600} y={360} width={320} height={320} fill="#1d2b4f" />
				{Array.from({length: 12}).map((_, i) => (
					<circle key={i} cx={610 + hash(i) * 300} cy={370 + hash(i + 4) * 150} r={3} fill="#fff6c8" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />
				))}
				<circle cx={830} cy={430} r={36} fill="#fff1c0" stroke={OL} strokeWidth={5} />
				<path d={`M 600 ${560} L 920 ${470 + sweep * 60} L 920 ${560 + sweep * 60} Z`} fill="#ffe89a" opacity={0.35} />
				<rect x={600} y={580} width={320} height={120} fill="#2b4a7a" />
				{[0, 1, 2].map((i) => (
					<path key={i} d={`M ${600 - ((t * 40) % 70)} ${600 + i * 30} q 17 -16 35 0 q 17 16 35 0 q 17 -16 35 0 q 17 16 35 0 q 17 -16 35 0 q 17 16 35 0 q 17 -16 35 0 q 17 16 35 0 q 17 -16 35 0 q 17 16 35 0 q 17 -16 35 0`} fill="none" stroke="#6f9ad0" strokeWidth={5} />
				))}
			</g>
			<circle cx={760} cy={520} r={150} fill="none" stroke={OL} strokeWidth={OW} />
			{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
				const a = (i / 8) * Math.PI * 2;
				return <circle key={i} cx={760 + Math.cos(a) * 170} cy={520 + Math.sin(a) * 170} r={9} fill={C.ochre} stroke={OL} strokeWidth={4} />;
			})}
			{/* shelf with a ship in a bottle */}
			<rect x={90} y={430} width={360} height={26} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<g transform="translate(150 430)">
				<path d="M 0 0 L 0 -70 Q 0 -90 30 -90 L 120 -90 Q 150 -90 150 -70 L 150 0 Z" fill="#cfe8e0" stroke={OL} strokeWidth={6} opacity={0.9} />
				<rect x={150} y={-62} width={34} height={34} rx={6} fill={C.wood} stroke={OL} strokeWidth={5} />
				<path d="M 30 -22 L 120 -22 L 108 -6 L 42 -6 Z" fill={C.red} stroke={OL} strokeWidth={4} />
				<path d="M 75 -22 L 75 -76 L 110 -30 Z" fill="#fff" stroke={OL} strokeWidth={4} />
			</g>
			<rect x={340} y={360} width={50} height={70} rx={8} fill="#5b8f6a" stroke={OL} strokeWidth={5} />
			<rect x={395} y={375} width={40} height={55} rx={6} fill={C.red} stroke={OL} strokeWidth={5} />
			{/* life ring on wall */}
			<g transform="translate(250 760)">
				<circle r={90} fill="#fff" stroke={OL} strokeWidth={OW} />
				<circle r={45} fill="#e9dcc4" stroke={OL} strokeWidth={OW} />
				{[0, 1, 2, 3].map((i) => (
					<path key={i} d="M 0 -90 A 90 90 0 0 1 35 -83 L 18 -42 A 45 45 0 0 0 0 -45 Z" transform={`rotate(${i * 90 + 30})`} fill={C.red} />
				))}
			</g>
			{/* floor */}
			<rect x={0} y={1290} width={1080} height={630} fill="#c98c55" stroke={OL} strokeWidth={OW} />
			{Array.from({length: 9}).map((_, i) => (
				<line key={i} x1={i * 140 - 60} y1={1290} x2={i * 140 - 260} y2={1920} stroke="#a8713f" strokeWidth={6} />
			))}
			<ellipse cx={500} cy={1320} rx={380} ry={56} fill="#3f6fb0" stroke={OL} strokeWidth={OW} />
			<ellipse cx={500} cy={1320} rx={300} ry={38} fill="none" stroke="#f2c230" strokeWidth={8} strokeDasharray="30 18" />
			{/* warm lamp glow */}
			<circle cx={880} cy={980} r={260} fill="#ffd36a" opacity={0.18 + 0.03 * Math.sin(t * 9)} />
		</g>
	);
};

export const Table: React.FC<{t: number}> = ({t}) => (
	<g>
		<rect x={640} y={1070} width={400} height={36} rx={10} fill={C.wood} stroke={OL} strokeWidth={OW} />
		<rect x={670} y={1106} width={30} height={200} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
		<rect x={980} y={1106} width={30} height={200} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
		{/* oil lamp */}
		<g transform="translate(900 1070)">
			<path d="M -36 0 Q -50 -40 0 -46 Q 50 -40 36 0 Z" fill={C.red} stroke={OL} strokeWidth={6} />
			<path d="M -26 -46 Q -34 -120 0 -130 Q 34 -120 26 -46 Z" fill="#fff6d8" stroke={OL} strokeWidth={6} opacity={0.85} />
			<path d={`M 0 -60 q ${-10 + Math.sin(t * 12) * 3} -24 0 -44 q 10 20 0 44`} fill={C.ochre} stroke={OL} strokeWidth={4} />
		</g>
		{/* teapot + mug */}
		<g transform="translate(760 1070)">
			<path d="M -50 0 Q -64 -70 0 -76 Q 64 -70 50 0 Z" fill="#5b8f6a" stroke={OL} strokeWidth={6} />
			<path d="M 50 -40 Q 90 -50 92 -76" fill="none" stroke={OL} strokeWidth={12} strokeLinecap="round" />
			<path d="M 50 -40 Q 90 -50 92 -76" fill="none" stroke="#5b8f6a" strokeWidth={5} strokeLinecap="round" />
			<ellipse cx={0} cy={-78} rx={20} ry={8} fill={C.ochre} stroke={OL} strokeWidth={5} />
			{[0, 1].map((i) => {
				const p = (t * 0.8 + i * 0.5) % 1;
				return <path key={i} d={`M ${92 + i * 6} ${-90 - p * 70} q 10 -14 0 -28`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={1 - p} />;
			})}
		</g>
	</g>
);

const Inside: React.FC<{t: number}> = ({t}) => (
	<>
		<Room t={t} />
		<Table t={t} />
		<Keeper x={420} y={1310} s={1.0} armR={[60, -70]} />
		{/* mug in keeper hand */}
		<g transform="translate(578 1030)">
			<rect x={-26} y={-34} width={52} height={60} rx={8} fill="#fff" stroke={OL} strokeWidth={6} />
			<path d="M 26 -20 Q 44 -16 26 10" fill="none" stroke={OL} strokeWidth={6} />
			<rect x={-26} y={-14} width={52} height={10} fill={C.red} />
		</g>
		<Cat x={860} y={1070} s={0.62} t={t} look={-1} />
		<NameTag name="Дед Савелий" role="смотритель маяка" from={0} x={60} y={130} avatar={<Keeper x={0} y={236} s={0.42} />} />
		<NameTag name="Барсик" role="кот, старший помощник" from={0} x={60} y={300} avatar={<Cat x={0} y={88} s={0.36} t={t} />} />
	</>
);

// ------------------------------------------------------------------ scene 2: outside at night
export const Lighthouse: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => {
	const sweep = Math.sin(t * 1.2);
	return (
		<g transform={`translate(${x} ${y})`}>
			<path d={`M 0 -720 L 1100 ${-900 + sweep * 80} L 1100 ${-560 + sweep * 80} Z`} fill="#ffe89a" opacity={0.28} />
			<path d="M -140 0 L -95 -620 L 95 -620 L 140 0 Z" fill="#f6efe2" stroke={OL} strokeWidth={OW} />
			{[[-500, -400], [-260, -160]].map(([a, b], i) => {
				const w = (yy: number) => 140 - ((-yy) / 620) * 45;
				return <path key={i} d={`M ${-w(a)} ${a} L ${w(a)} ${a} L ${w(b)} ${b} L ${-w(b)} ${b} Z`} fill={C.red} stroke={OL} strokeWidth={OW} />;
			})}
			<path d="M -40 0 L -40 -90 Q 0 -130 40 -90 L 40 0 Z" fill={C.woodDark} stroke={OL} strokeWidth={OW} />
			<rect x={-22} y={-330} width={44} height={56} rx={8} fill="#ffd36a" stroke={OL} strokeWidth={6} />
			<rect x={-130} y={-650} width={260} height={36} rx={8} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
			<rect x={-80} y={-790} width={160} height={140} rx={10} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
			<circle cx={0} cy={-720} r={46} fill="#fffbe6" stroke={OL} strokeWidth={6} />
			<path d="M -100 -786 L 0 -880 L 100 -786 Z" fill={C.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<circle cx={0} cy={-890} r={16} fill={C.red} stroke={OL} strokeWidth={6} />
		</g>
	);
};


// cliff top curve: M -20 1000 C 220 930 560 940 760 1000
const bez = (u: number): [number, number] => {
	const p = [[-20, 1000], [220, 930], [560, 940], [760, 1000]];
	const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
	return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
};

export const GrassTop: React.FC<{t: number}> = ({t}) => {
	// scalloped lower edge hanging over the rock
	const n = 14;
	let lower = '';
	for (let i = n; i >= 0; i--) {
		const [x, y] = bez(i / n);
		const depth = 70 + (i % 3) * 18;
		const [px, py] = bez(Math.max(0, (i - 0.5) / n));
		lower += i === n ? `L ${x + 30} ${y + depth} ` : `Q ${px} ${py + depth + 34} ${x} ${y + depth} `;
	}
	const top = 'M -20 1000 C 220 930 560 940 760 1000 Q 800 1010 806 1050 ';
	const light = 'M -20 1000 C 220 930 560 940 760 1000 L 752 1018 C 560 962 220 952 -20 1022 Z';
	const tufts = [0.06, 0.18, 0.3, 0.47, 0.63, 0.86, 0.95];
	const flowers = [0.11, 0.24, 0.4, 0.55, 0.72, 0.9];
	return (
		<g>
			<path d={top + lower + 'Z'} fill="#5f9e55" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<path d={light} fill="#7dbb6a" />
			{/* dirt path from the lighthouse door */}
			<path d="M 200 990 Q 330 1000 420 978 Q 500 966 560 990 Q 500 1006 420 1000 Q 330 1022 200 1012 Z" fill="#cbb48a" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
			{tufts.map((u, i) => {
				const [x, y] = bez(u);
				const sway = Math.sin(t * 2 + i) * 4;
				return (
					<g key={i} transform={`translate(${x} ${y + 30 + (i % 2) * 18})`}>
						<path d={`M -16 0 L ${-12 + sway} -26 L -4 0 M -4 0 L ${2 + sway} -34 L 6 0 M 6 0 L ${14 + sway} -24 L 16 0`} fill="#4e8a46" stroke={OL} strokeWidth={4} strokeLinejoin="round" />
					</g>
				);
			})}
			{flowers.map((u, i) => {
				const [x, y] = bez(u);
				const col = i % 2 ? '#fff6e0' : '#ffd23a';
				return (
					<g key={i} transform={`translate(${x + 14} ${y + 52 + (i % 3) * 10})`}>
						{[0, 1, 2, 3, 4].map((k) => (
							<circle key={k} cx={Math.cos((k / 5) * Math.PI * 2) * 7} cy={Math.sin((k / 5) * Math.PI * 2) * 7} r={6} fill={col} stroke={OL} strokeWidth={2.5} />
						))}
						<circle r={4} fill="#e8743a" />
					</g>
				);
			})}
		</g>
	);
};

export const Outside: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#1d2b4f" />
		{Array.from({length: 40}).map((_, i) => (
			<circle key={i} cx={hash(i) * 1080} cy={hash(i + 7) * 800 + 60} r={3 + hash(i + 3) * 3} fill="#fff6c8" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
		))}
		<circle cx={870} cy={260} r={90} fill="#fff1c0" stroke={OL} strokeWidth={OW} />
		<circle cx={840} cy={240} r={20} fill="#f3d98a" />
		<rect x={0} y={1060} width={1080} height={860} fill="#2b4a7a" />
		{Array.from({length: 6}).map((_, r) => (
			<path key={r} d={`M ${-140 + ((r % 2) * 70) - ((t * 30) % 140)} ${1110 + r * 120} ` + Array.from({length: 10}).map(() => 'q 35 -30 70 0 q 35 30 70 0').join(' ')} fill="none" stroke="#6f9ad0" strokeWidth={7} strokeLinecap="round" />
		))}
		<path d="M -20 1000 C 220 930 560 940 760 1000 C 840 1080 800 1300 850 1500 C 880 1700 820 1850 800 1940 L -20 1940 Z" fill="#7a6a5a" stroke={OL} strokeWidth={OW} />
		<GrassTop t={t} />
		<Lighthouse x={230} y={990} t={t} />
		<Keeper x={590} y={1012} s={0.52} armR={[100, -30]} face="neutral" />
		{/* lantern */}
		<g transform={`translate(731 ${836 + Math.sin(t * 3) * 3}) scale(0.62)`}>
			<circle r={70} fill="#ffd36a" opacity={0.35} />
			<path d="M -16 -50 Q 0 -70 16 -50" fill="none" stroke={OL} strokeWidth={6} />
			<rect x={-26} y={-48} width={52} height={70} rx={8} fill="#3a3f55" stroke={OL} strokeWidth={6} />
			<rect x={-16} y={-38} width={32} height={50} rx={6} fill="#fff1b0" />
		</g>
		<Cat x={760} y={1016} s={0.34} t={t} look={-1} />
	</>
);

const S1 = timeWords('Это дед Савелий и его кот Барсик.', 0.2, 1.0);
const S2 = timeWords('Каждую ночь они зажигают маяк.', 1.2, 2.0);

export const KeeperPreview: React.FC = () => {
	const frame = useCurrentFrame();
	const t = frame / 30;
	const inside = frame < 36;
	return (
		<ShotCtx.Provider value={{t, dur: 1.2, scatter: 0}}>
			<AbsoluteFill>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					{inside ? <Inside t={t} /> : <Outside t={t} />}
				</svg>
				{inside ? <KaraokeLine words={S1} t={t} /> : <KaraokeLine words={S2} t={t} />}
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
