import React from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {hash} from '../lib';
import {B, Cyl, clay, P} from './Train3D';

// Outdoor taiga + train exteriors + the conductor's compartment, in the approved clay look.

export type V3 = [number, number, number];
export const W = 1080;
export const H = 1920;

export type Shot = {pos: V3; look: V3; fov: number};

export const makeCam = (s: Shot) => {
	const c = new THREE.PerspectiveCamera(s.fov, W / H, 0.05, 200);
	c.position.set(...s.pos);
	c.lookAt(...s.look);
	c.updateMatrixWorld();
	c.updateProjectionMatrix();
	return c;
};

export const project = (cam: THREE.PerspectiveCamera, x: number, y: number, z: number) => {
	const v = new THREE.Vector3(x, y, z).project(cam);
	return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H] as const;
};

/** Screen position + px-per-metre of a point on the floor (for 2D characters). */
export const onFloor = (cam: THREE.PerspectiveCamera, x: number, z: number, y = 0) => {
	const [fx, fy] = project(cam, x, y, z);
	const [, hy] = project(cam, x, y + 1, z);
	return {x: fx, y: fy, ppm: fy - hy};
};

export const Rig: React.FC<{shot: Shot}> = ({shot}) => {
	const {camera} = useThree();
	const c = camera as THREE.PerspectiveCamera;
	c.position.set(...shot.pos);
	c.fov = shot.fov;
	c.near = 0.05;
	c.far = 200;
	c.updateProjectionMatrix();
	c.lookAt(...shot.look);
	return null;
};

export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const lerpShot = (a: Shot, b: Shot, k: number): Shot => ({pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: a.fov + (b.fov - a.fov) * k});

// ------------------------------------------------------------------ taiga
export const Pine: React.FC<{p: V3; h?: number; snow?: string}> = ({p, h = 4, snow = '#f4f8ff'}) => (
	<group position={p}>
		<Cyl p={[0, h * 0.08, 0]} r={h * 0.04} h={h * 0.16} c="#5a3a28" />
		{[0, 1, 2].map((i) => {
			const y = h * (0.22 + i * 0.25);
			const r = h * (0.3 - i * 0.075);
			return (
				<group key={i}>
					<mesh position={[0, y, 0]} material={clay(P.pine)} castShadow receiveShadow>
						<coneGeometry args={[r, h * 0.42, 9]} />
					</mesh>
					<mesh position={[0, y + h * 0.13, 0]} material={clay(snow)} castShadow>
						<coneGeometry args={[r * 0.45, h * 0.14, 9]} />
					</mesh>
				</group>
			);
		})}
	</group>
);

export const Ground: React.FC<{c?: string}> = ({c = '#e9eff8'}) => (
	<group>
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} material={clay(c)} receiveShadow>
			<planeGeometry args={[220, 160]} />
		</mesh>
		{/* soft drifts */}
		{Array.from({length: 26}).map((_, i) => (
			<mesh key={i} position={[(hash(i) - 0.5) * 60, -0.35, -2 - hash(i + 3) * 40]} scale={[3 + hash(i + 5) * 4, 0.7, 2 + hash(i + 7) * 2]} material={clay(c)} receiveShadow>
				<sphereGeometry args={[1, 18, 10]} />
			</mesh>
		))}
	</group>
);

export const Forest: React.FC<{zFrom: number; zTo: number; xSpan?: number; n?: number; seed?: number; snow?: string; avoid?: (x: number, z: number) => boolean}> = ({zFrom, zTo, xSpan = 70, n = 70, seed = 0, snow, avoid}) => (
	<group>
		{Array.from({length: n}).map((_, i) => {
			const x = (hash(i + seed) - 0.5) * xSpan;
			const z = zFrom + (zTo - zFrom) * hash(i * 3 + seed + 1);
			if (avoid && avoid(x, z)) return null;
			return <Pine key={i} p={[x, 0, z]} h={3.2 + hash(i + seed + 9) * 3.6} snow={snow} />;
		})}
	</group>
);

