import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ShotCtx, hash} from '../lib';
import {C, OL, NameTag} from '../cartoon/parts';
import type {Hair} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Pill} from './FlatStyleDemo';
import {RBox, Box, mat, M} from './Style3D';
import rawWords from '../../public/shnurok/ep09-words.json';
import envRaw from '../../public/shnurok/ep09-env.json';

// «Овощ», 4 серия «Против Метеора» — 3D world + flat 2D heroes.

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
export const OVOSHCH4_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 1.2);
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
const QUOTE_WHO: (Who | null)[] = ['marco', 'lm', 'marco'];
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
			<text x={160 + 800 * 0.35 * k + 20} y={622} fontFamily="Inter" fontWeight={900} fontSize={40} fill={O} opacity={k}>1 · остаться</text>
			<rect x={140} y={690} width={800 * k} height={90} rx={20} fill={BLUE} stroke={O} strokeWidth={6} />
			<rect x={140 + 800 * k * 0.5} y={690} width={800 * k * 0.25} height={90} fill={GARNET} />
			<text x={160} y={752} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" opacity={k}>2 · «Барселона» ✓</text>
		</g>
	);
};


// ---------------------------------------------------------------- episode 4 pieces
const SPOT: V3 = [14.0, 0.13, 0.4];
const MarcoRed: React.FC<CP> = (p) => <SideChar {...p} frontHair="curly" hairColor="#1b1410" jacket={KIT} pants="#f4f1ea" shoes="#2b2b2b" talk={useTalk('marco')} phase={0.9} />;
const Armband: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-70} y={-470} width={60} height={26} rx={6} fill="#f2c230" stroke={O} strokeWidth={4} />
		<text x={-40} y={-450} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={20} fill={O}>C</text>
	</g>
);
const Shirt: React.FC<{t: number; at: number}> = ({t, at}) =>
	t < at ? null : (
		<g transform={`translate(540 640) rotate(-4) scale(${back((t - at) / 0.4)})`}>
			<path d="M -150 -170 L -60 -200 Q 0 -160 60 -200 L 150 -170 L 210 -60 L 140 -30 L 120 -80 L 120 200 L -120 200 L -120 -80 L -140 -30 L -210 -60 Z" fill={BLUE} stroke={O} strokeWidth={9} strokeLinejoin="round" />
			{[-70, 10, 90].map((x) => (
				<rect key={x} x={x - 25} y={-170} width={36} height={368} fill={GARNET} />
			))}
			<text x={0} y={-20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">ШНУРОК</text>
			<text x={0} y={130} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={150} fill="#fff" stroke={O} strokeWidth={8} paintOrder="stroke">7</text>
		</g>
	);
const Plane: React.FC<{t: number; at: number; dur?: number}> = ({t, at, dur = 2}) => {
	if (t < at || t > at + dur) return null;
	const k = (t - at) / dur;
	return (
		<g transform={`translate(${-200 + k * 1500} ${700 - k * 260}) rotate(-12) scale(2.2)`}>
			<path d="M -60 10 l 50 -12 l 36 -48 l 14 0 l -16 44 l 36 -8 l 12 -16 l 12 0 l -8 26 l 8 26 l -12 0 l -12 -16 l -36 -8 l 16 44 l -14 0 l -36 -48 Z" fill="#fff" stroke={O} strokeWidth={3} />
		</g>
	);
};
const Stretcher: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-260} y={-150} width={520} height={40} rx={10} fill="#f4f1ea" stroke={O} strokeWidth={6} />
		<path d="M -240 -110 L -240 0 M 240 -110 L 240 0" stroke={O} strokeWidth={8} />
		<rect x={-230} y={-200} width={460} height={50} rx={20} fill={KIT} stroke={O} strokeWidth={6} />
		<circle cx={-200} cy={-210} r={44} fill={C.skin} stroke={O} strokeWidth={6} />
		<path d="M -250 -230 Q -200 -290 -150 -236 Q -200 -250 -250 -230 Z" fill="#e0b04a" stroke={O} strokeWidth={5} />
	</g>
);
const SubBoard: React.FC<{t: number; at: number}> = ({t, at}) =>
	t < at ? null : (
		<g transform={`translate(540 640) scale(${back((t - at) / 0.4)})`}>
			<rect x={-220} y={-160} width={440} height={300} rx={20} fill="#1b1e2b" stroke={O} strokeWidth={8} />
			<text x={-80} y={0} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={130} fill="#ff5a4a">9</text>
			<text x={80} y={0} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={130} fill="#5cff7a">10</text>
			<text x={0} y={100} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={44} fill="#fff">ЗАМЕНА</text>
		</g>
	);

