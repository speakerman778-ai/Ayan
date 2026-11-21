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
export type Face = 'neutral' | 'smile' | 'shock' | 'laugh' | 'sad' | 'wince' | 'think' | 'closed' | 'determined' | 'joy';

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
		joy: [-14, 0],
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
		case 'joy':
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
export type Hair = 'guy' | 'wife' | 'boy' | 'boss' | 'old' | 'lyokha' | 'sweep' | 'curly' | 'crew' | 'shaggy' | 'quiff' | 'middle' | 'buzz' | 'beanie' | 'goggles' | 'capback' | 'phones' | 'tips';
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
	headS?: number; // head size multiplier
	bodyS?: number; // torso + legs length multiplier
	headDrop?: number; // move head down toward shoulders
	armROver?: boolean; // draw right arm in front of the head (hand on head)
	hairColor?: string;
	headOnly?: boolean; // draw only the head (used by side-view bodies)
	acc?: 'phones' | 'phonesNeck' | 'goggles' | 'bow' | 'tipped' | 'pencil' | 'star' | 'bandaid';
	foreR?: number; // right forearm length multiplier
	freckles?: boolean;
	hoodie?: boolean; // hood + drawstrings + pocket instead of shirt collar and buttons
	patch?: boolean; // little planet patch on the chest
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
		headS = 1,
		bodyS = 1,
		headDrop = 0,
		armROver = false,
		hairColor,
		headOnly = false,
		acc,
		foreR = 1,
		freckles = false,
		hoodie = false,
		patch = false,
	} = p;
	const breathe = Math.sin(t * 2.2 + blinkSeed) * 0.012;
	const cyc = (t + blinkSeed * 1.7) % 3.4;
	const blink = cyc > 3.2 && cyc < 3.32 ? 0.15 : 1;
	const legLen = (kid ? 80 : 100) * bodyS;
	const hipY = -legLen * 2 - 10;
	const shY = hipY - (kid ? 150 : 210) * bodyS;
	const headY = shY - (kid ? 120 : 140) * headS + headDrop;
	const shoulderX = kid ? 62 : 84;
	const hairCol = hairColor ?? (hair === 'old' || hair === 'boss' ? C.gray : C.hair);
	const skin = C.skin;
	const body = (
		<g>
			{!headOnly && (<>
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
			</>)}
			<g transform={`rotate(${stoop * 14} 0 ${hipY})`}>
				{!headOnly && (<>
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
				{!skirt && !kid && !hoodie && (
					<g>
						<path d={`M -30 ${shY + 2} L 0 ${shY + 46} L 30 ${shY + 2}`} fill={C.shirt} stroke={OL} strokeWidth={OW - 1} strokeLinejoin="round" />
						<line x1={0} y1={shY + 50} x2={0} y2={hipY + 8} stroke={OL} strokeWidth={5} />
						{[0, 1, 2].map((i) => (
							<circle key={i} cx={-14} cy={shY + 80 + i * 48} r={6} fill={OL} />
						))}
						<rect x={28} y={shY + 70} width={40} height={30} rx={6} fill="none" stroke={OL} strokeWidth={5} />
					</g>
				)}
				{hoodie && (
					<g>
						<path d={`M ${-shoulderX + 6} ${shY + 8} Q 0 ${shY + 70} ${shoulderX - 6} ${shY + 8} Q 0 ${shY + 34} ${-shoulderX + 6} ${shY + 8} Z`} fill={jacket} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
						<path d={`M -18 ${shY + 40} Q -26 ${shY + 100} -20 ${shY + 150} M 18 ${shY + 40} Q 28 ${shY + 110} 24 ${shY + 140}`} stroke={OL} strokeWidth={9} fill="none" strokeLinecap="round" />
						<path d={`M -18 ${shY + 40} Q -26 ${shY + 100} -20 ${shY + 150} M 18 ${shY + 40} Q 28 ${shY + 110} 24 ${shY + 140}`} stroke={C.white} strokeWidth={4} fill="none" strokeLinecap="round" />
						<rect x={-27} y={shY + 146} width={14} height={22} rx={5} fill={C.red} stroke={OL} strokeWidth={4} />
						<rect x={17} y={shY + 136} width={14} height={22} rx={5} fill={C.red} stroke={OL} strokeWidth={4} />
						<path d={`M -56 ${hipY - 86} L 56 ${hipY - 86} L 70 ${hipY - 14} L -70 ${hipY - 14} Z`} fill="none" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
						<path d={`M -${shoulderX - 4} ${hipY - 4} L ${shoulderX - 4} ${hipY - 4}`} stroke={OL} strokeWidth={5} />
					</g>
				)}
				{patch && (
					<g transform={`translate(44 ${shY + 74})`}>
						<circle r={20} fill="#5b86c4" stroke={OL} strokeWidth={4} />
						<ellipse rx={32} ry={9} fill="none" stroke={C.red} strokeWidth={5} transform="rotate(-18)" />
						<circle cx={-6} cy={-6} r={4} fill="#fff" opacity={0.8} />
					</g>
				)}
				{/* arms */}
				<Limb from={[-shoulderX + 8, shY + 26]} a1={-armL[0]} a2={-armL[1]} l1={kid ? 80 : 110} l2={kid ? 70 : 100} w={kid ? 32 : 40} color={skirt ?? jacket} end="hand" />
				<Limb from={[shoulderX - 8, shY + 26]} a1={armR[0]} a2={armR[1]} l1={kid ? 80 : 110} l2={(kid ? 70 : 100) * foreR} w={kid ? 32 : 40} color={skirt ?? jacket} end="hand" />
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
				</>)}
				{/* neck + head */}
				{!headOnly && <rect x={-22} y={headY + 100 * headS} width={44} height={shY - headY - 90 * headS} fill={skin} stroke={OL} strokeWidth={OW} />}
				<g transform={`translate(0 ${headY}) rotate(${headTilt}) scale(${(kid ? 0.82 : 1) * headS})`}>
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
					{hair === 'lyokha' && (
						<g>
							<path d="M 6 -128 C -6 -186 34 -214 62 -196 C 40 -192 30 -176 40 -156 C 52 -180 84 -180 92 -160 C 70 -160 60 -146 56 -128 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -114 -2 C -126 -98 -62 -142 6 -138 C 80 -136 126 -90 114 -6 L 96 -34 L 84 -18 L 66 -52 L 46 -30 L 26 -60 L 4 -36 L -18 -62 L -38 -36 L -62 -58 L -78 -30 L -96 -46 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
						</g>
					)}
					{hair === 'sweep' && (
						<path d="M -114 6 C -128 -100 -60 -144 10 -138 C 84 -134 126 -84 114 0 C 106 -40 90 -58 70 -66 C 30 -40 -40 -40 -100 -10 C -104 -2 -110 4 -114 6 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					)}
					{hair === 'curly' && (
						<g fill={hairCol} stroke={OL} strokeWidth={OW}>
							{[[-104, -20, 34], [-96, -70, 38], [-60, -108, 40], [-12, -126, 40], [38, -118, 40], [80, -90, 38], [104, -42, 34], [-40, -98, 30], [10, -104, 30], [56, -92, 28]].map(([cx, cy, r], i) => (
								<circle key={i} cx={cx} cy={cy} r={r} />
							))}
						</g>
					)}
					{hair === 'crew' && (
						<g>
							<path d="M -112 -10 C -118 -96 -60 -136 0 -136 C 60 -136 118 -96 112 -10 C 100 -54 70 -78 0 -82 C -70 -78 -100 -54 -112 -10 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -60 -110 l 6 -10 M -20 -122 l 4 -10 M 20 -122 l 4 -10 M 60 -110 l 6 -10" stroke={OL} strokeWidth={5} strokeLinecap="round" />
						</g>
					)}
					{hair === 'shaggy' && (
						<path d="M -126 40 C -140 -90 -70 -146 0 -142 C 70 -146 140 -90 126 40 L 108 10 L 100 34 L 92 -30 L 70 -6 L 58 -56 L 34 -30 L 16 -66 L -6 -36 L -28 -66 L -46 -30 L -66 -58 L -80 -10 L -98 -32 L -102 30 L -114 4 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					)}
					{hair === 'quiff' && (
						<path d="M -112 -6 C -118 -80 -90 -112 -60 -122 C -40 -170 40 -186 96 -150 C 70 -150 60 -140 66 -128 C 100 -110 118 -70 112 -6 C 100 -46 78 -66 50 -74 C 10 -62 -40 -66 -80 -60 C -96 -44 -106 -26 -112 -6 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					)}
					{hair === 'middle' && (
						<g fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round">
							<path d="M 0 -136 C -70 -138 -124 -96 -116 10 C -96 -40 -60 -60 -30 -66 C -14 -80 -4 -106 0 -136 Z" />
							<path d="M 0 -136 C 70 -138 124 -96 116 10 C 96 -40 60 -60 30 -66 C 14 -80 4 -106 0 -136 Z" />
						</g>
					)}
					{hair === 'buzz' && (
						<g>
							<path d="M -110 -20 C -116 -100 -60 -132 0 -132 C 60 -132 116 -100 110 -20 C 96 -70 60 -92 0 -94 C -60 -92 -96 -70 -110 -20 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							{[-70, -40, -10, 20, 50, 80].map((dx, i) => (
								<circle key={i} cx={dx} cy={-112 + Math.abs(dx) * 0.12} r={3} fill={OL} opacity={0.5} />
							))}
						</g>
					)}
					{hair === 'beanie' && (
						<g>
							<path d="M -112 -2 C -116 -40 -100 -60 -80 -62 L 80 -62 C 100 -60 116 -40 112 -2 C 90 -30 60 -40 0 -42 C -60 -40 -90 -30 -112 -2 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -116 -84 C -120 -164 -60 -184 0 -184 C 60 -184 120 -164 116 -84 Z" fill={C.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<rect x={-124} y={-104} width={248} height={44} rx={18} fill={C.red} stroke={OL} strokeWidth={OW} />
							{[-90, -54, -18, 18, 54, 90].map((dx) => (
								<line key={dx} x1={dx} y1={-98} x2={dx} y2={-66} stroke={OL} strokeWidth={4} opacity={0.5} />
							))}
							<circle cx={0} cy={-190} r={22} fill={C.white} stroke={OL} strokeWidth={OW} />
						</g>
					)}
					{hair === 'goggles' && (
						<g>
							<path d="M -116 10 C -130 -100 -64 -146 0 -142 C 64 -146 130 -100 116 10 L 100 -20 L 86 0 L 76 -50 L 50 -40 L 30 -60 L 0 -46 L -30 -60 L -50 -40 L -76 -50 L -86 0 L -100 -20 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -118 -84 Q 0 -112 118 -84 L 118 -66 Q 0 -94 -118 -66 Z" fill="#3a3f55" stroke={OL} strokeWidth={6} />
							{[-1, 1].map((k) => (
								<g key={k} transform={`translate(${k * 44} -96)`}>
									<ellipse rx={40} ry={30} fill="#c9963e" stroke={OL} strokeWidth={OW} />
									<ellipse rx={28} ry={20} fill="#6fb4d0" stroke={OL} strokeWidth={5} />
									<path d="M -14 -8 Q -6 -14 4 -12" stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" />
								</g>
							))}
						</g>
					)}
					{hair === 'capback' && (
						<g>
							<path d="M -112 0 C -112 -40 -100 -60 -86 -66 L 86 -66 C 100 -60 112 -40 112 0 C 96 -30 70 -44 40 -48 L 30 -30 L 14 -50 L -4 -30 L -20 -50 L -40 -32 L -50 -50 C -80 -44 -100 -26 -112 0 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -114 -84 C -118 -164 -60 -182 0 -182 C 60 -182 118 -164 114 -84 Z" fill="#3d7a5a" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M 70 -164 Q 130 -184 168 -144 Q 140 -134 104 -136 Z" fill="#2f6248" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<rect x={-114} y={-96} width={228} height={18} rx={6} fill="#2f6248" stroke={OL} strokeWidth={5} />
							<circle cx={0} cy={-182} r={10} fill="#2f6248" stroke={OL} strokeWidth={5} />
						</g>
					)}
					{hair === 'phones' && (
						<g>
							<path d="M -116 0 C -126 -100 -60 -142 0 -140 C 60 -142 126 -100 116 0 C 100 -40 80 -54 56 -62 L 40 -40 L 26 -66 L 4 -44 L -16 -70 L -36 -44 L -54 -66 C -84 -56 -104 -36 -116 0 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -122 -10 C -130 -170 130 -170 122 -10" fill="none" stroke={OL} strokeWidth={26} strokeLinecap="round" />
							<path d="M -122 -10 C -130 -170 130 -170 122 -10" fill="none" stroke={C.red} strokeWidth={12} strokeLinecap="round" />
							{[-1, 1].map((k) => (
								<g key={k}>
									<rect x={k * 122 - 26} y={-30} width={52} height={76} rx={22} fill={C.red} stroke={OL} strokeWidth={OW} />
									<rect x={k * 122 - 12} y={-16} width={24} height={48} rx={10} fill="#3a3f55" />
								</g>
							))}
						</g>
					)}
					{hair === 'tips' && (
						<g>
							<path d="M -40 -120 L -62 -200 L -26 -170 L -18 -250 L 6 -180 L 30 -240 L 34 -170 L 66 -206 L 50 -120 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -55 -175 L -62 -200 L -40 -182 Z M -21 -212 L -18 -250 L -6 -214 Z M 24 -212 L 30 -240 L 33 -208 Z M 56 -186 L 66 -206 L 61 -174 Z" fill={C.ochre} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
							<path d="M -116 4 C -128 -100 -64 -146 0 -144 C 64 -146 128 -100 116 4 L 104 -30 L 96 -6 L 84 -60 L 62 -40 L 52 -86 L 28 -60 L 10 -100 L -10 -62 L -32 -98 L -48 -58 L -70 -84 L -78 -40 L -98 -56 L -100 -6 Z" fill={hairCol} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
						</g>
					)}
					{hair === 'boss' && <path d="M -112 -10 C -116 -70 -96 -110 -60 -118 C -50 -96 -90 -70 -108 -10 Z M 112 -10 C 116 -70 96 -110 60 -118 C 50 -96 90 -70 108 -10 Z" fill={hairCol} stroke={OL} strokeWidth={OW} />}
					{acc === 'tipped' && (
						<path d="M 16 -170 C 14 -192 34 -214 62 -196 C 40 -192 30 -180 32 -168 Z M 52 -168 C 62 -182 84 -180 92 -160 C 74 -160 64 -154 60 -146 Z" fill={C.ochre} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
					)}
					{acc === 'bow' && (
						<g transform="translate(30 -150) rotate(-10)">
							<path d="M 0 0 L -34 -18 L -30 18 Z M 0 0 L 34 -18 L 30 18 Z" fill={C.red} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
							<circle r={9} fill={C.red} stroke={OL} strokeWidth={5} />
							<path d="M -4 8 Q -12 40 -2 56 M 4 8 Q 14 36 8 60" fill="none" stroke={OL} strokeWidth={9} strokeLinecap="round" />
							<path d="M -4 8 Q -12 40 -2 56 M 4 8 Q 14 36 8 60" fill="none" stroke={C.white} strokeWidth={4} strokeLinecap="round" />
						</g>
					)}
					{acc === 'star' && (
						<path transform="translate(-70 -96) rotate(-12)" d="M 0 -26 L 8 -8 L 26 -8 L 12 4 L 18 24 L 0 12 L -18 24 L -12 4 L -26 -8 L -8 -8 Z" fill={C.ochre} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
					)}
					{acc === 'pencil' && (
						<g transform="translate(128 -6) rotate(-78)">
							<rect x={-70} y={-9} width={120} height={18} fill={C.ochre} stroke={OL} strokeWidth={5} />
							<rect x={-86} y={-9} width={18} height={18} fill="#f29b8a" stroke={OL} strokeWidth={5} />
							<path d="M 50 -9 L 76 0 L 50 9 Z" fill="#f6c9a0" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
							<path d="M 68 -3 L 76 0 L 68 3 Z" fill={OL} />
						</g>
					)}
					{acc === 'goggles' && (
						<g>
							<path d="M -116 -90 Q 0 -118 116 -90 L 116 -72 Q 0 -100 -116 -72 Z" fill="#3a3f55" stroke={OL} strokeWidth={6} />
							{[-1, 1].map((k) => (
								<g key={k} transform={`translate(${k * 44} -100)`}>
									<ellipse rx={38} ry={28} fill="#c9963e" stroke={OL} strokeWidth={OW} />
									<ellipse rx={26} ry={18} fill="#6fb4d0" stroke={OL} strokeWidth={5} />
								</g>
							))}
						</g>
					)}
					{acc === 'phones' && (
						<g>
							<path d="M -122 -10 C -130 -170 130 -170 122 -10" fill="none" stroke={OL} strokeWidth={26} strokeLinecap="round" />
							<path d="M -122 -10 C -130 -170 130 -170 122 -10" fill="none" stroke={C.red} strokeWidth={12} strokeLinecap="round" />
							{[-1, 1].map((k) => (
								<g key={k}>
									<rect x={k * 122 - 26} y={-30} width={52} height={76} rx={22} fill={C.red} stroke={OL} strokeWidth={OW} />
									<rect x={k * 122 - 12} y={-16} width={24} height={48} rx={10} fill="#3a3f55" />
								</g>
							))}
						</g>
					)}
					{acc === 'phonesNeck' && (
						<g>
							<path d="M -110 150 C -110 220 110 220 110 150" fill="none" stroke={OL} strokeWidth={24} strokeLinecap="round" />
							<path d="M -110 150 C -110 220 110 220 110 150" fill="none" stroke="#3a3f55" strokeWidth={10} strokeLinecap="round" />
							{[-1, 1].map((k) => (
								<g key={k}>
									<ellipse cx={k * 110} cy={150} rx={36} ry={44} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
									<ellipse cx={k * 110} cy={150} rx={20} ry={26} fill={C.ochre} stroke={OL} strokeWidth={5} />
								</g>
							))}
						</g>
					)}
					{/* cheeks */}
					<ellipse cx={-62} cy={34} rx={18} ry={11} fill={C.cheek} opacity={0.55} />
					<ellipse cx={62} cy={34} rx={18} ry={11} fill={C.cheek} opacity={0.55} />
					{freckles && (
						<g fill="#b86a4a">
							{[[-74, 22], [-58, 30], [-80, 38], [-64, 44], [74, 22], [58, 30], [80, 38], [64, 44]].map(([fx, fy], i) => (
								<circle key={i} cx={fx} cy={fy} r={3.5} />
							))}
						</g>
					)}
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
						<g>
							<path d="M -92 34 C -96 92 -56 128 -22 132 L 0 150 L 22 132 C 56 128 96 92 92 34 C 70 62 40 72 0 72 C -40 72 -70 62 -92 34 Z" fill="#f4f1ea" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
							<path d="M -46 90 q 8 14 18 4 M 28 94 q 10 10 18 -4 M -6 112 q 6 12 14 0" fill="none" stroke="#cfc8bb" strokeWidth={5} strokeLinecap="round" />
							<path d="M -50 50 Q -24 30 0 44 Q 24 30 50 50 Q 28 62 0 56 Q -28 62 -50 50 Z" fill="#f4f1ea" stroke={OL} strokeWidth={5} />
						</g>
					)}
					{nose && <ellipse cx={0} cy={22} rx={20} ry={16} fill={C.cheek} stroke={OL} strokeWidth={5} />}
					{acc === 'bandaid' && (
						<g transform="translate(70 26) rotate(-25)">
							<rect x={-30} y={-11} width={60} height={22} rx={10} fill="#f2d2a8" stroke={OL} strokeWidth={5} />
							<rect x={-10} y={-11} width={20} height={22} fill="#e8b888" stroke={OL} strokeWidth={4} />
						</g>
					)}
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
				{armROver && <Limb from={[shoulderX - 8, shY + 26]} a1={armR[0]} a2={armR[1]} l1={kid ? 80 : 110} l2={(kid ? 70 : 100) * foreR} w={kid ? 32 : 40} color={skirt ?? jacket} end="hand" />}
			</g>
		</g>
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${s} ${s * (1 + breathe)})`}>
			{!headOnly && <ellipse cx={0} cy={6} rx={kid ? 70 : 110} ry={16} fill="#000" opacity={0.13} />}
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
