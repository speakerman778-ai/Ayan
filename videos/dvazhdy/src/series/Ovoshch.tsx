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
import rawWords from '../../public/shnurok/ep06-words.json';
import envRaw from '../../public/shnurok/ep06-env.json';

// «Овощ» — 3D world + flat 2D heroes.

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
export const OVOSHCH_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 1.2);
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
type Who = 'kir' | 'coach' | 'team';
const QUOTE_WHO: (Who | null)[] = ['kir', null, null, 'kir', null, 'coach', 'team'];
const SPEAK: {who: Who; start: number; end: number}[] = (() => {
	const out: {who: Who; start: number; end: number}[] = [];
	let q = -1;
	let st = 0;
	WORDS.forEach((w) => {
		if (w.text.includes('«')) {
			q++;
			st = w.start;
		}
		if (w.text.includes('»')) {
			const who = QUOTE_WHO[q];
			if (who) out.push({who, start: st, end: w.end});
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

const Field: React.FC<{t: number; night: number; crowd: number; hype?: number; lamp?: number}> = ({t, night, crowd, hype = 0, lamp = 0}) => {
	const day = 1 - night;
	const sky = new THREE.Color('#9fd0f2').lerp(new THREE.Color('#141d38'), night);
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

const sc: Scene[] = [];

// 1. training: miss, fall, carrot, Kirюха mocks -----------------------------------------
{
	const at = 0;
	const miss = T('убегает') - at;
	const aut = T('аут') - at;
	const kir = T('кирюха') - at;
	const ovo = T('овощ', idx('кирюха')) - at;
	const ovoT = T('овощем') - at;
	sc.push({
		at,
		cam: (t) => {
			if (t > kir - 0.2) {
				const k = ease((t - kir) / 4);
				return {pos: lv([13.6, 1.45, 6.4], [14.0, 1.4, 5.4], k), look: [14.8, 1.15, 0.6], fov: 50};
			}
			const k = ease(t / 7);
			return {pos: lv([8.2, 1.7, 10.8], [9.6, 1.5, 9.4], k), look: lv([13.4, 0.9, 2.2], [13.9, 0.95, 2.3], k), fov: 50};
		},
		world: (t) => {
			const kt = t - miss;
			const ball: V3 = kt < 0 ? [12.4 + Math.sin(t * 3) * 0.05, 0.13, 3.3] : [12.4 + kt * 3.2, 0.13 + Math.abs(Math.sin(kt * 6)) * 0.3 * Math.exp(-kt), 3.3 + kt * 1.6];
			return (
				<>
					<Field t={t} night={0} crowd={0} />
					<Ball p={ball} spin={t * 6} />
				</>
			);
		},
		flat: (t) => {
			const fall = ease((t - miss - 0.15) / 0.35) * (1 - ease((t - aut - 0.6) / 0.5));
			const laugh = t > kir + 0.3;
			return (
				<>
					<At x={15.6} z={1.2} h={0.9}>{(x, y, s) => <Mate k={0} x={x} y={y} s={s} dir={-1} face={laugh ? 'joy' : 'neutral'} />}</At>
					<At x={16.8} z={2.6} h={0.88}>{(x, y, s) => <Mate k={1} x={x} y={y} s={s} dir={-1} face={laugh ? 'joy' : 'smile'} />}</At>
					<At x={14.6} z={0.4} h={0.92}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={-1} face={t > kir ? 'smile' : 'neutral'} armFront={t > kir ? [100, -60] : undefined} />}</At>
					<At x={12.2} z={3.4} h={0.88} lie={fall}>
						{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={1} face={t > miss ? 'shock' : 'neutral'} walk={t < miss ? 0.6 : 0} />}
					</At>
					{t > ovoT && fall < 0.05 && (
						<At x={12.2} z={3.4} h={0.88} shadow={false}>
							{(x, y, s) => <Carrot x={x + 150 * s} y={y - 760 * s + Math.sin(t * 3) * 6} s={s * 1.4 * back((t - (t > aut ? aut + 1.1 : ovoT)) / 0.4)} />}
						</At>
					)}
				</>
			);
		},
		over: (t) => (
			<>
				<NameTag name="Кирюха" role="капитан «Метеора»" from={kir} x={60} y={150} avatar={<SideChar x={0} y={190} s={0.38} frontHair="quiff" hairColor="#e0b04a" jacket={KIT} pants="#f4f1ea" />} />
				<Pill text="«Метеор» · тренировка" t={t - 0.3} y={360} />
			</>
		),
	});
}

// 2. locker room: carrot instead of boots ------------------------------------------------
{
	const at = S('в', idx('раздевалке') - 1);
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 4);
			return {pos: lv([-0.2, 1.5, 4.8], [0.4, 1.4, 3.8], k), look: lv([0.0, 1.05, -2.2], [0.3, 1.05, -2.4], k), fov: 58};
		},
		world: (t) => <Locker t={t} open={ease((t - 0.8) / 0.6)} carrot />,
		flat: (t) => (
			<>
				<At x={-1.1} z={-0.5} h={0.88}>{(x, y, s) => <Mate k={2} x={x} y={y} s={s} dir={1} face="joy" />}</At>
				<At x={-1.9} z={0.2} h={0.9}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={1} face="joy" armFront={[110, -40]} />}</At>
				<At x={1.15} z={-0.9} h={0.88}>{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={-1} face={t > 1.4 ? 'sad' : 'neutral'} />}</At>
				<At x={-0.4} z={0.9} h={0.86}>{(x, y, s) => <Mate k={3} x={x} y={y} s={s} dir={1} face="joy" />}</At>
			</>
		),
		over: (t) => <Pill text="вместо бутс — морковка" t={t - 1.2} y={300} />,
	});
}

