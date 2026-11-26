import React from 'react';
import {useShot} from '../lib';
import {C, Char, Face, Hair, Limb, OL, OW} from './parts';

/**
 * Side-view (profile) character in the channel style. Faces right; dir=-1 mirrors.
 * (x, y) = point between the feet on the ground. Walk cycle driven by `walk` (0 = standing) and scene time.
 */
export type SideFace = 'smile' | 'neutral' | 'shock' | 'closed' | 'joy' | 'think' | 'sad' | 'determined' | 'wince';
export type SideProps = {
	x: number;
	y: number;
	s?: number;
	dir?: 1 | -1;
	walk?: number; // 0..1 amount of walking
	speed?: number; // steps per second
	face?: SideFace;
	hair?: 'lyokha' | 'old' | 'short' | 'curly' | 'bun' | 'long' | 'pigtails';
	headLower?: number;
	hairColor?: string;
	jacket?: string;
	pants?: string;
	shoes?: string;
	hoodie?: boolean;
	freckles?: boolean;
	beard?: boolean;
	hat?: boolean;
	hatColor?: string;
	headS?: number;
	bodyS?: number;
	armFront?: [number, number]; // override near arm [shoulder, elbow]
	phase?: number;
	talk?: number;
	/** Body sideways, face to the camera (default). false = full profile head. */
	frontFace?: boolean;
	frontHair?: Hair;
	mustache?: boolean;
	glasses?: boolean;
	nose?: boolean;
	hatFront?: 'souwester';
	look?: number;
	/** 0..1 kick cycle of the near leg: wind-up (0–0.4) then strike (0.4–1). */
	kick?: number;
	/** 0..1 knee bend for jump take-off / landing squash. */
	crouch?: number;
};

const shade = (hex: string, k: number) => {
	const p = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	return '#' + p.map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('');
};

