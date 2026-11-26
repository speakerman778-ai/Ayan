import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ShotCtx, hash} from '../lib';
import {C, Char, OL, NameTag} from '../cartoon/parts';
import type {Hair} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Pill} from './FlatStyleDemo';
import {RBox, Box, mat, M} from './Style3D';
import rawWords from '../../public/shnurok/ep14-words.json';
import envRaw from '../../public/shnurok/ep14-env.json';

// «Овощ», 8 серия «Предатель» — cinema look, real kicks/jumps; 3D world + flat 2D heroes.

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
export const OVOSHCH8_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 3.2);
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
type Who = 'kir' | 'coach' | 'team' | 'scout' | 'marco' | 'lm' | 'doc' | 'rm' | 'shn' | 'dan';
const QUOTE_WHO: (Who | null)[] = ['kir', 'kir', null, 'shn', null, null, 'dan', null, null];
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
type CP = {x: number; y: number; s: number; dir?: 1 | -1; face?: React.ComponentProps<typeof SideChar>['face']; walk?: number; armFront?: [number, number]; phase?: number; kick?: number; crouch?: number; talk?: number; look?: number; speed?: number};
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
const S = (w: string, from = 0, pad = -0.02) => Math.max(0, T(w, from) - pad);

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


// ---------------------------------------------------------------- episode 5 pieces
const GROZA = '#3d6fb5';
/** A character facing the camera (front view), e.g. a goalkeeper staring at the kicker. */
const Keeper: React.FC<{x: number; y: number; s: number; kit?: string; t: number; ready?: boolean}> = ({x, y, s, kit = '#5fbf4a', t, ready = true}) => (
	<Char x={x} y={y} s={s * 0.95} hair="buzz" hairColor="#2b211d" jacket={kit} pants="#22252e" headS={0.82} bodyS={1.14} headDrop={18} face="determined" armL={ready ? [55 + Math.sin(t * 3) * 5, -30] : [12, -8]} armR={ready ? [55 + Math.sin(t * 3 + 1) * 5, -30] : [12, -8]} />
);
const PalFront: React.FC<{x: number; y: number; s: number; face?: React.ComponentProps<typeof Char>['face']; talk?: number}> = ({x, y, s, face = 'smile', talk = 0}) => (
	<Char x={x} y={y} s={s * 0.95} hair="boss" hairColor="#9a9a9a" mustache jacket="#2f4f86" pants="#2f4f86" headS={0.82} bodyS={1.14} headDrop={18} face={face} talk={talk} />
);
const PalTalkFront: React.FC<{x: number; y: number; s: number; face?: React.ComponentProps<typeof Char>['face']}> = (p) => <PalFront {...p} talk={useTalk('coach')} />;

const Letter: React.FC<{t: number; at: number; club: number}> = ({t, at, club}) =>
	t < at ? null : (
		<g transform={`translate(540 700) rotate(-3) scale(${back((t - at) / 0.4)})`}>
			<rect x={-330} y={-300} width={660} height={600} rx={18} fill="#fbf7ef" stroke={O} strokeWidth={9} />
			<rect x={-330} y={-300} width={660} height={90} rx={18} fill={BLUE} stroke={O} strokeWidth={9} />
			<rect x={-150} y={-300} width={80} height={90} fill={GARNET} />
			<rect x={70} y={-300} width={80} height={90} fill={GARNET} />
			<text x={0} y={-130} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={58} fill={O}>АРЕНДА</text>
			<text x={0} y={-60} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={40} fill={O}>срок: 6 месяцев</text>
			<path d="M -260 -10 L 260 -10" stroke="#d8cfc0" strokeWidth={4} />
			<text x={0} y={80} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={40} fill={O}>клуб:</text>
			{t > club && (
				<text x={0} y={190} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={92 * (0.8 + 0.2 * back((t - club) / 0.4))} fill={KIT} stroke={O} strokeWidth={5} paintOrder="stroke">
					«МЕТЕОР»
				</text>
			)}
		</g>
	);
const Calendar: React.FC<{t: number; at: number; dur: number}> = ({t, at, dur}) => {
	if (t < at) return null;
	const day = Math.min(21, 1 + Math.floor(((t - at) / dur) * 21));
	return (
		<g transform={`translate(540 600) scale(${back((t - at) / 0.35)})`}>
			<rect x={-150} y={-170} width={300} height={320} rx={22} fill="#fbf3e2" stroke={O} strokeWidth={8} />
			<rect x={-150} y={-170} width={300} height={80} rx={22} fill={KIT} stroke={O} strokeWidth={8} />
			<text x={0} y={-112} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill="#fff">день</text>
			<text x={0} y={90} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={150} fill={O}>{day}</text>
		</g>
	);
};
const Notebook: React.FC<{x: number; y: number; s: number; open: number}> = ({x, y, s, open}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-50} y={-60} width={50 * open + 2} height={70} fill="#fbf7ef" stroke={O} strokeWidth={4} transform={`translate(0 0)`} />
		<rect x={0} y={-60} width={50} height={70} fill="#fbf7ef" stroke={O} strokeWidth={4} />
		<rect x={-4} y={-62} width={8} height={74} fill={GARNET} />
	</g>
);


// ---------------------------------------------------------------- episode 6 pieces: hospital set (detailed)
const FK: V3 = [-12.5, 0.13, 1.0];
const H_WALL = mat('#dfe7e4');
const H_WALL2 = mat('#cfdad6');
const H_FLOOR = mat('#c9ccc4');
const H_FLOOR2 = mat('#bfc2ba');
const METAL = mat('#b9bec6', {roughness: 0.35, metalness: 0.6});
const SHEET = mat('#f7f8fa');
const BLANKET = mat('#8fb3d9');
const SCREEN = mat('#0f2a24', {emissive: '#0f3a30', emissiveIntensity: 0.6});
const LIGHTBOX = mat('#eaf4ff', {emissive: '#dbeeff', emissiveIntensity: 1.1});
const CITY = ['#4a5a7a', '#5b6b8a', '#3e4b66', '#6b7a96'].map((c) => mat(c));
const Doctor: React.FC<CP> = (p) => <SideChar {...p} frontHair="buzz" hairColor="#3b2a22" glasses jacket="#f4f6f8" pants="#7d93a8" shoes="#f4f1ea" talk={useTalk('doc')} phase={1.4} />;

