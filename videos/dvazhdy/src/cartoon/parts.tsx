import React from 'react';
import {useShot, clamp, prog, easeOut} from '../lib';

// ------------------------------------------------------------------ palette
export const OL = '#3b2a22'; // outline
export const OW = 7;
export const C = {
	skin: '#f6c9a0',
	skinShade: '#e8b088',
	cheek: '#f29b8a',
	hair: '#2b211d',
	gray: '#c9c4bd',
	shirt: '#f4efe4',
	jacket: '#5b6f8f', // indigo work jacket
	pants: '#4a4f5c',
	shoes: '#5a3a28',
	wood: '#c98c55',
	woodDark: '#9c6338',
	paper: '#f7ecd6',
	wall: '#efe0c2',
	tatami: '#cfc58e',
	tatamiLine: '#a99f68',
	red: '#d9483b',
	ochre: '#e8a93a',
	sky: '#9fd0e8',
	navy: '#24324f',
	green: '#7fae6a',
	white: '#fffaf0',
	bandage: '#fbf7ef',
};

// ------------------------------------------------------------------ limbs
type Pt = [number, number];
const d2r = Math.PI / 180;
const seg = (o: Pt, ang: number, len: number): Pt => [o[0] + Math.sin(ang * d2r) * len, o[1] + Math.cos(ang * d2r) * len];

