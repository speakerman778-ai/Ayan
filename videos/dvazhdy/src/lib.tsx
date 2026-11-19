import React, {createContext, useContext, useMemo} from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';

// ------------------------------------------------------------------ math
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t: number, t0: number, dur: number) => clamp((t - t0) / dur);
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x: number) => {
	const v = clamp(x);
	return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
export const hash = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

export const WHITE = '#f4f1ea';
export const AMBER = '#ffb347';
export const GOLD = '#ffd27a';

// ------------------------------------------------------------------ shot context
// scatter: 0 = assembled, 1 = fully blown apart (used for scene transitions)
export const ShotCtx = createContext({t: 0, dur: 1, scatter: 0});
export const useShot = () => useContext(ShotCtx);

// ------------------------------------------------------------------ path helpers
export const circle = (cx: number, cy: number, r: number) =>
	`M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
export const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
	`M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
export const rect = (x: number, y: number, w: number, h: number, r = 0) =>
	r === 0
		? `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
		: `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
export const line = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} L ${x2} ${y2}`;
export const poly = (pts: [number, number][], closed = false) =>
	pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ') + (closed ? ' Z' : '');

/** Simple contour person. (x, y) = point between the feet. */
export const person = (
	x: number,
	y: number,
	s = 1,
	o: {la?: number; ra?: number; legs?: number; bend?: number; head?: boolean} = {},
) => {
	const {la = 18, ra = 18, legs = 16, bend = 0, head = true} = o;
	const hipY = y - 170 * s;
	const shY = y - 300 * s;
	const bx = bend * 40 * s; // forward lean of shoulders
	const d2r = Math.PI / 180;
	const armL = 135 * s;
	const out: string[] = [];
	out.push(
		poly(
			[
				[x - 30 * s, hipY],
				[x - 46 * s + bx, shY],
				[x + 46 * s + bx, shY],
				[x + 30 * s, hipY],
			],
			true,
		),
	);
	if (head) out.push(circle(x + bx * 1.2, shY - 52 * s, 38 * s));
	out.push(line(x - 46 * s + bx, shY + 6 * s, x - 46 * s + bx - Math.sin(la * d2r) * armL, shY + 6 * s + Math.cos(la * d2r) * armL));
	out.push(line(x + 46 * s + bx, shY + 6 * s, x + 46 * s + bx + Math.sin(ra * d2r) * armL, shY + 6 * s + Math.cos(ra * d2r) * armL));
	out.push(line(x - 18 * s, hipY, x - Math.sin(legs * d2r) * 175 * s - 10 * s, y));
	out.push(line(x + 18 * s, hipY, x + Math.sin(legs * d2r) * 175 * s + 10 * s, y));
	return out;
};

export const mushroom = (x: number, ground: number, s = 1) => {
	const capY = ground - 520 * s;
	const out: string[] = [];
	// stem
	out.push(`M ${x - 45 * s} ${ground} C ${x - 30 * s} ${ground - 200 * s} ${x - 70 * s} ${capY + 160 * s} ${x - 60 * s} ${capY + 90 * s}`);
	out.push(`M ${x + 45 * s} ${ground} C ${x + 30 * s} ${ground - 200 * s} ${x + 70 * s} ${capY + 160 * s} ${x + 60 * s} ${capY + 90 * s}`);
	// skirt ring
	out.push(ellipse(x, ground - 240 * s, 110 * s, 26 * s));
	// cap: bumpy outline
	const pts: string[] = [];
	const n = 11;
	for (let i = 0; i <= n; i++) {
		const a = Math.PI + (i / n) * Math.PI;
		const r = 230 * s * (1 + 0.08 * Math.sin(i * 2.7));
		pts.push(`${x + Math.cos(a) * r * 1.15} ${capY + Math.sin(a) * r * 0.75}`);
	}
	out.push(`M ${pts[0]} ` + pts.slice(1).map((p, i) => `Q ${x + Math.cos(Math.PI + ((i + 0.5) / n) * Math.PI) * 290 * s * 1.15} ${capY + Math.sin(Math.PI + ((i + 0.5) / n) * Math.PI) * 290 * s * 0.75} ${p}`).join(' '));
	out.push(`M ${x - 264 * s} ${capY} C ${x - 220 * s} ${capY + 120 * s} ${x + 220 * s} ${capY + 120 * s} ${x + 264 * s} ${capY}`);
	out.push(circle(x - 90 * s, capY - 40 * s, 70 * s));
	out.push(circle(x + 80 * s, capY - 60 * s, 80 * s));
	// base dust
	out.push(`M ${x - 320 * s} ${ground} Q ${x - 200 * s} ${ground - 90 * s} ${x - 60 * s} ${ground - 30 * s}`);
	out.push(`M ${x + 320 * s} ${ground} Q ${x + 200 * s} ${ground - 90 * s} ${x + 60 * s} ${ground - 30 * s}`);
	return out;
};

export const skyline = (x0: number, x1: number, ground: number, seed = 1, hMax = 160) => {
	const pts: [number, number][] = [[x0, ground]];
	let x = x0;
	let i = 0;
	while (x < x1) {
		const w = 40 + hash(seed + i) * 70;
		const h = 40 + hash(seed + i + 50) * hMax;
		pts.push([x, ground - h], [Math.min(x1, x + w), ground - h]);
		x += w;
		i++;
	}
	pts.push([x1, ground]);
	return poly(pts);
};

export const hanko = (cx: number, top: number, w = 120, h = 220) => {
	const ry = w * 0.22;
	return [
		ellipse(cx, top, w / 2, ry),
		`M ${cx - w / 2} ${top} V ${top + h} A ${w / 2} ${ry} 0 0 0 ${cx + w / 2} ${top + h} V ${top}`,
		`M ${cx - w / 2} ${top + h * 0.3} A ${w / 2} ${ry} 0 0 0 ${cx + w / 2} ${top + h * 0.3}`,
	];
};

// ------------------------------------------------------------------ dots
type Pt = [number, number];
const cache = new Map<string, Pt[]>();
const sample = (d: string, spacing: number): Pt[] => {
	const key = spacing + '|' + d;
	const hit = cache.get(key);
	if (hit) return hit;
	const pts: Pt[] = [];
	// split into sub paths so each starts with a dot
	const subs = d.split(/(?=M)/).filter((x) => x.trim());
	for (const sp of subs) {
		const len = getLength(sp);
		const n = Math.max(1, Math.round(len / spacing));
		for (let i = 0; i <= n; i++) {
			const p = getPointAtLength(sp, (i / n) * len);
			if (p) pts.push([p.x, p.y]);
		}
	}
	cache.set(key, pts);
	return pts;
};

/** A shape rendered as glowing dots. */
export const Dots: React.FC<{
	d: string | string[];
	progress?: number;
	color?: string;
	spacing?: number;
	r?: number;
	seed?: number;
	opacity?: number;
	twinkle?: number;
}> = ({d, progress = 1, color = WHITE, spacing = 13, r = 3, seed = 1, opacity = 1, twinkle = 0}) => {
	const {scatter, t} = useShot();
	const pts = useMemo(() => (Array.isArray(d) ? d : [d]).flatMap((x) => sample(x, spacing)), [d, spacing]);
	const shown = Math.floor(pts.length * clamp(progress));
	const sc = Math.pow(scatter, 1.4);
	return (
		<g fill={color} opacity={opacity}>
			{pts.slice(0, shown).map((p, i) => {
				const h1 = hash(i * 1.37 + seed * 91.3);
				const h2 = hash(i * 2.11 + seed * 17.9);
				const a = h1 * Math.PI * 2;
				const dist = (250 + h2 * 650) * sc;
				const tw = twinkle ? 0.55 + 0.45 * Math.sin(t * 5 + i * 0.9) : 1;
				const fresh = progress < 1 && i > shown - 12 ? 1.6 : 1;
				return (
					<circle
						key={i}
						cx={p[0] + Math.cos(a) * dist}
						cy={p[1] + Math.sin(a) * dist}
						r={r * fresh * (1 - 0.4 * sc)}
						opacity={(1 - 0.85 * sc) * tw}
					/>
				);
			})}
		</g>
	);
};

/** Dotted outline text inside SVG. */
export const DotText: React.FC<{
	x: number;
	y: number;
	size: number;
	children: React.ReactNode;
	color?: string;
	opacity?: number;
	weight?: number;
	spacing?: number;
	family?: string;
	dash?: number;
}> = ({x, y, size, children, color = WHITE, opacity = 1, weight = 300, spacing = 0.08, family = 'Inter', dash}) => {
	const {scatter} = useShot();
	const dd = dash ?? Math.max(6, size / 22);
	return (
		<text
			x={x}
			y={y}
			fontSize={size}
			fontFamily={family}
			fontWeight={weight}
			letterSpacing={`${spacing + scatter * 0.6}em`}
			textAnchor="middle"
			dominantBaseline="middle"
			fill="none"
			stroke={color}
			strokeWidth={Math.max(3, size / 45)}
			strokeLinecap="round"
			strokeDasharray={`0 ${dd}`}
			opacity={opacity * (1 - scatter)}
		>
			{children}
		</text>
	);
};

/** Thin golden rays + nested dotted ellipses around a point. */
export const Rays: React.FC<{cx: number; cy: number; r0?: number; r1?: number; n?: number; intensity?: number}> = ({
	cx,
	cy,
	r0 = 140,
	r1 = 520,
	n = 28,
	intensity = 1,
}) => {
	const {t, scatter} = useShot();
	const k = intensity * (1 - scatter);
	return (
		<g opacity={k}>
			<circle cx={cx} cy={cy} r={r0 * 1.6} fill="url(#amberGlow)" />
			{Array.from({length: n}).map((_, i) => {
				const a = (i / n) * Math.PI * 2 + t * 0.12;
				const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + i * 2.3));
				const rr = r1 * (0.7 + 0.3 * hash(i));
				return (
					<line
						key={i}
						x1={cx + Math.cos(a) * r0}
						y1={cy + Math.sin(a) * r0}
						x2={cx + Math.cos(a) * rr}
						y2={cy + Math.sin(a) * rr}
						stroke={GOLD}
						strokeWidth={1.6}
						opacity={fl * 0.55}
					/>
				);
			})}
			{[1, 1.35, 1.75].map((m, i) => (
				<ellipse
					key={i}
					cx={cx}
					cy={cy}
					rx={r0 * m * 1.25}
					ry={r0 * m * 0.8}
					fill="none"
					stroke={AMBER}
					strokeWidth={3}
					strokeLinecap="round"
					strokeDasharray="0 16"
					transform={`rotate(${(i % 2 ? -1 : 1) * t * 8} ${cx} ${cy})`}
					opacity={0.65 - i * 0.15}
				/>
			))}
		</g>
	);
};

/** Caption in a dashed frame, centered at y = 1440. */
export const Caption: React.FC<{text: string; from: number; to?: number; big?: boolean; amber?: boolean}> = ({
	text,
	from,
	to = 1e9,
	big = false,
	amber = false,
}) => {
	const {t, scatter} = useShot();
	if (t < from || t > to + 0.4) return null;
	const a = easeOut(prog(t, from, 0.45)) * (1 - prog(t, to, 0.35)) * (1 - scatter);
	const base = big ? 88 : 46;
	const size = Math.min(base, 800 / (text.length * (big ? 0.95 : 0.9)));
	const col = amber ? AMBER : WHITE;
	return (
		<foreignObject x={0} y={0} width={1080} height={1920} style={{overflow: 'visible'}}>
		<div
			style={{
				position: 'absolute',
				left: 540,
				top: 1440,
				transform: `translate(-50%, -50%) translateY(${(1 - a) * 24}px)`,
				opacity: a,
				padding: big ? '22px 40px' : '18px 34px',
				border: `2px dashed ${amber ? 'rgba(255,179,71,0.7)' : 'rgba(244,241,234,0.55)'}`,
				borderRadius: 8,
				whiteSpace: 'nowrap',
				fontFamily: 'Inter',
				fontWeight: big ? 300 : 200,
				fontSize: size,
				letterSpacing: `${0.28 + (1 - a) * 0.25}em`,
				color: col,
				textShadow: `0 0 18px ${amber ? 'rgba(255,179,71,0.8)' : 'rgba(255,255,255,0.6)'}`,
				background: 'rgba(5,5,8,0.45)',
				maxWidth: 830,
			}}
		>
			{text}
		</div>
		</foreignObject>
	);
};