// 3. bus: nobody sits next to him ---------------------------------------------------------
{
	const at = S('в', idx('автобусе') - 1);
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 3.5);
			return {pos: lv([0.3, 1.6, -9.6], [0.4, 1.5, -8.6], k), look: [0.6, 0.85, 0.1], fov: 56};
		},
		world: (t) => <Bus t={t} />,
		flat: () => (
			<>
				{[
					[-1.05, -5.6, 0],
					[-0.65, -5.6, 1],
					[-1.05, -3.7, 2],
					[-0.65, -3.7, 3],
					[0.65, -5.6, 4],
					[1.05, -5.6, 5],
				].map(([x, z, k]) => (
					<g key={k}>
						<At x={x} z={z} h={0.82} lift={-0.42} shadow={false}>{(sx, sy, s) => <Mate k={k} x={sx} y={sy} s={s} dir={x < 0 ? 1 : -1} face="joy" />}</At>
						<Quad pts={[[x - 0.25, 0.0, z - 0.75], [x + 0.25, 0.0, z - 0.75], [x + 0.25, 0.36, z - 0.75], [x - 0.25, 0.36, z - 0.75]]} fill="#3d6fb5" sw={3} />
					</g>
				))}
				<At x={1.05} z={0.1} h={0.82} lift={-0.42} shadow={false}>{(sx, sy, s) => <ShnKit x={sx} y={sy} s={s} dir={-1} face="sad" />}</At>
			</>
		),
		over: (t) => <Pill text="место рядом — пустое" t={t - 0.8} y={300} />,
	});
}

