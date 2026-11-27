import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ShotCtx, hash} from '../lib';
import {ShnurokSide, SideChar} from '../cartoon/SideChar';

// Trial style: the world is 3D (soft "clay" look), the characters stay flat 2D.

const W = 1080;
const H = 1920;
const FOV = 54;
const ease = (v: number) => Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, v)));

export const camAt = (t: number) => {
	const k = ease(t / 8);
	return {
		pos: new THREE.Vector3(-0.8 + 0.7 * k, 1.25 - 0.05 * k, 4.6 - 0.6 * k),
		look: new THREE.Vector3(-0.1 + 0.15 * k, 0.95, -1.2),
	};
};

export const makeCam = (t: number) => {
	const c = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
	const {pos, look} = camAt(t);
	c.position.copy(pos);
	c.lookAt(look);
	c.updateMatrixWorld();
	c.updateProjectionMatrix();
	return c;
};

export const project = (cam: THREE.PerspectiveCamera, x: number, y: number, z: number) => {
	const v = new THREE.Vector3(x, y, z).project(cam);
	return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H] as const;
};

export const CamRig: React.FC<{t: number}> = ({t}) => {
	const {camera} = useThree();
	const {pos, look} = camAt(t);
	camera.position.copy(pos);
	camera.lookAt(look);
	(camera as THREE.PerspectiveCamera).fov = FOV;
	camera.updateProjectionMatrix();
	return null;
};

// ---------------------------------------------------------------- materials
export const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.85, metalness: 0, ...extra});
export const M = {
	wall: mat('#f1e4cc'),
	wall2: mat('#e9d8bb'),
	floor: mat('#c98c55'),
	floorDark: mat('#b57a47'),
	wood: mat('#9c6338'),
	woodL: mat('#c98c55'),
	red: mat('#d9483b'),
	ochre: mat('#e8a93a'),
	cream: mat('#fbf3e2'),
	white: mat('#ffffff'),
	sky: mat('#1d2b4f', {emissive: '#1d2b4f', emissiveIntensity: 0.6}),
	moon: mat('#fff6c8', {emissive: '#fff6c8', emissiveIntensity: 1.2}),
	green: mat('#5f9e55'),
	green2: mat('#7dbb6a'),
	blue: mat('#3d5a8a'),
	pot: mat('#c0603e'),
	bulb: mat('#fff1b8', {emissive: '#ffd36a', emissiveIntensity: 2.2}),
	metal: mat('#4a3a32', {roughness: 0.5}),
	snow: mat('#ffffff', {emissive: '#ffffff', emissiveIntensity: 0.6}),
};

export const RBox: React.FC<{size: [number, number, number]; pos: [number, number, number]; m: THREE.Material; r?: number; rot?: [number, number, number]}> = ({size, pos, m, r = 0.06, rot = [0, 0, 0]}) => {
	const geo = React.useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(r, Math.min(...size) / 2 - 0.001)), [size[0], size[1], size[2], r]);
	return <mesh geometry={geo} material={m} position={pos} rotation={rot} castShadow receiveShadow />;
};

export const Box: React.FC<{size: [number, number, number]; pos: [number, number, number]; m: THREE.Material}> = ({size, pos, m}) => (
	<mesh position={pos} material={m} castShadow receiveShadow>
		<boxGeometry args={size} />
	</mesh>
);

