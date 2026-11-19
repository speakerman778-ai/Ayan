import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx} from '../lib';
import {C, OL, OW} from '../cartoon/parts';
import {Cat, Keeper} from './Keeper';

// Character & prop sheets for episode 1 «Барсик — живой компас».

const Label: React.FC<{x: number; y: number; text: string; sub?: string}> = ({x, y, text, sub}) => (
	<g>
		<text x={x} y={y} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill={OL}>
			{text}
		</text>
		{sub && (
			<text x={x} y={y + 40} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={28} fill={C.red}>
				{sub}
			</text>
		)}
	</g>
);

const Title: React.FC<{text: string}> = ({text}) => (
	<g>
		<rect x={60} y={60} width={960} height={120} rx={18} fill={C.paper} stroke={OL} strokeWidth={OW} />
		<rect x={60} y={60} width={34} height={120} rx={10} fill={C.red} stroke={OL} strokeWidth={OW} />
		<text x={130} y={140} fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>
			{text}
		</text>
	</g>
);

const Floor: React.FC<{y: number}> = ({y}) => <rect x={40} y={y} width={1000} height={26} rx={13} fill={C.wood} stroke={OL} strokeWidth={6} />;

const useT = () => useCurrentFrame() / 30;

export const Ep01Characters: React.FC = () => {
	const t = useT();
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: C.wall}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Title text="Серия 1 · Персонажи" />
					{/* Savely: big + emotions */}
					<Floor y={1010} />
					<Keeper x={250} y={1010} s={0.78} face="smile" armR={[30, -20]} />
					<Label x={250} y={1080} text="Дед Савелий" sub="смотритель маяка" />
					{([
						['neutral', 'спокоен'],
						['think', 'думает'],
						['shock', 'удивлён'],
					] as const).map(([f, l], i) => (
						<g key={f}>
							<Keeper x={590 + i * 170} y={1010} s={0.44} face={f} handOnHead={f === 'shock'} />
							<text x={590 + i * 170} y={1060} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={28} fill={OL}>
								{l}
							</text>
						</g>
					))}
					{/* Barsik adult and kitten */}
					<Floor y={1650} />
					<Cat x={270} y={1650} s={0.95} t={t} />
					<Label x={270} y={1720} text="Барсик" sub="живой компас" />
					<Cat x={620} y={1650} s={0.7} t={t} kitten wet look={1} />
					<Label x={620} y={1720} text="Котёнок" sub="мокрый, после шторма" />
					<Cat x={890} y={1650} s={0.62} t={t} kitten look={-1} />
					<Label x={890} y={1720} text="Котёнок" sub="сухой, дома" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

// ------------------------------------------------------------------ props
export const Compass: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => {
	const needle = 18 * Math.exp(-((t % 4) * 1.2)) * Math.sin((t % 4) * 9); // swings, then settles north
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<rect x={-26} y={-205} width={52} height={40} rx={10} fill="#b88a3a" stroke={OL} strokeWidth={OW} />
			<circle cx={0} cy={-210} r={22} fill="none" stroke={OL} strokeWidth={14} />
			<circle cx={0} cy={-210} r={22} fill="none" stroke="#d9a94a" strokeWidth={6} />
			<circle r={170} fill="#c9963e" stroke={OL} strokeWidth={OW} />
			<circle r={140} fill="#f7ecd6" stroke={OL} strokeWidth={6} />
			{Array.from({length: 16}).map((_, i) => (
				<line key={i} transform={`rotate(${i * 22.5})`} x1={0} y1={-126} x2={0} y2={i % 4 === 0 ? -104 : -116} stroke={OL} strokeWidth={i % 4 === 0 ? 6 : 4} strokeLinecap="round" />
			))}
			{([['С', 0, -82], ['В', 82, 0], ['Ю', 0, 82], ['З', -82, 0]] as const).map(([l, lx, ly], i) => (
				<text key={l} x={lx} y={ly + 2} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={i === 0 ? C.red : OL}>
					{l}
				</text>
			))}
			<g transform={`rotate(${needle})`}>
				<path d="M 0 -60 L 14 0 L -14 0 Z" fill={C.red} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
				<path d="M 0 60 L 14 0 L -14 0 Z" fill="#fffaf0" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
				<circle r={12} fill="#c9963e" stroke={OL} strokeWidth={5} />
			</g>
			<path d="M -90 -90 Q -60 -118 -30 -126" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8} />
		</g>
	);
};