// 4. the bench: coach never lets him play -----------------------------------------------
{
	const at = S('а', idx('тренер') - 1);
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 4);
			return {pos: lv([-3.3, 2.0, 21.5], [-3.3, 1.9, 20.5], k), look: [-3.3, 0.9, 12.5], fov: 44};
		},
		world: (t) => (
			<>
				<Field t={t} night={0} crowd={0} />
				<Ball p={[-6 + Math.sin(t) * 2, 0.13, 6]} spin={t * 4} />
			</>
		),
		flat: (t) => (
			<>
				<At x={-6} z={6} h={0.88}>{(x, y, s) => <Mate k={4} x={x} y={y} s={s} dir={1} walk={1} />}</At>
				<At x={-1} z={7} h={0.88}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={-1} walk={1} />}</At>
				<At x={-2.2} z={14.1} h={0.88} lift={-0.25} shadow={false}>{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={1} face="sad" />}</At>
				{Dugout(-3.4, -0.9)}
				<At x={-4.6} z={13.0} h={1}>
					{(x, y, s) => (
						<g>
							<Coach x={x} y={y} s={s} dir={1} face="neutral" />
							<Whistle x={x} y={y} s={s} />
						</g>
					)}
				</At>
			</>
		),
		over: (t) => (
			<>
				<NameTag name="Палыч" role="тренер" from={0.3} x={60} y={150} avatar={<SideChar x={0} y={190} s={0.38} frontHair="boss" hairColor="#9a9a9a" mustache jacket="#2f4f86" pants="#2f4f86" />} />
				<Big text="0 минут" t={t} at={T('минуту') - at - 0.1} y={700} size={150} color="#f5c542" />
			</>
		),
	});
}

// 5. a week to the final; Kirюха: «only not the Vegetable» -------------------------------
{
	const at = S('а', idx('через') - 1);
	const kir = T('кирюха', idx('через')) - at;
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 3);
			return {pos: lv([2.6, 1.6, 1.0], [1.2, 1.45, 2.8], k), look: lv([2.9, 1.9, -3], [1.0, 1.2, -2], k), fov: 50};
		},
		world: (t) => <Locker t={t} />,
		flat: (t) => (
			<>
				<At x={-0.2} z={-0.2} h={0.9}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={1} face={t > kir ? 'smile' : 'neutral'} armFront={t > kir ? [100, -50] : undefined} />}</At>
				<At x={-1.2} z={0.4} h={0.88}>{(x, y, s) => <Mate k={1} x={x} y={y} s={s} dir={1} face={t > kir + 2 ? 'joy' : 'neutral'} />}</At>
				<At x={-2.2} z={-0.6} h={0.88}>{(x, y, s) => <Mate k={5} x={x} y={y} s={s} dir={1} face={t > kir + 2 ? 'joy' : 'neutral'} />}</At>
				<At x={2.2} z={0.8} h={0.88}>{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={-1} face="neutral" />}</At>
				{/* the poster text */}
				<Pin p={[2.9, 2.0, -2.94]}>
					{(x, y, ppm) => (
						<g transform={`translate(${x} ${y}) scale(${ppm / 300})`}>
							<text textAnchor="middle" y={-60} fontFamily="Inter" fontWeight={900} fontSize={110} fill={O}>ФИНАЛ</text>
							<text textAnchor="middle" y={40} fontFamily="Inter" fontWeight={800} fontSize={60} fill={KIT}>Метеор — Гроза</text>
							<text textAnchor="middle" y={110} fontFamily="Inter" fontWeight={700} fontSize={50} fill={O}>суббота</text>
						</g>
					)}
				</Pin>
			</>
		),
		over: (t) => <Pill text="до финала 7 дней" t={t - 0.3} y={300} />,
		heads: {kir: [-0.2, 1.45, -0.2]},
	});
}

