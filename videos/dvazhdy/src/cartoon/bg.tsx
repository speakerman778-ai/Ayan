import React from 'react';
import {useShot, hash} from '../lib';
import {C, OL, OW} from './parts';

/** Japanese room: plaster wall, wooden posts, shoji, tatami floor. */
export const Room: React.FC<{floorY?: number; wall?: string; shoji?: boolean; window?: boolean}> = ({floorY = 1330, wall = C.wall, shoji = true, window = true}) => (
	<g>
		<rect width={1080} height={1920} fill={wall} />
		{/* subtle plaster texture */}
		{Array.from({length: 40}).map((_, i) => (
			<circle key={i} cx={hash(i) * 1080} cy={hash(i + 3) * floorY} r={2 + hash(i + 9) * 3} fill="#000" opacity={0.035} />
		))}
		<rect x={0} y={250} width={1080} height={36} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
		<rect x={30} y={250} width={40} height={floorY - 250} fill={C.wood} stroke={OL} strokeWidth={OW} />
		<rect x={1010} y={250} width={40} height={floorY - 250} fill={C.wood} stroke={OL} strokeWidth={OW} />
		{shoji && (
			<g>
				<rect x={640} y={330} width={330} height={floorY - 380} fill={C.white} stroke={OL} strokeWidth={OW} />
				{[1, 2].map((i) => (
					<line key={'v' + i} x1={640 + i * 110} y1={330} x2={640 + i * 110} y2={floorY - 50} stroke={C.woodDark} strokeWidth={6} />
				))}
				{Array.from({length: 7}).map((_, i) => (
					<line key={'h' + i} x1={640} y1={330 + (i + 1) * ((floorY - 380) / 8)} x2={970} y2={330 + (i + 1) * ((floorY - 380) / 8)} stroke={C.woodDark} strokeWidth={5} />
				))}
			</g>
		)}
		{window && (
			<g>
				<rect x={130} y={380} width={300} height={300} rx={8} fill={C.sky} stroke={OL} strokeWidth={OW} />
				<path d="M 130 600 Q 230 540 330 590 Q 390 560 430 580 L 430 680 L 130 680 Z" fill={C.green} stroke={OL} strokeWidth={5} />
				<line x1={280} y1={380} x2={280} y2={680} stroke={C.woodDark} strokeWidth={10} />
				<line x1={130} y1={530} x2={430} y2={530} stroke={C.woodDark} strokeWidth={10} />
				<rect x={130} y={380} width={300} height={300} rx={8} fill="none" stroke={OL} strokeWidth={OW} />
			</g>
		)}
		<Tatami y={floorY} />
	</g>
);

export const Tatami: React.FC<{y: number; color?: string}> = ({y, color = C.tatami}) => (
	<g>
		<rect x={0} y={y - 20} width={1080} height={26} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
		<rect x={0} y={y} width={1080} height={1920 - y} fill={color} stroke={OL} strokeWidth={OW} />
		{Array.from({length: 18}).map((_, i) => (
			<line key={i} x1={0} y1={y + 20 + i * 34} x2={1080} y2={y + 20 + i * 34} stroke={C.tatamiLine} strokeWidth={3} opacity={0.6} />
		))}
		<line x1={540} y1={y} x2={540} y2={1920} stroke={OL} strokeWidth={10} />
		<line x1={0} y1={y + 330} x2={1080} y2={y + 330} stroke={OL} strokeWidth={10} />
	</g>
);

export const House: React.FC<{x: number; y: number; w?: number; h?: number; body?: string; roof?: string; broken?: number}> = ({
	x,
	y,
	w = 200,
	h = 150,
	body = C.paper,
	roof = '#4a5568',
	broken = 0,
}) => (
	<g transform={`rotate(${broken * 8} ${x} ${y})`}>
		<rect x={x - w / 2} y={y - h} width={w} height={h} fill={body} stroke={OL} strokeWidth={OW} />
		<rect x={x - w / 4} y={y - h * 0.6} width={w / 5} height={h * 0.35} fill={C.sky} stroke={OL} strokeWidth={5} />
		<rect x={x + w / 12} y={y - h * 0.55} width={w / 6} height={h * 0.55} fill={C.woodDark} stroke={OL} strokeWidth={5} />
		<path
			d={`M ${x - w / 2 - 40} ${y - h + 6} Q ${x - w / 2} ${y - h - 10} ${x - w / 2 + 20} ${y - h - 60} L ${x + w / 2 - 20} ${y - h - 60} Q ${x + w / 2} ${y - h - 10} ${x + w / 2 + 40} ${y - h + 6} Z`}
			fill={roof}
			stroke={OL}
			strokeWidth={OW}
			strokeLinejoin="round"
		/>
	</g>
);