const Hospital: React.FC<{t: number; evening?: number}> = ({t, evening = 0}) => (
	<>
		<color attach="background" args={[evening > 0.5 ? '#2b3550' : '#bcd6ef']} />
		<ambientLight intensity={0.55 - 0.2 * evening} color="#f4f8ff" />
		<hemisphereLight args={['#ffffff', '#9aa3a0', 0.45]} />
		<directionalLight position={[4, 4, 6]} intensity={0.7 - 0.4 * evening} color="#fff4e2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
		<pointLight position={[0, 2.9, 0]} intensity={3 + 2 * evening} distance={10} decay={1.4} color={evening > 0.5 ? '#ffd9a8' : '#ffffff'} castShadow shadow-mapSize={[1024, 1024]} />
		{/* floor tiles */}
		{Array.from({length: 10}).map((_, i) =>
			Array.from({length: 9}).map((_, j) => <Box key={`${i}${j}`} size={[0.6, 0.03, 0.6]} pos={[-3 + i * 0.6 + 0.3, -0.015, -3 + j * 0.6 + 0.3]} m={(i + j) % 2 ? H_FLOOR : H_FLOOR2} />),
		)}
		{/* walls with a window hole on the back wall */}
		<Box size={[2.2, 3.2, 0.15]} pos={[-1.9, 1.6, -3.1]} m={H_WALL} />
		<Box size={[2.0, 3.2, 0.15]} pos={[2.0, 1.6, -3.1]} m={H_WALL} />
		<Box size={[1.8, 0.9, 0.15]} pos={[0.1, 0.45, -3.1]} m={H_WALL} />
		<Box size={[1.8, 0.7, 0.15]} pos={[0.1, 2.85, -3.1]} m={H_WALL} />
		<Box size={[6.2, 0.8, 0.05]} pos={[0, 0.4, -3.0]} m={H_WALL2} />
		<Box size={[0.15, 3.2, 7]} pos={[-3.1, 1.6, 0.4]} m={H_WALL} />
		<Box size={[0.15, 3.2, 7]} pos={[3.1, 1.6, 0.4]} m={H_WALL} />
		<Box size={[6.4, 0.12, 7]} pos={[0, 3.25, 0.4]} m={mat('#f4f6f6')} />
		<Box size={[1.6, 0.04, 0.5]} pos={[0, 3.18, 0]} m={LAMP} />
		{/* window: frame, blinds, city outside */}
		<RBox size={[1.9, 0.08, 0.2]} pos={[0.1, 0.92, -3.0]} m={SHEET} r={0.02} />
		<RBox size={[1.9, 0.08, 0.2]} pos={[0.1, 2.48, -3.0]} m={SHEET} r={0.02} />
		{Array.from({length: 7}).map((_, i) => (
			<Box key={i} size={[1.76, 0.03, 0.04]} pos={[0.1, 2.35 - i * 0.07, -2.95]} m={SHEET} />
		))}
		{Array.from({length: 9}).map((_, i) => (
			<Box key={i} size={[0.5 + hash(i) * 0.4, 1.4 + hash(i + 2) * 2.6, 0.5]} pos={[-1.6 + i * 0.45, 0.6, -6 - hash(i + 4) * 2]} m={CITY[i % 4]} />
		))}
		{evening > 0.5 &&
			Array.from({length: 24}).map((_, i) => (
				<Box key={i} size={[0.08, 0.1, 0.02]} pos={[-1.6 + hash(i) * 3.4, 0.9 + hash(i + 1) * 2.2, -5.7]} m={WIN_ON} />
			))}
		{/* bed */}
		<group position={[0.6, 0, -1.2]}>
			<RBox size={[1.1, 0.12, 2.1]} pos={[0, 0.55, 0]} m={METAL} r={0.03} />
			{[[-0.5, -1.0], [0.5, -1.0], [-0.5, 1.0], [0.5, 1.0]].map(([x, z], i) => (
				<mesh key={i} position={[x, 0.27, z]} material={METAL} castShadow>
					<cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
				</mesh>
			))}
			<RBox size={[1.12, 0.9, 0.06]} pos={[0, 0.95, -1.05]} m={METAL} r={0.04} />
			<RBox size={[1.0, 0.16, 2.0]} pos={[0, 0.69, 0]} m={SHEET} r={0.06} />
			<RBox size={[0.7, 0.14, 0.38]} pos={[0, 0.84, -0.78]} m={SHEET} r={0.07} rot={[0.25, 0, 0]} />
			<RBox size={[1.04, 0.1, 1.3]} pos={[0, 0.8, 0.35]} m={BLANKET} r={0.05} />
		</group>
		{/* bedside table + water + flowers */}
		<group position={[-0.5, 0, -1.9]}>
			<RBox size={[0.5, 0.6, 0.45]} pos={[0, 0.3, 0]} m={mat('#e8e2d6')} r={0.03} />
			<mesh position={[-0.1, 0.68, 0]} material={new THREE.MeshStandardMaterial({color: '#cfe9ff', transparent: true, opacity: 0.6})}>
				<cylinderGeometry args={[0.04, 0.035, 0.14, 16]} />
			</mesh>
			<mesh position={[0.12, 0.7, 0]} material={mat('#c0603e')}>
				<cylinderGeometry args={[0.05, 0.04, 0.16, 16]} />
			</mesh>
			{[0, 1, 2].map((k) => (
				<mesh key={k} position={[0.12 + (k - 1) * 0.05, 0.86 + (k % 2) * 0.04, 0]} material={k === 1 ? M.red : SHIRTS[6]}>
					<sphereGeometry args={[0.04, 10, 8]} />
				</mesh>
			))}
		</group>
		{/* IV stand */}
		<group position={[1.5, 0, -1.9]}>
			<mesh position={[0, 0.9, 0]} material={METAL}>
				<cylinderGeometry args={[0.015, 0.015, 1.8, 8]} />
			</mesh>
			<RBox size={[0.16, 0.24, 0.05]} pos={[0.08, 1.65, 0]} m={new THREE.MeshStandardMaterial({color: '#e8f6ff', transparent: true, opacity: 0.8})} r={0.03} />
		</group>
		{/* heart monitor */}
		<group position={[1.75, 1.4, -2.9]}>
			<RBox size={[0.55, 0.4, 0.12]} pos={[0, 0, 0]} m={DARK} r={0.03} />
			<mesh position={[0, 0, 0.065]} material={SCREEN}>
				<planeGeometry args={[0.48, 0.32]} />
			</mesh>
		</group>
		{/* x-ray light box */}
		<group position={[-1.9, 1.6, -3.0]}>
			<RBox size={[0.9, 0.7, 0.06]} pos={[0, 0, 0]} m={METAL} r={0.02} />
			<mesh position={[0, 0, 0.035]} material={LIGHTBOX}>
				<planeGeometry args={[0.8, 0.6]} />
			</mesh>
		</group>
		{/* chair */}
		<group position={[-1.4, 0, -0.2]}>
			<RBox size={[0.5, 0.06, 0.5]} pos={[0, 0.45, 0]} m={mat('#7d93a8')} r={0.03} />
			<RBox size={[0.5, 0.5, 0.06]} pos={[0, 0.72, -0.22]} m={mat('#7d93a8')} r={0.03} />
			{[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
				<Box key={i} size={[0.03, 0.45, 0.03]} pos={[x, 0.22, z]} m={METAL} />
			))}
		</group>
		{/* curtain rail + privacy curtain */}
		<Box size={[0.04, 0.04, 3.2]} pos={[-2.6, 3.1, 0.2]} m={METAL} />
		{Array.from({length: 6}).map((_, i) => (
			<mesh key={i} position={[-2.6, 1.9, 1.0 + i * 0.12]} material={mat('#a8c8d8')}>
				<cylinderGeometry args={[0.05, 0.06, 2.3, 10]} />
			</mesh>
		))}
	</>
);
/** Heartbeat line on the monitor + x-ray picture, drawn as 2D on top of the 3D props. */
const HospitalDetails: React.FC<{t: number}> = ({t}) => (
	<>
		<Pin p={[1.75, 1.4, -2.83]}>
			{(x, y, ppm) => (
				<path
					d={`M ${x - ppm * 0.22} ${y} ${Array.from({length: 22}).map((_, i) => {
						const k = (i / 22 + t * 0.6) % 1;
						const spike = k > 0.45 && k < 0.5 ? -0.12 : k > 0.5 && k < 0.53 ? 0.06 : 0;
						return `L ${x - ppm * 0.22 + (i / 21) * ppm * 0.44} ${y + spike * ppm}`;
					}).join(' ')}`}
					stroke="#5cff7a"
					strokeWidth={Math.max(1.5, ppm * 0.012)}
					fill="none"
				/>
			)}
		</Pin>
		<Pin p={[-1.9, 1.6, -2.96]}>
			{(x, y, ppm) => (
				<g transform={`translate(${x} ${y}) scale(${ppm / 400})`} opacity={0.85}>
					<path d="M -40 -110 Q -30 -20 -34 0 Q -60 30 -40 50 Q -20 60 -10 30 Q 0 0 10 30 Q 20 60 40 50 Q 60 30 34 0 Q 30 -20 40 -110" fill="none" stroke="#5a6b7a" strokeWidth={18} strokeLinecap="round" />
					<ellipse cx={0} cy={18} rx={26} ry={14} fill="none" stroke="#c84a4a" strokeWidth={6} />
					<path d="M -34 120 L -30 40 M 34 120 L 30 40" stroke="#5a6b7a" strokeWidth={18} strokeLinecap="round" />
				</g>
			)}
		</Pin>
	</>
);
/** Shnurok sitting up in bed: body hidden under the blanket edge. */
const InBed: React.FC<{t: number; face: React.ComponentProps<typeof SideChar>['face']}> = ({t, face}) => (
	<>
		<At x={0.6} z={-1.35} h={0.88} lift={0.12} shadow={false}>{(x, y, s) => <ShnHood x={x} y={y} s={s} dir={1} face={face} />}</At>
		<Quad pts={[[0.04, 0.6, -0.9], [1.16, 0.6, -0.9], [1.16, 1.14, -1.0], [0.04, 1.14, -1.0]]} fill="#8fb3d9" sw={4} />
	</>
);