// 6. night: alone under one lamp ----------------------------------------------------------
{
	const at = S('только', idx('проиграем'));
	sc.push({
		at,
		cam: (t) => {
			const k = ease(t / 7.5);
			return {pos: lv([6, 4.5, 12], [11.5, 1.7, 8.5], k), look: lv([13, 1.5, -1], [14.5, 1.1, 2.5], k), fov: 52};
		},
		world: (t) => (
			<>
				<Field t={t} night={1} crowd={0} lamp={1} />
				<Ball p={[14.2 + Math.sin(t * 2) * 0.3, 0.13 + Math.abs(Math.sin(t * 4)) * 0.5, 2.8]} spin={t * 5} />
			</>
		),
		flat: (t) => (
			<At x={14.6} z={2.6} h={0.88}>
				{(x, y, s) => (
					<g>
						<ShnHood x={x} y={y} s={s} dir={1} face="determined" />
						{[0, 1].map((i) => {
							const k = ((t + i * 1.1) % 2.2) / 2.2;
							return <circle key={i} cx={x + 110 * s + k * 90 * s} cy={y - 560 * s - k * 40 * s} r={(16 + k * 30) * s * 2} fill="#eef4ff" opacity={0.5 * (1 - k)} />;
						})}
					</g>
				)}
			</At>
		),
		over: (t) => <Pill text="23:40" t={t - 0.4} y={300} />,
	});
}

// 7. montage: 100 / 500 / 1000, fall-get up, crossbar, seven nights, dawn ---------------
{
	const at = S('сто', idx('фонарём'));
	const t500 = T('пятьсот') - at;
	const t1000 = T('тысяча') - at;
	const fall = T('падаю') - at;
	const up = T('встаю') - at;
	const bar = T('перекладину') - at;
	const seven = T('семь') - at;
	const dawn = T('светать') - at;
	sc.push({
		at,
		cam: (t) => {
			const part = t < fall ? 0 : t < bar ? 1 : t < seven ? 2 : 3;
			const shots: Cam[] = [
				{pos: [10.8, 1.4, 7.0], look: [15.6, 1.0, 1.8], fov: 52},
				{pos: [10.2, 1.6, 8.8], look: [13.8, 0.5, 2.6], fov: 48},
				{pos: [16.2, 1.6, 3.6], look: [21, 2.0, 0], fov: 48},
				{pos: [6, 6, 13], look: [15, 1.0, 0], fov: 52},
			];
			const c = shots[part];
			const st = [0, fall, bar, seven][part];
			const k = ease((t - st) / 3);
			return {pos: [c.pos[0] + k * 0.6, c.pos[1], c.pos[2] - k * 0.8], look: c.look, fov: c.fov};
		},
		world: (t) => {
			const night = 1 - 0.75 * ease((t - dawn + 0.4) / 2);
			// a shot every 0.7 s towards the goal; on «перекладину» it hits the bar
			const kt = t < bar ? (t % 0.8) / 0.8 : clamp01((t - bar) / 0.6);
			const tgt: V3 = t >= bar && t < seven ? [21, 2.2, 0.3] : [21, 0.9 + hash(Math.floor(t / 0.8)) * 1, -2 + hash(Math.floor(t / 0.8) + 3) * 4];
			const ball: V3 = lv([14.4, 0.13, 2.4], tgt, kt);
			ball[1] += Math.sin(kt * Math.PI) * 0.8;
			return (
				<>
					<Field t={t} night={night} crowd={0} lamp={night} />
					<Ball p={t > fall && t < bar ? [13.6, 0.13, 3.2] : ball} spin={t * 9} />
				</>
			);
		},
		flat: (t) => {
			const lie = ease((t - fall) / 0.25) * (1 - ease((t - up) / 0.3));
			const kick = (t % 0.8) / 0.8 < 0.25 ? 1 : 0;
			return (
				<At x={14.0} z={2.5} h={0.88} lie={lie}>
					{(x, y, s) => <ShnHood x={x} y={y} s={s} dir={1} face={t > up ? 'determined' : 'neutral'} walk={kick ? 0.8 : 0.15} />}
				</At>
			);
		},
		over: (t) => (
			<>
				<Big text="100" t={t} at={0} out={t500 - 0.05} y={560} size={200} />
				<Big text="500" t={t} at={t500} out={t1000 - 0.05} y={560} size={220} />
				<Big text="1000" t={t} at={t1000} out={fall - 0.05} y={560} size={240} color="#f5c542" />
				{t > seven && t < dawn + 1.2 && (
					<g transform={`translate(540 520) scale(${back((t - seven) / 0.3)})`}>
						<rect x={-130} y={-150} width={260} height={290} rx={22} fill="#fbf3e2" stroke={O} strokeWidth={8} />
						<rect x={-130} y={-150} width={260} height={70} rx={22} fill={KIT} stroke={O} strokeWidth={8} />
						<text textAnchor="middle" y={-100} fontFamily="Inter" fontWeight={800} fontSize={40} fill="#fff">ночь</text>
						<text textAnchor="middle" y={90} fontFamily="Inter" fontWeight={900} fontSize={170} fill={O}>
							{Math.max(1, 7 - Math.floor(((t - seven) / Math.max(0.6, dawn - seven)) * 7))}
						</text>
					</g>
				)}
			</>
		),
	});
}