/** Thick limb with outline. angle in degrees: 0 = straight down, +90 = to the right. */
export const Limb: React.FC<{from: Pt; a1: number; a2: number; l1: number; l2: number; w: number; color: string; end?: 'hand' | 'shoe' | 'none'; endColor?: string; flip?: boolean}> = ({
	from,
	a1,
	a2,
	l1,
	l2,
	w,
	color,
	end = 'none',
	endColor,
	flip = false,
}) => {
	const j = seg(from, a1, l1);
	const e = seg(j, a1 + a2, l2);
	const d = `M ${from[0]} ${from[1]} L ${j[0]} ${j[1]} L ${e[0]} ${e[1]}`;
	return (
		<g>
			<path d={d} stroke={OL} strokeWidth={w + OW * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			{end === 'hand' && <circle cx={e[0]} cy={e[1]} r={w * 0.62} fill={endColor ?? C.skin} stroke={OL} strokeWidth={OW} />}
			{end === 'shoe' && (
				<ellipse cx={e[0] + (flip ? -10 : 10)} cy={e[1] + 4} rx={w * 0.95} ry={w * 0.5} fill={endColor ?? C.shoes} stroke={OL} strokeWidth={OW} />
			)}
		</g>
	);
};

// ------------------------------------------------------------------ face
export type Face = 'neutral' | 'smile' | 'shock' | 'laugh' | 'sad' | 'wince' | 'think' | 'closed' | 'determined';

const Eyes: React.FC<{face: Face; blink: number; look?: number}> = ({face, blink, look = 0}) => {
	const ex = 44;
	const ey = -8;
	const lx = look * 10;
	if (face === 'laugh' || face === 'closed') {
		const up = face === 'laugh';
		return (
			<g stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round">
				{[-1, 1].map((k) => (
					<path key={k} d={up ? `M ${k * ex - 20} ${ey + 6} Q ${k * ex} ${ey - 18} ${k * ex + 20} ${ey + 6}` : `M ${k * ex - 18} ${ey} Q ${k * ex} ${ey + 14} ${k * ex + 18} ${ey}`} />
				))}
			</g>
		);
	}
	if (face === 'wince') {
		return (
			<g stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round">
				<path d={`M ${-ex - 18} ${ey - 14} L ${-ex + 14} ${ey} L ${-ex - 18} ${ey + 14}`} />
				<path d={`M ${ex + 18} ${ey - 14} L ${ex - 14} ${ey} L ${ex + 18} ${ey + 14}`} />
			</g>
		);
	}
	if (face === 'shock') {
		return (
			<g>
				{[-1, 1].map((k) => (
					<g key={k}>
						<ellipse cx={k * ex} cy={ey} rx={24} ry={28 * blink} fill="#fff" stroke={OL} strokeWidth={6} />
						<circle cx={k * ex + lx} cy={ey} r={8 * Math.max(0.2, blink)} fill={OL} />
					</g>
				))}
			</g>
		);
	}
	return (
		<g fill={OL}>
			{[-1, 1].map((k) => (
				<ellipse key={k} cx={k * ex + lx} cy={ey} rx={18} ry={24 * blink} />
			))}
			{[-1, 1].map((k) => (
				<circle key={'h' + k} cx={k * ex + lx + 6} cy={ey - 8} r={6.5 * blink} fill="#fff" />
			))}
			{[-1, 1].map((k) => (
				<circle key={'h2' + k} cx={k * ex + lx - 6} cy={ey + 9} r={3 * blink} fill="#fff" />
			))}
		</g>
	);
};

const Brows: React.FC<{face: Face}> = ({face}) => {
	const by = -60;
	const p: Record<string, [number, number]> = {
		neutral: [0, 0],
		smile: [-4, 0],
		shock: [-16, 0],
		laugh: [-8, 0],
		sad: [0, 12],
		wince: [6, -10],
		think: [0, 0],
		closed: [0, 0],
		determined: [6, -12],
	};
	const [lift, tilt] = p[face];
	return (
		<g stroke={OL} strokeWidth={8} strokeLinecap="round">
			<line x1={-66} y1={by + lift + tilt * 0.6} x2={-24} y2={by + lift - tilt * 0.6} />
			<line x1={24} y1={by + lift - tilt * 0.6 + (face === 'think' ? -14 : 0)} x2={66} y2={by + lift + tilt * 0.6 + (face === 'think' ? -10 : 0)} />
		</g>
	);
};

const Mouth: React.FC<{face: Face; talk?: number}> = ({face, talk = 0}) => {
	const my = 52;
	switch (face) {
		case 'smile':
			return <path d={`M -30 ${my - 6} Q 0 ${my + 22} 30 ${my - 6}`} stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />;
		case 'laugh':
			return <path d={`M -42 ${my - 10} Q 0 ${my - 14} 42 ${my - 10} Q 36 ${my + 46} 0 ${my + 46} Q -36 ${my + 46} -42 ${my - 10} Z`} fill="#8c2f2a" stroke={OL} strokeWidth={7} />;
		case 'shock':
			return <ellipse cx={0} cy={my + 8} rx={18} ry={24} fill="#8c2f2a" stroke={OL} strokeWidth={7} />;
		case 'sad':
			return <path d={`M -24 ${my + 10} Q 0 ${my - 8} 24 ${my + 10}`} stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />;
		case 'wince':
			return <path d={`M -30 ${my} L -15 ${my - 8} L 0 ${my} L 15 ${my - 8} L 30 ${my}`} stroke={OL} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
		case 'think':
			return <path d={`M -10 ${my + 4} L 26 ${my - 4}`} stroke={OL} strokeWidth={8} strokeLinecap="round" />;
		case 'determined':
			return <path d={`M -24 ${my + 2} L 24 ${my + 2}`} stroke={OL} strokeWidth={8} strokeLinecap="round" />;
		default:
			return talk > 0 ? (
				<ellipse cx={0} cy={my + 4} rx={16} ry={4 + talk * 12} fill="#8c2f2a" stroke={OL} strokeWidth={6} />
			) : (
				<path d={`M -16 ${my + 2} Q 0 ${my + 8} 16 ${my + 2}`} stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />
			);
	}
};

// ------------------------------------------------------------------ character
export type Hair = 'guy' | 'wife' | 'boy' | 'boss' | 'old';
export type CharProps = {
	x: number;
	y: number;
	s?: number;
	face?: Face;
	hair?: Hair;
	jacket?: string;
	pants?: string;
	armL?: [number, number]; // [shoulder angle, elbow bend] in degrees; 0 = hanging down, positive = away from body
	armR?: [number, number];
	legL?: number;
	legR?: number;
	bandage?: boolean;
	burns?: boolean;
	cane?: boolean;
	stoop?: number;
	look?: number;
	talk?: number;
	blinkSeed?: number;
	glasses?: boolean;
	mustache?: boolean;
	skirt?: string;
	headTilt?: number;
	kid?: boolean;
	tone?: number; // 0..1 darken (silhouette)
	beard?: boolean;
	hat?: 'souwester';
	hatColor?: string;
	nose?: boolean;
};

export const Char: React.FC<CharProps> = (p) => {
	const {t} = useShot();
	const {
		x,
		y,
		s = 1,
		face = 'neutral',
		hair = 'guy',
		jacket = C.jacket,
		pants = C.pants,
		armL = [12, -8],
		armR = [12, -8],
		legL = 3,
		legR = 3,
		bandage = false,
		burns = false,
		cane = false,
		stoop = 0,
		look = 0,
		talk = 0,
		blinkSeed = 0,
		glasses = false,
		mustache = false,
		skirt,
		headTilt = 0,
		kid = false,
		tone = 0,
		beard = false,
		hat,
		hatColor = C.ochre,
		nose = false,
	} = p;
	const breathe = Math.sin(t * 2.2 + blinkSeed) * 0.012;
	const cyc = (t + blinkSeed * 1.7) % 3.4;
	const blink = cyc > 3.2 && cyc < 3.32 ? 0.15 : 1;
	const legLen = kid ? 80 : 100;
	const hipY = -legLen * 2 - 10;
	const shY = hipY - (kid ? 150 : 210);
	const headY = shY - (kid ? 120 : 140);
	const shoulderX = kid ? 62 : 84;
	const hairCol = hair === 'old' || hair === 'boss' ? C.gray : C.hair;
	const skin = C.skin;
	const body = (
		<g>
			{/* legs */}
			{skirt ? (
				<>
					<Limb from={[-34, hipY + 40]} a1={legL} a2={0} l1={legLen - 20} l2={legLen - 20} w={36} color={skin} end="shoe" flip />
					<Limb from={[34, hipY + 40]} a1={-legR} a2={0} l1={legLen - 20} l2={legLen - 20} w={36} color={skin} end="shoe" />
				</>
			) : (
				<>
					<Limb from={[-38, hipY]} a1={legL} a2={0} l1={legLen} l2={legLen} w={kid ? 38 : 48} color={pants} end="shoe" flip />
					<Limb from={[38, hipY]} a1={-legR} a2={0} l1={legLen} l2={legLen} w={kid ? 38 : 48} color={pants} end="shoe" />
				</>
			)}
			<g transform={`rotate(${stoop * 14} 0 ${hipY})`}>
				{/* torso */}
				{skirt ? (
					<path
						d={`M ${-shoulderX + 10} ${shY} Q 0 ${shY - 16} ${shoulderX - 10} ${shY} L ${shoulderX + 40} ${hipY + 60} Q 0 ${hipY + 80} ${-shoulderX - 40} ${hipY + 60} Z`}
						fill={skirt}
						stroke={OL}
						strokeWidth={OW}
						strokeLinejoin="round"
					/>
				) : (
					<rect x={-shoulderX} y={shY} width={shoulderX * 2} height={hipY - shY + 14} rx={kid ? 34 : 44} fill={jacket} stroke={OL} strokeWidth={OW} />
				)}
				{!skirt && !kid && (
					<g>
						<path d={`M -30 ${shY + 2} L 0 ${shY + 46} L 30 ${shY + 2}`} fill={C.shirt} stroke={OL} strokeWidth={OW - 1} strokeLinejoin="round" />
						<line x1={0} y1={shY + 50} x2={0} y2={hipY + 8} stroke={OL} strokeWidth={5} />
						{[0, 1, 2].map((i) => (
							<circle key={i} cx={-14} cy={shY + 80 + i * 48} r={6} fill={OL} />
						))}
						<rect x={28} y={shY + 70} width={40} height={30} rx={6} fill="none" stroke={OL} strokeWidth={5} />
					</g>
				)}
				{/* arms */}
				<Limb from={[-shoulderX + 8, shY + 26]} a1={-armL[0]} a2={-armL[1]} l1={kid ? 80 : 110} l2={kid ? 70 : 100} w={kid ? 32 : 40} color={skirt ?? jacket} end="hand" />
				<Limb from={[shoulderX - 8, shY + 26]} a1={armR[0]} a2={armR[1]} l1={kid ? 80 : 110} l2={kid ? 70 : 100} w={kid ? 32 : 40} color={skirt ?? jacket} end="hand" />
				{cane && (() => {
					const la = kid ? 80 : 110, lb = kid ? 70 : 100;
					const sx = shoulderX - 8, sy = shY + 26;
					const jx = sx + Math.sin(armR[0] * d2r) * la, jy = sy + Math.cos(armR[0] * d2r) * la;
					const hx = jx + Math.sin((armR[0] + armR[1]) * d2r) * lb, hy = jy + Math.cos((armR[0] + armR[1]) * d2r) * lb;
					const d = `M ${hx} ${hy - 30} L ${hx + 18} ${-hipY * 0 + 0}`;
					return (
						<g>
							<path d={d} stroke={OL} strokeWidth={22} strokeLinecap="round" />
							<path d={d} stroke={C.woodDark} strokeWidth={9} strokeLinecap="round" />
							<circle cx={hx} cy={hy} r={25} fill={C.skin} stroke={OL} strokeWidth={OW} />
						</g>
					);
				})()}
				{burns && (
					<g fill={C.red} opacity={0.75}>
						<ellipse cx={-shoulderX - 8} cy={shY + 110} rx={18} ry={12} />
						<ellipse cx={shoulderX + 12} cy={shY + 150} rx={14} ry={10} />
					</g>
				)}
				{/* neck + head */}
				<rect x={-22} y={headY + 100} width={44} height={shY - headY - 90} fill={skin} stroke={OL} strokeWidth={OW} />
				<g transform={`translate(0 ${headY}) rotate(${headTilt}) scale(${kid ? 0.82 : 1})`}>
					{/* hair back (bun) */}
					{hair === 'wife' && <circle cx={0} cy={-128} r={46} fill={hairCol} stroke={OL} strokeWidth={OW} />}
					{/* ears */}
					<ellipse cx={-112} cy={6} rx={20} ry={28} fill={skin} stroke={OL} strokeWidth={OW} />
					<ellipse cx={112} cy={6} rx={20} ry={28} fill={skin} stroke={OL} strokeWidth={OW} />
					{/* head: egg shape */}
					<path d="M 0 -128 C 78 -128 112 -70 112 0 C 112 82 66 128 0 128 C -66 128 -112 82 -112 0 C -112 -70 -78 -128 0 -128 Z" fill={skin} stroke={OL} strokeWidth={OW} />
					{/* hair */}
					{hair === 'guy' && <path d="M -112 -6 C -122 -96 -60 -140 8 -136 C 80 -134 122 -86 112 -10 C 96 -50 72 -70 40 -80 C 20 -60 -20 -64 -52 -82 C -74 -66 -96 -42 -112 -6 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />}
					{hair === 'old' && <path d="M -112 -2 C -118 -80 -70 -128 4 -130 C 76 -128 118 -84 112 -6 C 100 -40 80 -60 50 -70 C 30 -56 -20 -60 -54 -74 C -78 -58 -98 -36 -112 -2 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />}
					{hair === 'wife' && <path d="M -114 20 C -126 -90 -60 -136 0 -134 C 64 -136 126 -90 114 20 C 104 -30 70 -78 0 -86 C -70 -78 -104 -30 -114 20 Z" fill={hairCol} stroke={OL} strokeWidth={OW} />}
					{hair === 'boy' && <path d="M -114 -4 C -124 -96 -64 -138 0 -136 C 64 -138 124 -96 114 -4 L 80 -40 L 50 -20 L 20 -44 L -14 -22 L -44 -44 L -76 -22 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />}
					{hair === 'boss' && <path d="M -112 -10 C -116 -70 -96 -110 -60 -118 C -50 -96 -90 -70 -108 -10 Z M 112 -10 C 116 -70 96 -110 60 -118 C 50 -96 90 -70 108 -10 Z" fill={hairCol} stroke={OL} strokeWidth={OW} />}
					{/* cheeks */}
					<ellipse cx={-62} cy={34} rx={18} ry={11} fill={C.cheek} opacity={0.55} />
					<ellipse cx={62} cy={34} rx={18} ry={11} fill={C.cheek} opacity={0.55} />
					<Brows face={face} />
					<Eyes face={face} blink={blink} look={look} />
					{glasses && (
						<g fill="none" stroke={OL} strokeWidth={6}>
							<circle cx={-44} cy={-8} r={30} />
							<circle cx={44} cy={-8} r={30} />
							<line x1={-14} y1={-10} x2={14} y2={-10} />
						</g>
					)}
					<path d="M -4 16 Q 8 28 -6 34" stroke={OL} strokeWidth={6} fill="none" strokeLinecap="round" />
					{beard && (
						<path d="M -104 20 C -100 120 -50 176 0 178 C 50 176 100 120 104 20 C 80 60 50 74 0 76 C -50 74 -80 60 -104 20 Z" fill="#f4f1ea" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					)}
					{beard && <path d="M -48 52 Q -20 30 0 44 Q 20 30 48 52 Q 24 64 0 58 Q -24 64 -48 52 Z" fill="#f4f1ea" stroke={OL} strokeWidth={5} />}
					{nose && <ellipse cx={0} cy={22} rx={20} ry={16} fill={C.cheek} stroke={OL} strokeWidth={5} />}
					{mustache && <path d="M -46 40 Q -20 24 0 36 Q 20 24 46 40 Q 24 50 0 44 Q -24 50 -46 40 Z" fill={C.gray} stroke={OL} strokeWidth={5} />}
					{(!beard || face === 'shock' || talk > 0) && <Mouth face={face} talk={talk} />}
					{hair === 'old' && (
						<g stroke={OL} strokeWidth={4} opacity={0.5} fill="none">
							<path d="M -80 18 q 8 6 16 0" />
							<path d="M 64 18 q 8 6 16 0" />
							<path d="M -30 -84 q 30 -8 60 0" />
						</g>
					)}
					{hat === 'souwester' && (
						<g>
							<path d="M -170 -40 Q 0 -90 170 -40 Q 150 0 120 -10 Q 0 -50 -120 -10 Q -150 0 -170 -40 Z" fill={hatColor} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -112 -50 C -116 -150 -50 -176 0 -176 C 50 -176 116 -150 112 -50 Q 0 -80 -112 -50 Z" fill={hatColor} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -60 -150 Q 0 -165 60 -150" fill="none" stroke={OL} strokeWidth={4} opacity={0.5} />
						</g>
					)}
					{bandage && (
						<g>
							<path d="M -116 -50 C -60 -84 60 -84 116 -50 L 112 -18 C 60 -52 -60 -52 -112 -18 Z" fill={C.bandage} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
							<path d="M 70 70 l 34 -10 l 4 26 l -34 10 Z" fill={C.bandage} stroke={OL} strokeWidth={5} />
							<path d="M 76 74 l 24 18 M 100 66 l -18 26" stroke="#d8cfc0" strokeWidth={3} />
						</g>
					)}
				</g>
			</g>
		</g>
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${s} ${s * (1 + breathe)})`}>
			<ellipse cx={0} cy={6} rx={kid ? 70 : 110} ry={16} fill="#000" opacity={0.13} />
			{body}
			{tone > 0 && <g opacity={tone}>{/* silhouette darkening handled by parent */}</g>}
		</g>
	);
};

// ------------------------------------------------------------------ UI pieces
export const NameTag: React.FC<{name: string; role: string; from: number; to?: number; x?: number; y?: number; avatar?: React.ReactNode}> = ({
	name,
	role,
	from,
	to = 1e9,
	x = 60,
	y = 230,
	avatar,
}) => {
	const {t} = useShot();
	if (t < from || t > to + 0.4) return null;
	const a = easeOut(prog(t, from, 0.4)) * (1 - prog(t, to, 0.35));
	const pop = 0.85 + 0.15 * easeOut(prog(t, from, 0.25));
	return (
		<g transform={`translate(${x + (1 - a) * -60} ${y}) scale(${pop})`} opacity={a}>
			<rect x={0} y={0} width={700} height={150} rx={18} fill={C.paper} stroke={OL} strokeWidth={OW} />
			<rect x={0} y={0} width={34} height={150} rx={10} fill={C.red} stroke={OL} strokeWidth={OW} />
			<clipPath id="ntclip"><circle cx={120} cy={75} r={54} /></clipPath>
			<circle cx={120} cy={75} r={54} fill={C.sky} />
			<g clipPath="url(#ntclip)"><g transform="translate(120 85)">{avatar}</g></g>
			<circle cx={120} cy={75} r={54} fill="none" stroke={OL} strokeWidth={OW} />
			<text x={200} y={70} fontFamily="Inter" fontWeight={800} fontSize={50} fill={OL}>
				{name}
			</text>
			<text x={202} y={118} fontFamily="Inter" fontWeight={600} fontSize={34} fill={C.red}>
				{role}
			</text>
		</g>
	);
};

export const Bubble: React.FC<{x: number; y: number; text: string; from: number; to?: number; w?: number; tail?: [number, number]; size?: number; color?: string}> = ({
	x,
	y,
	text,
	from,
	to = 1e9,
	w,
	tail = [-60, 110],
	size = 52,
	color = C.white,
}) => {
	const {t} = useShot();
	if (t < from || t > to + 0.25) return null;
	const a = easeOut(prog(t, from, 0.22)) * (1 - prog(t, to, 0.2));
	const ww = w ?? Math.max(260, text.length * size * 0.62 + 80);
	const h = size * 1.9;
	return (
		<g transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * a})`} opacity={a}>
			<path d={`M ${-30} ${h / 2 - 6} L ${tail[0]} ${tail[1]} L ${30} ${h / 2 - 6} Z`} fill={color} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<rect x={-ww / 2} y={-h / 2} width={ww} height={h} rx={h / 2} fill={color} stroke={OL} strokeWidth={OW} />
			<rect x={-34} y={h / 2 - 14} width={68} height={16} fill={color} />
			<text x={0} y={size * 0.36} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={size} fill={OL}>
				{text}
			</text>
		</g>
	);
};

export const Thought: React.FC<{x: number; y: number; r?: number; from: number; to?: number; children: React.ReactNode; tailTo: [number, number]}> = ({
	x,
	y,
	r = 230,
	from,
	to = 1e9,
	children,
	tailTo,
}) => {
	const {t} = useShot();
	if (t < from || t > to + 0.3) return null;
	const a = easeOut(prog(t, from, 0.35)) * (1 - prog(t, to, 0.25));
	const puffs = 12;
	return (
		<g opacity={a}>
			{[0.25, 0.5, 0.72].map((k, i) => (
				<circle key={i} cx={tailTo[0] + (x - tailTo[0]) * k} cy={tailTo[1] + (y + r * 0.8 - tailTo[1]) * k} r={12 + i * 10} fill={C.white} stroke={OL} strokeWidth={6} />
			))}
			<g transform={`translate(${x} ${y}) scale(${0.7 + 0.3 * a})`}>
				{Array.from({length: puffs}).map((_, i) => {
					const an = (i / puffs) * Math.PI * 2;
					return <circle key={i} cx={Math.cos(an) * r * 1.12} cy={Math.sin(an) * r * 0.78} r={r * 0.3} fill={C.white} stroke={OL} strokeWidth={OW} />;
				})}
				<ellipse cx={0} cy={0} rx={r * 1.15} ry={r * 0.82} fill={C.white} />
				<clipPath id={`th${Math.round(x)}${Math.round(y)}`}>
					<ellipse cx={0} cy={0} rx={r * 1.1} ry={r * 0.78} />
				</clipPath>
				<g clipPath={`url(#th${Math.round(x)}${Math.round(y)})`}>{children}</g>
			</g>
		</g>
	);
};

/** Caption: cream paper label with a red seal mark, centered at y = 1440. */
export const Cap: React.FC<{text: string; from: number; to?: number; big?: boolean; red?: boolean}> = ({text, from, to = 1e9, big = false, red = false}) => {
	const {t} = useShot();
	if (t < from || t > to + 0.35) return null;
	const a = easeOut(prog(t, from, 0.3)) * (1 - prog(t, to, 0.3));
	const size = Math.min(big ? 96 : 54, 760 / (text.length * 0.78));
	const w = text.length * size * 0.78 + 120;
	const h = size * 1.75;
	const bg = red ? C.red : C.paper;
	const fg = red ? C.white : OL;
	return (
		<g transform={`translate(540 1440) rotate(${-1.5 + (1 - a) * -4}) scale(${0.8 + 0.2 * a})`} opacity={a}>
			<rect x={-w / 2 + 8} y={-h / 2 + 10} width={w} height={h} rx={16} fill="#000" opacity={0.18} />
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16} fill={bg} stroke={OL} strokeWidth={OW} />
			<rect x={-w / 2 + 20} y={-h / 2 + 18} width={22} height={h - 36} rx={5} fill={red ? C.paper : C.red} />
			<text x={24} y={size * 0.36} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={fg}>
				{text}
			</text>
		</g>
	);
};

export const shake = (t: number, at: number, dur: number, amp: number) =>
	t > at && t < at + dur ? Math.sin(t * 90) * amp * (1 - (t - at) / dur) : 0;

export const pop = (t: number, at: number, d = 0.35) => {
	const x = clamp((t - at) / d);
	if (x <= 0) return 0;
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