export const Rails: React.FC<{z: number; len?: number}> = ({z, len = 160}) => (
	<group>
		<B p={[0, 0.06, z]} s={[len, 0.12, 2.6]} c="#8d8f99" o={0.01} />
		{[-0.75, 0.75].map((dz) => (
			<B key={dz} p={[0, 0.2, z + dz]} s={[len, 0.12, 0.1]} c="#5c5f6b" o={0.01} />
		))}
		{Array.from({length: 80}).map((_, i) => (
			<B key={i} p={[-len / 2 + i * 2, 0.14, z]} s={[0.25, 0.06, 2.2]} c="#6b4a38" o={0.01} />
		))}
	</group>
);

/** One passenger car along +x, centred at x. windows: 0..1 brightness per window (fn). */
export const CarBody: React.FC<{x: number; z: number; len?: number; lit?: (i: number) => number; body?: string; frost?: number}> = ({x, z, len = 13, lit = () => 1, body = '#a8322a', frost = 0}) => {
	const nW = 9;
	return (
		<group position={[x, 0, z]}>
			{/* bogies */}
			{[-len * 0.32, len * 0.32].map((bx) => (
				<group key={bx}>
					<B p={[bx, 0.55, 0]} s={[2.4, 0.5, 2.6]} c="#2e2a2c" o={0.04} />
					{[-0.7, 0.7].map((wx) => [-1.3, 1.3].map((wz) => <Cyl key={`${wx}${wz}`} p={[bx + wx, 0.48, wz]} r={0.42} h={0.14} c="#3a3638" rot={[Math.PI / 2, 0, 0]} />))}
				</group>
			))}
			{/* body */}
			<B p={[0, 2.3, 0]} s={[len, 2.9, 3.1]} c={body} o={0.16} />
			<B p={[0, 1.15, 0]} s={[len - 0.2, 0.3, 3.0]} c="#3a2a2a" o={0.05} />
			<B p={[0, 3.85, 0]} s={[len - 0.3, 0.35, 2.9]} c={frost > 0 ? '#e8eef8' : '#9aa3ad'} o={0.16} />
			{/* snow on the roof */}
			<B p={[0, 4.06, 0]} s={[len - 0.6, 0.12, 2.6]} c="#f4f8ff" o={0.06} />
			{/* stripe */}
			{[-1.56, 1.56].map((sz) => (
				<B key={sz} p={[0, 1.6, sz]} s={[len - 0.3, 0.14, 0.03]} c={P.ochre} o={0.01} />
			))}
			{/* windows on the +z side (towards camera) and -z side */}
			{[1, -1].map((side) =>
				Array.from({length: nW}).map((_, i) => {
					const wx = -len / 2 + 1.0 + i * ((len - 2) / (nW - 1));
					const k = lit(i);
					return (
						<group key={`${side}${i}`}>
							<B p={[wx, 2.75, side * 1.555]} s={[0.95, 0.75, 0.04]} c="#e9e2d2" o={0.03} />
							<mesh position={[wx, 2.75, side * 1.58]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
								<planeGeometry args={[0.8, 0.6]} />
								<meshBasicMaterial color={k > 0.5 ? '#ffd77a' : k > 0.1 ? '#6a5a3a' : '#141a30'} />
							</mesh>
						</group>
					);
				}),
			)}
			{/* door */}
			<B p={[len / 2 - 0.6, 2.0, 1.56]} s={[0.8, 2.0, 0.04]} c="#7a2620" o={0.03} />
			<mesh position={[len / 2 - 0.6, 2.45, 1.585]}>
				<planeGeometry args={[0.4, 0.5]} />
				<meshBasicMaterial color={lit(nW - 1) > 0.5 ? '#ffd77a' : '#141a30'} />
			</mesh>
		</group>
	);
};

export const Loco: React.FC<{x: number; z: number; light?: number; dir?: 1 | -1}> = ({x, z, light = 1, dir = 1}) => (
	<group position={[x, 0, z]} scale={[dir, 1, 1]}>
		{[-3, 3].map((bx) => (
			<B key={bx} p={[bx, 0.55, 0]} s={[2.4, 0.5, 2.6]} c="#2e2a2c" o={0.04} />
		))}
		<B p={[0, 2.3, 0]} s={[11, 2.9, 3.1]} c="#2f5d4a" o={0.2} />
		<B p={[0, 3.85, 0]} s={[10.6, 0.35, 2.9]} c="#9aa3ad" o={0.16} />
		<B p={[0, 4.06, 0]} s={[10, 0.12, 2.6]} c="#f4f8ff" o={0.06} />
		{/* cab nose */}
		<B p={[5.6, 2.1, 0]} s={[0.8, 2.6, 3.0]} c="#e8a93a" o={0.3} />
		<mesh position={[6.02, 3.0, 0]} rotation={[0, Math.PI / 2, 0]}>
			<planeGeometry args={[2.2, 0.7]} />
			<meshBasicMaterial color="#1a2238" />
		</mesh>
		{/* headlights */}
		{[-0.9, 0.9].map((hz) => (
			<mesh key={hz} position={[6.03, 1.6, hz]} rotation={[0, Math.PI / 2, 0]}>
				<circleGeometry args={[0.2, 20]} />
				<meshBasicMaterial color={light > 0.3 ? '#fff4c0' : '#555'} />
			</mesh>
		))}
		<mesh position={[6.03, 3.65, 0]} rotation={[0, Math.PI / 2, 0]}>
			<circleGeometry args={[0.24, 20]} />
			<meshBasicMaterial color={light > 0.3 ? '#fffbe0' : '#555'} />
		</mesh>
		{light > 0.3 && <spotLight position={[6.4, 2.6, 0]} target-position={[30, 0, 0]} angle={0.45} penumbra={0.6} intensity={60 * light} distance={40} decay={1.2} color="#fff1c8" />}
	</group>
);

export const Moon: React.FC<{p: V3; r?: number}> = ({p, r = 2.2}) => (
	<mesh position={p}>
		<sphereGeometry args={[r, 32, 16]} />
		<meshBasicMaterial color="#fff6c8" fog={false} />
	</mesh>
);

/** Big sky dome with a vertical gradient. */
export const Sky: React.FC<{top: string; bottom: string}> = ({top, bottom}) => {
	const mat = React.useMemo(() => {
		return new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			uniforms: {top: {value: new THREE.Color(top)}, bottom: {value: new THREE.Color(bottom)}},
			vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
			fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k = smoothstep(-0.05, 0.45, vP.y); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }',
		});
	}, [top, bottom]);
	return (
		<mesh material={mat}>
			<sphereGeometry args={[150, 32, 16]} />
		</mesh>
	);
};