// 8. final: full stadium, 0:0, post + crossbar -------------------------------------------
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
{
	const at = S('суббота');
	const bench = T('я', idx('трибуны')) - at;
	const half = T('первый') - at;
	const post = T('штангу') - at;
	const bar = T('перекладину', idx('гроза')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < bench - 0.2) {
				const k = ease(t / 3);
				return {pos: lv([0, 3, 26], [0, 6, 20], k), look: [0, 6, -14], fov: 60};
			}
			if (t < half - 0.2) {
				const k = ease((t - bench) / 3);
				return {pos: lv([-3.4, 2.0, 21.2], [-3.0, 1.9, 20.4], k), look: [-2.8, 0.9, 12.5], fov: 44};
			}
			const k = ease((t - half) / 6);
			return {pos: lv([6, 5, 18], [12, 3.2, 12], k), look: lv([4, 1, 0], [17, 1.4, 0], k), fov: 56};
		},
		world: (t) => {
			const kp = clamp01((t - post + 0.6) / 0.6);
			const kb = clamp01((t - bar + 0.6) / 0.6);
			let ball: V3 = [Math.sin(t * 0.8) * 8, 0.13, Math.cos(t * 0.6) * 4];
			if (t > post - 0.6 && t < bar - 0.6) ball = kp < 1 ? lv([12, 0.3, 1], [21, 1.0, 2.95], kp) : lv([21, 1.0, 2.95], [16, 0.13, 7], clamp01((t - post) / 0.8));
			if (t > bar - 0.6) ball = kb < 1 ? lv([14, 0.3, -2], [21, 2.2, -0.5], kb) : lv([21, 2.2, -0.5], [15, 0.13, -5], clamp01((t - bar) / 0.8));
			return (
				<>
					<Field t={t} night={0} crowd={1} hype={0.6} />
					<Ball p={ball} spin={t * 8} />
				</>
			);
		},
		flat: (t) => (
			<>
				{[[-6, 3, 0], [-2, -4, 1], [4, 2, 2], [10, -1, 3], [14, 3, 4]].map(([x, z, k]) => (
					<At key={k} x={x + Math.sin(t + k) * 1.2} z={z} h={0.9}>{(sx, sy, s) => <Mate k={k} x={sx} y={sy} s={s} dir={k % 2 ? -1 : 1} walk={1} />}</At>
				))}
				{[[-10, -2, 1], [6, -3, 2], [17, 1, 3], [12, 4, 4]].map(([x, z, k]) => (
					<At key={`g${k}`} x={x + Math.cos(t + k) * 1.2} z={z} h={0.9}>{(sx, sy, s) => <Mate k={k + 2} kit={KIT2} x={sx} y={sy} s={s} dir={k % 2 ? 1 : -1} walk={1} />}</At>
				))}
				<At x={13} z={1.2} h={0.92}>{(sx, sy, s) => <Kir x={sx} y={sy} s={s} dir={1} walk={1} />}</At>
				<At x={-2.2} z={14.1} h={0.88} lift={-0.25} shadow={false}>{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={1} face="neutral" />}</At>
				{Dugout(-3.4, -0.9)}
				<At x={-4.6} z={13.0}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={1} face="neutral" /><Whistle x={x} y={y} s={s} /></g>}</At>
				<Board text="0 : 0" sub={t < half ? 'финал' : t < T('второй') - at ? '1-й тайм' : '2-й тайм'} />
			</>
		),
		over: (t) => (
			<>
				<Pill text="Метеор — Гроза · финал" t={t - 0.3} y={300} />
				{t > post && t < post + 1.6 && <Big text="ШТАНГА!" t={t} at={post} y={720} size={150} color="#f5c542" />}
				{t > bar && t < bar + 1.6 && <Big text="ПЕРЕКЛАДИНА!" t={t} at={bar} y={720} size={120} color="#f5c542" />}
			</>
		),
	});
}