const sc: Scene[] = [];

// 1. the penalty: top corner, 5:4, my place --------------------------------------------
{
	const at = 0;
	const run = T('разбежался') - at;
	const shot = T('пробил') - at;
	const goal = T('гол') - at;
	const place = T('место') - at;
	sc.push({
		at,
		cam: (t, dur) => (t < shot + 0.3 ? orbit([15.5, 0.9, 0.4], 6, 0.6, 1.9 - 0.5 * ease(t / 4), 46) : orbit([19, 1.4, 0.2], 7, 0.6, 1.0 - 0.3 * ease((t - shot) / 4), 50)),
		world: (t) => {
			const p: V3 = t < shot + 0.2 ? SPOT : lv(SPOT, [21.5, 2.0, -2.6], clamp01((t - shot - 0.2) / 0.5));
			return (
				<>
					<Field t={t} night={0.35} crowd={0} skyCol="#ee9660" />
					<Palms t={t} />
					<Ball p={p} spin={t * 8} />
				</>
			);
		},
		flat: (t) => {
			const r = ease((t - run) / Math.max(0.5, shot - run));
			return (
				<>
					<At x={11.0} z={-3.4} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face={t > goal ? 'smile' : 'neutral'} />}</At>
					<At x={11.8} z={1.8} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={1} face={t > goal ? 'sad' : 'neutral'} />}</At>
					<At x={lerp(12.0, 13.6, r)} z={0.5} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > goal ? 'joy' : 'determined'} walk={t > run && t < shot ? 1 : 0} />}</At>
					<Board text={t > goal ? '5 : 4' : '4 : 4'} sub="пенальти" />
				</>
			);
		},
		over: (t) => (
			<>
				<Pill text="вы выбрали: забить" t={t - 0.2} y={300} />
				<Big text="ГОЛ!" t={t} at={goal} out={place - 0.05} y={640} size={230} color="#f5c542" />
				<Big text="МЕСТО МОЁ" t={t} at={place} y={640} size={130} color="#f5c542" />
			</>
		),
	});
}

// 2. Marco shakes hands: «I'll be back» (orbit) ----------------------------------------
{
	const at = S('марко');
	const shake = T('пожал') - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([13.0, 1.15, 1.0], 4.4, 0.35, 0.8 - 1.0 * ease(t / dur), 46),
		world: (t) => (
			<>
				<Field t={t} night={0.45} crowd={0} skyCol="#e88a5c" />
				<Palms t={t} />
			</>
		),
		flat: (t) => (
			<>
				<At x={12.3} z={1.0} h={0.92}>{(x, y, s) => <Marco x={x} y={y} s={s} dir={1} face={t > T('улыбнулся') - at ? 'smile' : 'neutral'} armFront={t > shake ? [100, -10] : undefined} walk={t < shake - 0.3 ? 0.6 : 0} />}</At>
				<At x={13.7} z={1.0} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face="smile" armFront={t > shake ? [100, -10] : undefined} />}</At>
			</>
		),
		over: () => null,
		heads: {marco: [12.3, 1.55, 1.0]},
	});
}

// 3. rise: goal, two goals, the shirts ------------------------------------------------
{
	const at = S('дальше');
	const g1 = T('гол', idx('основу')) - at;
	const g2 = T('второй') - at;
	const shirts = T('мою') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < g2 - 0.2) return orbit([17, 1.2, 1.0], 9, 1.2, 0.9 - 0.4 * ease(t / 3), 52);
			return orbit([0, 3, -4], 24, 5, -0.3 + 0.5 * ease((t - g2) / 5), 60);
		},
		world: (t) => {
			const k = clamp01((t - g1 + 0.4) / 0.5);
			const p: V3 = t < g2 - 0.2 ? lv([14.6, 0.2, 2.2], [21.5, 1.4, -1.5], k) : [Math.sin(t) * 5, 0.13, 2];
			return (
				<>
					<Field t={t} night={0} crowd={1} hype={t > g1 ? 1 : 0.5} skyCol="#6fc2f2" />
					<Ball p={p} spin={t * 9} />
				</>
			);
		},
		flat: (t) => (
			<>
				<At x={17.6} z={-0.6} h={0.94}>{(x, y, s) => <Mate k={2} kit="#f2c230" x={x} y={y} s={s} dir={-1} face={t > g1 ? 'shock' : 'neutral'} />}</At>
				<At x={14.2} z={2.2} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > g1 ? 'joy' : 'determined'} walk={t < g1 ? 0.8 : 0} />}</At>
			</>
		),
		over: (t) => (
			<>
				<Big text="ГОЛ!" t={t} at={g1} out={g2 - 0.05} y={620} size={220} color="#f5c542" />
				<Big text="2 ГОЛА" t={t} at={g2} out={shirts - 0.05} y={620} size={190} color="#f5c542" />
				<Shirt t={t} at={shirts} />
			</>
		),
	});
}