export const Flakes3D: React.FC<{t: number; center: V3; n?: number; spread?: number; wind?: number}> = ({t, center, n = 90, spread = 10, wind = 0.6}) => (
	<group>
		{Array.from({length: n}).map((_, i) => {
			const k = (t * (0.08 + hash(i) * 0.06) + hash(i + 3)) % 1;
			return (
				<mesh key={i} position={[center[0] + (hash(i + 7) - 0.5) * spread + k * wind * 4, center[1] + 6 - k * 7, center[2] + (hash(i + 9) - 0.5) * spread]}>
					<sphereGeometry args={[0.03 + hash(i + 11) * 0.03, 6, 4]} />
					<meshBasicMaterial color="#ffffff" />
				</mesh>
			);
		})}
	</group>
);

// ------------------------------------------------------------------ conductor's compartment
// Small room: x [-1.0, 1.0], z [-1.8, 0.4] (camera looks toward -x at the door on the x=-1 wall? no:)
// Layout: window on the far wall (z=-1.8), door on the left wall (x=-1.0), seat on the right.
export const Compartment: React.FC<{t: number; lockK: number; handle: number; suitcase: number; frost?: number}> = ({t, lockK, handle, suitcase, frost = 0}) => {
	const wall = frost > 0 ? '#dfe6ef' : P.wall;
	return (
		<group>
			<B p={[0, -0.03, -0.7]} s={[2.2, 0.06, 3.0]} c={P.floor} />
			<B p={[0, 2.63, -0.7]} s={[2.2, 0.06, 3.0]} c={P.ceiling} />
			{/* far wall with window */}
			<B p={[0, 1.3, -1.85]} s={[2.2, 2.6, 0.08]} c={wall} />
			<B p={[0, 0.45, -1.8]} s={[2.1, 0.9, 0.03]} c={P.wallLow} o={0.008} />
			<B p={[0.2, 1.45, -1.79]} s={[1.0, 0.78, 0.04]} c={P.metal} />
			<mesh position={[0.2, 1.45, -1.765]}>
				<planeGeometry args={[0.86, 0.64]} />
				<meshBasicMaterial color={P.night} />
			</mesh>
			<mesh position={[0.2, 1.2, -1.76]}>
				<planeGeometry args={[0.86, 0.14]} />
				<meshBasicMaterial color={P.snow} />
			</mesh>
			{/* right wall + seat */}
			<B p={[1.12, 1.3, -0.7]} s={[0.08, 2.6, 3.0]} c={wall} />
			<B p={[0.78, 0.25, -0.9]} s={[0.6, 0.5, 1.8]} c={P.berthDark} />
			<B p={[0.78, 0.53, -0.9]} s={[0.62, 0.07, 1.82]} c={P.berth} />
			<B p={[0.78, 0.6, -1.3]} s={[0.5, 0.1, 0.4]} c={P.sheet} />
			{/* little table with tea tray, kettle */}
			<B p={[0.35, 0.74, -1.6]} s={[0.9, 0.05, 0.4]} c={P.wood} />
			<Cyl p={[0.1, 0.86, -1.6]} r={0.09} h={0.2} c="#c9c4bd" />
			<Cyl p={[0.42, 0.83, -1.6]} r={0.04} h={0.13} c="#c9a24a" />
			<Cyl p={[0.55, 0.83, -1.62]} r={0.04} h={0.13} c="#c9a24a" />
			{/* hanging uniform jacket */}
			<B p={[1.05, 1.6, -0.15]} s={[0.08, 0.7, 0.4]} c="#24324f" r={[0, 0, 0.04]} />
			<B p={[1.03, 1.94, -0.15]} s={[0.06, 0.05, 0.3]} c="#e8a93a" />
			{/* left wall with the door */}
			<B p={[-1.12, 1.3, -1.35]} s={[0.08, 2.6, 1.0]} c={wall} />
			<B p={[-1.12, 1.3, 0.35]} s={[0.08, 2.6, 0.4]} c={wall} />
			<B p={[-1.12, 2.35, -0.45]} s={[0.08, 0.5, 0.9]} c={wall} />
			{/* door leaf (rattles on knocks) */}
			<group position={[-1.09, 1.05, -0.45 + Math.sin(t * 70) * 0.012 * handle]}>
				<B p={[0, 0, 0]} s={[0.05, 2.1, 0.86]} c="#b9a27f" />
				<B p={[0.03, 0.45, 0]} s={[0.02, 0.5, 0.6]} c="#a68d68" o={0.01} />
				<B p={[0.03, -0.45, 0]} s={[0.02, 0.6, 0.6]} c="#a68d68" o={0.01} />
				{/* mirror */}
				<mesh position={[0.06, 0.45, 0]} rotation={[0, Math.PI / 2, 0]}>
					<planeGeometry args={[0.5, 0.38]} />
					<meshBasicMaterial color="#8fa6c4" />
				</mesh>
				{/* handle: jerks down when someone pulls it from outside */}
				<group position={[0.07, -0.05, 0.3]} rotation={[-0.5 * handle * Math.max(0, Math.sin(t * 22)), 0, 0]}>
					<B p={[0, 0, -0.06]} s={[0.04, 0.04, 0.16]} c="#c9c4bd" o={0.01} />
				</group>
				{/* lock latch */}
				<B p={[0.07, 0.1, 0.36 - 0.07 * (1 - lockK)]} s={[0.04, 0.05, 0.12]} c="#e8a93a" o={0.01} />
			</group>
			{/* suitcase wedged under the handle */}
			<group position={[-0.75 + (1 - suitcase) * 0.7, 0, -0.18 + (1 - suitcase) * 0.2]} rotation={[0, 0, suitcase * 0.42]}>
				<B p={[0, 0.42, 0]} s={[0.34, 0.8, 0.55]} c="#3d5a8a" o={0.05} />
				<B p={[0, 0.85, 0]} s={[0.08, 0.06, 0.2]} c="#2a2a2a" o={0.01} />
				<B p={[0.18, 0.42, 0]} s={[0.01, 0.75, 0.05]} c={P.ochre} o={0.004} />
			</group>
			<pointLight position={[0.2, 2.4, -0.7]} color="#ffcf7a" intensity={2.2} distance={5} decay={1.2} castShadow shadow-mapSize={[1024, 1024]} />
		</group>
	);
};