const ContractDoc: React.FC<{t: number; at: number; out?: number}> = ({t, at, out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(540 640) rotate(4) scale(${back((t - at) / 0.4)})`}>
			<rect x={-280} y={-260} width={560} height={520} rx={16} fill="#fbf7ef" stroke={O} strokeWidth={9} />
			<rect x={-280} y={-260} width={560} height={80} rx={16} fill={BLUE} stroke={O} strokeWidth={9} />
			<rect x={-120} y={-260} width={70} height={80} fill={GARNET} />
			<rect x={50} y={-260} width={70} height={80} fill={GARNET} />
			<text x={0} y={-110} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill={O}>КОНТРАКТ</text>
			<text x={0} y={-30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={110} fill={GARNET}>5 лет</text>
			<text x={0} y={50} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={34} fill={O}>операция в лучшей клинике</text>
			<text x={0} y={100} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={34} fill={KIT}>без возврата в «Метеор»</text>
			<path d="M -200 190 L 200 190" stroke={O} strokeWidth={4} />
			<text x={-200} y={230} fontFamily="Inter" fontWeight={600} fontSize={26} fill="#8a8a8a">подпись</text>
		</g>
	);
const MeteorBadge: React.FC<{t: number; at: number; stamp?: string; x?: number; y?: number; s?: number; stampColor?: string}> = ({t, at, stamp, x = 540, y = 640, s = 1, stampColor = '#c0392b'}) =>
	t < at ? null : (
		<g transform={`translate(${x} ${y}) scale(${s * back((t - at) / 0.4)})`}>
			<circle r={130} fill={KIT} stroke={O} strokeWidth={10} />
			<path d="M -64 44 L 54 -76 M -20 54 L 74 -42" stroke="#f2c230" strokeWidth={16} strokeLinecap="round" />
			<circle cx={-66} cy={46} r={28} fill="#f2c230" stroke={O} strokeWidth={6} />
			<text y={200} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={60} fill="#fff" stroke={O} strokeWidth={8} paintOrder="stroke">«МЕТЕОР»</text>
			{stamp && (
				<g transform={`rotate(-14) scale(${back((t - at - 0.5) / 0.3)})`}>
					<rect x={-190} y={-50} width={380} height={100} rx={12} fill="none" stroke={stampColor} strokeWidth={12} />
					<text y={28} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={76} fill={stampColor}>{stamp}</text>
				</g>
			)}
		</g>
	);

// ---------------------------------------------------------------- episode 7 pieces
const RM_WHITE = '#f4f4f2';
const RmCap: React.FC<CP> = (p) => <SideChar {...p} frontHair="quiff" hairColor="#1b1410" jacket={RM_WHITE} pants={RM_WHITE} shoes="#2b2b2b" talk={useTalk('rm')} phase={1.7} />;
const DocTalk: React.FC<CP> = (p) => <Doctor {...p} />;

/** Concrete players' tunnel running along -z, bright stadium light at the far end. */
const T_WALL = mat('#8f8a82');
const T_WALL2 = mat('#7a766f');
const T_FLOOR = mat('#4a4f57');
const T_GLOW = new THREE.MeshBasicMaterial({color: '#fff6dc'});
const Tunnel: React.FC<{t: number; exit?: number}> = ({t, exit = 0}) => (
	<>
		<color attach="background" args={['#14161c']} />
		<fog attach="fog" args={['#1a1c22', 8, 40]} />
		<ambientLight intensity={0.25} color="#cfd8ff" />
		<pointLight position={[0, 2.5, -30]} intensity={40 + 40 * exit} distance={40} decay={1.2} color="#fff1c8" />
		{Array.from({length: 10}).map((_, i) => (
			<group key={i}>
				<pointLight position={[0, 2.7, -i * 3.2]} intensity={1.6 + 0.6 * Math.sin(t * 7 + i * 3) * (i === 4 ? 1 : 0)} distance={5} decay={1.6} color="#e6ecff" />
				<Box size={[1.2, 0.05, 0.25]} pos={[0, 2.95, -i * 3.2]} m={LAMP} />
				<Box size={[0.12, 3, 0.4]} pos={[-1.65, 1.5, -i * 3.2 - 1.6]} m={T_WALL2} />
				<Box size={[0.12, 3, 0.4]} pos={[1.65, 1.5, -i * 3.2 - 1.6]} m={T_WALL2} />
			</group>
		))}
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -13]} material={T_FLOOR} receiveShadow>
			<planeGeometry args={[3.4, 40]} />
		</mesh>
		<Box size={[0.2, 3.1, 40]} pos={[-1.8, 1.55, -13]} m={T_WALL} />
		<Box size={[0.2, 3.1, 40]} pos={[1.8, 1.55, -13]} m={T_WALL} />
		<Box size={[3.8, 0.2, 40]} pos={[0, 3.1, -13]} m={T_WALL2} />
		{/* red carpet line + wall banners */}
		<Box size={[1.2, 0.01, 30]} pos={[0, 0.01, -15]} m={mat('#8a1538')} />
		{[-6, -14, -22].map((z) => (
			<group key={z}>
				<Box size={[0.03, 1.4, 1.0]} pos={[-1.68, 1.7, z]} m={mat('#1f3f8f')} />
				<Box size={[0.03, 1.4, 1.0]} pos={[1.68, 1.7, z]} m={mat(RM_WHITE)} />
			</group>
		))}
		<mesh position={[0, 1.6, -32.9]} material={T_GLOW}>
			<planeGeometry args={[3.6, 3.2]} />
		</mesh>
	</>
);

/** Phone in hand with a chat / video. */
const Phone: React.FC<{t: number; at: number; x?: number; y?: number; s?: number; children: React.ReactNode}> = ({t, at, x = 540, y = 820, s = 1, children}) =>
	t < at ? null : (
		<g transform={`translate(${x} ${y + 40 * (1 - ease((t - at) / 0.5))}) rotate(-3) scale(${s * back((t - at) / 0.45)})`}>
			<rect x={-250} y={-440} width={500} height={880} rx={56} fill="#15171f" stroke={O} strokeWidth={10} />
			<rect x={-224} y={-400} width={448} height={800} rx={30} fill="#1e2433" />
			<rect x={-60} y={-424} width={120} height={14} rx={7} fill="#2b2f3c" />
			{children}
		</g>
	);
const Bubble: React.FC<{y: number; text: string[]; from?: string; t: number; at: number; mine?: boolean}> = ({y, text, from, t, at, mine}) =>
	t < at ? null : (
		<g transform={`translate(${mine ? 30 : -200} ${y}) scale(${back((t - at) / 0.35)})`}>
			{from && <text x={0} y={-16} fontFamily="Inter" fontWeight={800} fontSize={24} fill="#9fb7d6">{from}</text>}
			<rect x={0} y={0} width={380} height={30 + text.length * 40} rx={22} fill={mine ? '#3d6fb5' : '#f4f1ea'} />
			{text.map((l, i) => (
				<text key={i} x={22} y={44 + i * 40} fontFamily="Inter" fontWeight={700} fontSize={30} fill={mine ? '#fff' : O}>{l}</text>
			))}
		</g>
	);

/** Big knee x-ray on a lightbox (overlay). */
const XRay: React.FC<{t: number; at: number; crack: number}> = ({t, at, crack}) =>
	t < at ? null : (
		<g transform={`translate(540 700) scale(${back((t - at) / 0.4)})`}>
			<rect x={-260} y={-330} width={520} height={660} rx={18} fill="#0d1622" stroke={O} strokeWidth={10} />
			<rect x={-236} y={-306} width={472} height={612} rx={8} fill="#1b2a3c" />
			<path d="M -60 -300 Q -48 -80 -58 -10 Q -110 40 -70 90 Q -30 110 -12 60 Q 0 30 12 60 Q 30 110 70 90 Q 110 40 58 -10 Q 48 -80 60 -300" fill="none" stroke="#d6e4f0" strokeWidth={34} strokeLinecap="round" opacity={0.9} />
			<path d="M -56 300 L -50 120 M 56 300 L 50 120" stroke="#d6e4f0" strokeWidth={34} strokeLinecap="round" opacity={0.9} />
			<ellipse cx={0} cy={40} rx={70} ry={36} fill="none" stroke="#ff4b4b" strokeWidth={8} opacity={0.5 + 0.5 * Math.abs(Math.sin(t * 4))} />
			{crack > 0 && <path d={`M -30 40 L -8 22 L 6 50 L 28 30`} stroke="#ff4b4b" strokeWidth={7} fill="none" strokeDasharray={120} strokeDashoffset={120 * (1 - clamp01(crack))} />}
		</g>
	);

/** Front-facing friends in the stands with red scarves. */
const Scarf: React.FC<{x: number; y: number; s: number; t: number; k: number}> = ({x, y, s, t, k}) => (
	<g transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(t * 5 + k) * 8})`}>
		<rect x={-12} y={-150} width={24} height={150} fill={O} />
		<rect x={-110} y={-260} width={220} height={60} rx={8} fill={KIT} stroke={O} strokeWidth={6} />
		<rect x={-40} y={-260} width={30} height={60} fill="#f2c230" />
		<rect x={20} y={-260} width={30} height={60} fill="#f2c230" />
	</g>
);