// 4. «We fly to a friendly. Against Meteor.» ------------------------------------------
{
	const at = S('а', idx('футболках'));
	const met = T('против') - at;
	const old = T('против', idx('метеор') + 1) - at;
	sc.push({
		at,
		cam: (t, dur) => orbit([9.6, 1.1, 2.1], 6.5, 0.5, -0.3 + 0.6 * ease(t / dur), 48),
		world: (t) => (
			<>
				<Field t={t} night={0} crowd={0} skyCol="#6fc2f2" />
				<Palms t={t} />
			</>
		),
		flat: (t) => (
			<>
				<At x={9.0} z={1.8} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face="neutral" armFront={t > met ? [110, -30] : undefined} />}</At>
				<At x={10.4} z={2.4} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face={t > old ? 'shock' : 'neutral'} />}</At>
			</>
		),
		over: (t) => (
			<>
				{t > met && (
					<g transform={`translate(540 600) scale(${back((t - met) / 0.4)})`}>
						<circle r={120} fill={KIT} stroke={O} strokeWidth={9} />
						<path d="M -60 40 L 50 -70 M -20 50 L 70 -40" stroke="#f2c230" strokeWidth={14} strokeLinecap="round" />
						<circle cx={-62} cy={42} r={26} fill="#f2c230" stroke={O} strokeWidth={6} />
						<text y={190} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={64} fill="#fff" stroke={O} strokeWidth={8} paintOrder="stroke">«МЕТЕОР»</text>
					</g>
				)}
				<Plane t={t} at={old + 0.6} dur={2.2} />
			</>
		),
		heads: {lm: [9.0, 1.65, 1.8]},
	});
}

// 5. home stadium: the lamp, full stands, Palych on the bench, Kirюха captain ----------
{
	const at = S('наш');
	const bench = T('на', idx('пришёл')) - at;
	const cap = T('а', idx('палыч', idx('пришёл'))) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < bench - 0.2) return orbit([14, 3, -2], 16, 3, 0.9 - 0.6 * ease(t / 5), 56);
			if (t < cap - 0.2) return {pos: lv([-3.4, 2.0, 21.2], [-3.4, 1.9, 20.4], ease((t - bench) / 2)), look: [-3.4, 0.9, 12.8], fov: 44};
			return orbit([2, 1.1, 3], 5.5, 0.4, 0.4 - 0.6 * ease((t - cap) / 2), 48);
		},
		world: (t) => <Field t={t} night={0.4} crowd={1} hype={0.7} lamp={1} />,
		flat: (t) => (
			<>
				<At x={-4.4} z={13.2}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={1} face="neutral" /><Whistle x={x} y={y} s={s} /></g>}</At>
				{Dugout(-3.0, -0.6)}
				<At x={2} z={3} h={0.92}>{(x, y, s) => <g><Kir x={x} y={y} s={s} dir={-1} face="smile" /><Armband x={x} y={y} s={s} /></g>}</At>
			</>
		),
		over: (t) => (
			<>
				<Pill text="родной стадион" t={t - 0.3} y={300} />
				{t > cap && <Pill text="капитан «Метеора» — Кирюха" t={t - cap} y={420} />}
			</>
		),
	});
}