export const Plank: React.FC<{x: number; y: number; s?: number; t: number; children?: React.ReactNode}> = ({x, y, s = 1, t, children}) => (
	<g transform={`translate(${x} ${y + Math.sin(t * 1.6) * 6}) rotate(${Math.sin(t * 1.2) * 2}) scale(${s})`}>
		<path d="M -230 -30 L 200 -34 L 214 -10 L 196 6 L 222 24 L -230 30 Z" fill={C.wood} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		<path d="M -200 -8 L 60 -12 M -120 12 L 150 10" stroke={C.woodDark} strokeWidth={6} strokeLinecap="round" />
		<circle cx={-196} cy={0} r={8} fill="#6b6f78" stroke={OL} strokeWidth={4} />
		<path d="M -140 -30 Q -150 -60 -128 -64" stroke="#5f9e55" strokeWidth={8} fill="none" strokeLinecap="round" />
		{children}
	</g>
);

export const Boat: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x} ${y + Math.sin(t * 1.8) * 6}) rotate(${Math.sin(t * 1.4) * 2.5}) scale(${s})`}>
		{/* oar */}
		<path d="M -60 -70 L 150 60" stroke={OL} strokeWidth={22} strokeLinecap="round" />
		<path d="M -60 -70 L 150 60" stroke={C.wood} strokeWidth={10} strokeLinecap="round" />
		<ellipse cx={170} cy={74} rx={40} ry={16} transform="rotate(32 170 74)" fill={C.wood} stroke={OL} strokeWidth={6} />
		<path d="M -260 -40 L 260 -40 Q 230 70 120 80 L -150 80 Q -240 60 -260 -40 Z" fill={C.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		<path d="M -255 -40 L 255 -40 L 250 -14 L -250 -14 Z" fill={C.woodDark} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
		<path d="M -220 20 L 220 20" stroke="#fffaf0" strokeWidth={12} />
		<text x={0} y={64} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill="#fffaf0">
			ЧАЙКА
		</text>
	</g>
);

export const Saucer: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[0, 1].map((i) => {
			const k = (t * 0.5 + i * 0.5) % 1;
			return <path key={i} d={`M ${-20 + i * 40} -40 q 14 -24 0 -48 q -14 -24 0 -48`} transform={`translate(0 ${-k * 30})`} stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8 * (1 - k)} />;
		})}
		<ellipse cx={0} cy={0} rx={130} ry={36} fill="#5b86c4" stroke={OL} strokeWidth={OW} />
		<ellipse cx={0} cy={-8} rx={96} ry={22} fill="#fffaf0" stroke={OL} strokeWidth={5} />
	</g>
);

export const Ep01Props: React.FC = () => {
	const t = useT();
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: C.wall}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Title text="Серия 1 · Предметы" />
					<Compass x={290} y={560} s={1.05} t={t} />
					<Label x={290} y={800} text="Старый компас" sub="стрелка качается → «С»" />
					<g>
						<rect x={620} y={420} width={360} height={300} rx={20} fill="#2b4a7a" stroke={OL} strokeWidth={OW} />
						<path d="M 620 600 q 45 -30 90 0 t 90 0 t 90 0 t 90 0" stroke="#6f9ad0" strokeWidth={10} fill="none" />
						<Plank x={800} y={590} s={0.72} t={t}>
							<Cat x={-30} y={-26} s={0.62} t={t} kitten wet look={1} />
						</Plank>
					</g>
					<Label x={800} y={800} text="Обломок доски" sub="с котёнком" />
					<g>
						<rect x={60} y={980} width={960} height={420} rx={20} fill="#e6e8ea" stroke={OL} strokeWidth={OW} />
						<path d="M 60 1290 q 60 -30 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0" stroke="#9aa6b2" strokeWidth={10} fill="none" />
						<Boat x={540} y={1250} s={1} t={t} />
					</g>
					<Label x={540} y={1460} text="Лодка «Чайка»" sub="сцена «Туман»" />
					<Saucer x={300} y={1720} s={1} t={t} />
					<Label x={300} y={1800} text="Блюдце с молоком" />
					<g transform="translate(780 1720)">
						<rect x={-150} y={-120} width={300} height={130} rx={20} fill="#f2c230" stroke={OL} strokeWidth={OW} />
						<path d="M -150 -80 L 150 -80 M -150 -40 L 150 -40" stroke={C.red} strokeWidth={10} />
					</g>
					<Label x={780} y={1800} text="Полотенце" sub="для котёнка" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