// ---------------------------------------------------------------- room pieces
export const Room: React.FC = () => (
	<group>
		{/* floor planks */}
		{Array.from({length: 12}).map((_, i) => (
			<Box key={i} size={[0.5, 0.04, 7]} pos={[-3 + 0.25 + i * 0.5, -0.02, 0.5]} m={i % 2 ? M.floor : M.floorDark} />
		))}
		{/* back wall with a window hole: x [0.0, 1.4], y [0.9, 2.4] */}
		<Box size={[3.0, 3.2, 0.2]} pos={[-1.5, 1.6, -3.1]} m={M.wall} />
		<Box size={[1.6, 3.2, 0.2]} pos={[2.2, 1.6, -3.1]} m={M.wall} />
		<Box size={[1.4, 0.9, 0.2]} pos={[0.7, 0.45, -3.1]} m={M.wall} />
		<Box size={[1.4, 0.8, 0.2]} pos={[0.7, 2.8, -3.1]} m={M.wall} />
		{/* side walls + ceiling */}
		<Box size={[0.2, 3.2, 7]} pos={[-3.1, 1.6, 0.5]} m={M.wall2} />
		<Box size={[0.2, 3.2, 7]} pos={[3.1, 1.6, 0.5]} m={M.wall2} />
		<Box size={[6.4, 0.2, 7]} pos={[0, 3.3, 0.5]} m={M.wall} />
		{/* skirting */}
		<Box size={[6, 0.14, 0.06]} pos={[0, 0.07, -2.98]} m={M.wood} />
		{/* night outside */}
		<mesh position={[0.7, 1.6, -4.2]} material={M.sky}>
			<planeGeometry args={[6, 5]} />
		</mesh>
		<mesh position={[1.15, 2.1, -4.1]} material={M.moon}>
			<sphereGeometry args={[0.16, 32, 16]} />
		</mesh>
	</group>
);

export const Window: React.FC = () => (
	<group>
		{/* frame */}
		<RBox size={[1.56, 0.1, 0.16]} pos={[0.7, 0.88, -3.0]} m={M.cream} r={0.03} />
		<RBox size={[1.56, 0.1, 0.16]} pos={[0.7, 2.42, -3.0]} m={M.cream} r={0.03} />
		<RBox size={[0.1, 1.6, 0.16]} pos={[-0.03, 1.65, -3.0]} m={M.cream} r={0.03} />
		<RBox size={[0.1, 1.6, 0.16]} pos={[1.43, 1.65, -3.0]} m={M.cream} r={0.03} />
		<RBox size={[0.06, 1.5, 0.1]} pos={[0.7, 1.65, -3.0]} m={M.cream} r={0.02} />
		{/* sill */}
		<RBox size={[1.8, 0.07, 0.36]} pos={[0.7, 0.86, -2.86]} m={M.cream} r={0.03} />
		{/* curtain rod + curtains with folds */}
		<mesh position={[0.7, 2.62, -2.85]} rotation={[0, 0, Math.PI / 2]} material={M.wood}>
			<cylinderGeometry args={[0.025, 0.025, 2.4, 12]} />
		</mesh>
		{[-0.42, 1.82].map((cx, s) => (
			<group key={s}>
				{Array.from({length: 5}).map((_, i) => (
					<mesh key={i} position={[cx - 0.2 + i * 0.1, 1.5, -2.82 + (i % 2) * 0.04]} material={M.red} castShadow>
						<cylinderGeometry args={[0.06, 0.07, 2.2, 14]} />
					</mesh>
				))}
			</group>
		))}
	</group>
);

export const Snow: React.FC<{t: number}> = ({t}) => (
	<group>
		{Array.from({length: 70}).map((_, i) => {
			const k = (t * (0.12 + hash(i) * 0.1) + hash(i + 3)) % 1;
			const x = -0.2 + hash(i + 7) * 1.8 + Math.sin(t * 1.5 + i) * 0.05;
			return (
				<mesh key={i} position={[x, 2.5 - k * 1.8, -3.4 - hash(i + 9) * 0.6]} material={M.snow}>
					<sphereGeometry args={[0.012 + hash(i + 11) * 0.012, 8, 6]} />
				</mesh>
			);
		})}
	</group>
);

export const Bed: React.FC = () => (
	<group position={[-2.0, 0, -1.75]}>
		<RBox size={[1.3, 0.32, 2.2]} pos={[0, 0.22, 0]} m={M.wood} r={0.05} />
		<RBox size={[1.3, 0.95, 0.12]} pos={[0, 0.55, -1.1]} m={M.wood} r={0.05} />
		<RBox size={[1.22, 0.2, 2.05]} pos={[0, 0.46, 0.03]} m={M.cream} r={0.08} />
		<RBox size={[1.26, 0.14, 1.35]} pos={[0, 0.6, 0.38]} m={M.red} r={0.07} />
		<RBox size={[0.9, 0.16, 0.42]} pos={[0, 0.64, -0.72]} m={M.white} r={0.08} />
		{/* blanket stripe */}
		<RBox size={[1.28, 0.145, 0.12]} pos={[0, 0.6, 0.0]} m={M.ochre} r={0.05} />
	</group>
);