// 6. the match: Kirюха 1:0, I equalise 1:1, half whistle half clap -------------------
{
	const at = S('кирюха', idx('кирюха') + 1);
	const k1 = T('кирюха', idx('кирюха') + 1) - at;
	const boom = T('стадион', idx('ноль')) - at;
	const eq = T('во') - at;
	const one = T('один', idx('сравниваю')) - at;
	const half = T('половина') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < eq - 0.2) return orbit([-17, 1.2, 0.5], 9, 1.2, -0.9 + 0.4 * ease(t / 3), 52);
			if (t < half - 0.2) return orbit([17, 1.2, 0.5], 9, 1.2, 0.9 - 0.4 * ease((t - eq) / 3), 52);
			return orbit([0, 6, -18], 18, 0, 0.1 * Math.sin(t * 0.3), 56);
		},
		world: (t) => {
			const a = clamp01((t - k1 - 0.3) / 0.5);
			const b = clamp01((t - one + 0.6) / 0.5);
			const p: V3 = t < eq - 0.2 ? lv([-14.6, 0.2, 1.8], [-21.5, 1.2, -1.5], a) : lv([14.6, 0.2, 2.2], [21.5, 0.9, 1.8], b);
			return (
				<>
					<Field t={t} night={0.4} crowd={1} hype={t > boom ? 1 : 0.6} lamp={1} />
					<Ball p={p} spin={t * 9} />
				</>
			);
		},
		flat: (t) =>
			t < eq - 0.2 ? (
				<>
					<At x={-17.8} z={-0.4} h={0.95}>{(x, y, s) => <Mate k={2} kit={BLUE} x={x} y={y} s={s} dir={1} face={t > k1 + 0.6 ? 'shock' : 'neutral'} />}</At>
					<At x={-14.2} z={1.8} h={0.92}>{(x, y, s) => <g><Kir x={x} y={y} s={s} dir={-1} face={t > k1 + 0.6 ? 'joy' : 'determined'} walk={t < k1 + 0.3 ? 0.9 : 0} /><Armband x={x} y={y} s={s} /></g>}</At>
					<Board text="МЕТ 1 : 0 БАР" sub="1-й тайм" />
				</>
			) : (
				<>
					<At x={17.6} z={-0.6} h={0.95}>{(x, y, s) => <Mate k={3} x={x} y={y} s={s} dir={-1} face={t > one ? 'shock' : 'neutral'} />}</At>
					<At x={14.2} z={2.2} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > one ? 'joy' : 'determined'} walk={t < one ? 0.9 : 0} />}</At>
					<Board text={t > one ? 'МЕТ 1 : 1 БАР' : 'МЕТ 1 : 0 БАР'} sub="2-й тайм" />
				</>
			),
		over: (t) => (
			<>
				<Big text="1 : 0" t={t} at={boom} out={eq - 0.05} y={620} size={200} color="#f5c542" />
				<Big text="1 : 1" t={t} at={one} out={half - 0.05} y={620} size={200} color="#f5c542" />
				{t > half && <Pill text="половина свистит · половина хлопает" t={t - half} y={360} />}
			</>
		),
	});
}

// 7. 89': one on one, Kirюха's tackle, he's down, empty goal -------------------------
{
	const at = S('восемьдесят');
	const run = T('убегаю') - at;
	const tackle = T('бросается') - at;
	const hit = T('сталкиваемся') - at;
	const down = T('а', idx('ногах')) - at;
	const empty = T('передо') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < hit + 0.3) {
				const k = ease((t - run) / Math.max(1, hit - run));
				return {pos: [lerp(4, 11, k), 1.5, 7.5], look: [lerp(10, 16, k), 1.0, 1.5], fov: 50};
			}
			if (t < empty - 0.2) return orbit([16.0, 0.6, 2.3], 4.2, 0.6, 1.2 + 0.8 * ease((t - hit) / 5), 46);
			return {pos: [13.6, 1.2, 3.6], look: [21, 1.1, 0], fov: lerp(50, 40, ease((t - empty) / 2))};
		},
		world: (t) => {
			const k = ease((t - run) / Math.max(1, hit - run));
			return (
				<>
					<Field t={t} night={0.4} crowd={1} hype={0.5} lamp={1} />
					<Ball p={[lerp(10, 16.4, k), 0.13, lerp(2.0, 2.4, k)]} spin={t * 9} />
				</>
			);
		},
		flat: (t) => {
			const k = ease((t - run) / Math.max(1, hit - run));
			const kt = ease((t - tackle) / Math.max(0.6, hit - tackle));
			const lie = ease((t - hit) / 0.4);
			return (
				<>
					<At x={lerp(17.5, 16.6, kt)} z={lerp(-1.5, 1.8, kt)} h={0.92} lie={lie}>
						{(x, y, s) => <g><Kir x={x} y={y} s={s} dir={-1} face={t > hit ? 'wince' : 'determined'} walk={t > tackle && t < hit ? 0.9 : 0} /></g>}
					</At>
					<At x={lerp(9.6, 15.8, k)} z={lerp(2.0, 2.6, k)} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > hit ? 'shock' : 'determined'} walk={t < hit ? 1 : 0} />}</At>
					<Board text="МЕТ 1 : 1 БАР" sub="89:00" />
				</>
			);
		},
		over: (t) => (
			<>
				<Big text="89′" t={t} at={0.1} out={run} y={620} size={240} color="#f5c542" />
				{t > empty && <Pill text="пустые ворота" t={t - empty} y={360} />}
			</>
		),
	});
}