const Rewind: React.FC<{t: number; at: number}> = ({t, at}) =>
	t < at ? null : (
		<g opacity={clamp01((t - at) / 0.3)}>
			{Array.from({length: 24}).map((_, i) => (
				<rect key={i} x={0} y={((i * 80 + t * 900) % 1920)} width={VW} height={6} fill="#fff" opacity={0.08} />
			))}
			<g transform={`translate(540 520) scale(${back((t - at) / 0.4)})`}>
				<path d="M 10 -60 L -70 0 L 10 60 Z M 100 -60 L 20 0 L 100 60 Z" fill="#fff" stroke={O} strokeWidth={8} strokeLinejoin="round" />
				<text y={130} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill="#fff" stroke={O} strokeWidth={8} paintOrder="stroke">ПОЛГОДА НАЗАД…</text>
			</g>
		</g>
	);

type Grade = 'warm' | 'cold' | 'gold' | 'night' | 'neutral';
const GRADE: Record<Grade, {tint: string; a: number; css: string}> = {
	warm: {tint: '#ffb35c', a: 0.22, css: 'contrast(1.08) saturate(1.15) brightness(1.03)'},
	cold: {tint: '#4f7dff', a: 0.22, css: 'contrast(1.1) saturate(0.85) brightness(0.96)'},
	gold: {tint: '#ffcf6a', a: 0.3, css: 'contrast(1.12) saturate(1.1) brightness(1.04)'},
	night: {tint: '#2b47a8', a: 0.35, css: 'contrast(1.1) saturate(0.8) brightness(0.9)'},
	neutral: {tint: '#ffffff', a: 0, css: 'contrast(1.07) saturate(1.08) brightness(1.02)'},
};
type Scene7 = Scene & {grade?: Grade; blur?: (t: number) => number};

const BAR = 150;
const DAN_HAIR = '#d9a066';
const Dan: React.FC<CP> = (p) => <SideChar frontHair="buzz" hairColor={DAN_HAIR} jacket={BLUE} pants={GARNET} shoes="#2b2b2b" talk={useTalk('dan')} phase={2.9} {...p} />;
const ShnTalk: React.FC<CP> = (p) => <ShnBar talk={useTalk('shn')} {...p} />;
const KirFan: React.FC<CP> = (p) => <SideChar frontHair="quiff" hairColor="#e0b04a" jacket={KIT} pants="#f4f1ea" shoes="#2b2b2b" talk={useTalk('kir')} phase={0.7} {...p} />;