export const Sofa: React.FC = () => (
	<group position={[2.25, 0, -0.3]} rotation={[0, -Math.PI / 2, 0]}>
		<RBox size={[2.0, 0.4, 0.9]} pos={[0, 0.25, 0]} m={M.ochre} r={0.1} />
		<RBox size={[2.0, 0.7, 0.24]} pos={[0, 0.65, -0.36]} m={M.ochre} r={0.1} />
		<RBox size={[0.26, 0.6, 0.9]} pos={[-1.0, 0.45, 0]} m={M.ochre} r={0.1} />
		<RBox size={[0.26, 0.6, 0.9]} pos={[1.0, 0.45, 0]} m={M.ochre} r={0.1} />
		<RBox size={[0.86, 0.16, 0.66]} pos={[-0.44, 0.52, 0.07]} m={M.cream} r={0.07} />
		<RBox size={[0.86, 0.16, 0.66]} pos={[0.44, 0.52, 0.07]} m={M.cream} r={0.07} />
		<RBox size={[0.4, 0.4, 0.14]} pos={[0.55, 0.8, -0.18]} m={M.red} r={0.07} rot={[-0.2, 0, 0.12]} />
		{[-0.9, 0.9].map((x) => [-0.32, 0.32].map((z) => <Box key={`${x}${z}`} size={[0.08, 0.08, 0.08]} pos={[x, 0.04, z]} m={M.wood} />))}
	</group>
);

export const Rug: React.FC = () => (
	<group position={[0.1, 0.005, 0.5]}>
		<mesh material={M.red} receiveShadow>
			<cylinderGeometry args={[1.35, 1.35, 0.02, 48]} />
		</mesh>
		<mesh position={[0, 0.012, 0]} material={M.ochre} receiveShadow>
			<cylinderGeometry args={[1.05, 1.05, 0.02, 48]} />
		</mesh>
		<mesh position={[0, 0.024, 0]} material={M.cream} receiveShadow>
			<cylinderGeometry args={[0.6, 0.6, 0.02, 48]} />
		</mesh>
	</group>
);

export const Desk: React.FC<{t: number}> = ({t}) => (
	<group position={[2.15, 0, -2.45]}>
		<RBox size={[1.4, 0.07, 0.7]} pos={[0, 0.78, 0]} m={M.woodL} r={0.02} />
		{[-0.62, 0.62].map((x) => [-0.28, 0.28].map((z) => <Box key={`${x}${z}`} size={[0.06, 0.76, 0.06]} pos={[x, 0.38, z]} m={M.wood} />))}
		{/* lamp */}
		<mesh position={[-0.4, 0.83, 0]} material={M.metal} castShadow>
			<cylinderGeometry args={[0.1, 0.12, 0.04, 20]} />
		</mesh>
		<mesh position={[-0.4, 1.05, 0]} material={M.metal}>
			<cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
		</mesh>
		<mesh position={[-0.4, 1.3, 0]} material={M.red} castShadow>
			<coneGeometry args={[0.18, 0.2, 24, 1, true]} />
		</mesh>
		<mesh position={[-0.4, 1.22, 0]} material={M.bulb}>
			<sphereGeometry args={[0.05, 16, 12]} />
		</mesh>
		<pointLight position={[-0.4, 1.15, 0.05]} color="#ffc36a" intensity={2.6 + 0.15 * Math.sin(t * 9)} distance={5} decay={1.6} castShadow shadow-mapSize={[1024, 1024]} />
		{/* books + mug */}
		{['#3d5a8a', '#d9483b', '#5f9e55'].map((c, i) => (
			<RBox key={c} size={[0.32, 0.05, 0.24]} pos={[0.3, 0.84 + i * 0.05, 0]} m={mat(c)} r={0.01} rot={[0, 0.15 * i, 0]} />
		))}
		<mesh position={[0.0, 0.88, 0.12]} material={M.white} castShadow>
			<cylinderGeometry args={[0.05, 0.045, 0.12, 20]} />
		</mesh>
	</group>
);