// 9. 89th minute: Kirюха down, «Овощ. Выходи», «Только не он!» ------------------------
{
	const at = S('восемьдесят');
	const down = T('падает') - at;
	const off = T('уводят') - at;
	const look = T('тренер', idx('восемьдесят')) - at;
	const only = T('остался') - at;
	const vyhodi = T('говорит') - at;
	const team = T('команда', idx('выходи')) - at;
	sc.push({
		at,
		cam: (t) => {
			if (t < look - 0.2) {
				const k = ease(t / 5);
				return {pos: lv([8, 2.4, 10], [10.5, 1.6, 8], k), look: [14, 0.8, 2], fov: 50};
			}
			if (t < team - 0.3) {
				const k = ease((t - look) / 5);
				return {pos: lv([-2.6, 2.0, 21.0], [-3.0, 1.9, 20.2], k), look: [-3.2, 0.95, 13.2], fov: 44};
			}
			const k = ease((t - team) / 2.5);
			return {pos: lv([4, 1.6, 9], [5, 1.5, 8], k), look: [1, 1.1, 3], fov: 52};
		},
		world: (t) => (
			<>
				<Field t={t} night={0} crowd={1} hype={0.25} />
				<Ball p={[13.5, 0.13, 2.5]} />
			</>
		),
		flat: (t) => {
			const lie = ease((t - down) / 0.3);
			const away = ease((t - off) / 3);
			return (
				<>
					{t < team - 0.3 && (
						<>
							<At x={14 - away * 4} z={2 + away * 8} h={0.92} lie={lie * (1 - away)}>{(x, y, s) => <Kir x={x} y={y} s={s} dir={-1} face={t > down ? 'wince' : 'neutral'} walk={away > 0 && away < 1 ? 0.5 : 0} />}</At>
							<At x={12.5} z={3.2} h={0.9}>{(x, y, s) => <Mate k={1} x={x} y={y} s={s} dir={1} face="shock" />}</At>
							<At x={15.5} z={0.5} h={0.9}>{(x, y, s) => <Mate k={3} kit={KIT2} x={x} y={y} s={s} dir={-1} face="neutral" />}</At>
							<At x={-2.2} z={14.1} h={0.88} lift={-0.25} shadow={false}>{(x, y, s) => <ShnKit x={x} y={y} s={s} dir={1} face={t > vyhodi + 1 ? 'shock' : 'neutral'} />}</At>
							{Dugout(-3.4, -0.9)}
							<At x={-4.4} z={13.2}>{(x, y, s) => <g><Coach x={x} y={y} s={s} dir={1} face="neutral" armFront={t > vyhodi ? [100, -30] : undefined} /><Whistle x={x} y={y} s={s} /></g>}</At>
						</>
					)}
					{t >= team - 0.3 &&
						[[0, 2, 0], [1.4, 3.2, 2], [-1.2, 3.6, 4], [2.6, 1.2, 5], [-0.2, 4.4, 1]].map(([x, z, k]) => (
							<At key={k} x={x} z={z} h={0.9}>{(sx, sy, s) => <Mate k={k} x={sx} y={sy} s={s} dir={-1} face="shock" armFront={[150, -20]} />}</At>
						))}
					<Board text="0 : 0" sub="89:00" />
				</>
			);
		},
		over: (t) => (
			<>
				<Big text="89′" t={t} at={0.1} out={down} y={620} size={260} color="#f5c542" />
				{t > only && t < vyhodi && <Pill text="на скамейке — только он" t={t - only} y={300} />}
			</>
		),
		heads: {coach: [-4.4, 1.6, 13.2], team: [0.5, 1.4, 2.8]},
	});
}

