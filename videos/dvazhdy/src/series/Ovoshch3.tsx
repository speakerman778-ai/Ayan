import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ShotCtx, hash} from '../lib';
import {OL, NameTag} from '../cartoon/parts';
import type {Hair} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Pill} from './FlatStyleDemo';
import {RBox, Box, mat, M} from './Style3D';
import rawWords from '../../public/shnurok/ep08-words.json';
import envRaw from '../../public/shnurok/ep08-env.json';

// «Овощ», 3 серия «Вердура» — 3D world + flat 2D heroes.

const FPS = 30;
const VW = 1080;
const VH = 1920;
const O = OL;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
type V3 = [number, number, number];
const lv = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------------------------------------------------------- words / captions
const WORDS: Word[] = rawWords as Word[];
export const OVOSHCH3_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 1.2);
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:]»?$/.test(prev.text);
		if (cur.length && (cur.length >= 5 || end || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();
const norm = (s: string) => s.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && norm(x.text) === w);
const T = (w: string, from = 0) => {
	const i = idx(w, from);
	return i >= 0 ? WORDS[i].start : 0;
};

// ---------------------------------------------------------------- lip sync
type Who = 'kir' | 'coach' | 'team' | 'scout' | 'marco' | 'lm';
const QUOTE_WHO: (Who | null)[] = [null, 'coach', null, 'marco', 'lm', 'marco', null];
const SPEAK: {who: Who; start: number; end: number}[] = (() => {
	const out: {who: Who; start: number; end: number}[] = [];
	let q = -1;
	let st = 0;
	let depth = 0;
	WORDS.forEach((w) => {
		for (const ch of w.text) {
			if (ch === '«') {
				if (depth === 0) {
					q++;
					st = w.start;
				}
				depth++;
			}
			if (ch === '»') {
				depth = Math.max(0, depth - 1);
				if (depth === 0) {
					const who = QUOTE_WHO[q];
					if (who) out.push({who, start: st, end: w.end});
				}
			}
		}
	});
	return out;
})();
const ENV = envRaw as number[];
const AbsCtx = React.createContext(0);
const talkAt = (who: Who, abs: number) => {
	const seg = SPEAK.find((sg) => sg.who === who && abs >= sg.start - 0.03 && abs <= sg.end + 0.05);
	if (!seg) return 0;
	return clamp01(((ENV[Math.round(abs * FPS)] ?? 0) - 0.12) * 1.5);
};
const useTalk = (who?: Who) => {
	const abs = React.useContext(AbsCtx);
	return who ? talkAt(who, abs) : 0;
};
const speakFocus = (abs: number) => {
	let best: {who: Who; f: number} | null = null;
	for (const sg of SPEAK) {
		const f = Math.min(ease((abs - (sg.start - 0.45)) / 0.45), 1 - ease((abs - (sg.end + 0.25)) / 0.5));
		if (f > 0 && (!best || f > best.f)) best = {who: sg.who, f};
	}
	return best;
};

// ---------------------------------------------------------------- camera + projection
type Cam = {pos: V3; look: V3; fov: number};
const makeCam = (c: Cam) => {
	const cam = new THREE.PerspectiveCamera(c.fov, VW / VH, 0.1, 300);
	cam.position.set(...c.pos);
	cam.lookAt(new THREE.Vector3(...c.look));
	cam.updateMatrixWorld();
	cam.updateProjectionMatrix();
	return cam;
};
const proj = (cam: THREE.PerspectiveCamera, p: V3) => {
	const v = new THREE.Vector3(...p).project(cam);
	return [(v.x * 0.5 + 0.5) * VW, (-v.y * 0.5 + 0.5) * VH, v.z] as const;
};
const CamRig: React.FC<{c: Cam}> = ({c}) => {
	const {camera} = useThree();
	camera.position.set(...c.pos);
	camera.lookAt(new THREE.Vector3(...c.look));
	(camera as THREE.PerspectiveCamera).fov = c.fov;
	camera.updateProjectionMatrix();
	return null;
};
const CamCtx = React.createContext<THREE.PerspectiveCamera>(makeCam({pos: [0, 1.5, 5], look: [0, 1, 0], fov: 50}));

// ---------------------------------------------------------------- 2D on 3D helpers
const PX_PER_M = 640 / 1.75;
/** A flat character standing at world (x, z). h = body height factor (1 = adult 1.75 m). lift = y offset in metres (negative = sit/sink). */
const At: React.FC<{x: number; z: number; h?: number; lift?: number; lie?: number; shadow?: boolean; children: (sx: number, sy: number, s: number) => React.ReactNode}> = ({x, z, h = 1, lift = 0, lie = 0, shadow = true, children}) => {
	const cam = React.useContext(CamCtx);
	const [gx, gy, d] = proj(cam, [x, 0, z]);
	if (d > 1) return null;
	const [fx, fy] = proj(cam, [x, lift, z]);
	const [, hy] = proj(cam, [x, lift + 1, z]);
	const ppm = fy - hy;
	const s = (ppm / PX_PER_M) * h;
	return (
		<g>
			{shadow && <ellipse cx={gx} cy={gy} rx={0.34 * ppm * h + lie * 0.5 * ppm} ry={0.07 * ppm} fill="#2a2018" opacity={0.3} />}
			<g transform={lie ? `rotate(${-82 * lie} ${fx} ${fy})` : undefined}>{children(fx, fy, s)}</g>
		</g>
	);
};
/** Flat polygon from world points (used for bench planks / seat backs in front of 2D heroes). */
const Quad: React.FC<{pts: V3[]; fill: string; sw?: number}> = ({pts, fill, sw = 5}) => {
	const cam = React.useContext(CamCtx);
	const p = pts.map((q) => proj(cam, q));
	return <path d={`M ${p.map((q) => `${q[0]} ${q[1]}`).join(' L ')} Z`} fill={fill} stroke={O} strokeWidth={sw} strokeLinejoin="round" />;
};
const Pin: React.FC<{p: V3; children: (x: number, y: number, ppm: number) => React.ReactNode}> = ({p, children}) => {
	const cam = React.useContext(CamCtx);
	const [x, y, d] = proj(cam, p);
	const [, y2] = proj(cam, [p[0], p[1] + 1, p[2]]);
	if (d > 1) return null;
	return <>{children(x, y, y - y2)}</>;
};

// ---------------------------------------------------------------- heroes
const KIT = '#d9483b';
const KIT2 = '#3d6fb5';
type CP = {x: number; y: number; s: number; dir?: 1 | -1; face?: React.ComponentProps<typeof SideChar>['face']; walk?: number; armFront?: [number, number]; phase?: number};
const ShnKit: React.FC<CP> = (p) => <SideChar {...p} hair="lyokha" hairColor="#7a4a2a" freckles jacket={KIT} pants="#f4f1ea" shoes="#2b2b2b" />;
const ShnHood: React.FC<CP> = (p) => <ShnurokSide {...p} />;
const Kir: React.FC<CP> = (p) => <SideChar {...p} frontHair="quiff" hairColor="#e0b04a" jacket={KIT} pants="#f4f1ea" shoes="#2b2b2b" talk={useTalk('kir')} phase={0.7} />;
const Mate: React.FC<CP & {k: number; kit?: string}> = ({k, kit = KIT, ...p}) => {
	const hairs: Hair[] = ['buzz', 'curly', 'crew', 'shaggy', 'sweep', 'guy'];
	const cols = ['#2b211d', '#7a4a2a', '#c98c55', '#3b2a22', '#e0b04a', '#5a3a22'];
	return <SideChar {...p} frontHair={hairs[k % 6]} hairColor={cols[(k * 3 + 1) % 6]} jacket={kit} pants={kit === KIT ? '#f4f1ea' : '#22325a'} shoes="#2b2b2b" talk={useTalk(kit === KIT ? 'team' : undefined)} phase={k * 0.9} />;
};
const Coach: React.FC<CP> = (p) => <SideChar {...p} frontHair="boss" hairColor="#9a9a9a" mustache jacket="#2f4f86" pants="#2f4f86" shoes="#f4f1ea" talk={useTalk('coach')} phase={2.2} />;
const Whistle: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M 0 -380 L 10 -300" stroke="#e8e8e8" strokeWidth={5} />
		<rect x={0} y={-305} width={34} height={20} rx={8} fill="#c9ced6" stroke={O} strokeWidth={4} />
	</g>
);
const Carrot: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 20}) => (
	<g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
		<path d="M -26 -40 Q 0 -52 26 -40 L 4 70 Q 0 78 -4 70 Z" fill="#f08a24" stroke={O} strokeWidth={6} strokeLinejoin="round" />
		<path d="M -10 -20 L 4 -18 M -14 8 L 0 10 M -6 34 L 6 36" stroke="#c9661a" strokeWidth={4} />
		<path d="M -6 -44 Q -26 -90 -14 -96 Q 0 -70 0 -48 Q 4 -84 18 -92 Q 22 -64 6 -44 Z" fill="#5f9e55" stroke={O} strokeWidth={5} strokeLinejoin="round" />
	</g>
);
const Big: React.FC<{text: string; t: number; at: number; y?: number; size?: number; color?: string; out?: number}> = ({text, t, at, y = 700, size = 220, color = '#fff', out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.3)})`}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={O} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);

// ---------------------------------------------------------------- 3D sets
const G1 = mat('#5f9e55');
const G2 = mat('#6dab62');
const GOUT = mat('#4f8a47');
const LINE = mat('#f4f1ea');
const SEAT = mat('#c94b3e');
const SEAT2 = mat('#e8a93a');
const CONC = mat('#b9b2a6');
const DARK = mat('#2b2b33');
const NET = new THREE.MeshBasicMaterial({color: '#ffffff', wireframe: true, transparent: true, opacity: 0.45});
const GLASS = new THREE.MeshStandardMaterial({color: '#bfe0ff', transparent: true, opacity: 0.35, roughness: 0.2});
const BEAM = new THREE.MeshBasicMaterial({color: '#fff3c4', transparent: true, opacity: 0.12, depthWrite: false});
const LAMP = mat('#fff7d6', {emissive: '#ffe9a8', emissiveIntensity: 2});
const SHIRTS = ['#d9483b', '#3d6fb5', '#e8a93a', '#f4f1ea', '#5f9e55', '#8a5a9a', '#f2c230'].map((c) => mat(c));
const SKIN = mat('#f2c9a0');

let ballTex: THREE.CanvasTexture | null = null;
const getBallTex = () => {
	if (ballTex) return ballTex;
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 128;
	const g = c.getContext('2d')!;
	g.fillStyle = '#fafafa';
	g.fillRect(0, 0, 256, 128);
	g.fillStyle = '#222';
	for (let i = 0; i < 10; i++) {
		const x = (i * 53) % 256;
		const y = 20 + ((i * 37) % 90);
		g.beginPath();
		for (let k = 0; k < 5; k++) {
			const a = (k / 5) * Math.PI * 2;
			g.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
		}
		g.fill();
	}
	ballTex = new THREE.CanvasTexture(c);
	return ballTex;
};
const Ball: React.FC<{p: V3; spin?: number}> = ({p, spin = 0}) => {
	const m = React.useMemo(() => new THREE.MeshStandardMaterial({map: getBallTex(), roughness: 0.6}), []);
	return (
		<mesh position={p} rotation={[spin, spin * 0.6, 0]} material={m} castShadow>
			<sphereGeometry args={[0.13, 32, 20]} />
		</mesh>
	);
};

const Goal: React.FC<{x: number; dir: 1 | -1}> = ({x, dir}) => (
	<group position={[x, 0, 0]}>
		{[-3, 3].map((z) => (
			<mesh key={z} position={[0, 1.1, z]} material={LINE} castShadow>
				<cylinderGeometry args={[0.07, 0.07, 2.2, 12]} />
			</mesh>
		))}
		<mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={LINE} castShadow>
			<cylinderGeometry args={[0.07, 0.07, 6.14, 12]} />
		</mesh>
		<mesh position={[dir * 0.8, 1.1, 0]} material={NET}>
			<boxGeometry args={[1.6, 2.2, 6, 6, 8, 20]} />
		</mesh>
	</group>
);

const Crowd: React.FC<{t: number; hype: number}> = ({t, hype}) => (
	<group>
		{Array.from({length: 7}).map((_, r) =>
			Array.from({length: 34}).map((_, c) => {
				const i = r * 34 + c;
				if (hash(i + 5) < 0.12) return null;
				const x = -25 + c * 1.5 + (hash(i) - 0.5) * 0.4;
				const y = 1.3 + r * 0.9;
				const z = -16 - r * 1.2;
				const j = Math.max(0, Math.sin(t * (6 + hash(i) * 4) + i)) * 0.25 * hype;
				return (
					<group key={i} position={[x, y + j, z]}>
						<mesh position={[0, 0.3, 0]} material={SHIRTS[i % SHIRTS.length]}>
							<capsuleGeometry args={[0.22, 0.35, 4, 8]} />
						</mesh>
						<mesh position={[0, 0.82, 0]} material={SKIN}>
							<sphereGeometry args={[0.18, 12, 10]} />
						</mesh>
					</group>
				);
			}),
		)}
	</group>
);

const Stands: React.FC<{t: number; crowd: number; hype: number}> = ({t, crowd, hype}) => (
	<group>
		{Array.from({length: 7}).map((_, r) => (
			<group key={r}>
				<Box size={[54, 0.9 * (r + 1), 1.2]} pos={[0, 0.45 * (r + 1), -16 - r * 1.2]} m={CONC} />
				<Box size={[54, 0.12, 0.5]} pos={[0, 0.9 * (r + 1) + 0.06, -15.8 - r * 1.2]} m={r % 2 ? SEAT : SEAT2} />
			</group>
		))}
		{/* roof */}
		<Box size={[56, 0.3, 10]} pos={[0, 9.8, -20]} m={mat('#ece7dc')} />
		{[-26, -9, 9, 26].map((x) => (
			<Box key={x} size={[0.4, 9.8, 0.4]} pos={[x, 4.9, -24.5]} m={CONC} />
		))}
		{crowd > 0 && <Crowd t={t} hype={hype} />}
		{/* flags on the roof */}
		{crowd > 0 &&
			[-20, -12, -4, 4, 12, 20].map((x, i) => (
				<group key={x} position={[x, 10, -15.5]}>
					<Box size={[0.08, 2.2, 0.08]} pos={[0, 1.1, 0]} m={CONC} />
					<mesh position={[0.6, 1.8, 0]} rotation={[0, Math.sin(t * 3 + i) * 0.4, 0]} material={i % 2 ? SHIRTS[0] : SHIRTS[1]}>
						<boxGeometry args={[1.2, 0.7, 0.04]} />
					</mesh>
				</group>
			))}
		{/* scoreboard */}
		<RBox size={[9, 3.2, 0.5]} pos={[0, 13.5, -22]} m={DARK} r={0.2} />
		<Box size={[0.4, 4, 0.4]} pos={[-3, 10.8, -22.2]} m={DARK} />
		<Box size={[0.4, 4, 0.4]} pos={[3, 10.8, -22.2]} m={DARK} />
	</group>
);

const Field: React.FC<{t: number; night: number; crowd: number; hype?: number; lamp?: number; skyCol?: string}> = ({t, night, crowd, hype = 0, lamp = 0, skyCol}) => {
	const day = 1 - night;
	const sky = skyCol ? new THREE.Color(skyCol) : new THREE.Color('#9fd0f2').lerp(new THREE.Color('#141d38'), night);
	return (
		<>
			<color attach="background" args={[sky]} />
			<fog attach="fog" args={[sky, 40, 110]} />
			<ambientLight intensity={0.35 + 0.35 * day} color={night > 0.5 ? '#8fa6d8' : '#fff4e2'} />
			<hemisphereLight args={['#dfefff', '#4f7a40', 0.25 + 0.45 * day]} />
			<directionalLight position={[-18, 30, 20]} intensity={1.6 * day + 0.12} color={night > 0.5 ? '#9ab8ff' : '#fff1d8'} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
			{/* ground */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={GOUT} receiveShadow>
				<planeGeometry args={[200, 200]} />
			</mesh>
			{Array.from({length: 18}).map((_, i) => (
				<mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-22.5 + i * 2.5 + 1.25, 0, 0]} material={i % 2 ? G1 : G2} receiveShadow>
					<planeGeometry args={[2.5, 28]} />
				</mesh>
			))}
			{/* lines */}
			{[
				[[42, 0.02, 0.12], [0, 0.01, 12]],
				[[42, 0.02, 0.12], [0, 0.01, -12]],
				[[0.12, 0.02, 24], [21, 0.01, 0]],
				[[0.12, 0.02, 24], [-21, 0.01, 0]],
				[[0.12, 0.02, 24], [0, 0.01, 0]],
				[[0.12, 0.02, 12], [15.5, 0.01, 0]],
				[[5.5, 0.02, 0.12], [18.25, 0.01, 6]],
				[[5.5, 0.02, 0.12], [18.25, 0.01, -6]],
				[[0.12, 0.02, 12], [-15.5, 0.01, 0]],
				[[5.5, 0.02, 0.12], [-18.25, 0.01, 6]],
				[[5.5, 0.02, 0.12], [-18.25, 0.01, -6]],
			].map(([sz, p], i) => (
				<Box key={i} size={sz as V3} pos={p as V3} m={LINE} />
			))}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={LINE}>
				<ringGeometry args={[3.0, 3.12, 64]} />
			</mesh>
			<Goal x={21} dir={1} />
			<Goal x={-21} dir={-1} />
			{/* corner flags */}
			{[[21, 12], [21, -12], [-21, 12], [-21, -12]].map(([x, z], i) => (
				<group key={i} position={[x, 0, z]}>
					<Box size={[0.05, 1.5, 0.05]} pos={[0, 0.75, 0]} m={LINE} />
					<mesh position={[0.25, 1.35, 0]} rotation={[0, Math.sin(t * 4 + i) * 0.5, 0]} material={SHIRTS[2]}>
						<boxGeometry args={[0.5, 0.3, 0.02]} />
					</mesh>
				</group>
			))}
			{/* ad boards */}
			{Array.from({length: 12}).map((_, i) => (
				<RBox key={i} size={[3.9, 0.9, 0.15]} pos={[-23.4 + i * 4.25, 0.45, -13.6]} m={SHIRTS[(i * 3) % SHIRTS.length]} r={0.05} />
			))}
			<Stands t={t} crowd={crowd} hype={hype} />
			{/* trees behind the goals */}
			{Array.from({length: 10}).map((_, i) => {
				const x = i % 2 ? 29 + hash(i) * 4 : -29 - hash(i) * 4;
				const z = -12 + (i >> 1) * 6;
				return (
					<group key={i} position={[x, 0, z]}>
						<Box size={[0.4, 2.4, 0.4]} pos={[0, 1.2, 0]} m={M.wood} />
						<mesh position={[0, 3.4, 0]} material={i % 3 ? M.green : M.green2} castShadow>
							<sphereGeometry args={[1.7 + hash(i + 2) * 0.6, 16, 12]} />
						</mesh>
					</group>
				);
			})}
			{/* the lonely lamp post */}
			<group position={[17, 0, -9.5]}>
				<mesh position={[0, 4.5, 0]} material={DARK} castShadow>
					<cylinderGeometry args={[0.12, 0.18, 9, 10]} />
				</mesh>
				<RBox size={[1.2, 0.35, 0.8]} pos={[-0.4, 9.1, 0.3]} m={DARK} r={0.08} />
				<mesh position={[-0.4, 8.9, 0.3]} material={lamp > 0 ? LAMP : DARK}>
					<boxGeometry args={[1.0, 0.06, 0.6]} />
				</mesh>
				{lamp > 0 && (
					<>
						<spotLight position={[-0.4, 8.8, 0.3]} target-position={[-1.5, 0, 6]} angle={0.62} penumbra={0.5} intensity={60 * lamp} distance={30} decay={1.4} color="#ffe8b0" castShadow shadow-mapSize={[1024, 1024]} />
						<mesh position={[-1.0, 4.5, 3.4]} rotation={[0.58, 0, 0.12]} material={BEAM}>
							<coneGeometry args={[4.6, 9.5, 32, 1, true]} />
						</mesh>
					</>
				)}
			</group>
			{/* dugout on the near side */}
			<group position={[-3, 0, 14]}>
				<RBox size={[6, 0.12, 0.6]} pos={[0, 0.5, 0]} m={M.wood} r={0.04} />
				<RBox size={[6, 0.12, 0.6]} pos={[0, 0.5, 0.0]} m={M.wood} r={0.04} />
				<mesh position={[0, 1.9, 0.4]} rotation={[0.25, 0, 0]} material={GLASS}>
					<boxGeometry args={[6.4, 0.05, 1.6]} />
				</mesh>
				{[-3.1, 3.1].map((x) => (
					<Box key={x} size={[0.08, 1.9, 0.08]} pos={[x, 0.95, 0.9]} m={CONC} />
				))}
			</group>
			{night > 0.5 &&
				Array.from({length: 40}).map((_, i) => (
					<mesh key={i} position={[-60 + hash(i) * 120, 25 + hash(i + 1) * 30, -80]} material={M.snow}>
						<sphereGeometry args={[0.15, 6, 4]} />
					</mesh>
				))}
		</>
	);
};

const TILE = mat('#d3dbe4');
const TILE2 = mat('#c3ccd7');
const LOCK = mat('#3d6fb5');
const LOCKD = mat('#335f9c');
const CARROT = mat('#f08a24');
const Locker: React.FC<{t: number; open?: number; carrot?: boolean}> = ({t, open = 0, carrot = false}) => (
	<>
		<color attach="background" args={['#cfd8e3']} />
		<ambientLight intensity={0.6} color="#fff6ea" />
		<hemisphereLight args={['#ffffff', '#8a8f99', 0.5]} />
		<pointLight position={[0, 2.8, 0]} intensity={4} distance={12} decay={1.3} color="#fff2d6" castShadow shadow-mapSize={[1024, 1024]} />
		{/* floor tiles */}
		{Array.from({length: 10}).map((_, i) =>
			Array.from({length: 8}).map((_, j) => <Box key={`${i}${j}`} size={[0.8, 0.04, 0.8]} pos={[-4 + i * 0.8 + 0.4, -0.02, -3 + j * 0.8 + 0.4]} m={(i + j) % 2 ? TILE : TILE2} />),
		)}
		<Box size={[8, 3.2, 0.2]} pos={[0, 1.6, -3.1]} m={mat('#e9eef3')} />
		<Box size={[0.2, 3.2, 7]} pos={[-4.1, 1.6, 0.4]} m={mat('#dfe6ee')} />
		<Box size={[0.2, 3.2, 7]} pos={[4.1, 1.6, 0.4]} m={mat('#dfe6ee')} />
		<Box size={[8.4, 0.2, 7]} pos={[0, 3.3, 0.4]} m={mat('#f4f6f8')} />
		{/* stripe on the wall */}
		<Box size={[8, 0.25, 0.05]} pos={[0, 2.5, -2.98]} m={M.red} />
		{/* lockers */}
		{Array.from({length: 9}).map((_, i) => {
			const x = -3.6 + i * 0.75;
			const isOpen = i === 5;
			return (
				<group key={i} position={[x, 0, -2.7]}>
					<RBox size={[0.7, 2.0, 0.5]} pos={[0, 1.05, 0]} m={i % 2 ? LOCK : LOCKD} r={0.03} />
					{[0, 1, 2].map((k) => (
						<Box key={k} size={[0.4, 0.03, 0.02]} pos={[0, 1.75 - k * 0.07, 0.26]} m={DARK} />
					))}
					{isOpen ? (
						<group position={[0.33, 1.05, 0.26]} rotation={[0, -1.9 * open, 0]}>
							<RBox size={[0.68, 1.94, 0.04]} pos={[-0.34, 0, 0]} m={LOCK} r={0.02} />
						</group>
					) : (
						<Box size={[0.05, 0.18, 0.04]} pos={[0.25, 1.05, 0.27]} m={CONC} />
					)}
					{isOpen && carrot && (
						<group position={[0, 0.55, 0.05]} rotation={[0, 0, 0.5]}>
							<mesh material={CARROT} rotation={[0, 0, Math.PI]} castShadow>
								<coneGeometry args={[0.09, 0.5, 16]} />
							</mesh>
							<mesh position={[0, 0.32, 0]} material={M.green}>
								<coneGeometry args={[0.07, 0.18, 8]} />
							</mesh>
						</group>
					)}
				</group>
			);
		})}
		{/* bench */}
		<RBox size={[4.2, 0.1, 0.45]} pos={[0, 0.45, -1.2]} m={M.woodL} r={0.03} />
		{[-1.8, 0, 1.8].map((x) => (
			<Box key={x} size={[0.08, 0.42, 0.35]} pos={[x, 0.21, -1.2]} m={CONC} />
		))}
		{/* balls + bag on the floor */}
		<Ball p={[2.9, 0.13, -1.6]} spin={0.4} />
		<Ball p={[3.2, 0.13, -1.9]} spin={1.4} />
		<RBox size={[0.7, 0.35, 0.35]} pos={[-2.8, 0.18, -1.7]} m={M.red} r={0.12} />
		{/* poster + clock */}
		<RBox size={[1.4, 1.0, 0.04]} pos={[2.9, 2.0, -2.98]} m={mat('#f2c230')} r={0.02} />
		<mesh position={[-3.0, 2.6, -2.95]} rotation={[Math.PI / 2, 0, 0]} material={M.white}>
			<cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
		</mesh>
		{/* ceiling lamps */}
		{[-2, 2].map((x) => (
			<Box key={x} size={[1.6, 0.06, 0.4]} pos={[x, 3.17, -0.5]} m={LAMP} />
		))}
	</>
);

const Bus: React.FC<{t: number}> = ({t}) => {
	const sh = Math.sin(t * 9) * 0.004;
	return (
		<group position={[0, sh, 0]}>
			<color attach="background" args={['#9fd0f2']} />
			<ambientLight intensity={0.75} color="#fff6ea" />
			<hemisphereLight args={['#ffffff', '#6a6a70', 0.5]} />
			<directionalLight position={[-6, 6, 2]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
			<Box size={[2.6, 0.05, 14]} pos={[0, -0.02, -3]} m={mat('#5a5f6a')} />
			<Box size={[0.6, 0.06, 14]} pos={[0, 0.0, -3]} m={mat('#3b3f48')} />
			<Box size={[2.8, 0.1, 14]} pos={[0, 2.3, -3]} m={mat('#f4f1ea')} />
			<Box size={[2.8, 2.4, 0.1]} pos={[0, 1.15, 4]} m={mat('#e8e2d6')} />
			<mesh position={[0, 1.5, 3.94]} rotation={[0, Math.PI, 0]}>
				<planeGeometry args={[2.2, 0.9]} />
				<meshBasicMaterial color={'#cfe9ff'} />
			</mesh>
			{[-1.35, 1.35].map((x, s) => (
				<group key={x}>
					<Box size={[0.1, 0.9, 14]} pos={[x, 0.45, -3]} m={mat('#e8e2d6')} />
					<Box size={[0.1, 0.4, 14]} pos={[x, 2.1, -3]} m={mat('#e8e2d6')} />
					{Array.from({length: 7}).map((_, i) => (
						<group key={i}>
							<mesh position={[x, 1.4, 3 - i * 2]} rotation={[0, (s ? -1 : 1) * Math.PI / 2, 0]}>
								<planeGeometry args={[1.8, 1.0]} />
								<meshBasicMaterial color={'#cfe9ff'} />
							</mesh>
							{/* passing trees outside */}
							<mesh position={[x * 1.6, 1.4, ((3 - i * 2 + t * 6) % 14) - 10]} material={M.green}>
								<sphereGeometry args={[0.5, 10, 8]} />
							</mesh>
							<Box size={[0.1, 1.0, 0.12]} pos={[x, 1.4, 4 - i * 2]} m={mat('#e8e2d6')} />
						</group>
					))}
				</group>
			))}
			{/* seats */}
			{Array.from({length: 6}).map((_, i) =>
				[-0.85, 0.85].map((x) => (
					<group key={`${i}${x}`} position={[x, 0, 2 - i * 1.9]}>
						<RBox size={[0.9, 0.18, 0.55]} pos={[0, 0.5, 0]} m={SHIRTS[1]} r={0.06} />
						<RBox size={[0.9, 0.7, 0.14]} pos={[0, 0.9, 0.28]} m={SHIRTS[1]} r={0.06} />
					</group>
				)),
			)}
			{/* yellow poles */}
			{[-1, -5].map((z) => (
				<mesh key={z} position={[0.32, 1.15, z]} material={SHIRTS[6]}>
					<cylinderGeometry args={[0.03, 0.03, 2.3, 8]} />
				</mesh>
			))}
		</group>
	);
};

// ---------------------------------------------------------------- scenes
type Scene = {
	at: number; // absolute start (s)
	cam: (t: number, dur: number) => Cam;
	world: (t: number) => React.ReactNode;
	flat: (t: number, abs: number) => React.ReactNode;
	over?: (t: number, abs: number) => React.ReactNode;
	heads?: Partial<Record<Who, V3>>;
	freezeAt?: number;
};
const S = (w: string, from = 0, pad = 0.2) => Math.max(0, T(w, from) - pad);

const Seated = (x: number, z: number, w = 0.8, col = '#c98c55') => <Quad pts={[[x - w / 2, 0.42, z + 0.25], [x + w / 2, 0.42, z + 0.25], [x + w / 2, 0.56, z + 0.25], [x - w / 2, 0.56, z + 0.25]]} fill={col} />;

const Dugout = (x0: number, x1: number) => (
	<g>
		<Quad pts={[[x0, 0, 14.75], [x1, 0, 14.75], [x1, 0.72, 14.75], [x0, 0.72, 14.75]]} fill="#2f4f86" />
		<Quad pts={[[x0, 0.45, 14.75], [x1, 0.45, 14.75], [x1, 0.53, 14.75], [x0, 0.53, 14.75]]} fill="#f4f1ea" sw={3} />
		<Quad pts={[[x0, 0.72, 14.75], [x1, 0.72, 14.75], [x1, 0.79, 14.7], [x0, 0.79, 14.7]]} fill="#d9483b" sw={3} />
	</g>
);


const Board: React.FC<{text: string; sub: string}> = ({text, sub}) => (
	<Pin p={[0, 13.5, -21.7]}>
		{(x, y, ppm) => (
			<g transform={`translate(${x} ${y}) scale(${ppm / 120})`}>
				<text textAnchor="middle" y={-20} fontFamily="Inter" fontWeight={900} fontSize={120} fill="#ffd36a">{text}</text>
				<text textAnchor="middle" y={90} fontFamily="Inter" fontWeight={800} fontSize={60} fill="#fff">{sub}</text>
			</g>
		)}
	</Pin>
);

// ---------------------------------------------------------------- extra pieces for episode 2
const SNOWG = mat('#eef2f8');
const ROAD = mat('#8e97a6');
const WALK = mat('#c9ced8');
const HOUSE = ['#efe0c2', '#e8a93a', '#c0603e', '#9fb7d6', '#d9b07a', '#b9c7a6'].map((c) => mat(c));
const WIN_ON = mat('#ffe9a8', {emissive: '#ffd36a', emissiveIntensity: 1.4});
const WIN_OFF = mat('#5a6478');
const SUNM = mat('#ffd08a', {emissive: '#ffb050', emissiveIntensity: 1.6});

const Street: React.FC<{t: number; dawn: number}> = ({t, dawn}) => {
	const sky = new THREE.Color('#26305a').lerp(new THREE.Color('#f4b98e'), dawn);
	return (
		<>
			<color attach="background" args={[sky]} />
			<fog attach="fog" args={[sky, 25, 75]} />
			<ambientLight intensity={0.35 + 0.35 * dawn} color={dawn > 0.5 ? '#ffe6d2' : '#9fb0e0'} />
			<hemisphereLight args={['#ffe0c8', '#8a96b0', 0.3 + 0.3 * dawn]} />
			<directionalLight position={[25, 6, -30]} intensity={0.4 + 1.1 * dawn} color="#ffb877" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -20]} material={SNOWG} receiveShadow>
				<planeGeometry args={[80, 100]} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -20]} material={ROAD} receiveShadow>
				<planeGeometry args={[4, 100]} />
			</mesh>
			{[-2.8, 2.8].map((x) => (
				<Box key={x} size={[1.6, 0.12, 100]} pos={[x, 0.06, -20]} m={WALK} />
			))}
			{/* snow banks */}
			{Array.from({length: 14}).map((_, i) => (
				<mesh key={i} position={[(i % 2 ? 1 : -1) * 2.05, 0.05, 4 - i * 4]} scale={[0.5, 0.25, 1.6]} material={SNOWG}>
					<sphereGeometry args={[1, 12, 8]} />
				</mesh>
			))}
			{/* houses */}
			{Array.from({length: 16}).map((_, i) => {
				const side = i % 2 ? 1 : -1;
				const z = 4 - Math.floor(i / 2) * 7;
				const h = 6 + hash(i) * 7;
				return (
					<group key={i} position={[side * 7.5, 0, z]}>
						<RBox size={[5, h, 5.6]} pos={[0, h / 2, 0]} m={HOUSE[i % HOUSE.length]} r={0.08} />
						<Box size={[5.4, 0.3, 6]} pos={[0, h + 0.15, 0]} m={SNOWG} />
						{Array.from({length: Math.floor(h / 2)}).map((_, r) =>
							[-1.6, 0, 1.6].map((dz, c) => (
								<Box key={`${r}${c}`} size={[0.06, 0.9, 0.8]} pos={[-side * 2.52, 1.6 + r * 2, dz]} m={hash(i * 31 + r * 7 + c) > 0.55 + dawn * 0.3 ? WIN_ON : WIN_OFF} />
							)),
						)}
					</group>
				);
			})}
			{/* lamp posts: they switch off one by one at dawn */}
			{Array.from({length: 8}).map((_, i) => {
				const side = i % 2 ? 1 : -1;
				const z = 2 - i * 6;
				const on = dawn < 0.35 + i * 0.06;
				return (
					<group key={i} position={[side * 3.4, 0, z]}>
						<mesh position={[0, 2.2, 0]} material={DARK}>
							<cylinderGeometry args={[0.06, 0.08, 4.4, 8]} />
						</mesh>
						<RBox size={[0.5, 0.2, 0.3]} pos={[-side * 0.2, 4.4, 0]} m={DARK} r={0.05} />
						<mesh position={[-side * 0.2, 4.28, 0]} material={on ? LAMP : DARK}>
							<boxGeometry args={[0.4, 0.04, 0.24]} />
						</mesh>
						{on && i < 4 && <pointLight position={[-side * 0.2, 4.1, 0]} color="#ffd9a0" intensity={4} distance={9} decay={1.5} />}
					</group>
				);
			})}
			<mesh position={[30, 4 + dawn * 6, -70]} material={SUNM}>
				<sphereGeometry args={[4, 24, 16]} />
			</mesh>
			{/* falling snow */}
			{Array.from({length: 90}).map((_, i) => {
				const k = (t * (0.18 + hash(i) * 0.1) + hash(i + 3)) % 1;
				return (
					<mesh key={i} position={[-6 + hash(i + 7) * 12 + Math.sin(t + i) * 0.2, 7 - k * 7, 2 - hash(i + 9) * 24]} material={M.snow}>
						<sphereGeometry args={[0.03, 6, 4]} />
					</mesh>
				);
			})}
		</>
	);
};

const SCOUT_BLUE = '#1f3f8f';
const SCOUT_RED = '#8a1538';
const Scout: React.FC<CP> = (p) => (
	<g>
		<SideChar {...p} frontHair="boss" hairColor="#3b2a22" mustache jacket="#262a33" pants="#262a33" shoes="#111111" talk={useTalk('scout')} phase={1.7} />
		{/* blue-garnet striped scarf */}
		<g transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
			<rect x={-58} y={-452} width={116} height={34} rx={14} fill={SCOUT_BLUE} stroke={O} strokeWidth={5} />
			{[-30, 0, 30].map((dx) => (
				<rect key={dx} x={dx - 7} y={-450} width={14} height={30} fill={SCOUT_RED} />
			))}
			<path d="M 24 -424 L 34 -330 L 64 -330 L 52 -424 Z" fill={SCOUT_BLUE} stroke={O} strokeWidth={5} strokeLinejoin="round" />
			<rect x={36} y={-372} width={24} height={14} fill={SCOUT_RED} />
		</g>
	</g>
);

const Confetti: React.FC<{t: number; at: number}> = ({t, at}) =>
	t < at ? null : (
		<>
			{Array.from({length: 70}).map((_, i) => {
				const k = (t - at) * (0.35 + hash(i) * 0.3) + hash(i + 2) * 0.2;
				const y = -40 + k * 1500;
				if (y > 1960) return null;
				const x = hash(i + 5) * 1080 + Math.sin(t * 3 + i) * 30;
				return <rect key={i} x={x} y={y} width={18} height={10} fill={['#d9483b', '#f2c230', '#3d6fb5', '#5f9e55', '#fff'][i % 5]} transform={`rotate(${(t * 200 + i * 40) % 360} ${x + 9} ${y + 5})`} />;
			})}
		</>
	);

const Ticket: React.FC<{t: number; at: number; x?: number; y?: number}> = ({t, at, x = 540, y = 600}) =>
	t < at ? null : (
		<g transform={`translate(${x} ${y}) rotate(-6) scale(${back((t - at) / 0.4)})`}>
			<rect x={-300} y={-120} width={600} height={240} rx={26} fill="#fbf3e2" stroke={O} strokeWidth={8} />
			<rect x={-300} y={-120} width={150} height={240} rx={26} fill={SCOUT_BLUE} stroke={O} strokeWidth={8} />
			<rect x={-190} y={-120} width={40} height={240} fill={SCOUT_RED} />
			<path d="M -120 -120 L -120 120" stroke={O} strokeWidth={5} strokeDasharray="14 10" />
			<path d="M -250 10 l 40 -10 l 30 -40 l 12 0 l -14 36 l 30 -6 l 10 -14 l 10 0 l -6 22 l 6 22 l -10 0 l -10 -14 l -30 -6 l 14 36 l -12 0 l -30 -40 Z" fill="#fff" stroke={O} strokeWidth={3} />
			<text x={90} y={-30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={SCOUT_RED}>БАРСЕЛОНА</text>
			<text x={90} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={30} fill={O}>академия «Ла Масия»</text>
			<text x={90} y={80} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill={O}>1 пассажир · в одну сторону</text>
		</g>
	);


// ---------------------------------------------------------------- episode 3 pieces
const BLUE = '#1f3f8f';
const GARNET = '#8a1538';
const ShnBar: React.FC<CP> = (p) => <SideChar {...p} hair="lyokha" hairColor="#7a4a2a" freckles jacket={BLUE} pants={GARNET} shoes="#2b2b2b" />;
const Marco: React.FC<CP> = (p) => <SideChar {...p} frontHair="curly" hairColor="#1b1410" jacket={BLUE} pants={GARNET} shoes="#2b2b2b" talk={useTalk('marco')} phase={0.9} />;
const LmCoach: React.FC<CP> = (p) => <SideChar {...p} frontHair="buzz" hairColor="#3b2a22" glasses jacket="#2b2b33" pants="#2b2b33" shoes="#f4f1ea" talk={useTalk('lm')} phase={2.6} />;
const Mom: React.FC<CP> = (p) => <SideChar {...p} hair="long" hairColor="#2b211d" jacket="#c0603e" pants="#5a3a28" phase={1.1} />;

const orbit = (c: V3, r: number, h: number, a: number, fov = 50): Cam => ({pos: [c[0] + r * Math.sin(a), c[1] + h, c[2] + r * Math.cos(a)], look: c, fov});

const TRUNK = mat('#9c6338');
const LEAF = mat('#4f9a4a');
const LEAF2 = mat('#6dbb5f');
const Palm: React.FC<{p: V3; h?: number; t: number; lean?: number}> = ({p, h = 6, t, lean = 0.15}) => (
	<group position={p} rotation={[0, hash(p[0] * 3 + p[2]) * 6, lean]}>
		{Array.from({length: 6}).map((_, i) => (
			<mesh key={i} position={[i * i * 0.012 * h, (i + 0.5) * (h / 6), 0]} material={TRUNK} castShadow>
				<cylinderGeometry args={[0.16 - i * 0.012, 0.2 - i * 0.012, h / 6 + 0.05, 10]} />
			</mesh>
		))}
		<group position={[0.36 * h * 0.33, h, 0]}>
			{Array.from({length: 8}).map((_, i) => (
				<group key={i} rotation={[0, (i / 8) * Math.PI * 2, -0.5 + Math.sin(t * 1.5 + i) * 0.06]}>
					<mesh position={[1.1, 0, 0]} scale={[1.2, 0.08, 0.35]} material={i % 2 ? LEAF : LEAF2} castShadow>
						<sphereGeometry args={[1, 12, 6]} />
					</mesh>
				</group>
			))}
			<mesh material={TRUNK}>
				<sphereGeometry args={[0.28, 10, 8]} />
			</mesh>
		</group>
	</group>
);
const Palms: React.FC<{t: number}> = ({t}) => (
	<>
		{[[-24, -12], [-26, -4], [-25, 5], [24, -12], [26, -3], [25, 6], [-14, -14.8], [-6, -14.8], [6, -14.8], [14, -14.8], [-18, 15], [-6, 16], [8, 16], [18, 15]].map(([x, z], i) => (
			<Palm key={i} p={[x, 0, z]} h={5.5 + hash(i) * 2.5} t={t + i} lean={(hash(i + 3) - 0.5) * 0.3} />
		))}
	</>
);

const Panel: React.FC<{t: number; at: number; out?: number; children: React.ReactNode; tint?: string}> = ({t, at, out = 1e9, children, tint = '#fbf3e2'}) =>
	t < at || t > out + 0.3 ? null : (
		<g opacity={clamp01((t - at) / 0.3) * (1 - clamp01((t - out) / 0.3))} transform={`translate(540 860) scale(${0.9 + 0.1 * back((t - at) / 0.4)}) translate(-540 -860)`}>
			<rect x={60} y={400} width={960} height={920} rx={44} fill={tint} stroke={O} strokeWidth={9} />
			{children}
		</g>
	);

const VoteBars: React.FC<{t: number}> = ({t}) => {
	const k = ease((t - 0.3) / 1.8);
	return (
		<g transform="translate(0 0)">
			<rect x={90} y={430} width={900} height={420} rx={36} fill="#fbf3e2" stroke={O} strokeWidth={8} />
			<text x={540} y={510} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={52} fill={O}>вы выбрали</text>
			<rect x={140} y={560} width={800 * 0.35 * k} height={90} rx={20} fill={KIT} stroke={O} strokeWidth={6} />
			<text x={160} y={622} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" opacity={k}>1 · остаться</text>
			<rect x={140} y={690} width={800 * k} height={90} rx={20} fill={BLUE} stroke={O} strokeWidth={6} />
			<rect x={140 + 800 * k * 0.5} y={690} width={800 * k * 0.25} height={90} fill={GARNET} />
			<text x={160} y={752} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" opacity={k}>2 · «Барселона» ✓</text>
		</g>
	);
};

const sc: Scene[] = [];

// 1. vote result → farewell with Palych ----------------------------------------------------
{
	const at = 0;
	sc.push({
		at,
		cam: (t) => orbit([15, 1.0, 2.5], 9, 1.6, 0.9 + 0.12 * ease(t / 7), 52),
		world: (t) => <Field t={t} night={1} crowd={0} lamp={1} />,
		flat: (t) => (
			<>
				<At x={14.2} z={2.0} h={0.88}>{(x, y, s) => <ShnHood x={x} y={y} s={s} dir={1} face="smile" />}</At>
				<At x={16.0} z={2.8} h={1}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={-1} face="neutral" /><Whistle x={x} y={y} s={s} /></g>}</At>
			</>
		),
		over: (t) => <VoteBars t={t} />,
	});
}

// 2. night with Palych until dawn; «Лети, Овощ» (orbit) -----------------------------------
{
	const at = S('ночь');
	const dawn = T('рассвете') - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([15.1, 1.0, 2.4], 7.5, 1.3, 0.2 + 1.3 * ease(t / dur), 50),
		world: (t) => {
			const night = 1 - 0.75 * ease((t - dawn) / 1.5);
			const k = (t * 0.7) % 2;
			const f = k < 1 ? k : 2 - k;
			const p: V3 = lv([14.4, 0.13, 2.1], [15.8, 0.13, 2.7], ease(f));
			p[1] += Math.sin(f * Math.PI) * 0.5;
			return (
				<>
					<Field t={t} night={night} crowd={0} lamp={night} />
					<Ball p={p} spin={t * 6} />
				</>
			);
		},
		flat: (t) => {
			const k = (t * 0.7) % 2;
			return (
				<>
					<At x={14.1} z={2.0} h={0.88}>{(x, y, s) => <ShnHood x={x} y={y} s={s} dir={1} face={t > dawn ? 'smile' : 'determined'} walk={k > 1.8 || k < 0.2 ? 0.7 : 0.1} />}</At>
					<At x={16.1} z={2.8} h={1}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={-1} face={t > dawn ? 'smile' : 'neutral'} walk={k > 0.8 && k < 1.2 ? 0.7 : 0.1} /><Whistle x={x} y={y} s={s} /></g>}</At>
				</>
			);
		},
		over: (t) => <Pill text="прощальный матч" t={t - 0.3} y={300} />,
		heads: {coach: [16.1, 1.6, 2.8]},
	});
}

// 3. Spain, La Masia: sun, palms, blue-garnet kit (crane down) ------------------------------
{
	const at = S('испания');
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 6);
			return {pos: lv([2, 14, 26], [6, 1.7, 9], k), look: lv([4, 2, 0], [9.5, 1.1, 2], k), fov: 54};
		},
		world: (t) => (
			<>
				<Field t={t} night={0} crowd={0} skyCol="#6fc2f2" />
				<Palms t={t} />
				<Ball p={[9.2 + Math.sin(t * 2) * 0.2, 0.13 + Math.abs(Math.sin(t * 4)) * 0.4, 2.4]} spin={t * 6} />
			</>
		),
		flat: (t) => <At x={9.6} z={2.2} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face="joy" />}</At>,
		over: (t) => <Pill text="Испания · «Ла Масия»" t={t - 0.6} y={300} />,
	});
}

// 4. history repeats: no passes, laughter, Marco: «Вердура» --------------------------------
{
	const at = S('но', idx('сказка'));
	const nopass = T('пас') - at;
	const laugh = T('смеются') - at;
	const marco = T('марко') - at;
	const verd = T('вердура') - at;
	const ru = T('по-испански') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < marco - 0.3) return orbit([8, 1.0, 2], 10, 1.8, -0.3 + 0.5 * ease(t / 5), 52);
			const k = ease((t - marco) / 5);
			return {pos: lv([6.2, 1.5, 8.6], [6.8, 1.45, 7.4], k), look: [8.4, 1.05, 2.0], fov: 48};
		},
		world: (t) => {
			const k = (t * 0.9) % 3;
			const pts: V3[] = [[5, 0.13, 0.5], [9, 0.13, -0.5], [11, 0.13, 2.8]];
			const a = pts[Math.floor(k)];
			const b = pts[(Math.floor(k) + 1) % 3];
			return (
				<>
					<Field t={t} night={0} crowd={0} skyCol="#6fc2f2" />
					<Palms t={t} />
					<Ball p={lv(a, b, k % 1)} spin={t * 8} />
				</>
			);
		},
		flat: (t) => (
			<>
				<At x={5} z={0.5} h={0.9}>{(x, y, s) => <Mate k={1} kit={BLUE} x={x} y={y} s={s} dir={1} face={t > laugh ? 'joy' : 'smile'} />}</At>
				<At x={11} z={2.8} h={0.9}>{(x, y, s) => <Mate k={3} kit={BLUE} x={x} y={y} s={s} dir={-1} face={t > laugh ? 'joy' : 'smile'} />}</At>
				<At x={9} z={-0.5} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={-1} face={t > laugh ? 'smile' : 'neutral'} armFront={t > marco ? [100, -60] : undefined} />}</At>
				<At x={7.6} z={2.6} h={0.88}>
					{(x, y, s) => (
						<g>
							<ShnBar x={x} y={y} s={s} dir={1} face={t > laugh ? 'sad' : 'neutral'} armFront={t > nopass && t < laugh ? [140, -20] : undefined} />
							{t > verd && (
								<g>
									<Carrot x={x + 150 * s} y={y - 760 * s + Math.sin(t * 3) * 6} s={s * 1.4 * back((t - verd) / 0.4)} />
									<g transform={`translate(${x + 190 * s} ${y - 900 * s}) scale(${s * back((t - verd - 0.2) / 0.4)})`}>
										<path d="M 0 0 L 0 -140" stroke={O} strokeWidth={8} />
										<rect x={0} y={-140} width={110} height={70} fill="#c60b1e" stroke={O} strokeWidth={6} />
										<rect x={0} y={-122} width={110} height={34} fill="#ffc400" />
									</g>
								</g>
							)}
						</g>
					)}
				</At>
			</>
		),
		over: (t) => (
			<>
				<NameTag name="Марко" role="звезда академии" from={marco} x={60} y={150} avatar={<SideChar x={0} y={190} s={0.38} frontHair="curly" hairColor="#1b1410" jacket={BLUE} pants={GARNET} />} />
				{t > ru && <Pill text="vérdura = овощ" t={t - ru} y={360} />}
			</>
		),
		heads: {marco: [9, 1.55, -0.5]},
	});
}

// 5. the coach: only one place; duel tomorrow ---------------------------------------------
{
	const at = S('через', idx('овощ', idx('по-испански')));
	const one = T('одного') - at;
	const duel = T('дуэль') - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([9.4, 1.15, 2.0], 6.2, 0.5, 0.65 - 0.9 * ease(t / dur), 48),
		world: (t) => (
			<>
				<Field t={t} night={0.1} crowd={0} skyCol="#7cbbe8" />
				<Palms t={t} />
			</>
		),
		flat: (t) => (
			<>
				<At x={8.2} z={2.6} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > one ? 'shock' : 'neutral'} />}</At>
				<At x={9.4} z={1.6} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face="neutral" armFront={t > one ? [120, -40] : undefined} />}</At>
				<At x={10.6} z={2.4} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={-1} face={t > one ? 'shock' : 'smile'} />}</At>
			</>
		),
		over: (t) => (
			<>
				<NameTag name="Тренер" role="«Ла Масия»" from={0.2} x={60} y={150} avatar={<SideChar x={0} y={200} s={0.36} frontHair="buzz" hairColor="#3b2a22" glasses jacket="#2b2b33" pants="#2b2b33" />} />
				<Big text="1 МЕСТО" t={t} at={one} y={620} size={150} color="#f5c542" />
				{t > duel && <Pill text="завтра · дуэль · 5 пенальти" t={t - duel} y={360} />}
			</>
		),
		heads: {lm: [9.4, 1.6, 1.6]},
	});
}

// 6. evening locker room: Marco crying on the phone ---------------------------------------
{
	const at = S('вечером');
	const saw = T('увидел') - at;
	const phone = T('по', idx('плакал')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < saw - 0.2) {
				const k = ease(t / 2.5);
				return {pos: lv([-3.2, 1.5, 3.6], [-2.6, 1.45, 3.0], k), look: [0.5, 1.0, -1.6], fov: 54};
			}
			return orbit([1.4, 1.0, -1.2], 3.8, 0.4, 0.5 - 0.6 * ease((t - saw) / 8), 48);
		},
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<>
				<At x={1.4} z={-1.0} h={0.92}>
					{(x, y, s) => (
						<g>
							<Marco x={x} y={y} s={s} dir={-1} face="sad" armFront={t > phone - 0.3 ? [120, -110] : undefined} />
							{t > phone - 0.3 && <rect x={x - 70 * s} y={y - 600 * s} width={36 * s} height={64 * s} rx={8 * s} fill="#222" stroke={O} strokeWidth={4 * s} />}
							{[0, 1].map((i) => {
								const k = (t * 0.8 + i * 0.5) % 1;
								return <ellipse key={i} cx={x - 30 * s + i * 60 * s} cy={y - 500 * s + k * 120 * s} rx={7 * s} ry={11 * s} fill="#8fd0ff" opacity={1 - k} />;
							})}
						</g>
					)}
				</At>
				<At x={-1.6} z={0.6} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > saw ? 'shock' : 'neutral'} />}</At>
			</>
		),
		over: (t) => <Pill text="вечер" t={t - 0.3} y={300} />,
		heads: {marco: [1.4, 1.6, -1.0]},
	});
}

// 7. the duel: empty stadium at sunset, 4:4, Marco misses (orbit) -------------------------
const SPOT: V3 = [14.0, 0.13, 0.4];
{
	const at = S('дуэль', idx('дом'));
	const mk = T('марко', idx('мы')) - at;
	const g1 = T('гол', idx('мы')) - at;
	const ik = T('я', idx('гол', idx('мы'))) - at;
	const g2 = T('гол', idx('я', idx('гол', idx('мы')))) - at;
	const four = T('четыре') - at;
	const last = T('последний') - at;
	const miss = T('мимо') - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([16.0, 1.0, 0.4], 9, 1.4, 1.35 - 0.75 * ease(t / dur), 52),
		world: (t) => {
			const shots = [
				[mk, g1, 1.4, -1.6],
				[ik, g2, 1.0, 1.8],
				[last - 0.3, miss, 1.6, 4.2],
			];
			let p: V3 = SPOT;
			for (const [a, b, y, z] of shots) {
				if (t > a + 0.4) p = lv(SPOT, [21.4, y, z], clamp01((t - a - 0.4) / Math.max(0.3, b - a - 0.4)));
			}
			if (t > four - 0.2 && t < last - 0.3) p = SPOT;
			return (
				<>
					<Field t={t} night={0.3} crowd={0} skyCol="#f2a46a" />
					<Palms t={t} />
					<Ball p={p} spin={t * 8} />
				</>
			);
		},
		flat: (t) => {
			const marcoUp = (t > mk - 0.2 && t < ik - 0.2) || (t > last - 0.4);
			return (
				<>
					<At x={11.0} z={-3.4} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face="neutral" />}</At>
					<At x={marcoUp ? 13.4 : 11.6} z={marcoUp ? 0.6 : -1.6} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={1} face={t > miss ? 'sad' : 'determined'} walk={marcoUp && t - (t > last - 0.4 ? last - 0.4 : mk - 0.2) < 0.5 ? 0.8 : 0} />}</At>
					<At x={!marcoUp ? 13.4 : 11.8} z={!marcoUp ? 0.6 : 1.8} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > miss ? 'shock' : 'determined'} />}</At>
					<Board text={t < g1 ? '0 : 0' : t < four ? (t < g2 ? '1 : 0' : '1 : 1') : '4 : 4'} sub="пенальти" />
				</>
			);
		},
		over: (t) => (
			<>
				<Pill text="дуэль" t={t - 0.2} y={300} />
				<Big text="ГОЛ" t={t} at={g1} out={ik - 0.1} y={620} size={170} color="#f5c542" />
				<Big text="ГОЛ" t={t} at={g2} out={four - 0.1} y={620} size={170} color="#f5c542" />
				<Big text="4 : 4" t={t} at={four} out={last - 0.1} y={620} size={190} />
				<Big text="МИМО!" t={t} at={miss} y={620} size={190} color="#ff8a7a" />
			</>
		),
	});
}

// 8. my shot: the ball, Marco looking at the ground (low orbit, heartbeat) --------------
{
	const at = S('остался');
	const ball = T('мяч', idx('остался')) - at;
	const mlook = T('потом', idx('остался')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < ball - 0.2) return orbit([14.0, 0.6, 0.4], 3.2, 0.5, 2.6 - 0.8 * ease(t / 4), 46);
			if (t < mlook - 0.2) return orbit([14.0, 0.2, 0.4], 1.6, 0.25, 1.4 + 0.6 * ease((t - ball) / 2), 40);
			return orbit([12.2, 1.2, 2.6], 3.4, 0.2, 0.9 + 0.4 * ease((t - mlook) / 4), 44);
		},
		world: (t) => (
			<>
				<Field t={t} night={0.35} crowd={0} skyCol="#ee9660" />
				<Palms t={t} />
				<Ball p={SPOT} />
			</>
		),
		flat: (t) => (
			<>
				<At x={12.2} z={2.6} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={1} face="sad" />}</At>
				<At x={13.0} z={0.4} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face="think" />}</At>
				<At x={11.0} z={-3.4} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face="neutral" />}</At>
			</>
		),
		over: (t) => <Pill text="последний удар" t={t - 0.3} y={300} />,
	});
}

// 9. «если забью»: dream + Marco leaving ------------------------------------------------
{
	const at = S('если', idx('землю'));
	const pal = T('палыч', idx('сбудется')) - at;
	const but = T('но', idx('гордиться')) - at;
	const fam = T('а', idx('уедет', idx('гордиться'))) - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([0, 2, 0], 26, 4, 0.0 + 0.6 * ease(t / dur), 60),
		world: (t) => <Field t={t} night={0} crowd={1} hype={1} skyCol="#6fc2f2" />,
		flat: () => <rect width={VW} height={VH} fill="#0b1226" opacity={0.25} />,
		over: (t) => (
			<>
				<Pill text="если забью…" t={t - 0.2} y={300} />
				<Panel t={t} at={0.4} out={but - 0.2}>
					<rect x={110} y={450} width={860} height={420} rx={24} fill={BLUE} stroke={O} strokeWidth={6} />
					{[0, 1, 2, 3].map((k) => (
						<rect key={k} x={150 + k * 200} y={450} width={80} height={420} fill={GARNET} opacity={0.8} />
					))}
					<ShnBar x={540} y={860} s={0.55} dir={1} face="joy" />
					<text x={540} y={530} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">основной состав</text>
					{t > pal && (
						<g>
							<rect x={180} y={930} width={420} height={300} rx={20} fill="#2b2b33" stroke={O} strokeWidth={6} />
							<rect x={200} y={950} width={380} height={230} rx={10} fill="#6fc2f2" />
							<text x={390} y={1080} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#f5c542" stroke={O} strokeWidth={6} paintOrder="stroke">ГОЛ!</text>
							<SideChar x={800} y={1290} s={0.42} frontHair="boss" hairColor="#9a9a9a" mustache jacket="#2f4f86" pants="#2f4f86" face="joy" />
							<text x={800} y={950} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={KIT}>Палыч гордится</text>
						</g>
					)}
				</Panel>
				<Panel t={t} at={but} tint="#d9d2c4">
					<path d="M 140 1300 L 140 640 Q 300 520 460 640 L 460 1300" fill="#c9a46a" stroke={O} strokeWidth={8} />
					<text x={300} y={720} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={O}>академия</text>
					<Marco x={360} y={1280} s={0.5} dir={1} face="sad" walk={0.6} />
					<rect x={420} y={1080} width={110} height={80} rx={14} fill="#5a3a28" stroke={O} strokeWidth={5} />
					{t > fam && (
						<g>
							<path d="M 600 1300 L 600 900 L 760 780 L 920 900 L 920 1300 Z" fill="#efe0c2" stroke={O} strokeWidth={8} />
							<rect x={720} y={1100} width={80} height={200} fill="#7a4a2a" stroke={O} strokeWidth={5} />
							<Mom x={680} y={1290} s={0.46} dir={1} face="sad" />
							{[0, 1, 2].map((k) => (
								<rect key={k} x={800 + (k % 2) * 60} y={1220 - k * 70} width={90} height={70} fill="#c9a06a" stroke={O} strokeWidth={5} />
							))}
							<text x={760} y={740} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={O}>без дома?</text>
						</g>
					)}
				</Panel>
			</>
		),
	});
}

// 10. «если пробью мимо»: replay, coach frowns, ticket home?, Marco's chance ------------
{
	const at = S('если', idx('дома', idx('семья')));
	const replay = T('переигровка') - at;
	const weak = T('он', idx('специально')) - at;
	const chance = T('зато') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < replay + 1.2) return orbit([17, 1.2, 1.5], 8, 1.0, 0.5 + 0.4 * ease(t / 3), 50);
			if (t < chance - 0.2) return orbit([11.0, 1.4, -3.4], 4, 0.4, 0.8 - 0.4 * ease((t - replay) / 5), 46);
			return orbit([12.2, 1.2, 2.6], 3.6, 0.3, 0.6 + 0.3 * ease((t - chance) / 2), 46);
		},
		world: (t) => {
			const p: V3 = t < 0.4 ? SPOT : lv(SPOT, [21.5, 0.8, 5.6], clamp01((t - 0.4) / 0.7));
			return (
				<>
					<Field t={t} night={0.35} crowd={0} skyCol="#ee9660" />
					<Palms t={t} />
					<Ball p={p} spin={t * 8} />
				</>
			);
		},
		flat: (t) => (
			<>
				<At x={11.0} z={-3.4} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face={t > replay ? 'think' : 'neutral'} />}</At>
				<At x={13.0} z={0.4} h={0.88}>
					{(x, y, s) => (
						<g>
							<ShnBar x={x} y={y} s={s} dir={1} face={t > weak ? 'sad' : 'neutral'} />
							{t > weak && (
								<text x={x + 120 * s} y={y - 760 * s} fontFamily="Inter" fontWeight={900} fontSize={200 * s * back((t - weak) / 0.3)} fill="#f5c542" stroke={O} strokeWidth={10 * s} paintOrder="stroke">?</text>
							)}
						</g>
					)}
				</At>
				<At x={12.2} z={2.6} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={1} face={t > chance ? 'smile' : 'sad'} />}</At>
			</>
		),
		over: (t) => (
			<>
				<Pill text="если пробью мимо…" t={t - 0.2} y={300} />
				{t > replay && t < weak && <Big text="ПЕРЕИГРОВКА" t={t} at={replay} y={620} size={110} color="#f5c542" />}
				{t > weak + 1 && t < chance && (
					<g transform={`translate(540 640) rotate(-5) scale(${back((t - weak - 1) / 0.35)})`}>
						<rect x={-240} y={-90} width={480} height={180} rx={24} fill="#fbf3e2" stroke={O} strokeWidth={8} />
						<rect x={-240} y={-90} width={110} height={180} rx={24} fill={KIT} stroke={O} strokeWidth={8} />
						<text x={60} y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={64} fill={O}>ДОМОЙ?</text>
					</g>
				)}
				{t > chance && <Big text="шанс для Марко" t={t} at={chance} y={640} size={90} color="#f5c542" />}
			</>
		),
	});
}

// 11. the choice ----------------------------------------------------------------------------
{
	const at = S('один', idx('шанс', idx('зато')));
	const two = T('два', idx('место', idx('забрать'))) - at;
	const ask = T('что', idx('два', idx('место', idx('забрать')))) - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([14.0, 0.6, 0.4], 5, 0.8, 1.2 + 0.8 * ease(t / dur), 50),
		world: (t) => (
			<>
				<Field t={t} night={0.35} crowd={0} skyCol="#ee9660" />
				<Palms t={t} />
				<Ball p={SPOT} />
			</>
		),
		flat: (t) => (
			<g>
				<rect width={VW} height={VH} fill="#0b1226" opacity={0.45} />
				<g transform={`translate(${-560 * (1 - back(t / 0.4))} 0)`}>
					<rect x={30} y={420} width={500} height={900} rx={36} fill={BLUE} stroke={O} strokeWidth={8} />
					{[0, 1].map((k) => (
						<rect key={k} x={90 + k * 220} y={420} width={90} height={900} fill={GARNET} opacity={0.85} />
					))}
					<path d="M 110 1000 L 110 840 L 450 840 L 450 1000" fill="none" stroke="#fff" strokeWidth={14} />
					<circle cx={380} cy={930} r={30} fill="#fafafa" stroke={O} strokeWidth={5} />
					<ShnBar x={210} y={1260} s={0.4} dir={1} face="joy" />
					<circle cx={280} cy={540} r={80} fill="#f2c230" stroke={O} strokeWidth={8} />
					<text x={280} y={575} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={100} fill={O}>1</text>
					<text x={280} y={680} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">забить</text>
					<text x={280} y={735} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={32} fill="#fff" stroke={O} strokeWidth={5} paintOrder="stroke">место моё</text>
				</g>
				{t > two - 0.2 && (
					<g transform={`translate(${560 * (1 - back((t - two + 0.2) / 0.4))} 0)`}>
						<rect x={550} y={420} width={500} height={900} rx={36} fill="#f2a46a" stroke={O} strokeWidth={8} />
						<path d="M 620 1000 L 620 840 L 960 840 L 960 1000" fill="none" stroke="#fff" strokeWidth={14} />
						<circle cx={1000} cy={800} r={30} fill="#fafafa" stroke={O} strokeWidth={5} />
						<path d="M 940 860 q 30 -40 60 -60" stroke="#fff" strokeWidth={6} strokeDasharray="12 10" fill="none" />
						<Marco x={760} y={1260} s={0.42} dir={-1} face="smile" />
						<circle cx={800} cy={540} r={80} fill={KIT} stroke={O} strokeWidth={8} />
						<text x={800} y={575} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={100} fill="#fff">2</text>
						<text x={800} y={680} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill={O}>мимо</text>
						<text x={800} y={735} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={32} fill={O}>шанс для Марко</text>
					</g>
				)}
			</g>
		),
		over: (t) => (
			<>
				{t > ask && (
					<g transform={`translate(540 300) scale(${back((t - ask) / 0.35)})`}>
						<rect x={-380} y={-75} width={760} height={130} rx={36} fill="#fbf3e2" stroke={O} strokeWidth={8} />
						<text textAnchor="middle" y={22} fontFamily="Inter" fontWeight={900} fontSize={64} fill={KIT}>Что бы выбрал ты?</text>
					</g>
				)}
				<g transform={`translate(540 ${1330 + Math.sin(t * 2) * 6})`}>
					<ShnurokSide x={0} y={0} s={0.55} dir={Math.sin(t * 1.3) > 0 ? 1 : -1} face="think" />
				</g>
			</>
		),
	});
}

const SCENES = sc;

// ---------------------------------------------------------------- layers
const FADE = 0.3;
const Layer: React.FC<{i: number; lead: number; dur: number}> = ({i, lead, dur}) => {
	const sd = SCENES[i];
	const t0 = useCurrentFrame() / FPS - lead;
	const t = sd.freezeAt !== undefined ? Math.min(t0, sd.freezeAt) : t0;
	const frozen = sd.freezeAt !== undefined && t0 > sd.freezeAt;
	const abs = t0 + sd.at;
	const a = i === 0 ? 1 : clamp01((t0 + lead) / FADE);
	let c = sd.cam(t, dur);
	// punch-in on speaker
	const sp = speakFocus(abs);
	const head = sp && sd.heads?.[sp.who];
	if (sp && head) {
		const dir = new THREE.Vector3(...c.pos).sub(new THREE.Vector3(...head)).normalize();
		const close: V3 = [head[0] + dir.x * 4.2, head[1] + dir.y * 4.2 + 0.1, head[2] + dir.z * 4.2];
		c = {pos: lv(c.pos, close, sp.f * 0.7), look: lv(c.look, head, sp.f), fov: c.fov};
	}
	// zoom-through: new shot starts slightly tighter
	const enter = i === 0 ? 0 : 1 - Easing.out(Easing.cubic)(clamp01((t0 + lead) / 0.6));
	c = {...c, fov: c.fov * (1 - 0.18 * enter)};
	if (frozen) c = {...c, fov: c.fov * (1 - 0.06 * clamp01((t0 - (sd.freezeAt ?? 0)) / 1.2))};
	const cam = makeCam(c);
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsCtx.Provider value={abs}>
				<CamCtx.Provider value={cam}>
					<AbsoluteFill style={{opacity: a, filter: frozen ? 'saturate(0.35) contrast(1.1)' : undefined}}>
						<ThreeCanvas width={VW} height={VH} shadows gl={{antialias: true}} camera={{fov: c.fov, near: 0.1, far: 300, position: c.pos}}>
							<CamRig c={c} />
							{sd.world(t)}
						</ThreeCanvas>
						<svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{position: 'absolute', inset: 0}}>
							{sd.flat(t, abs)}
							{sd.over?.(t, abs)}
							<defs>
								<radialGradient id="vig8" cx="50%" cy="50%" r="72%">
									<stop offset="62%" stopColor="#000" stopOpacity={0} />
									<stop offset="100%" stopColor="#000" stopOpacity={frozen ? 0.6 : 0.28} />
								</radialGradient>
							</defs>
							<rect width={VW} height={VH} fill="url(#vig8)" />
						</svg>
					</AbsoluteFill>
				</CamCtx.Provider>
			</AbsCtx.Provider>
		</ShotCtx.Provider>
	);
};

export const Ovoshch3: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	const endFade = interpolate(t, [OVOSHCH3_DURATION - 0.25, OVOSHCH3_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((sd, i) => {
				const from = sd.at;
				const to = i < SCENES.length - 1 ? SCENES[i + 1].at : OVOSHCH3_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round(to * FPS) - start)}>
						<Layer i={i} lead={from - start / FPS} dur={to - from} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} keepSpoken />}
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #0008'}}>Вселенная Шнурка</div>
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