export const Shelf: React.FC = () => (
	<group position={[-2.92, 0, -0.1]}>
		{[1.3, 1.8].map((y) => (
			<group key={y}>
				<RBox size={[0.3, 0.05, 1.2]} pos={[0.12, y, 0]} m={M.wood} r={0.02} />
				{Array.from({length: 7}).map((_, i) => {
					const h = 0.24 + hash(i + y * 10) * 0.12;
					const c = ['#3d5a8a', '#d9483b', '#e8a93a', '#5f9e55', '#8a5a9a', '#f2c230', '#c0603e'][(i + Math.round(y * 3)) % 7];
					return <RBox key={i} size={[0.2, h, 0.08]} pos={[0.13, y + 0.025 + h / 2, -0.45 + i * 0.12]} m={mat(c)} r={0.015} />;
				})}
			</group>
		))}
		{/* toy ship on the top shelf corner */}
		<RBox size={[0.18, 0.1, 0.34]} pos={[0.13, 2.1, 0.45]} m={M.red} r={0.04} />
	</group>
);

export const Plant: React.FC<{t: number}> = ({t}) => (
	<group position={[-0.75, 0, -2.6]} rotation={[0, 0, Math.sin(t * 1.3) * 0.02]}>
		<mesh position={[0, 0.2, 0]} material={M.pot} castShadow>
			<cylinderGeometry args={[0.2, 0.15, 0.4, 24]} />
		</mesh>
		{[[0, 0.62, 0, 0.22], [0.15, 0.78, 0.05, 0.16], [-0.14, 0.8, -0.03, 0.17], [0.02, 0.95, 0, 0.14]].map(([x, y, z, r], i) => (
			<mesh key={i} position={[x, y, z]} material={i % 2 ? M.green2 : M.green} castShadow>
				<sphereGeometry args={[r, 20, 14]} />
			</mesh>
		))}
	</group>
);

export const Picture: React.FC = () => (
	<group position={[-1.6, 1.9, -2.98]}>
		<RBox size={[0.8, 0.6, 0.05]} pos={[0, 0, 0]} m={M.wood} r={0.02} />
		<mesh position={[0, 0, 0.03]} material={mat('#2b4a7a')}>
			<planeGeometry args={[0.66, 0.46]} />
		</mesh>
		<mesh position={[0.12, 0.05, 0.035]} material={M.moon}>
			<circleGeometry args={[0.08, 24]} />
		</mesh>
		<mesh position={[-0.12, -0.12, 0.035]} material={mat('#6f9ad0')}>
			<planeGeometry args={[0.4, 0.06]} />
		</mesh>
	</group>
);

export const Pendant: React.FC<{t: number}> = ({t}) => (
	<group position={[0.1, 3.2, 0.3]} rotation={[0, 0, Math.sin(t * 0.8) * 0.03]}>
		<mesh position={[0, -0.3, 0]} material={M.metal}>
			<cylinderGeometry args={[0.01, 0.01, 0.6, 6]} />
		</mesh>
		<mesh position={[0, -0.68, 0]} material={M.ochre} castShadow>
			<coneGeometry args={[0.28, 0.26, 28, 1, true]} />
		</mesh>
		<mesh position={[0, -0.76, 0]} material={M.bulb}>
			<sphereGeometry args={[0.07, 16, 12]} />
		</mesh>
		<pointLight position={[0, -0.85, 0]} color="#ffd9a0" intensity={3.2} distance={8} decay={1.4} castShadow shadow-mapSize={[1024, 1024]} />
	</group>
);