/** kick value so that the foot meets the ball exactly at tc */
const kickV = (t: number, tc: number) => (t < tc - 0.35 || t > tc + 0.45 ? 0 : clamp01((t - (tc - 0.35)) / 0.6));
/** jump: returns lift (m) + crouch (squash before take-off and after landing) */
const jumpV = (t: number, t0: number, air = 0.55, h = 0.55) => {
	const k = (t - t0) / air;
	if (k < -0.35 || k > 1.5) return {lift: 0, crouch: 0};
	if (k < 0) return {lift: 0, crouch: ease((k + 0.35) / 0.35) * 0.8};
	if (k <= 1) return {lift: 4 * h * k * (1 - k), crouch: Math.max(0, 0.6 - k * 3) * (k < 0.2 ? 1 : 0)};
	return {lift: 0, crouch: 0.7 * Math.sin(((k - 1) / 0.5) * Math.PI)};
};
const Minute: React.FC<{t: number; at: number; text: string; out?: number}> = ({t, at, text, out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(880 ${BAR + 110}) scale(${back((t - at) / 0.3)})`}>
			<rect x={-110} y={-55} width={220} height={110} rx={22} fill="#15171f" stroke={O} strokeWidth={6} />
			<text y={22} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={66} fill="#f5c542">{text}</text>
		</g>
	);
const Score: React.FC<{t: number; a: number; b: number}> = ({a, b}) => (
	<g transform={`translate(230 ${BAR + 70})`}>
		<rect x={-170} y={-40} width={340} height={80} rx={18} fill="#15171f" stroke={O} strokeWidth={5} />
		<rect x={-160} y={-30} width={110} height={60} rx={10} fill={BLUE} />
		<rect x={50} y={-30} width={110} height={60} rx={10} fill={RM_WHITE} />
		<text x={-105} y={14} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">БАР</text>
		<text x={105} y={14} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={O}>МАД</text>
		<text y={16} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill="#f5c542">{a}:{b}</text>
	</g>
);
/** a Madrid defender slides in to the knee at time tc (relative), victim at (x,z) */
const Foul: React.FC<{t: number; tc: number; x: number; z: number; from: number}> = ({t, tc, x, z, from}) => {
	if (t < tc - 1.1 || t > tc + 1.4) return null;
	const k = ease((t - tc + 1.1) / 1.1);
	const px = lerp(x + from, x + 0.55 * Math.sign(from), k);
	const slide = t > tc - 0.25;
	return <At x={px} z={z + 0.1} h={0.93} lift={slide ? -0.55 : 0} lie={slide ? 0.55 : 0}>{(sx, sy, s) => <RmCap x={sx} y={sy} s={s} dir={from > 0 ? -1 : 1} face="determined" walk={slide ? 0 : 1} speed={2.6} kick={slide ? 0.75 : 0} />}</At>;
};
const Impact: React.FC<{t: number; tc: number; x: number; y: number}> = ({t, tc, x, y}) =>
	t < tc || t > tc + 0.45 ? null : (
		<g transform={`translate(${x} ${y}) scale(${0.6 + 1.2 * ((t - tc) / 0.45)})`} opacity={1 - (t - tc) / 0.45}>
			{Array.from({length: 8}).map((_, i) => (
				<path key={i} d={`M 0 0 L ${Math.cos((i / 8) * Math.PI * 2) * 60} ${Math.sin((i / 8) * Math.PI * 2) * 60}`} stroke="#ff4b4b" strokeWidth={10} strokeLinecap="round" />
			))}
		</g>
	);

const sc: Scene7[] = [];

// 1. walking out: anthem, 90 000 -------------------------------------------------------
{
	const at = 0;
	sc.push({
		at,
		grade: 'gold',
		cam: (t, dur) => (t < 4.2 ? orbit([0, 1.1, 12.6], 7.5, 0.6, 0.5 - 0.4 * ease(t / 4.2), 46) : orbit([0, 6, -2], 28, 6, -0.4 + 0.5 * ease((t - 4.2) / (dur - 4.2)), 62)),
		world: (t) => <Field t={t} night={1} crowd={1} hype={0.8} lamp={1} />,
		flat: (t) => (
			<>
				<At x={lerp(-0.6, -1.6, ease(t / 4))} z={lerp(14.2, 11.6, ease(t / 4))} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face="determined" walk={t < 4 ? 0.6 : 0} />}</At>
				<At x={lerp(0.6, 1.4, ease(t / 4))} z={lerp(14.0, 11.4, ease(t / 4))} h={0.93}>{(x, y, s) => <RmCap x={x} y={y} s={s} dir={-1} face="neutral" walk={t < 4 ? 0.6 : 0} />}</At>
				<Board text="ФИНАЛ" sub="БАРСЕЛОНА — МАДРИД" />
			</>
		),
		over: (t) => <Pill text="финал · 90 000" t={t - 0.6} y={BAR + 120} />,
	});
}

// 2. kick-off and three fouls on the knee: 1', 5', 10' -------------------------------
{
	const at = S('свисток');
	const f1 = T('бьют') - at;
	const f2 = T('снова') - at;
	const f3 = T('опять') - at;
	const pos = (t: number): [number, number] => {
		const legs: [number, number, number, number][] = [[0, -2, 10, 2], [f1 + 1.4, -6, 6, 1], [f2 + 1.4, -9, 4, 2]];
		let cur = legs[0];
		for (const l of legs) if (t >= l[0]) cur = l;
		const k = clamp01((t - cur[0]) / 1.2);
		return [lerp(cur[1] + 3, cur[1], k), cur[2]];
	};
	sc.push({
		at,
		grade: 'gold',
		cam: (t) => {
			const [x, z] = pos(t);
			const r = t > f3 - 0.5 ? 4.2 : t > f2 - 0.5 ? 5.4 : 7;
			return orbit([x, 1.0, z], r, 1.2, 0.35 + 0.2 * Math.sin(t * 0.4), 48);
		},
		world: (t) => {
			const [x, z] = pos(t);
			const loose = [f1, f2, f3].some((f) => t > f && t < f + 1.2);
			return (
				<>
					<Field t={t} night={1} crowd={1} hype={0.6} lamp={1} />
					<Ball p={loose ? [x - 1.5, 0.13, z + 1.2] : [x - 0.45, 0.13, z + 0.05]} spin={t * 5} />
				</>
			);
		},
		flat: (t) => {
			const [x, z] = pos(t);
			const hit = [f1, f2, f3].find((f) => t > f - 0.05 && t < f + 1.2);
			const down = hit !== undefined;
			return (
				<>
					<At x={x} z={z} h={0.88} lie={down ? 0.85 * ease((t - (hit ?? 0)) / 0.25) : 0}>{(sx, sy, s) => <ShnBar x={sx} y={sy} s={s} dir={-1} face={down ? 'wince' : 'determined'} walk={down ? 0 : 0.9} speed={2.4} />}</At>
					{[f1, f2, f3].map((f, i) => <Foul key={i} t={t} tc={f} x={x} z={z} from={i % 2 ? -3 : 3} />)}
				</>
			);
		},
		over: (t) => (
			<>
				<Score t={t} a={0} b={0} />
				<Minute t={t} at={f1 - 0.4} out={f2 - 0.5} text="1'" />
				<Minute t={t} at={f2 - 0.4} out={f3 - 0.5} text="5'" />
				<Minute t={t} at={f3 - 0.4} text="10'" />
				{[f1, f2, f3].map((f, i) => <Impact key={i} t={t} tc={f} x={540} y={1080} />)}
			</>
		),
	});
}

// 3. «it's no accident»: close-up, captain's smirk -------------------------------------
{
	const at = S('это');
	sc.push({
		at,
		grade: 'cold',
		cam: (t, dur) => ({pos: lv([-6.2, 1.5, 6.2], [-6.0, 1.5, 5.6], ease(t / dur)), look: [-8.6, 1.3, 4.1], fov: 40}),
		world: (t) => <Field t={t} night={1} crowd={1} hype={0.4} lamp={1} />,
		flat: (t) => (
			<>
				<At x={-9.0} z={4.0} h={0.88} lift={-0.2}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face="determined" />}</At>
				<At x={-7.6} z={3.2} h={0.93}>{(x, y, s) => <RmCap x={x} y={y} s={s} dir={-1} face="smile" />}</At>
			</>
		),
		over: (t) => <Pill text="они знали" t={t - 1.4} y={BAR + 120} />,
	});
}

// 4. Kiryukha yells from the stands, Palych facepalms ------------------------------------
{
	const at = S('а', idx('знали'));
	const quote = T('судья') - at;
	const pal = T('палыч') - at;
	sc.push({
		at,
		grade: 'warm',
		cam: (t, dur) => orbit([0, 5, -15], 9, 0.5, -0.1 + 0.2 * ease(t / dur), 52),
		world: (t) => <Field t={t} night={0.6} crowd={1} hype={0.8} lamp={1} />,
		flat: (t) => {
			const j = t > quote ? jumpV(t, quote + 0.1, 0.45, 0.4) : {lift: 0, crouch: 0};
			const j2 = t > quote ? jumpV(t, quote + 1.3, 0.45, 0.4) : {lift: 0, crouch: 0};
			const jj = j.lift || j.crouch ? j : j2;
			return (
				<>
					<rect x={0} y={1180} width={VW} height={VH - 1180} fill="#3b3f4a" />
					<g transform={`translate(0 ${-jj.lift * 420})`}>
						<KirFan x={330} y={1560} s={0.66} face={t > quote ? 'shock' : 'smile'} crouch={jj.crouch} armFront={t > quote ? [-150, -20] : undefined} />
					</g>
					<g>
						<PalFront x={760} y={1560} s={0.66} face={t > pal ? 'sad' : 'smile'} />
						{t > pal && (
							<g transform={`translate(760 ${1560 - 0.66 * 560}) scale(${ease((t - pal) / 0.3)})`}>
								<ellipse cx={-40} cy={10} rx={46} ry={30} fill={C.skin} stroke={O} strokeWidth={5} />
								<ellipse cx={40} cy={10} rx={46} ry={30} fill={C.skin} stroke={O} strokeWidth={5} />
							</g>
						)}
					</g>
					<rect x={0} y={1300} width={VW} height={28} fill={O} />
					<Scarf x={330} y={1150 - jj.lift * 420} s={0.7} t={t} k={1} />
				</>
			);
		},
		over: (t) => <Pill text="Кирюха и Палыч на трибуне" t={t - 0.3} y={BAR + 120} />,
		heads: {kir: [-0.5, 6, -15]},
		blur: () => 5,
	});
}

// 5. 20': run-up, jump, volley — GOAL 1:0 ---------------------------------------------
{
	const at = S('двадцатая');
	const jump = T('прыжок') - at;
	const hit = T('удар') - at;
	const goal = T('гол') - at;
	const run = (t: number): number => (t < jump ? lerp(-6, -13.4, ease(t / jump)) : -13.4 - 0.9 * clamp01((t - jump) / 0.6));
	sc.push({
		at,
		grade: 'gold',
		cam: (t) => (t < hit + 0.2 ? {pos: [run(t) - 0.5, 1.6, 10.0], look: [run(t) - 2.2, 1.2, 2.2], fov: 52} : orbit([-19.5, 1.4, 0], 9, 1.2, 0.9 - 0.3 * ease((t - hit) / 2.5), 50)),
		world: (t) => {
			const x0 = run(Math.min(t, hit)) - 0.4;
			let p: V3;
			if (t < jump) p = [run(t) - 0.5, 0.13 + Math.abs(Math.sin(t * 5)) * 0.15, 2.4];
			else if (t < hit) {
				// cross comes in from the right wing, dropping to the volley point
				const k = clamp01((t - jump + 0.2) / (hit - jump + 0.2));
				p = [lerp(-10, x0, k), 0.4 + Math.sin(k * Math.PI) * 2.2 + (1 - k) * 0.2 + k * 0.9, lerp(9, 2.4, k)];
			} else {
				const k = clamp01((t - hit) / Math.max(0.25, goal - hit));
				p = [lerp(x0, -21.2, k), lerp(1.3, 1.7, k) + Math.sin(k * Math.PI) * 0.3, lerp(2.4, -1.4, k)];
				if (t > goal) p = [-21.4, 0.13 + Math.abs(Math.sin((t - goal) * 6)) * 0.5 * Math.exp(-(t - goal) * 2), -1.4];
			}
			return (
				<>
					<Field t={t} night={1} crowd={1} hype={t > goal ? 1 : 0.6} lamp={1} />
					<Ball p={p} spin={t * 8} />
				</>
			);
		},
		flat: (t) => {
			const j = jumpV(t, jump + 0.15, hit - jump - 0.05 + 0.35, 0.75);
			return (
				<>
					<At x={-20.4} z={0.2} h={0.95}>{(x, y, s) => <Keeper x={x} y={y} s={s} kit="#2b2b2b" t={t} ready={t < hit + 0.15} />}</At>
					<At x={run(t)} z={2.4} h={0.88} lift={j.lift}>
						{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face={t > goal ? 'joy' : 'determined'} walk={t < jump ? 1 : 0} speed={2.8} crouch={j.crouch} kick={kickV(t, hit)} armFront={t > goal + 0.3 ? [-160, -20] : t > jump ? [-70, 20] : undefined} />}
					</At>
				</>
			);
		},
		over: (t) => (
			<>
				<Score t={t} a={t > goal ? 1 : 0} b={0} />
				<Minute t={t} at={0.1} out={goal} text="20'" />
				<Impact t={t} tc={hit} x={540} y={960} />
				<Big text="ГОЛ!" t={t} at={goal} y={640} size={240} color="#f5c542" />
			</>
		),
	});
}

// 6. Kiryukha: «Якорный бабай!» — jumping with joy -------------------------------------
{
	const at = S('кирюха', idx('ноль'));
	sc.push({
		at,
		grade: 'warm',
		cam: (t, dur) => orbit([0, 5, -15], 8.5, 0.5, 0.15 - 0.25 * ease(t / dur), 52),
		world: (t) => <Field t={t} night={0.6} crowd={1} hype={1} lamp={1} />,
		flat: (t) => {
			const ph = (t % 0.95) / 0.95;
			const j = jumpV(ph * 0.95, 0.3, 0.45, 0.45);
			return (
				<>
					<rect x={0} y={1180} width={VW} height={VH - 1180} fill="#3b3f4a" />
					<g transform={`translate(0 ${-j.lift * 420})`}>
						<KirFan x={420} y={1560} s={0.68} face="joy" crouch={j.crouch} armFront={[-165, -10]} />
					</g>
					<PalFront x={790} y={1560} s={0.62} face="joy" />
					<rect x={0} y={1300} width={VW} height={28} fill={O} />
					<Scarf x={420} y={1150 - j.lift * 420} s={0.72} t={t} k={2} />
				</>
			);
		},
		over: (t) => <Score t={t} a={1} b={0} />,
		blur: () => 5,
	});
}

// 7. another foul, I fall — Madrid equalise 1:1 — half-time whistle --------------------
{
	const at = S('но', idx('овощ'));
	const foul = T('удар', idx('новый')) - at;
	const fall = T('падаю') - at;
	const eq = T('а', idx('падаю')) - at;
	const one = T('один', idx('забивает')) - at;
	const ht = T('свисток', idx('забивает')) - at;
	sc.push({
		at,
		grade: 'cold',
		cam: (t) => {
			if (t < eq - 0.1) return orbit([4, 0.9, 3], 5.5, 1.0, 0.6 - 0.3 * ease(t / Math.max(1, eq)), 46);
			if (t < ht - 0.1) return {pos: [12.5, 1.6, 8.5], look: [20.5, 1.2, 0], fov: 50};
			return orbit([0, 4, -4], 22, 5, -0.2, 60);
		},
		world: (t) => {
			const k = clamp01((t - eq - 0.4) / Math.max(0.4, one - eq - 0.6));
			const p: V3 = t < eq ? [3.2, 0.13, 3.4] : t < one ? [lerp(15, 21.2, k), 0.13 + Math.sin(k * Math.PI) * 1.4 + k * 0.5, lerp(5, 1.2, k)] : [21.4, 0.13, 1.2];
			return (
				<>
					<Field t={t} night={1} crowd={1} hype={t > one ? 0.3 : 0.6} lamp={1} />
					<Ball p={p} spin={t * 6} />
				</>
			);
		},
		flat: (t) => (
			<>
				<At x={4} z={3} h={0.88} lie={t > fall - 0.2 ? ease((t - fall + 0.2) / 0.3) : 0}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face={t > foul ? 'wince' : 'determined'} walk={t < foul ? 0.9 : 0} speed={2.4} />}</At>
				<Foul t={t} tc={foul} x={4} z={3} from={-3} />
				{t > eq - 0.1 && t < ht - 0.1 && (
					<>
						<At x={14.6} z={5.4} h={0.93}>{(x, y, s) => <RmCap x={x} y={y} s={s} dir={1} face="joy" kick={kickV(t, eq + 0.4)} />}</At>
						<At x={20.4} z={0.2} h={0.95}>{(x, y, s) => <Keeper x={x} y={y} s={s} kit="#f2c230" t={t} ready={t < one} />}</At>
					</>
				)}
			</>
		),
		over: (t) => (
			<>
				<Score t={t} a={1} b={t > one ? 1 : 0} />
				<Impact t={t} tc={foul} x={540} y={1040} />
				{t > ht && <Pill text="перерыв" t={t - ht} y={BAR + 200} />}
			</>
		),
	});
}

// 8. locker room: I call Palych — «Why did you tell them?!» — silence — screenshot ------
{
	const at = S('в', idx('перерыв'));
	const call = T('звоню') - at;
	const quiet = T('тишина') - at;
	const shot = T('скрин') - at;
	sc.push({
		at,
		grade: 'cold',
		cam: (t, dur) => orbit([0, 1.2, -0.8], 4.4, 0.4, -0.3 + 0.5 * ease(t / dur), 48),
		world: (t) => <Locker t={t} />,
		flat: (t) => <At x={0.2} z={-0.9} h={0.88} lift={-0.3}>{(x, y, s) => <ShnTalk x={x} y={y} s={s} dir={1} face={t > shot + 1.5 ? 'shock' : 'determined'} armFront={t > call ? [-130, 60] : undefined} />}</At>,
		over: (t) => (
			<Phone t={t} at={call - 0.1} y={820} s={0.85}>
				<text x={0} y={-340} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">Палыч</text>
				{t < shot && <text x={0} y={-290} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={26} fill="#9fb7d6">{t < quiet ? 'звонок…' : '…тишина…'}</text>}
				{t > shot && (
					<g transform={`scale(${back((t - shot) / 0.4)})`}>
						<rect x={-200} y={-260} width={400} height={420} rx={20} fill="#f4f1ea" />
						<text x={0} y={-200} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={O}>Отправленные</text>
						<text x={0} y={-40} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={34} fill="#8a8a8a">сообщений нет</text>
						<text x={0} y={60} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={90} fill="#2b9a3b">0</text>
					</g>
				)}
			</Phone>
		),
		heads: {shn: [0.2, 1.2, -0.9]},
		blur: (t) => (t > call ? 3 : 0),
	});
}

// 9. «Then the doctor?» No. «Then who?!» -------------------------------------------------
{
	const at = S('тогда');
	const no = T('нет', idx('врач')) - at;
	const who = T('тогда', idx('шоке')) - at;
	sc.push({
		at,
		grade: 'cold',
		cam: (t) => (t < who ? orbit([-0.8, 1.3, -0.6], 3.6, 0.3, 0.4, 44) : {pos: lv([0.4, 1.3, 2.8], [0.3, 1.3, 1.8], ease((t - who) / 1.5)), look: [0.2, 1.2, -0.9], fov: 44}),
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<>
				{t < who && <At x={-1.0} z={-1.0} h={1}>{(x, y, s) => <Doctor x={x} y={y} s={s} dir={1} face={t > no ? 'shock' : 'neutral'} />}</At>}
				<At x={0.2} z={-0.9} h={0.88} lift={-0.3}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={t < who ? -1 : 1} face={t > who ? 'shock' : 'think'} />}</At>
				{t > who && <rect width={VW} height={VH} fill="#05070d" opacity={0.45 * ease((t - who) / 0.6)} />}
			</>
		),
		over: (t) => (
			<>
				{t < no && <Pill text="врач?" t={t - 0.1} y={BAR + 120} />}
				{t > no && t < who && <Pill text="нет — врач в шоке" t={t - no} y={BAR + 120} />}
				{t > who && <Big text="КТО?!" t={t} at={who} y={620} size={200} color="#ff4b4b" />}
			</>
		),
	});
}

// 10. I look up… Danya in the corner, hiding his phone ------------------------------------
{
	const at = S('я', idx('кто'));
	const dan = T('даню') - at;
	const hide = T('прячет') - at;
	sc.push({
		at,
		grade: 'night',
		cam: (t, dur) => (t < dan - 0.2 ? {pos: [0.6, 1.25, 1.0], look: [0.2, 1.3, -0.9], fov: 40} : {pos: lv([0.2, 1.4, 1.8], [1.4, 1.35, 0.6], ease((t - dan) / (dur - dan))), look: [2.0, 1.1, -1.4], fov: 42}),
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<>
				{t < dan - 0.2 && <At x={0.2} z={-0.9} h={0.88} lift={-0.3}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face="think" look={-0.4} />}</At>}
				{t > dan - 0.2 && (
					<At x={2.0} z={-1.6} h={0.9} lift={-0.3}>
						{(x, y, s) => (
							<g>
								<Dan x={x} y={y} s={s} dir={-1} face={t > hide ? 'shock' : 'neutral'} armFront={t < hide ? [-100, 50] : [20, 140]} />
								{t < hide + 0.4 && <rect x={x - 150 * s} y={y - 330 * s} width={40 * s} height={70 * s} rx={8 * s} fill="#15171f" stroke={O} strokeWidth={4} />}
							</g>
						)}
					</At>
				)}
			</>
		),
		over: (t) => <>{t > dan && <Pill text="Даня · одноклубник" t={t - dan} y={BAR + 120} />}</>,
	});
}

// 11. I snatch the phone: the chat with Madrid's captain -------------------------------
{
	const at = S('я', idx('телефон'));
	const chat = T('на', idx('его')) - at;
	const msg = T('у', idx('мадрида', idx('экране'))) - at;
	const door = T('даня', idx('туда')) - at;
	const replace = T('если', idx('слышал')) - at;
	sc.push({
		at,
		grade: 'night',
		cam: (t, dur) => orbit([1.0, 1.2, -1.2], 4.2, 0.4, 0.2 - 0.3 * ease(t / dur), 46),
		world: (t) => (t < door ? <Locker t={t} /> : <Hospital t={t} evening={1} />),
		flat: (t) => (
			<>
				{t < door && (
					<>
						<At x={0.6} z={-1.2} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={1} face="shock" armFront={[-120, 40]} />}</At>
						<At x={1.6} z={-1.4} h={0.9}>{(x, y, s) => <Dan x={x} y={y} s={s} dir={-1} face="shock" />}</At>
						<rect width={VW} height={VH} fill="#05070d" opacity={t > chat ? 0.5 : 0} />
					</>
				)}
				{t > door && (
					<>
						<At x={-1.2} z={-1.6} h={1}>{(x, y, s) => <Doctor x={x} y={y} s={s} dir={1} face="neutral" />}</At>
						<At x={0.4} z={-0.6} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face="sad" />}</At>
						<At x={2.6} z={0.6} h={0.9}>{(x, y, s) => <Dan x={x} y={y} s={s} dir={-1} face="neutral" look={-0.6} />}</At>
						<rect width={VW} height={VH} fill="#1b2a4a" opacity={0.35} style={{mixBlendMode: 'multiply'}} />
					</>
				)}
			</>
		),
		over: (t) => (
			<>
				{t > chat && t < door && (
					<Phone t={t} at={chat} y={820} s={0.95}>
						<text x={0} y={-340} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill="#fff">Капитан «Мадрида»</text>
						<Bubble y={-240} mine text={['У Шнурка больное', 'колено.']} t={t} at={msg - 0.1} />
						<Bubble y={-90} mine text={['Бейте туда.']} t={t} at={msg + 0.9} />
						<Bubble y={40} from="Капитан" text={['понял 😈']} t={t} at={msg + 1.6} />
					</Phone>
				)}
				{t > door && t < replace && <Pill text="за дверью врача…" t={t - door} y={BAR + 120} />}
				{t > replace && (
					<g transform={`translate(540 760) scale(${back((t - replace) / 0.4)})`}>
						<rect x={-300} y={-120} width={600} height={240} rx={26} fill="#15171f" stroke={O} strokeWidth={8} />
						<text y={-40} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={36} fill="#9fb7d6">в финале вместо Шнурка:</text>
						<text y={60} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={90} fill="#f5c542">ДАНЯ</text>
					</g>
				)}
			</>
		),
	});
}

// 12. Danya goes pale: «Don't tell the coach» (front-ish, pleading) -----------------------
{
	const at = S('даня', idx('он', idx('финале')));
	sc.push({
		at,
		grade: 'cold',
		cam: (t, dur) => ({pos: lv([2.6, 1.45, 1.0], [2.3, 1.45, 0.6], ease(t / dur)), look: [1.6, 1.3, -1.4], fov: 42}),
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<>
				<At x={1.6} z={-1.4} h={0.9}>{(x, y, s) => <Dan x={x} y={y} s={s} dir={1} face="sad" armFront={[60 + Math.sin(t * 3) * 6, 70]} />}</At>
				<rect width={VW} height={VH} fill="#ffffff" opacity={0.08} />
			</>
		),
		over: () => null,
		heads: {dan: [1.6, 1.55, -1.4]},
	});
}

// 13. the door opens: coach comes in — 2 minutes to the second half, 1:1 ----------------
{
	const at = S('дверь');
	const coach = T('входит') - at;
	const two = T('до', idx('тренер', idx('входит'))) - at;
	sc.push({
		at,
		grade: 'neutral',
		cam: (t, dur) => orbit([0.4, 1.2, -1.0], 5.6, 0.5, 0.5 - 0.6 * ease(t / dur), 52),
		world: (t) => <Locker t={t} open={clamp01(t / 0.6)} />,
		flat: (t) => (
			<>
				<At x={lerp(-2.6, -1.0, ease((t - coach + 0.4) / 1.2))} z={-0.4} h={1}>{(x, y, s) => <LmCoach x={x} y={y} s={s} dir={1} face="determined" walk={t > coach - 0.4 && t < coach + 0.8 ? 0.8 : 0} />}</At>
				<At x={0.6} z={-1.2} h={0.88}>{(x, y, s) => <ShnBar x={x} y={y} s={s} dir={-1} face="shock" />}</At>
				<At x={1.6} z={-1.4} h={0.9}>{(x, y, s) => <Dan x={x} y={y} s={s} dir={-1} face="sad" />}</At>
			</>
		),
		over: (t) => (
			<>
				<Score t={t} a={1} b={1} />
				{t > two && <Minute t={t} at={two} text={`${Math.max(0, 2 - Math.floor((t - two) * 0.25))}:${String(59 - (Math.floor((t - two) * 7) % 60)).padStart(2, '0')}`} />}
			</>
		),
	});
}

// 14. if I give him away / if I stay silent --------------------------------------------
{
	const at = S('если', idx('один', idx('счёт')));
	const silent = T('если', idx('вдесятером')) - at;
	sc.push({
		at,
		grade: 'night',
		cam: (t, dur) => orbit([0, 3, -4], 22, 5, -0.3 + 0.5 * ease(t / dur), 60),
		world: (t) => <Field t={t} night={1} crowd={1} hype={0.5} lamp={1} />,
		flat: () => <rect width={VW} height={VH} fill="#0b1226" opacity={0.4} />,
		over: (t) => (
			<>
				<Panel t={t} at={0.2} out={silent - 0.2}>
					<rect x={110} y={450} width={860} height={560} rx={24} fill={BLUE} stroke={O} strokeWidth={6} />
					<text x={540} y={530} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">сдать — Даню выгонят</text>
					<Dan x={360} y={960} s={0.5} dir={-1} face="sad" walk={1} />
					<text x={720} y={820} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill="#f5c542" stroke={O} strokeWidth={8} paintOrder="stroke">10</text>
					<text x={720} y={890} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={38} fill="#fff">игроков</text>
				</Panel>
				<Panel t={t} at={silent} tint="#dfe4ec">
					<rect x={110} y={450} width={860} height={560} rx={24} fill={KIT} stroke={O} strokeWidth={6} />
					<text x={540} y={530} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">промолчать</text>
					<ShnBar x={420} y={960} s={0.5} dir={1} face="sad" />
					<Dan x={660} y={960} s={0.5} dir={-1} face="smile" />
					<text x={540} y={640} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={36} fill="#fff">рядом — предатель</text>
				</Panel>
			</>
		),
		blur: () => 4,
	});
}

// 15. the choice: 1 or 2 ---------------------------------------------------------------
{
	const at = S('что', idx('предал'));
	const two = T('два', idx('сдать')) - at;
	sc.push({
		at,
		grade: 'night',
		cam: (t, dur) => orbit([0.4, 1.2, -1.0], 5, 0.4, -0.3 + 0.6 * ease(t / dur), 50),
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<g>
				<rect width={VW} height={VH} fill="#0b1226" opacity={0.55} />
				<g transform={`translate(${-560 * (1 - back(t / 0.4))} 0)`}>
					<rect x={30} y={420} width={500} height={760} rx={36} fill={BLUE} stroke={O} strokeWidth={8} />
					<circle cx={280} cy={540} r={80} fill="#f2c230" stroke={O} strokeWidth={8} />
					<text x={280} y={575} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={100} fill={O}>1</text>
					<text x={280} y={690} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={46} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">сдать Даню</text>
					<Dan x={280} y={1110} s={0.42} dir={1} face="shock" />
				</g>
				{t > two - 0.2 && (
					<g transform={`translate(${560 * (1 - back((t - two + 0.2) / 0.4))} 0)`}>
						<rect x={550} y={420} width={500} height={760} rx={36} fill={KIT} stroke={O} strokeWidth={8} />
						<circle cx={800} cy={540} r={80} fill="#f2c230" stroke={O} strokeWidth={8} />
						<text x={800} y={575} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={100} fill={O}>2</text>
						<text x={800} y={690} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={46} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">промолчать</text>
						<ShnBar x={800} y={1110} s={0.42} dir={-1} face="think" />
					</g>
				)}
			</g>
		),
		over: (t) => (
			<g transform={`translate(540 ${BAR + 140}) scale(${back(t / 0.35)})`}>
				<rect x={-380} y={-75} width={760} height={130} rx={36} fill="#fbf3e2" stroke={O} strokeWidth={8} />
				<text textAnchor="middle" y={22} fontFamily="Inter" fontWeight={900} fontSize={60} fill={KIT}>Что бы сделал ты?</text>
			</g>
		),
	});
}
const SCENES = sc;

// ---------------------------------------------------------------- layers (cinema look)
const FADE = 0.3;
const Layer: React.FC<{i: number; lead: number; dur: number}> = ({i, lead, dur}) => {
	const sd = SCENES[i];
	const t0 = useCurrentFrame() / FPS - lead;
	const t = sd.freezeAt !== undefined ? Math.min(t0, sd.freezeAt) : t0;
	const frozen = sd.freezeAt !== undefined && t0 > sd.freezeAt;
	const abs = t0 + sd.at;
	const a = i === 0 ? 1 : clamp01((t0 + lead) / FADE);
	let c = sd.cam(t, dur);
	const sp = speakFocus(abs);
	const head = sp && sd.heads?.[sp.who];
	if (sp && head) {
		const dir = new THREE.Vector3(...c.pos).sub(new THREE.Vector3(...head)).normalize();
		const close: V3 = [head[0] + dir.x * 2.6, head[1] + dir.y * 2.6 + 0.1, head[2] + dir.z * 2.6];
		c = {pos: lv(c.pos, close, sp.f * 0.7), look: lv(c.look, head, sp.f), fov: c.fov};
	}
	const enter = i === 0 ? 0 : 1 - Easing.out(Easing.cubic)(clamp01((t0 + lead) / 0.6));
	c = {...c, fov: c.fov * (1 - 0.18 * enter)};
	if (frozen) c = {...c, fov: c.fov * (1 - 0.08 * clamp01((t0 - (sd.freezeAt ?? 0)) / 1.2))};
	// handheld shake in the tunnel + hook
	const shake = sd.grade === 'gold' ? 0.012 : 0.004;
	c = {...c, look: [c.look[0] + Math.sin(t0 * 2.1) * shake * 3, c.look[1] + Math.sin(t0 * 2.9 + 1) * shake * 2, c.look[2]]};
	const cam = makeCam(c);
	const g = GRADE[sd.grade ?? 'neutral'];
	const blur = sd.blur?.(t) ?? 0;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsCtx.Provider value={abs}>
				<CamCtx.Provider value={cam}>
					<AbsoluteFill style={{opacity: a, filter: frozen ? 'saturate(0.3) contrast(1.15)' : g.css}}>
						<AbsoluteFill style={{filter: blur > 0 ? `blur(${blur}px)` : undefined}}>
							<ThreeCanvas width={VW} height={VH} shadows gl={{antialias: true}} camera={{fov: c.fov, near: 0.1, far: 300, position: c.pos}}>
								<CamRig c={c} />
								{sd.world(t)}
							</ThreeCanvas>
						</AbsoluteFill>
						<svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{position: 'absolute', inset: 0}}>
							{sd.flat(t, abs)}
							<rect width={VW} height={VH} fill={g.tint} opacity={g.a} style={{mixBlendMode: 'soft-light'}} />
							{sd.over?.(t, abs)}
							<defs>
								<radialGradient id="vig14" cx="50%" cy="50%" r="72%">
									<stop offset="58%" stopColor="#000" stopOpacity={0} />
									<stop offset="100%" stopColor="#000" stopOpacity={frozen ? 0.65 : 0.45} />
								</radialGradient>
								<radialGradient id="flare14" cx="50%" cy="50%" r="50%">
									<stop offset="0%" stopColor="#fff6d8" stopOpacity={0.55} />
									<stop offset="100%" stopColor="#fff6d8" stopOpacity={0} />
								</radialGradient>
							</defs>
							{sd.grade === 'gold' && <ellipse cx={540 + Math.sin(t0 * 0.5) * 120} cy={560} rx={520} ry={300} fill="url(#flare14)" style={{mixBlendMode: 'screen'}} />}
							<rect width={VW} height={VH} fill="url(#vig14)" />
							<filter id="grain14">
								<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={Math.floor(t0 * 12) % 24} />
								<feColorMatrix type="saturate" values="0" />
							</filter>
							<rect width={VW} height={VH} filter="url(#grain14)" opacity={0.08} />
						</svg>
					</AbsoluteFill>
				</CamCtx.Provider>
			</AbsCtx.Provider>
		</ShotCtx.Provider>
	);
};

export const Ovoshch8: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.05 <= t) ci = i;
	});
	const lastEnd = WORDS[WORDS.length - 1].end;
	const endFade = interpolate(t, [OVOSHCH8_DURATION - 0.3, OVOSHCH8_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((sd, i) => {
				const from = sd.at;
				const to = i < SCENES.length - 1 ? SCENES[i + 1].at : OVOSHCH8_DURATION;
				const start = Math.max(0, Math.round(from * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round((to + (i < SCENES.length - 1 ? FADE : 0)) * FPS) - start)}>
						<Layer i={i} lead={from - start / FPS} dur={to - from} />
					</Sequence>
				);
			})}
			{ci >= 0 && t < lastEnd + 0.6 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} keepSpoken />}
			<div style={{position: 'absolute', left: 0, top: 0, width: VW, height: BAR, background: '#000'}} />
			<div style={{position: 'absolute', left: 0, bottom: 0, width: VW, height: BAR, background: '#000'}} />
			<div style={{position: 'absolute', left: 40, top: 52, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85}}>Вселенная Шнурка</div>
			<div style={{position: 'absolute', right: 40, top: 56, fontFamily: 'Inter', fontWeight: 700, fontSize: 28, color: '#f5c542', opacity: 0.9}}>Овощ · 8 · Предатель</div>
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