// 10. runs out — the ball — wind-up — freeze on «и-и-и…» ---------------------------------
{
	const at = S('я', idx('кричит'));
	const laugh = T('смеются') - at;
	const ball = T('мяч', idx('атака')) - at;
	const swing = T('замахиваюсь') - at;
	const freeze = T('и-и-и') - at - 0.05;
	sc.push({
		at,
		freezeAt: freeze,
		cam: (t) => {
			const rk = ease((t - 0.6) / Math.max(1, ball - 0.4));
			const px = lerp(-2, 13.4, rk);
			const pz = lerp(13.5, 2.4, rk);
			if (t < ball - 0.3) return {pos: [px - 5, 1.8, pz + 6.5], look: [px + 1, 0.9, pz - 1], fov: 52};
			const k = ease((t - ball) / Math.max(1, freeze - ball));
			return {pos: lv([19.6, 1.2, 8.6], [18.3, 1.0, 7.1], k), look: [13.4, 0.85, 2.5], fov: lerp(44, 36, k)};
		},
		world: (t) => {
			const kb = clamp01((t - ball) / Math.max(0.5, swing + 0.6 - ball));
			const bp: V3 = lv([6, 4, -4], [13.9, 0.2, 2.8], kb);
			bp[1] += Math.sin(kb * Math.PI) * 2.5;
			return (
				<>
					<Field t={t} night={0} crowd={1} hype={t > laugh ? 1 : 0.4} />
					<Ball p={bp} spin={t * 7} />
				</>
			);
		},
		flat: (t) => {
			const run = ease(t / 3);
			const sw = ease((t - swing) / 0.6);
			return (
				<>
					<At x={10.5} z={0.6} h={0.9}>{(x, y, s) => <Mate k={2} kit={KIT2} x={x} y={y} s={s} dir={-1} face="shock" />}</At>
					<At x={9.6} z={4.2} h={0.9}>{(x, y, s) => <Mate k={4} kit={KIT2} x={x} y={y} s={s} dir={-1} face="shock" />}</At>
					<At x={lerp(-2, 13.4, ease((t - 0.6) / Math.max(1, ball - 0.4)))} z={lerp(13.5, 2.4, ease((t - 0.6) / Math.max(1, ball - 0.4)))} h={0.88}>
						{(x, y, s) => (
							<g transform={`rotate(${-10 * sw} ${x} ${y})`}>
								<ShnKit x={x} y={y} s={s} dir={1} face={t > ball ? 'determined' : 'neutral'} walk={t < ball + 1 ? run : 0.3 * (1 - sw)} />
							</g>
						)}
					</At>
				</>
			);
		},
		over: (t) => (
			<>
				{t > laugh && t < ball && <Pill text="ха-ха, Овощ!" t={t - laugh} y={300} />}
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
								<radialGradient id="vig6" cx="50%" cy="50%" r="72%">
									<stop offset="62%" stopColor="#000" stopOpacity={0} />
									<stop offset="100%" stopColor="#000" stopOpacity={frozen ? 0.6 : 0.28} />
								</radialGradient>
							</defs>
							<rect width={VW} height={VH} fill="url(#vig6)" />
						</svg>
					</AbsoluteFill>
				</CamCtx.Provider>
			</AbsCtx.Provider>
		</ShotCtx.Provider>
	);
};

export const Ovoshch: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	const endFade = interpolate(t, [OVOSHCH_DURATION - 0.25, OVOSHCH_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((sd, i) => {
				const from = sd.at;
				const to = i < SCENES.length - 1 ? SCENES[i + 1].at : OVOSHCH_DURATION;
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