// 8. I kick it out; the stadium applauds; Kirюха on a stretcher, thumbs up -----------
{
	const at = S('но', idx('ворота', idx('передо')));
	const out = T('выбиваю') - at;
	const clap = T('встаёт') - at;
	const med = T('врачи') - at;
	const thumb = T('он', idx('носилках')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < clap - 0.2) return orbit([16.0, 0.8, 2.4], 5.5, 0.8, 0.4 + 0.3 * ease(t / 3), 48);
			if (t < med - 0.2) return orbit([0, 5, -18], 20, 0, -0.2 + 0.4 * ease((t - clap) / 3), 58);
			return orbit([16.6, 0.8, 1.6], 8.5, 0.9, 0.35 - 0.4 * ease((t - med) / 4), 50);
		},
		world: (t) => {
			const p: V3 = t < out ? [16.4, 0.13, 2.5] : lv([16.4, 0.13, 2.5], [14.5, 2.0, 15], clamp01((t - out) / 0.8));
			return (
				<>
					<Field t={t} night={0.4} crowd={1} hype={t > clap ? 1 : 0.1} lamp={1} />
					<Ball p={p} spin={t * 8} />
				</>
			);
		},
		flat: (t) => {
			const carry = ease((t - med) / 3);
			return (
				<>
					{t < med && <At x={16.6} z={1.8} h={0.92} lie={1}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={-1} face="wince" />}</At>}
					{t >= med && (
						<At x={lerp(16.4, 18.8, carry)} z={lerp(1.8, -1.5, carry)} h={1}>
							{(x, y, s) => (
								<g>
									<Stretcher x={x} y={y - 60 * s} s={s * 0.9} />
									<SideChar x={x - 280 * s} y={y} s={s} frontHair="buzz" hairColor="#3b2a22" jacket="#f4f1ea" pants="#f4f1ea" walk={0.6} dir={1} />
									<SideChar x={x + 280 * s} y={y} s={s} frontHair="guy" hairColor="#2b211d" jacket="#f4f1ea" pants="#f4f1ea" walk={0.6} dir={1} />
									{t > thumb && (
										<g transform={`translate(${x - 200 * s} ${y - 420 * s}) scale(${s * back((t - thumb) / 0.3)})`}>
											<rect x={-30} y={-40} width={60} height={70} rx={16} fill={C.skin} stroke={O} strokeWidth={6} />
											<rect x={-12} y={-110} width={26} height={80} rx={13} fill={C.skin} stroke={O} strokeWidth={6} />
										</g>
									)}
								</g>
							)}
						</At>
					)}
					<At x={15.4} z={3.0} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face={t > thumb ? 'smile' : 'neutral'} walk={t > out - 0.2 && t < out + 0.2 ? 0.8 : 0} />}</At>
				</>
			);
		},
		over: (t) => (
			<>
				{t > out && t < clap && <Pill text="мяч в аут" t={t - out} y={360} />}
				{t > clap && t < med && <Pill text="стадион аплодирует" t={t - clap} y={360} />}
			</>
		),
	});
}