export const Toys: React.FC = () => (
	<group>
		{/* low table on the rug edge, foreground */}
		<group position={[-1.25, 0, 1.6]}>
			<RBox size={[0.8, 0.06, 0.5]} pos={[0, 0.36, 0]} m={M.woodL} r={0.03} />
			{[-0.33, 0.33].map((x) => [-0.18, 0.18].map((z) => <Box key={`${x}${z}`} size={[0.05, 0.34, 0.05]} pos={[x, 0.17, z]} m={M.wood} />))}
			<mesh position={[0.18, 0.45, 0.05]} material={M.red} castShadow>
				<cylinderGeometry args={[0.06, 0.055, 0.13, 20]} />
			</mesh>
			<RBox size={[0.3, 0.03, 0.22]} pos={[-0.15, 0.405, 0]} m={M.cream} r={0.01} rot={[0, 0.3, 0]} />
		</group>
		{/* toy blocks */}
		{[[0.9, 1.7, '#3d5a8a', 0.3], [1.05, 1.62, '#e8a93a', -0.2], [0.97, 1.66, '#d9483b', 0.6]].map(([x, z, c, r], i) => (
			<RBox key={i} size={[0.14, 0.14, 0.14]} pos={[x as number, 0.07 + (i === 2 ? 0.14 : 0), z as number]} m={mat(c as string)} r={0.02} rot={[0, r as number, 0]} />
		))}
		{/* slippers */}
		{[0, 1].map((i) => (
			<RBox key={i} size={[0.11, 0.06, 0.26]} pos={[-1.55 + i * 0.15, 0.03, -0.35]} m={M.blue} r={0.04} rot={[0, 0.2 - i * 0.15, 0]} />
		))}
	</group>
);

export const World: React.FC<{t: number}> = ({t}) => (
	<>
		<CamRig t={t} />
		<color attach="background" args={['#1d2b4f']} />
		<ambientLight intensity={0.55} color="#fff2df" />
		<hemisphereLight args={['#fff4e0', '#8a5a3a', 0.6]} />
		<directionalLight position={[1.2, 3, -6]} intensity={0.5} color="#9ab8ff" />
		<Room />
		<Window />
		<Snow t={t} />
		<Bed />
		<Sofa />
		<Rug />
		<Desk t={t} />
		<Shelf />
		<Plant t={t} />
		<Picture />
		<Pendant t={t} />
		<Toys />
	</>
);

// ---------------------------------------------------------------- 2D heroes placed on the 3D floor
export const PX_PER_M = 640 / 1.75; // SideChar at s=1 is ~640 px tall ≈ 1.75 m

export const Flat2D: React.FC<{cam: THREE.PerspectiveCamera; x: number; z: number; children: (sx: number, sy: number, s: number) => React.ReactNode}> = ({cam, x, z, children}) => {
	const [fx, fy] = project(cam, x, 0, z);
	const [, hy] = project(cam, x, 1, z);
	const pxPerM = fy - hy;
	const s = pxPerM / PX_PER_M;
	return (
		<g>
			<ellipse cx={fx} cy={fy} rx={0.35 * pxPerM} ry={0.08 * pxPerM} fill="#3b2a22" opacity={0.28} />
			{children(fx, fy, s)}
		</g>
	);
};

export const STYLE3D_DURATION = 9;

export const Style3D: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const cam = makeCam(t);
	const wave = Math.sin(t * 6) * 18;
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			<ThreeCanvas width={W} height={H} shadows gl={{antialias: true}} camera={{fov: FOV, position: [0, 1.5, 5], near: 0.1, far: 100}}>
				<World t={t} />
			</ThreeCanvas>
			<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
				<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
					<Flat2D cam={cam} x={0.55} z={1.0}>
						{(sx, sy, s) => <SideChar x={sx} y={sy} s={s * 0.62} dir={-1} face="joy" hair="pigtails" hairColor="#7a4a2a" jacket="#f2a6c0" pants="#f2a6c0" shoes="#f4f1ea" headS={0.8} bodyS={0.78} headLower={-14} phase={1.3} freckles armFront={t > 2 && t < 5 ? [150, wave] : undefined} />}
					</Flat2D>
					<Flat2D cam={cam} x={-0.45} z={0.7}>
						{(sx, sy, s) => <ShnurokSide x={sx} y={sy} s={s} dir={1} face={t > 5 ? 'think' : 'smile'} />}
					</Flat2D>
				</svg>
			</ShotCtx.Provider>
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #0008'}}>Вселенная Шнурка · пробный стиль</div>
		</AbsoluteFill>
	);
};
