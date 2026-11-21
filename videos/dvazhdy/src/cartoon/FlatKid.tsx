import React from 'react';
import {useShot} from '../lib';

/**
 * «Flat» character style: thin outlines, big rounded head (~1/3.3 of height), small dot eyes,
 * slim body. Body can stand sideways while the head is turned 3/4 to the camera.
 * Faces right; dir = -1 mirrors. (x, y) = ground point.
 */
export const FL = {ol: '#2e2a2a', w: 4, skin: '#f3cba8', cheek: '#f2a59a'};

type Pose = 'stand' | 'walk' | 'front';
export type FlatKidProps = {
	x: number;
	y: number;
	s?: number;
	dir?: 1 | -1;
	pose?: Pose;
	speed?: number;
	phase?: number;
	face?: 'smile' | 'neutral' | 'surprised' | 'happy' | 'sleepy';
	hairColor?: string;
	top?: string;
	pants?: string;
	shoes?: string;
	tuft?: boolean;
	laces?: boolean;
	freckles?: boolean;
	armUp?: boolean;
};

const shade = (hex: string, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

const limb = (x1: number, y1: number, a: number, b: number, l1: number, l2: number, w: number, color: string, end: 'hand' | 'shoe', endColor: string) => {
	const r = Math.PI / 180;
	const jx = x1 + Math.sin(a * r) * l1;
	const jy = y1 + Math.cos(a * r) * l1;
	const ex = jx + Math.sin((a + b) * r) * l2;
	const ey = jy + Math.cos((a + b) * r) * l2;
	const d = `M ${x1} ${y1} L ${jx} ${jy} L ${ex} ${ey}`;
	return (
		<g>
			<path d={d} stroke={FL.ol} strokeWidth={w + FL.w * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			{end === 'hand' ? (
				<circle cx={ex} cy={ey} r={w * 0.55} fill={endColor} stroke={FL.ol} strokeWidth={FL.w} />
			) : (
				<path d={`M ${ex - w * 0.6} ${ey - 4} L ${ex + w * 0.9} ${ey - 4} Q ${ex + w * 1.3} ${ey + 8} ${ex + w * 0.9} ${ey + 10} L ${ex - w * 0.6} ${ey + 10} Z`} fill={endColor} stroke={FL.ol} strokeWidth={FL.w} strokeLinejoin="round" />
			)}
		</g>
	);
};

export const FlatKid: React.FC<FlatKidProps> = (p) => {
	const {t} = useShot();
	const {x, y, s = 1, dir = 1, pose = 'stand', speed = 1.7, phase = 0, face = 'smile', hairColor = '#7a4a2a', top = '#e8a93a', pants = '#3d5a8a', shoes = '#f4f1ea', tuft = true, laces = true, freckles = true, armUp = false} = p;
	const walk = pose === 'walk' ? 1 : 0;
	const side = pose !== 'front';
	const ph = (t * speed + phase) * Math.PI * 2;
	const sw = Math.sin(ph) * 26 * walk;
	const bend = (k: number) => Math.max(0, k * Math.cos(ph)) * 30 * walk;
	const bob = -Math.abs(Math.cos(ph)) * 6 * walk + Math.sin(t * 2 + phase) * 1.2;
	const blink = (t + phase * 1.7) % 3.4 > 3.28 ? 0.1 : 1;

	const legL = 72;
	const hip = -legL * 2 + bob;
	const sh = hip - 125;
	const headCY = sh - 50;
	const turn = side ? 1 : 0;

	const eyes = () => {
		const ex = 26;
		const cx = turn * 26;
		if (face === 'happy') return [-1, 1].map((k) => <path key={k} d={`M ${cx + k * ex - 11} ${0} Q ${cx + k * ex} ${-12} ${cx + k * ex + 11} ${0}`} stroke={FL.ol} strokeWidth={5} fill="none" strokeLinecap="round" />);
		if (face === 'sleepy') return [-1, 1].map((k) => <path key={k} d={`M ${cx + k * ex - 11} ${-2} L ${cx + k * ex + 11} ${-2}`} stroke={FL.ol} strokeWidth={5} strokeLinecap="round" />);
		const r = face === 'surprised' ? 9 : 7.5;
		return [-1, 1].map((k) => (
			<g key={k}>
				<ellipse cx={cx + k * ex * (1 - turn * 0.15)} cy={-4} rx={r} ry={(r + 2) * blink} fill={FL.ol} />
				<circle cx={cx + k * ex * (1 - turn * 0.15) + 2.5} cy={-8} r={2.4 * blink} fill="#fff" />
			</g>
		));
	};
	const mouth = () => {
		const cx = turn * 30;
		if (face === 'surprised') return <ellipse cx={cx} cy={40} rx={8} ry={10} fill="#7a2a28" stroke={FL.ol} strokeWidth={4} />;
		if (face === 'happy') return <path d={`M ${cx - 16} 32 Q ${cx} 52 ${cx + 16} 32 Z`} fill="#7a2a28" stroke={FL.ol} strokeWidth={4} strokeLinejoin="round" />;
		if (face === 'neutral' || face === 'sleepy') return <path d={`M ${cx - 9} 38 L ${cx + 9} 38`} stroke={FL.ol} strokeWidth={4} strokeLinecap="round" />;
		return <path d={`M ${cx - 13} 33 Q ${cx} 44 ${cx + 13} 33`} stroke={FL.ol} strokeWidth={4} fill="none" strokeLinecap="round" />;
	};

	const armNear = armUp ? [160, 20] : [-sw * 0.9 - (side ? 0 : 8), 14 + Math.abs(sw) * 0.3];
	const armFar = [sw * 0.9 + (side ? 0 : 8), 14 + Math.abs(sw) * 0.3];
	const bodyW = side ? 62 : 88;

	return (
		<g transform={`translate(${x} ${y}) scale(${s * dir} ${s})`}>
			<ellipse cx={0} cy={4} rx={70} ry={10} fill="#000" opacity={0.12} />
			{/* far arm + legs */}
			{side ? limb(-4, sh + 20, armFar[0], armFar[1], 74, 68, 20, shade(top, 0.85), 'hand', shade(FL.skin, 0.93)) : limb(-bodyW / 2 + 4, sh + 22, -10, -6, 74, 68, 20, top, 'hand', FL.skin)}
			{limb(side ? 0 : -20, hip, side ? -sw : 2, side ? -bend(-1) : 0, legL, legL, 40, shade(pants, 0.85), 'shoe', shade(shoes, 0.9))}
			{limb(side ? 0 : 20, hip, side ? sw : -2, side ? -bend(1) : 0, legL, legL, 40, pants, 'shoe', shoes)}
			{/* torso */}
			<path d={`M ${-bodyW * 0.42} ${sh} L ${bodyW * 0.42} ${sh} Q ${bodyW * 0.5} ${sh} ${bodyW * 0.5 + 2} ${sh + 14} L ${bodyW * 0.55} ${hip + 10} Q ${bodyW * 0.55} ${hip + 16} ${bodyW * 0.48} ${hip + 16} L ${-bodyW * 0.48} ${hip + 16} Q ${-bodyW * 0.55} ${hip + 16} ${-bodyW * 0.55} ${hip + 10} L ${-bodyW * 0.5 - 2} ${sh + 14} Q ${-bodyW * 0.5} ${sh} ${-bodyW * 0.42} ${sh} Z`} fill={top} stroke={FL.ol} strokeWidth={FL.w} strokeLinejoin="round" />
			{laces && (
				<g>
					<path d={`M ${side ? 18 : -10} ${sh + 14} q -3 40 1 74 ${side ? '' : `M 10 ${sh + 14} q 3 40 -1 74`}`} stroke="#fffaf0" strokeWidth={4} fill="none" strokeLinecap="round" />
					<rect x={(side ? 15 : -14) - 1} y={sh + 86} width={8} height={12} rx={3} fill="#d9483b" />
					{!side && <rect x={5} y={sh + 86} width={8} height={12} rx={3} fill="#d9483b" />}
				</g>
			)}
			<path d={`M ${-bodyW / 2 + 8} ${sh + 8} Q 0 ${sh - 10} ${bodyW / 2 - 8} ${sh + 8}`} fill={shade(top, 0.9)} stroke={FL.ol} strokeWidth={FL.w} />
			{/* head */}
			<g transform={`translate(${side ? 4 : 0} ${headCY + bob * 0.3}) scale(0.56)`}>
				<rect x={-28} y={78} width={56} height={30} fill={FL.skin} stroke={FL.ol} strokeWidth={FL.w} />
				{!side && <ellipse cx={98} cy={20} rx={12} ry={17} fill={FL.skin} stroke={FL.ol} strokeWidth={FL.w} />}
				<ellipse cx={side ? -80 : -98} cy={20} rx={12} ry={17} fill={FL.skin} stroke={FL.ol} strokeWidth={FL.w} />
				<path d="M -96 -40 Q -96 -66 -70 -66 L 70 -66 Q 96 -66 96 -40 L 96 34 Q 96 96 36 96 L -36 96 Q -96 96 -96 34 Z" fill={FL.skin} stroke={FL.ol} strokeWidth={FL.w} strokeLinejoin="round" />
				{/* hair cap + fringe + tuft (Shnurok) */}
				<g transform="translate(0 10) scale(1.24 0.92)">
					<path d={`M -88 -6 C -96 -86 -50 -104 0 -104 C 54 -104 96 -86 88 -10 L 78 -30 L 66 -14 L 54 -40 L 38 -18 L 22 -44 L 6 -22 L -12 -46 L -28 -22 L -46 -44 L -60 -18 L -74 -36 Z`} fill={hairColor} stroke={FL.ol} strokeWidth={FL.w} strokeLinejoin="round" />
					{tuft && <path d="M 0 -102 C -8 -150 24 -168 46 -154 C 30 -150 22 -138 30 -122 C 40 -140 64 -140 70 -124 C 52 -124 44 -112 42 -100 Z" fill={hairColor} stroke={FL.ol} strokeWidth={FL.w} strokeLinejoin="round" />}
				</g>
				{/* face */}
				<g transform="translate(0 16)">
				<ellipse cx={turn * 26 - 44} cy={20} rx={13} ry={8} fill={FL.cheek} opacity={0.6} />
				<ellipse cx={turn * 26 + 44} cy={20} rx={13} ry={8} fill={FL.cheek} opacity={0.6} />
				{freckles && [[-50, 14], [-40, 22], [38, 14], [48, 22]].map(([fx, fy], i) => <circle key={i} cx={turn * 26 + fx} cy={fy} r={2.2} fill="#b86a4a" />)}
				<path d={`M ${turn * 26 - 36} -28 l 18 -3 M ${turn * 26 + 18} -31 l 18 3`} stroke={FL.ol} strokeWidth={4.5} strokeLinecap="round" />
				{eyes()}
				<path d={`M ${turn * 30 + 2} 6 q 8 8 -2 14`} stroke={FL.ol} strokeWidth={4} fill="none" strokeLinecap="round" />
				{mouth()}
				</g>
			</g>
			{/* near arm */}
			{side ? limb(10, sh + 20, armNear[0], armNear[1], 74, 68, 20, top, 'hand', FL.skin) : limb(bodyW / 2 - 4, sh + 22, armUp ? 160 : 10, armUp ? 20 : 6, 74, 68, 20, top, 'hand', FL.skin)}
		</g>
	);
};