// 9. substitution: Marco walks out in Meteor red; «I told you» ------------------------
{
	const at = S('палыч', idx('палец'));
	const tun = T('из') - at;
	const name = T('марко', idx('волосы')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < tun - 0.2) return {pos: [-3.4, 2.0, 21.0], look: [-3.4, 1.0, 12.8], fov: 46};
			if (t < name - 0.2) return orbit([-1.5, 1.0, 12.0], 7.5, 0.6, 0.0 + 0.5 * ease((t - tun) / 4), 48);
			return orbit([-1.0, 1.25, 10.5], 3.8, 0.3, 0.5 - 0.7 * ease((t - name) / 5), 44);
		},
		world: (t) => <Field t={t} night={0.4} crowd={1} hype={0.6} lamp={1} />,
		flat: (t) => {
			const walk = ease((t - tun) / Math.max(1, name - tun));
			return (
				<>
					<At x={-4.4} z={13.2}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={1} face="smile" armFront={t < tun ? [150, -30] : undefined} /><Whistle x={x} y={y} s={s} /></g>}</At>
					{Dugout(-3.0, -0.6)}
					<At x={lerp(-1.5, -1.0, walk)} z={lerp(15.5, 10.5, walk)} h={0.92}>{(x, y, s) => <MarcoRed x={x} y={y} s={s} dir={-1} face={t > name ? 'smile' : 'neutral'} walk={walk > 0 && walk < 1 ? 0.7 : 0} />}</At>
				</>
			);
		},
		over: (t) => (
			<>
				{t < name - 0.2 && <SubBoard t={t} at={0.2} />}
				{t > name && <NameTag name="Марко" role="теперь за «Метеор»" from={name} x={60} y={150} avatar={<SideChar x={0} y={190} s={0.38} frontHair="curly" hairColor="#1b1410" jacket={KIT} pants="#f4f1ea" />} />}
			</>
		),
		heads: {marco: [-1.0, 1.55, 10.5]},
	});
}

// 10. stoppage time: Marco runs at me, winds up — freeze on «и-и-и…» -----------------
{
	const at = S('компенсированное');
	const ball = T('мяч', idx('атака')) - at;
	const onlyT = T('только', idx('меня')) - at;
	const swing = T('замахивается') - at;
	const freeze = T('и-и-и') - at - 0.05;
	sc.push({
		at,
		freezeAt: freeze,
		cam: (t) => {
			if (t < ball - 0.2) return orbit([0, 4, -10], 20, 4, 0.5 - 0.3 * ease(t / 2.5), 56);
			if (t < onlyT - 0.2) return orbit([5, 1.0, 1.5], 7, 0.8, 1.4 - 0.6 * ease((t - ball) / 3), 50);
			return orbit([5.3, 0.9, 1.5], 7.0, 0.4, 0.45 - 0.45 * ease((t - onlyT) / Math.max(1, freeze - onlyT)), lerp(50, 44, ease((t - onlyT) / 3)));
		},
		world: (t) => {
			const k = ease((t - ball) / Math.max(1, swing - ball));
			return (
				<>
					<Field t={t} night={0.4} crowd={1} hype={1} lamp={1} />
					<Ball p={[lerp(1.0, 4.6, k), 0.13, 1.5]} spin={t * 8} />
				</>
			);
		},
		flat: (t) => {
			const k = ease((t - ball) / Math.max(1, swing - ball));
			const sw = ease((t - swing) / 0.6);
			return (
				<>
					<At x={6.4} z={1.6} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face={t > onlyT ? 'determined' : 'neutral'} />}</At>
					<At x={lerp(0.6, 4.2, k)} z={1.4} h={0.92}>
						{(x, y, s) => (
							<g transform={`rotate(${-10 * sw} ${x} ${y})`}>
								<MarcoRed x={x} y={y} s={s} dir={1} face="determined" walk={t < swing ? 0.9 : 0.2} />
							</g>
						)}
					</At>
					<Board text="МЕТ 1 : 1 БАР" sub="90+3" />
				</>
			);
		},
		over: (t) => <>{t > onlyT && t < swing && <Pill text="только он и я" t={t - onlyT} y={360} />}</>,
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
								<radialGradient id="vig9" cx="50%" cy="50%" r="72%">
									<stop offset="62%" stopColor="#000" stopOpacity={0} />
									<stop offset="100%" stopColor="#000" stopOpacity={frozen ? 0.6 : 0.28} />
								</radialGradient>
							</defs>
							<rect width={VW} height={VH} fill="url(#vig9)" />
						</svg>
					</AbsoluteFill>
				</CamCtx.Provider>
			</AbsCtx.Provider>
		</ShotCtx.Provider>
	);
};

export const Ovoshch4: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	const endFade = interpolate(t, [OVOSHCH4_DURATION - 0.25, OVOSHCH4_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((sd, i) => {
				const from = sd.at;
				const to = i < SCENES.length - 1 ? SCENES[i + 1].at : OVOSHCH4_DURATION;
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
