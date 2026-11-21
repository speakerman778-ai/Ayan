import React, {useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Toon 3D set for the "zombie train" episode.
// Flat 3-step shading + inverted-hull outlines in the channel outline colour,
// so the 3D world sits well with the flat 2D characters drawn on top.

export const OL3 = '#3b2a22';
export const P = {
	wall: '#e9dcc0',
	wallLow: '#c9b48e',
	ceiling: '#f2e8d2',
	berth: '#7a4a35',
	berthDark: '#5e3828',
	wood: '#c98c55',
	woodDark: '#9c6338',
	sheet: '#f4efe4',
	blanketA: '#3d5a8a',
	blanketB: '#d9483b',
	carpet: '#b23a31',
	carpetLine: '#e8a93a',
	floor: '#6b4a38',
	night: '#1d2b4f',
	snow: '#dfe8f5',
	pine: '#24413a',
	metal: '#9aa3ad',
	lamp: '#fff1b0',
	ochre: '#e8a93a',
};

const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** Matte "clay" material (approved 3D look), cached per colour. */
export const clay = (c: string, emissive = 0) => {
	const k = c + ':' + emissive;
	let m = matCache.get(k);
	if (!m) {
		m = new THREE.MeshStandardMaterial({color: c, roughness: 0.85, metalness: 0, ...(emissive ? {emissive: c, emissiveIntensity: emissive} : {})});
		matCache.set(k, m);
	}
	return m;
};
const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (sx: number, sy: number, sz: number, r: number) => {
	const k = [sx, sy, sz, r].map((v) => v.toFixed(3)).join(',');
	let g = geoCache.get(k);
	if (!g) {
		g = new RoundedBoxGeometry(sx, sy, sz, 3, Math.max(0.001, Math.min(r, Math.min(sx, sy, sz) / 2 - 0.001)));
		geoCache.set(k, g);
	}
	return g;
};

type V3 = [number, number, number];

/** Rounded clay box. p = centre, s = size. `o` sets the corner radius (kept for old call sites). */
export const B: React.FC<{p: V3; s: V3; c: string; o?: number; r?: V3; basic?: boolean; glow?: number; m?: THREE.Material}> = ({p, s, c, o = 0.022, r, basic, glow = 0, m}) => (
	<mesh position={p} rotation={r} geometry={rbox(s[0], s[1], s[2], Math.max(0.008, o * 1.4))} material={m ?? (basic ? clay(c, 0.9) : clay(c, glow))} castShadow={!basic} receiveShadow />
);

export const Cyl: React.FC<{p: V3; r: number; h: number; c: string; o?: number; rot?: V3; seg?: number; basic?: boolean}> = ({p, r, h, c, rot, seg = 18, basic}) => (
	<mesh position={p} rotation={rot} material={basic ? clay(c, 0.9) : clay(c)} castShadow receiveShadow>
		<cylinderGeometry args={[r, r, h, seg]} />
	</mesh>
);

export const Cam: React.FC<{pos: V3; look: V3; fov: number}> = ({pos, look, fov}) => {
	const {camera} = useThree();
	const cam = camera as THREE.PerspectiveCamera;
	cam.position.set(...pos);
	cam.fov = fov;
	cam.near = 0.05;
	cam.far = 60;
	cam.updateProjectionMatrix();
	cam.lookAt(...look);
	return null;
};

// ------------------------------------------------------------------ window with a snowy night outside
// Window on a wall. side = -1 (left wall, faces +x) or +1 (right wall, faces -x).
const Win: React.FC<{z: number; side: -1 | 1; t: number; seed: number}> = ({z, side, t, seed}) => {
	const x = side * 1.49;
	const nx = -side; // inward normal
	const w = 1.05;
	const h = 0.75;
	const y = 1.32;
	const ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
	const flakes = useMemo(() => Array.from({length: 14}, (_, i) => {
		const k = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
		const f = k - Math.floor(k);
		const k2 = Math.sin((i + 3) * 4.1 + seed * 9.7) * 9631.1;
		return {u: f, v: k2 - Math.floor(k2), sp: 0.12 + f * 0.1};
	}), [seed]);
	return (
		<group>
			{/* frame */}
			<B p={[x + nx * 0.02, y, z]} s={[0.04, h + 0.14, w + 0.14]} c={P.metal} />
			{/* glass: night sky */}
			<group position={[x + nx * 0.045, y, z]} rotation={[0, ry, 0]}>
				<mesh>
					<planeGeometry args={[w, h]} />
					<meshBasicMaterial color={P.night} />
				</mesh>
				{/* snow ground */}
				<mesh position={[0, -h / 2 + 0.11, 0.002]}>
					<planeGeometry args={[w, 0.22]} />
					<meshBasicMaterial color={P.snow} />
				</mesh>
				{/* pines */}
				{[-0.42, -0.22, 0.05, 0.3, 0.46].map((u, i) => (
					<mesh key={i} position={[u, -h / 2 + 0.26 + (i % 2) * 0.04, 0.003]}>
						<coneGeometry args={[0.07 + (i % 3) * 0.015, 0.34 + (i % 2) * 0.1, 3]} />
						<meshBasicMaterial color={P.pine} />
					</mesh>
				))}
				{/* snow caps */}
				{[-0.42, -0.22, 0.05, 0.3, 0.46].map((u, i) => (
					<mesh key={'c' + i} position={[u, -h / 2 + 0.36 + (i % 2) * 0.09, 0.004]}>
						<coneGeometry args={[0.035, 0.08, 3]} />
						<meshBasicMaterial color={P.snow} />
					</mesh>
				))}
				{/* falling snow */}
				{flakes.map((f, i) => {
					const v = ((f.v - t * f.sp) % 1 + 1) % 1;
					return (
						<mesh key={'f' + i} position={[(f.u - 0.5) * (w - 0.06) + Math.sin(t * 1.3 + i) * 0.02, (v - 0.5) * (h - 0.04), 0.005]}>
							<circleGeometry args={[0.012, 8]} />
							<meshBasicMaterial color="#ffffff" />
						</mesh>
					);
				})}
				{/* glass glint */}
				<mesh position={[-w / 2 + 0.2, h / 2 - 0.16, 0.006]} rotation={[0, 0, 0.7]}>
					<planeGeometry args={[0.03, 0.3]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
				</mesh>
			</group>
			{/* curtain */}
			<B p={[x + nx * 0.06, y + 0.1, z - w / 2 - 0.05]} s={[0.04, h + 0.25, 0.14]} c={P.blanketB} o={0.012} />
			<B p={[x + nx * 0.06, y + 0.1, z + w / 2 + 0.05]} s={[0.04, h + 0.25, 0.14]} c={P.blanketB} o={0.012} />
		</group>
	);
};

// ------------------------------------------------------------------ bedding
const Bed: React.FC<{p: V3; s: V3; blanket: string; pillowAt?: 1 | -1; along?: 'x' | 'z'; messy?: boolean}> = ({p, s, blanket, pillowAt = 1, along = 'x', messy}) => {
	const [sx, , sz] = s;
	const L = along === 'x' ? sx : sz;
	const pill: V3 = along === 'x' ? [p[0] + pillowAt * (L / 2 - 0.22), p[1] + 0.1, p[2]] : [p[0], p[1] + 0.1, p[2] + pillowAt * (L / 2 - 0.22)];
	const pillS: V3 = along === 'x' ? [0.32, 0.12, s[2] - 0.12] : [s[0] - 0.12, 0.12, 0.32];
	const blS: V3 = along === 'x' ? [L * 0.62, 0.08, s[2] - 0.04] : [s[0] - 0.04, 0.08, L * 0.62];
	const blP: V3 = along === 'x' ? [p[0] - pillowAt * L * 0.17, p[1] + 0.07, p[2]] : [p[0], p[1] + 0.07, p[2] - pillowAt * L * 0.17];
	return (
		<group>
			<B p={[p[0], p[1] + 0.03, p[2]]} s={[s[0] - 0.02, 0.05, s[2] - 0.02]} c={P.sheet} o={0.01} />
			<B p={pill} s={pillS} c={P.sheet} o={0.014} r={[0, 0, 0.05]} />
			<B p={blP} s={blS} c={blanket} o={0.014} r={messy ? [0.05, 0.25, 0.04] : undefined} />
		</group>
	);
};

// ------------------------------------------------------------------ one open "bay" of a sleeper car
// Bay spans z0 (front partition) .. z0 - 1.9. Left side holds 4 berths across the car,
// right side holds 2 side berths along the wall.
export const Bay: React.FC<{z0: number; t: number; i: number; emptyUpperRight?: boolean; teaShake?: number}> = ({z0, t, i, emptyUpperRight, teaShake = 0}) => {
	const L = 1.9;
	const zc = z0 - L / 2;
	const zA = z0 - 0.33; // berth near front partition
	const zB = z0 - L + 0.33;
	const xb = -0.6; // berths centre x (span -1.5..0.3)
	const bw = 1.8;
	return (
		<group>
			{/* partitions */}
			<B p={[xb, 1.08, z0]} s={[bw, 2.16, 0.05]} c={P.wall} />
			{/* lower berths */}
			{[zA, zB].map((z, k) => (
				<group key={'l' + k}>
					<B p={[xb, 0.25, z]} s={[bw - 0.04, 0.5, 0.6]} c={P.berthDark} />
					<B p={[xb, 0.52, z]} s={[bw - 0.04, 0.06, 0.62]} c={P.berth} />
					<Bed p={[xb, 0.55, z]} s={[bw - 0.1, 0, 0.6]} blanket={k ? P.blanketA : P.blanketB} pillowAt={-1} messy={k === 0} />
				</group>
			))}
			{/* upper berths */}
			{[zA, zB].map((z, k) => (
				<group key={'u' + k}>
					<B p={[xb, 1.42, z]} s={[bw - 0.04, 0.07, 0.62]} c={P.berth} />
					{!(emptyUpperRight && k === 1) && <Bed p={[xb, 1.45, z]} s={[bw - 0.1, 0, 0.6]} blanket={k ? P.blanketB : P.blanketA} pillowAt={-1} messy={k === 1} />}
					{/* safety rail */}
					<B p={[0.22, 1.56, z + (k ? 0.24 : -0.24)]} s={[0.04, 0.18, 0.04]} c={P.metal} o={0.01} />
					<Cyl p={[-0.05, 1.64, z + (k ? 0.24 : -0.24)]} r={0.02} h={0.55} c={P.metal} rot={[0, 0, Math.PI / 2]} o={0.008} />
				</group>
			))}
			{/* ladder step */}
			<B p={[0.2, 0.95, zA - 0.36]} s={[0.12, 0.04, 0.1]} c={P.metal} o={0.01} />
			{/* luggage shelf on top */}
			<B p={[xb, 2.16, zc]} s={[bw, 0.05, L]} c={P.wallLow} />
			<B p={[-1.05, 2.33, zc + 0.25]} s={[0.5, 0.28, 0.45]} c={i % 2 ? '#5f9e55' : P.ochre} r={[0, 0.2, 0]} />
			<B p={[-0.45, 2.3, zc - 0.35]} s={[0.4, 0.22, 0.35]} c="#3d4a66" r={[0, -0.15, 0]} />
			{/* table at the window */}
			<B p={[-1.22, 0.74, zc]} s={[0.55, 0.05, 0.62]} c={P.wood} />
			<B p={[-1.32, 0.38, zc]} s={[0.06, 0.7, 0.06]} c={P.metal} o={0.01} />
			{/* tea glasses in holders */}
			{[-0.1, 0.14].map((dz, k) => (
				<group key={'tea' + k} position={[-1.12 - k * 0.08, 0.84 + (k === 0 ? Math.sin(t * 40) * teaShake * 0.006 : 0), zc + dz]}>
					<Cyl p={[0, 0, 0]} r={0.04} h={0.13} c="#c9a24a" o={0.008} />
					<Cyl p={[0, 0.05, 0]} r={0.034} h={0.04} c="#8a4b1f" o={0} basic />
				</group>
			))}
			{/* bag on table */}
			<B p={[-1.3, 0.8, zc + 0.05]} s={[0.12, 0.08, 0.18]} c={P.ochre} o={0.01} />
			{/* side berths along right wall */}
			<B p={[1.22, 0.25, zc]} s={[0.55, 0.5, L - 0.1]} c={P.berthDark} />
			<B p={[1.22, 0.52, zc]} s={[0.57, 0.06, L - 0.08]} c={P.berth} />
			<Bed p={[1.22, 0.55, zc]} s={[0.55, 0, L - 0.12]} blanket={i % 2 ? P.blanketA : P.blanketB} along="z" />
			<B p={[1.22, 1.5, zc]} s={[0.57, 0.07, L - 0.1]} c={P.berth} />
			<Bed p={[1.22, 1.53, zc]} s={[0.55, 0, L - 0.14]} blanket={i % 2 ? P.blanketB : P.blanketA} along="z" pillowAt={-1} />
			{/* windows */}
			<Win z={zc} side={-1} t={t} seed={i * 2} />
			<Win z={zc} side={1} t={t} seed={i * 2 + 1} />
			{/* coat hooks + coat */}
			<B p={[-1.44, 1.05, z0 - 0.06]} s={[0.05, 0.4, 0.07]} c={i % 2 ? '#3d4a66' : '#5f9e55'} o={0.012} r={[0.05, 0, 0]} />
		</group>
	);
};

// ------------------------------------------------------------------ ceiling lamp
export const Lamp: React.FC<{z: number; on: number}> = ({z, on}) => (
	<group>
		<B p={[0.62, 2.56, z]} s={[0.36, 0.05, 0.22]} c={P.metal} o={0.012} />
		<mesh position={[0.62, 2.52, z]}>
			<boxGeometry args={[0.3, 0.04, 0.16]} />
			<meshBasicMaterial color={on > 0.5 ? P.lamp : '#6d6a5c'} />
		</mesh>
	</group>
);

// ------------------------------------------------------------------ the car shell
export const Car: React.FC<{t: number; zEnd: number; bays: number; lampsOn: (i: number) => number; emptyUpperRight?: number; teaShake?: number}> = ({t, zEnd, bays, lampsOn, emptyUpperRight, teaShake}) => {
	const len = -zEnd + 4;
	const zc = (zEnd + 4) / 2;
	return (
		<group>
			{/* floor */}
			<B p={[0, -0.03, zc]} s={[3.1, 0.06, len]} c={P.floor} o={0.01} />
			{/* aisle runner */}
			<B p={[0.62, 0.006, zc]} s={[0.55, 0.012, len]} c={P.carpet} o={0} />
			<B p={[0.62, 0.014, zc]} s={[0.04, 0.004, len]} c={P.carpetLine} o={0} />
			{/* walls */}
			<B p={[-1.55, 1.3, zc]} s={[0.08, 2.6, len]} c={P.wall} o={0.01} />
			<B p={[1.55, 1.3, zc]} s={[0.08, 2.6, len]} c={P.wall} o={0.01} />
			<B p={[-1.5, 0.45, zc]} s={[0.03, 0.9, len]} c={P.wallLow} o={0.008} />
			<B p={[1.5, 0.45, zc]} s={[0.03, 0.9, len]} c={P.wallLow} o={0.008} />
			{/* ceiling */}
			<B p={[0, 2.63, zc]} s={[3.1, 0.06, len]} c={P.ceiling} o={0.01} />
			{/* end wall + door */}
			<B p={[0, 1.3, zEnd]} s={[3.1, 2.6, 0.08]} c={P.wallLow} />
			<B p={[0.62, 1.0, zEnd + 0.05]} s={[0.72, 2.0, 0.04]} c={P.metal} />
			<mesh position={[0.62, 1.45, zEnd + 0.08]}>
				<planeGeometry args={[0.36, 0.5]} />
				<meshBasicMaterial color="#0c1226" />
			</mesh>
			<B p={[0.9, 1.0, zEnd + 0.09]} s={[0.12, 0.04, 0.04]} c={P.ochre} o={0.008} />
			{/* exit sign glowing red */}
			<mesh position={[0.62, 2.25, zEnd + 0.06]}>
				<planeGeometry args={[0.4, 0.14]} />
				<meshBasicMaterial color="#e2453a" />
			</mesh>
			{Array.from({length: bays}).map((_, i) => (
				<Bay key={i} z0={-i * 1.9} t={t} i={i} emptyUpperRight={emptyUpperRight === i} teaShake={teaShake} />
			))}
			{Array.from({length: bays}).map((_, i) => (
				<Lamp key={'l' + i} z={-i * 1.9 - 0.95} on={lampsOn(i)} />
			))}
		</group>
	);
};

// ------------------------------------------------------------------ wall clock stuck at 3:00 (faces +x)
export const Clock: React.FC<{p: V3}> = ({p}) => (
	<group position={p}>
		<Cyl p={[0.03, 0, 0]} r={0.14} h={0.04} c={P.sheet} rot={[0, 0, Math.PI / 2]} o={0.018} seg={28} />
		{Array.from({length: 12}).map((_, i) => {
			const a = (i / 12) * Math.PI * 2;
			return <B key={i} p={[0.055, Math.cos(a) * 0.11, Math.sin(a) * 0.11]} s={[0.005, 0.022, 0.012]} c={OL3} o={0} basic />;
		})}
		{/* hour hand -> 3 */}
		<B p={[0.06, 0, -0.04]} s={[0.006, 0.018, 0.08]} c={OL3} o={0} basic />
		{/* minute hand -> 12 */}
		<B p={[0.062, 0.05, 0]} s={[0.006, 0.11, 0.014]} c={P.blanketB} o={0} basic />
		<Cyl p={[0.065, 0, 0]} r={0.012} h={0.01} c={OL3} rot={[0, 0, Math.PI / 2]} o={0} basic />
	</group>
);