export const SideChar: React.FC<SideProps> = (p) => {
	const {t} = useShot();
	const {
		x,
		y,
		s = 1,
		dir = 1,
		walk = 0,
		speed = 1.6,
		face = 'smile',
		hair = 'short',
		hairColor = C.hair,
		jacket = C.jacket,
		pants = C.pants,
		shoes = C.shoes,
		hoodie = false,
		freckles = false,
		beard = false,
		hat = false,
		hatColor = '#f2c230',
		headS = 0.82,
		bodyS = 1.14,
		armFront,
		phase = 0,
		talk = 0,
		frontFace = true,
		frontHair,
		mustache = false,
		glasses = false,
		nose = false,
		hatFront,
		look = 0.6,
		headLower = 0,
		kick = 0,
		crouch = 0,
	} = p;
	const ph = (t * speed + phase) * Math.PI * 2;
	const sw = Math.sin(ph) * 28 * walk; // leg swing
	const bendF = Math.max(0, Math.cos(ph)) * 34 * walk;
	const bendB = Math.max(0, -Math.cos(ph)) * 34 * walk;
	const bob = -Math.abs(Math.cos(ph)) * 8 * walk + Math.sin(t * 2.2 + phase) * 1.5 * (1 - walk);
	const blink = (t + phase * 1.3) % 3.3 > 3.18 ? 0.15 : 1;

	const legLen = 100 * bodyS;
	const hipY = -legLen * 2 - 10 + bob + crouch * legLen * 0.45;
	const shY = hipY - 200 * bodyS;
	const headY = shY - 118 * headS + 10;

	const leg = (a: number, bend: number, back: boolean) => (
		<Limb from={[0, hipY]} a1={a} a2={-bend} l1={legLen} l2={legLen} w={46} color={back ? shade(pants, 0.82) : pants} end="shoe" endColor={back ? shade(shoes, 0.8) : shoes} />
	);
	const arm = (a: number, bend: number, back: boolean) => (
		<Limb from={[6, shY + 30]} a1={a} a2={bend} l1={105} l2={95} w={38} color={back ? shade(jacket, 0.82) : jacket} end="hand" endColor={back ? shade(C.skin, 0.9) : C.skin} />
	);
	const armA = armFront ?? [-sw * 0.8, 18 + Math.abs(sw) * 0.3];

	return (
		<g transform={`translate(${x} ${y}) scale(${s * dir} ${s})`}>
			<ellipse cx={0} cy={6} rx={95} ry={14} fill="#000" opacity={0.13} />
			{/* far limbs */}
			{arm(sw * 0.8, 18 + Math.abs(sw) * 0.3, true)}
			{leg(-sw + crouch * 28, bendB + crouch * 62, true)}
			{kick > 0
				? leg(kick < 0.4 ? 48 * (kick / 0.4) : 48 - 140 * Math.min(1, (kick - 0.4) / 0.35), kick < 0.4 ? -70 * (kick / 0.4) : -70 * Math.max(0, 1 - (kick - 0.4) / 0.25), false)
				: leg(sw + crouch * 28, bendF + crouch * 62, false)}
			{/* torso (side) */}
			<path d={`M -52 ${shY + 10} Q -64 ${shY} -40 ${shY - 6} L 40 ${shY - 6} Q 66 ${shY} 60 ${shY + 30} L 54 ${hipY + 14} Q 0 ${hipY + 26} -54 ${hipY + 14} Z`} fill={jacket} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			{hoodie && (
				<g>
					<path d={`M -56 ${shY + 6} Q -84 ${shY - 30} -40 ${shY - 22} Q -20 ${shY + 30} -56 ${shY + 6} Z`} fill={shade(jacket, 0.9)} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
					<path d={`M 40 ${shY + 20} Q 52 ${shY + 80} 46 ${shY + 130}`} stroke={OL} strokeWidth={9} fill="none" strokeLinecap="round" />
					<path d={`M 40 ${shY + 20} Q 52 ${shY + 80} 46 ${shY + 130}`} stroke={C.white} strokeWidth={4} fill="none" strokeLinecap="round" />
					<rect x={39} y={shY + 126} width={14} height={22} rx={5} fill={C.red} stroke={OL} strokeWidth={4} />
					<path d={`M -10 ${hipY - 80} L 50 ${hipY - 80} L 54 ${hipY - 10} L -14 ${hipY - 10} Z`} fill="none" stroke={OL} strokeWidth={5} />
				</g>
			)}
			{/* neck + head */}
			<rect x={-14} y={shY - 40} width={36} height={46} fill={C.skin} stroke={OL} strokeWidth={OW} />
			{frontFace ? (
				<g transform={`translate(0 ${-18 + headLower})`}>
				<Char x={8} y={headY + 574.2 - 140 * headS + 140 * 0.82 - (headY - (shY - 118 * headS + 10))} s={1} headOnly headS={headS} bodyS={1.14} headDrop={18 + (headY - (shY - 118 * headS + 10)) + ((shY - 118 * headS + 10) - (-477.4 - 140 * headS + 18)) - (shY - (-477.4))} hair={frontHair ?? (hair === 'old' ? 'old' : hair === 'lyokha' ? 'lyokha' : hair === 'curly' ? 'curly' : hair === 'long' || hair === 'bun' ? 'long' : hair === 'pigtails' ? 'pigtails' : 'guy')} hairColor={hairColor} freckles={freckles} beard={beard} nose={nose} mustache={mustache} glasses={glasses} hat={hatFront ?? (hat ? 'souwester' : undefined)} hatColor={hatColor} face={(face === 'joy' ? 'laugh' : face) as Face} look={look} talk={talk} turn={1} />
				</g>
			) : (
			<g transform={`translate(10 ${headY}) scale(${headS})`}>
				{hair === 'curly' && <circle cx={-40} cy={-60} r={90} fill={hairColor} stroke={OL} strokeWidth={OW} />}
				{hair === 'bun' && <circle cx={-80} cy={-110} r={42} fill={hairColor} stroke={OL} strokeWidth={OW} />}
				{/* head oval */}
				<ellipse cx={0} cy={0} rx={108} ry={122} fill={C.skin} stroke={OL} strokeWidth={OW} />
				{/* nose bump on the front edge */}
				<path d="M 100 -6 Q 132 10 104 30" fill={C.skin} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<path d="M 99 -8 L 99 32" stroke={C.skin} strokeWidth={10} />
				{beard && <path d="M 100 40 Q 96 120 20 132 Q -40 136 -60 70 Q 0 90 60 50 Z" fill="#f4f1ea" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />}
				{/* hair */}
				{hair !== 'old' && hair !== 'curly' && (
					<path
						d="M -110 30 C -132 -90 -40 -140 30 -132 C 80 -128 110 -96 112 -50 L 92 -66 L 80 -40 L 62 -74 L 42 -46 L 20 -80 L 0 -50 L -30 -60 Q -60 -10 -70 40 Q -90 50 -110 30 Z"
						fill={hairColor}
						stroke={OL}
						strokeWidth={OW}
						strokeLinejoin="round"
					/>
				)}
				{hair === 'curly' && <circle cx={20} cy={-80} r={60} fill={hairColor} stroke={OL} strokeWidth={OW} />}
				{hair === 'lyokha' && (
					<path d="M 6 -128 C -6 -186 34 -214 62 -196 C 40 -192 30 -176 40 -156 C 52 -180 84 -180 92 -160 C 70 -160 60 -146 56 -128 Z" fill={hairColor} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				)}
				{hair === 'old' && <path d="M -108 20 C -120 -50 -90 -90 -50 -100 Q -70 -40 -64 20 Z" fill={C.gray} stroke={OL} strokeWidth={OW} />}
				{/* ear */}
				<ellipse cx={-18} cy={8} rx={20} ry={28} fill={C.skin} stroke={OL} strokeWidth={OW} />
				<path d="M -22 -2 q 10 10 0 22" stroke={OL} strokeWidth={4} fill="none" />
				{/* cheek + freckles */}
				<ellipse cx={58} cy={38} rx={18} ry={11} fill={C.cheek} opacity={0.55} />
				{freckles && [[48, 28], [62, 34], [70, 26], [54, 44]].map(([fx, fy], i) => <circle key={i} cx={fx} cy={fy} r={3.5} fill="#b86a4a" />)}
				{/* eye */}
				{face === 'closed' ? (
					<path d="M 50 -10 Q 66 4 82 -10" stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />
				) : face === 'joy' ? (
					<path d="M 50 -4 Q 66 -22 82 -4" stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />
				) : face === 'shock' ? (
					<g>
						<ellipse cx={66} cy={-8} rx={22} ry={28 * blink} fill="#fff" stroke={OL} strokeWidth={6} />
						<circle cx={72} cy={-8} r={8} fill={OL} />
					</g>
				) : (
					<g>
						<ellipse cx={68} cy={-8} rx={17} ry={23 * blink} fill={OL} />
						<circle cx={74} cy={-16} r={6 * blink} fill="#fff" />
						<circle cx={63} cy={1} r={3 * blink} fill="#fff" />
					</g>
				)}
				{/* brow */}
				<path d={face === 'think' ? 'M 46 -54 L 88 -46' : face === 'shock' ? 'M 46 -60 Q 66 -72 88 -60' : 'M 46 -50 Q 66 -58 88 -50'} stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />
				{/* mouth */}
				{talk > 0 || face === 'joy' || face === 'shock' ? (
					<ellipse cx={84} cy={60} rx={14} ry={face === 'joy' ? 14 : 6 + talk * 10} fill="#8c2f2a" stroke={OL} strokeWidth={5} />
				) : face === 'smile' ? (
					<path d="M 66 52 Q 84 66 100 50" stroke={OL} strokeWidth={7} fill="none" strokeLinecap="round" />
				) : (
					<path d="M 72 58 L 98 56" stroke={OL} strokeWidth={7} strokeLinecap="round" />
				)}
				{hat && (
					<g>
						<path d="M -120 -40 Q 0 -70 130 -30 L 140 -10 Q 0 -50 -130 -20 Z" fill={hatColor} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
						<path d="M -96 -44 C -100 -140 -30 -168 20 -168 C 80 -168 110 -130 104 -40 Q 0 -66 -96 -44 Z" fill={hatColor} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					</g>
				)}
			</g>
			)}
			{/* near arm on top */}
			{arm(armA[0], armA[1], false)}
		</g>
	);
};

/** Шнурок in profile. */
export const ShnurokSide: React.FC<Omit<SideProps, 'hair' | 'hairColor' | 'jacket' | 'pants' | 'hoodie' | 'freckles'>> = (p) => (
	<SideChar {...p} hair="lyokha" hairColor="#7a4a2a" jacket="#e8a93a" pants="#3d5a8a" hoodie freckles />
);