/** Outdoor street. sky: color, dusk: 0..1 mixes to orange */
export const Outdoor: React.FC<{sky?: string; ground?: number; houses?: boolean; broken?: number; hills?: string}> = ({
	sky = C.sky,
	ground = 1330,
	houses = true,
	broken = 0,
	hills = C.green,
}) => (
	<g>
		<rect width={1080} height={1920} fill={sky} />
		<path d={`M 0 ${ground - 300} Q 200 ${ground - 470} 420 ${ground - 330} Q 620 ${ground - 480} 860 ${ground - 340} Q 980 ${ground - 400} 1080 ${ground - 330} L 1080 ${ground} L 0 ${ground} Z`} fill={hills} stroke={OL} strokeWidth={OW} />
		{houses && (
			<g>
				<House x={120} y={ground} w={220} h={160} broken={broken * 0.8} />
				<House x={400} y={ground} w={180} h={130} body="#f2dfc0" roof="#6b4f3a" broken={-broken} />
				<House x={720} y={ground} w={240} h={170} broken={broken * 0.5} />
				<House x={990} y={ground} w={200} h={140} body="#f2dfc0" roof="#6b4f3a" broken={-broken * 0.7} />
			</g>
		)}
		<rect x={0} y={ground} width={1080} height={1920 - ground} fill="#d9c49a" stroke={OL} strokeWidth={OW} />
		{Array.from({length: 10}).map((_, i) => (
			<ellipse key={i} cx={hash(i + 1) * 1080} cy={ground + 60 + hash(i + 5) * 500} rx={30 + hash(i) * 40} ry={8} fill="#000" opacity={0.06} />
		))}
	</g>
);

/** Cartoon mushroom cloud, base at (x, y). */
export const Mushroom: React.FC<{x: number; y: number; s?: number; grow?: number}> = ({x, y, s = 1, grow = 1}) => {
	const {t} = useShot();
	const g = Math.max(0.05, grow);
	const puff = (cx: number, cy: number, r: number, col: string, k: number) => (
		<circle key={k} cx={cx + Math.sin(t * 1.5 + k) * 6} cy={cy + Math.cos(t * 1.3 + k) * 5} r={r} fill={col} stroke={OL} strokeWidth={OW} />
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${s * (0.4 + 0.6 * g)} ${s * g})`}>
			<path d="M -60 0 C -40 -120 -90 -260 -70 -420 L 70 -420 C 90 -260 40 -120 60 0 Z" fill="#f3d9b0" stroke={OL} strokeWidth={OW} />
			<ellipse cx={0} cy={-230} rx={130} ry={34} fill="#f0c48a" stroke={OL} strokeWidth={OW} />
			{[
				[-200, -470, 110, '#f6dcb4'],
				[200, -470, 110, '#f6dcb4'],
				[-110, -560, 130, '#fbe8c8'],
				[110, -560, 130, '#fbe8c8'],
				[0, -620, 140, '#fff3dc'],
				[-140, -440, 90, '#f0b878'],
				[140, -440, 90, '#f0b878'],
				[0, -450, 120, '#f5c88c'],
			].map(([cx, cy, r, col], k) => puff(cx as number, cy as number, r as number, col as string, k))}
			{[-1, 1].map((k) => (
				<ellipse key={k} cx={k * 160} cy={-10} rx={140} ry={40} fill="#e8c9a0" stroke={OL} strokeWidth={OW} />
			))}
		</g>
	);
};

export const Hanko: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-50} y={-200} width={100} height={200} rx={14} fill={C.ochre} stroke={OL} strokeWidth={OW} />
		<ellipse cx={0} cy={-200} rx={50} ry={16} fill="#f5c46a" stroke={OL} strokeWidth={OW} />
		<rect x={-50} y={-36} width={100} height={36} fill={C.red} stroke={OL} strokeWidth={OW} />
		<line x1={-30} y1={-170} x2={-30} y2={-60} stroke="#fff" strokeWidth={8} opacity={0.4} strokeLinecap="round" />
	</g>
);

export const SealMark: React.FC<{x: number; y: number; r?: number; text?: string; opacity?: number}> = ({x, y, r = 70, text = '山口', opacity = 1}) => (
	<g opacity={opacity}>
		<circle cx={x} cy={y} r={r} fill="none" stroke={C.red} strokeWidth={r * 0.12} />
		<text x={x} y={y + r * 0.22} textAnchor="middle" fontFamily="IPAGothic" fontSize={r * 0.72} fill={C.red} fontWeight={700}>
			{text}
		</text>
	</g>
);
