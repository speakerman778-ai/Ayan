import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, getInputProps, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ShotCtx, hash} from '../lib';
import {C, Char, CharProps, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from '../series/Shnurok';
import {Car, Clock, P, B as Box3} from './Train3D';
import {CarBody, Compartment, Flakes3D, Forest, Ground, H, Loco, Moon, Rails, Rig, Shot, Sky, W, lerpShot, makeCam, onFloor} from './World';
import rawWords from '../../public/zombie/ep01-words.json';

// Сериал «Зомби» · серия 1 «Поезд». Мир — 3D (пластилин), герои — 2D.

const FPS = 30;
// Draft mode (`--props='{"draft":true}'`): no shadows, no antialias — much faster renders for checking timing.
const DRAFT = Boolean((getInputProps() as {draft?: boolean}).draft);
const O = OL;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));

// ------------------------------------------------------------------ timings from the voiceover
const WORDS: Word[] = rawWords as Word[];
export const ZOMBIE01_DURATION = Math.ceil(WORDS[WORDS.length - 1].end + 2);
const norm = (s: string) => s.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
const T = (w: string, nth = 1) => {
	let k = 0;
	for (const x of WORDS) if (norm(x.text) === w && ++k === nth) return x.start;
	return 0;
};
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:…]»?$/.test(prev.text);
		if (cur.length && (cur.length >= 5 || end || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();
const st = (w: string, nth = 1) => Math.max(0, T(w, nth) - 0.25);
const B = [0, st('три'), st('по'), st('первая'), st('он'), st('и', 2), st('шнурок', 2), st('к'), st('один')];

// ------------------------------------------------------------------ 2D helpers
const PPM_CHAR = 400; // Char at s=1 ≈ 700 px ≈ 1.75 m

const Snow2D: React.FC<{t: number; n?: number; wind?: number; op?: number}> = ({t, n = 80, wind = 1, op = 0.9}) => (
	<>
		{Array.from({length: n}).map((_, i) => {
			const sp = 0.22 + hash(i + 3) * 0.3;
			const k = (t * sp + hash(i)) % 1;
			const x = ((hash(i + 7) * 1400 + k * 500 * wind + Math.sin(t * 2 + i) * 20) % 1400) - 160;
			return <circle key={i} cx={x} cy={k * 2000 - 40} r={2 + hash(i + 11) * 4} fill="#fff" opacity={op * 0.6 * (0.5 + hash(i + 5) * 0.5)} />;
		})}
	</>
);

const Pill: React.FC<{text: string; t: number; y?: number; x?: number; color?: string}> = ({text, t, y = 260, x = 540, color = '#f5c542'}) => {
	if (t < 0) return null;
	const k = back(t / 0.35);
	const w = text.length * 32 + 90;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<rect x={-w / 2} y={-48} width={w} height={96} rx={48} fill={color} stroke={O} strokeWidth={6} />
			<text textAnchor="middle" y={19} fontFamily="Inter" fontWeight={900} fontSize={54} fill={O}>
				{text}
			</text>
		</g>
	);
};

const Big: React.FC<{text: string; t: number; y?: number; size?: number; color?: string; hold?: number}> = ({text, t, y = 760, size = 230, color = '#eef4ff', hold = 1.2}) =>
	t < 0 ? null : (
		<g transform={`translate(540 ${y}) scale(${back(t / 0.3)})`} opacity={clamp01(1 + hold - t)}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={O} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);

/** Frost creeping in from the frame edges, k = 0..1. */
const Frost: React.FC<{k: number; id: string}> = ({k, id}) =>
	k <= 0 ? null : (
		<g>
			<defs>
				<radialGradient id={id} cx="50%" cy="50%" r="72%">
					<stop offset={`${Math.round(92 - 40 * k)}%`} stopColor="#e9f3ff" stopOpacity={0} />
					<stop offset="100%" stopColor="#e9f3ff" stopOpacity={0.85} />
				</radialGradient>
			</defs>
			<rect width={W} height={H} fill={`url(#${id})`} />
			{Array.from({length: 26}).map((_, i) => {
				const side = i % 4;
				const u = hash(i + 40);
				const x = side === 0 ? 0 : side === 1 ? W : u * W;
				const y = side === 2 ? 0 : side === 3 ? H : u * H;
				const len = (70 + hash(i + 41) * 120) * k;
				return (
					<g key={i} transform={`translate(${x} ${y}) rotate(${hash(i + 42) * 360})`} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.8 * k}>
						{[0, 60, 120].map((r) => (
							<g key={r} transform={`rotate(${r})`}>
								<line x1={-len} y1={0} x2={len} y2={0} />
								<line x1={len * 0.5} y1={0} x2={len * 0.7} y2={-len * 0.2} />
								<line x1={len * 0.5} y1={0} x2={len * 0.7} y2={len * 0.2} />
							</g>
						))}
					</g>
				);
			})}
		</g>
	);

const Vig: React.FC<{id: string; k?: number}> = ({id, k = 0.55}) => (
	<>
		<defs>
			<radialGradient id={id} cx="50%" cy="46%" r="72%">
				<stop offset="58%" stopColor="#070b18" stopOpacity={0} />
				<stop offset="100%" stopColor="#070b18" stopOpacity={k} />
			</radialGradient>
		</defs>
		<rect width={W} height={H} fill={`url(#${id})`} />
	</>
);

const Breath: React.FC<{x: number; y: number; t: number; s?: number; dir?: 1 | -1}> = ({x, y, t, s = 1, dir = 1}) => {
	const k = (t % 2.4) / 2.4;
	if (k > 0.6) return null;
	const p = k / 0.6;
	return (
		<g transform={`translate(${x + dir * p * 60 * s} ${y - p * 30 * s}) scale(${s})`} opacity={0.75 * (1 - p)}>
			<circle r={10 + p * 22} fill="#eef4ff" />
			<circle cx={dir * 16} cy={-6} r={6 + p * 16} fill="#eef4ff" />
		</g>
	);
};

// lamp flicker: 1 = on, ~0.1 = off
const flick = (t: number, seed = 0) => {
	const k = Math.sin(t * 23.1 + seed) + Math.sin(t * 7.7 + 1 + seed) * 0.8 + Math.sin(t * 41 + seed * 2) * 0.4;
	return k > -0.7 ? 1 : 0.12;
};

// ------------------------------------------------------------------ characters
type ZProps = Partial<CharProps> & {x: number; y: number; s: number; t: number; v?: number; frozen?: number};
const ZOMBIE_LOOKS: Partial<CharProps>[] = [
	{hair: 'wife', hat: 'cap', hatColor: '#24324f', skirt: '#24324f'},
	{hair: 'guy', jacket: '#6b5a7a', pants: '#3d4a66'},
	{hair: 'boss', jacket: '#7a6a4a', pants: '#4a4f5c', glasses: true},
	{hair: 'curly', jacket: '#4f6f5a', pants: '#3d4a66'},
	{hair: 'buzz', jacket: '#8a4a3a', pants: '#2e3440'},
];
/** Zombie: grey-green skin, empty eyes, tilted head, arms reaching. v = 0..1 walking energy. frozen = 0..1 frost. */
const Zombie: React.FC<ZProps & {look?: number; kind?: number}> = ({x, y, s, t, v = 1, frozen = 0, kind = 0, ...rest}) => {
	const look = ZOMBIE_LOOKS[kind % ZOMBIE_LOOKS.length];
	const sway = Math.sin(t * 3.2 + kind) * 5 * v;
	const bob = Math.abs(Math.sin(t * 3.2 + kind)) * 10 * v * s;
	const skin = frozen > 0.5 ? '#b9d0e2' : '#a9c49a';
	const headY = y - 600 * s;
	return (
		<g transform={`rotate(${sway} ${x} ${y})`}>
			<Char x={x} y={y - bob} s={s} face="zombie" headTilt={14 + kind * 3} armL={[70 - 10 * frozen, 30]} armR={[56, 50]} skin={skin} blinkSeed={kind} {...look} {...rest} />
			{frozen > 0 && (
				<g opacity={frozen}>
					{/* snow cap on head and shoulders */}
					<ellipse cx={x + 10 * s} cy={headY - 92 * s} rx={95 * s} ry={30 * s} fill="#ffffff" stroke={O} strokeWidth={OW * s} />
					<ellipse cx={x - 80 * s} cy={y - 460 * s} rx={55 * s} ry={18 * s} fill="#ffffff" stroke={O} strokeWidth={OW * s} />
					<ellipse cx={x + 80 * s} cy={y - 460 * s} rx={55 * s} ry={18 * s} fill="#ffffff" stroke={O} strokeWidth={OW * s} />
				</g>
			)}
		</g>
	);
};

/** Шнурок wrapped in every blanket of the car. */
const Cocoon: React.FC<{x: number; y: number; s: number; face?: CharProps['face']; t: number}> = ({x, y, s, face = 'determined', t}) => (
	<g>
		<Shnurok x={x} y={y} s={s} face={face} hair="beanie" />
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			<path d="M -150 -470 Q 0 -540 150 -470 L 175 -90 Q 0 -40 -175 -90 Z" fill="#3d5a8a" stroke={O} strokeWidth={OW} strokeLinejoin="round" />
			<path d="M -160 -300 Q 0 -340 160 -300 L 168 -250 Q 0 -290 -168 -250 Z" fill="#d9483b" stroke={O} strokeWidth={OW - 2} />
			<path d="M -130 -500 Q 0 -560 130 -500 Q 150 -420 100 -400 Q 0 -440 -100 -400 Q -150 -420 -130 -500 Z" fill="#d9483b" stroke={O} strokeWidth={OW} strokeLinejoin="round" />
			<path d="M -60 -410 l 0 300 M 60 -400 l 0 300" stroke={O} strokeWidth={4} opacity={0.3} />
		</g>
		<Breath x={x + 30 * s} y={y - 560 * s} t={t} s={s * 1.4} />
	</g>
);

// ------------------------------------------------------------------ scene plumbing
type SceneProps = {a: number};
const Canvas3D: React.FC<{children: React.ReactNode; bg?: string}> = ({children, bg = '#0b1226'}) => (
	<ThreeCanvas width={W} height={H} shadows={!DRAFT} gl={{antialias: !DRAFT}} style={{position: 'absolute', inset: 0, background: bg}}>
		{children}
	</ThreeCanvas>
);
const Overlay: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
		{children}
	</svg>
);

// ================================================================== S1: train in the night taiga
const S1: React.FC<SceneProps> = ({a}) => {
	const shot = lerpShot({pos: [-16, 2.4, 15], look: [0, 3.0, -3], fov: 58}, {pos: [-10, 2.0, 10.5], look: [2, 3.2, -3], fov: 54}, ease(a / 9));
	const tz = T('зомби-апокалипсис');
	const lx = -8 + 2.4 * a;
	const dead = (car: number, i: number) => (a > tz - 0.3 + car * 0.15 + hash(i + car * 9) * 0.5 ? flick(a, i + car) * 0.1 : 1);
	const lit = (car: number) => (i: number) => (car === 1 ? dead(0, i) : car === 2 && a > tz + 0.6 ? dead(1, i) : 1);
	return (
		<>
			<Canvas3D>
				<Rig shot={shot} />
				<Sky top="#0b1430" bottom="#2b3d6b" />
				<fog attach="fog" args={['#26365e', 25, 110]} />
				<ambientLight intensity={0.55} color="#9fb2e8" />
				<directionalLight position={[30, 40, 20]} intensity={0.9} color="#b9ccff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
				<Moon p={[30, 42, -95]} r={4} />
				<Ground />
				<Rails z={-2} />
				<Loco x={lx} z={-2} />
				<CarBody x={lx - 12.6} z={-2} lit={lit(1)} />
				<CarBody x={lx - 26.2} z={-2} lit={lit(2)} />
				<CarBody x={lx - 39.8} z={-2} lit={lit(3)} />
				{[0, 1, 2].map((k) => (
					<pointLight key={k} position={[lx - 12.6 - k * 13.6, 2.6, 0.6]} intensity={(k === 0 && a > tz ? 0.3 : 4)} color="#ffcf7a" distance={9} decay={1.4} />
				))}
				<Forest zFrom={-9} zTo={-55} xSpan={120} n={110} />
				<Forest zFrom={4} zTo={18} xSpan={90} n={40} seed={50} avoid={(x, z) => Math.abs(x + 13) < 8 && z > 3} />
				<Flakes3D t={a} center={[-10, 0, 8]} n={120} spread={14} />
			</Canvas3D>
			<Overlay>
				<Snow2D t={a} n={70} />
				<Pill text="−38°" t={a - T('минус')} y={300} color="#9fd0e8" />
				<Big text="ЗОМБИ" t={a - tz} y={720} size={250} color="#d9483b" hold={1.6} />
				<Vig id="v1" />
			</Overlay>
		</>
	);
};

// ================================================================== S2: Шнурок wakes up on the upper berth
const S2Cam: Shot = {pos: [0.85, 1.85, -2.85], look: [-1.5, 1.05, -2.85], fov: 78};
const S2: React.FC<SceneProps> = ({a}) => {
	const tStop = T('стоит');
	const tScream = T('крик');
	const flickOn = a > T('свет') ? flick(a, 3) : 1;
	const lampsOn = (i: number) => (i === 1 ? flickOn : 0.15);
	const shake = a > tScream && a < tScream + 0.6 ? Math.sin(a * 80) * 14 * (1 - (a - tScream) / 0.6) : 0;
	const awake = a > T('три') + 0.6;
	const face = a > tScream ? 'shock' : awake ? 'neutral' : 'closed';
	const HX = 835, HIP = 985, HS = 0.86;
	return (
		<div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
			<Canvas3D bg="#1d2b4f">
				<Rig shot={S2Cam} />
				<fog attach="fog" args={['#1d2b4f', 5, 18]} />
				<ambientLight color="#7f8fc0" intensity={0.8} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.45]} />
				{[0, 1, 2, 3].map((i) => (
					<pointLight key={i} position={[0.62, 2.3, -i * 1.9 - 0.95]} color="#ffcf7a" intensity={4 * lampsOn(i)} distance={4.5} decay={1.2} castShadow={i === 1} />
				))}
				<Car t={a} zEnd={-7.8} bays={4} lampsOn={lampsOn} teaShake={a < tStop ? 1 : 0} />
				<Clock p={[-1.5, 1.98, -2.85]} />
			</Canvas3D>
			<Overlay>
				<clipPath id="waist2">
					<rect x={0} y={0} width={W} height={HIP + 30} />
				</clipPath>
				<g clipPath="url(#waist2)">
					<Shnurok x={HX} y={HIP + 238 * HS} s={HS} face={face} look={a > tScream ? -1 : 0} armL={[40, -70]} armR={[34, -80]} />
				</g>
				<path d={`M ${HX - 190} ${HIP + 60} Q ${HX - 170} ${HIP - 40} ${HX - 60} ${HIP - 10} Q ${HX + 20} ${HIP - 50} ${HX + 120} ${HIP - 10} Q ${HX + 210} ${HIP - 30} ${HX + 240} ${HIP + 40} L ${HX + 260} ${HIP + 110} L ${HX - 200} ${HIP + 120} Z`} fill="#3d5a8a" stroke={O} strokeWidth={OW} strokeLinejoin="round" />
				<NameTag name="Шнурок" role="едет в плацкарте" from={T('три') + 0.3} to={T('свет') - 0.2} x={60} y={130} avatar={<Shnurok x={0} y={215} s={0.4} face="neutral" />} />
				<Pill text="3:00" t={a - T('три')} y={330} x={540} color="#f5c542" />
				{flickOn < 0.5 && <rect width={W} height={H} fill="#070b18" opacity={0.45} />}
				<Vig id="v2" />
			</Overlay>
		</div>
	);
};

// ================================================================== S3: the conductor walks down the aisle
const S3: React.FC<SceneProps> = ({a}) => {
	const t0 = B[2];
	const tBlink = T('она');
	const k = ease((a - t0) / (tBlink - t0));
	const cam: Shot = {pos: [0.66, 1.5, 0.6], look: [0.62, 1.25, -12], fov: 72};
	const zc = -8.6 + 4.4 * k;
	const lampsOn = (i: number) => (i === 3 ? flick(a, 1) * 0.9 : i < 2 ? 0 : 0.2);
	const cm = makeCam(cam);
	const f = onFloor(cm, 0.62, zc);
	const s = f.ppm / PPM_CHAR;
	// final push-in on her face
	const push = ease((a - tBlink + 0.15) / 0.5);
	const fx = f.x;
	const fy = f.y - 610 * s;
	const z = 1 + 1.6 * push;
	return (
		<div style={{position: 'absolute', inset: 0, transformOrigin: `${fx}px ${fy}px`, transform: `translate(${(540 - fx) * push}px, ${(800 - fy) * push}px) scale(${z})`}}>
			<Canvas3D bg="#0b1226">
				<Rig shot={cam} />
				<fog attach="fog" args={['#0b1226', 3, 13]} />
				<ambientLight color="#7f8fc0" intensity={0.4} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.22]} />
				{Array.from({length: 6}).map((_, i) => (
					<pointLight key={i} position={[0.62, 2.3, -i * 1.9 - 0.95]} color="#ffcf7a" intensity={4 * lampsOn(i)} distance={4.5} decay={1.2} />
				))}
				<Car t={a} zEnd={-11.6} bays={6} lampsOn={lampsOn} />
			</Canvas3D>
			<Overlay>
				<ellipse cx={f.x} cy={f.y} rx={0.35 * f.ppm} ry={0.08 * f.ppm} fill="#000" opacity={0.3} />
				<Zombie x={f.x} y={f.y} s={s} t={a} kind={0} />
				<NameTag name="Проводница" role="уже не совсем" from={T('проводница') + 0.1} to={tBlink - 0.4} x={60} y={130} avatar={<Char x={0} y={250} s={0.42} face="zombie" hair="wife" hat="cap" hatColor="#24324f" skin="#a9c49a" skirt="#24324f" headTilt={14} />} />
				<Vig id="v3" k={0.75} />
			</Overlay>
		</div>
	);
};

// ================================================================== S4: thinking at the window, -38, 80 km, COLD
const S4: React.FC<SceneProps> = ({a}) => {
	const t0 = B[3];
	const cam: Shot = lerpShot({pos: [0.7, 1.5, 1.4], look: [0.5, 1.15, -10], fov: 68}, {pos: [0.7, 1.45, 0.6], look: [0.5, 1.2, -10], fov: 62}, ease((a - t0) / 10));
	const cm = makeCam(cam);
	const f = onFloor(cm, 0.6, -2.4);
	const s = f.ppm / PPM_CHAR;
	const tCold = T('холод');
	const thinking = a > T('но') && a < tCold;
	const lampsOn = (i: number) => (i === 1 ? 0.55 : 0.1);
	return (
		<>
			<Canvas3D bg="#1d2b4f">
				<Rig shot={cam} />
				<fog attach="fog" args={['#1d2b4f', 5, 18]} />
				<ambientLight color="#7f8fc0" intensity={0.7} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.35]} />
				<pointLight position={[0.62, 2.3, -2.85]} color="#ffcf7a" intensity={2.4} distance={4.5} decay={1.2} castShadow />
				<Car t={a} zEnd={-7.8} bays={4} lampsOn={lampsOn} />
			</Canvas3D>
			<Overlay>
				<ellipse cx={f.x} cy={f.y} rx={0.35 * f.ppm} ry={0.08 * f.ppm} fill="#000" opacity={0.3} />
				<Shnurok x={f.x} y={f.y} s={s} thinking={thinking} face={a < T('но') ? 'shock' : a > tCold ? 'shock' : undefined} />
				{thinking && (
					<g transform={`translate(${f.x + 230 * s} ${f.y - 820 * s + Math.sin(a * 2.2) * 10}) rotate(12)`}>
						<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={260 * s} fill={C.ochre} stroke={O} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">
							?
						</text>
					</g>
				)}
				<Pill text="−38°" t={a - T('минус', 2)} y={230} x={300} color="#9fd0e8" />
				<Pill text="80 км до станции" t={a - T('восемьдесят')} y={350} x={600} />
				<Frost k={ease((a - tCold + 0.2) / 0.8)} id="fr4" />
				<Big text="ХОЛОД" t={a - tCold} y={760} size={210} color="#e9f3ff" hold={2} />
				<Vig id="v4" />
			</Overlay>
		</>
	);
};

// ================================================================== S5: the conductor's compartment, lock + suitcase, knocks
const S5: React.FC<SceneProps> = ({a}) => {
	const tLock = T('замок');
	const tCase = T('чемодан');
	const tK1 = T('стук');
	const tK2 = T('стук', 2);
	const lockK = ease((a - tLock) / 0.2);
	const suitcase = ease((a - tCase) / 0.8);
	const knock = (tk: number) => (a > tk - 0.05 && a < tk + 0.5 ? 1 - (a - tk) / 0.5 : 0);
	const handle = Math.max(knock(tK1), knock(tK2));
	const cam: Shot = {pos: [0.8, 1.55, 1.9], look: [-0.6, 1.0, -0.7], fov: 66};
	const cm = makeCam(cam);
	const f = onFloor(cm, -0.05 + (1 - ease((a - B[4]) / 1.2)) * 0.3, 0.05);
	const s = f.ppm / PPM_CHAR;
	const shake = handle * Math.sin(a * 90) * 10;
	return (
		<div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, 0)`}}>
			<Canvas3D bg="#1d2b4f">
				<Rig shot={cam} />
				<ambientLight color="#8a96c4" intensity={0.55} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.3]} />
				<Compartment t={a} lockK={lockK} handle={handle} suitcase={suitcase} />
			</Canvas3D>
			<Overlay>
				<ellipse cx={f.x} cy={f.y} rx={0.35 * f.ppm} ry={0.08 * f.ppm} fill="#000" opacity={0.3} />
				<Shnurok x={f.x} y={f.y} s={s} face={a > tK1 ? 'shock' : 'determined'} look={-1} armL={a > tCase && a < tK1 ? [60, -20] : undefined} />
				{handle > 0.1 && (
					<g opacity={handle}>
						<text x={200} y={760} fontFamily="Inter" fontWeight={900} fontSize={120} fill="#fff" stroke={O} strokeWidth={10} paintOrder="stroke" transform="rotate(-12 200 760)">
							ТУК!
						</text>
					</g>
				)}
				<Vig id="v5" k={0.65} />
			</Overlay>
		</div>
	);
};

// ================================================================== S6: frozen zombies in the snow outside
const S6: React.FC<SceneProps> = ({a}) => {
	const t0 = B[5];
	const tFrozen = T('замёрзли');
	const cam: Shot = lerpShot({pos: [5.5, 1.7, 12.5], look: [0, 1.9, -1], fov: 52}, {pos: [3.2, 1.6, 10.5], look: [-0.4, 1.9, -1], fov: 48}, ease((a - t0) / 7.5));
	const cm = makeCam(cam);
	const Z: [number, number][] = [[-1.0, 1.4], [1.2, 2.6], [-2.2, 3.4], [2.6, 1.2], [0.2, 4.6]];
	const frozenK = ease((a - T('стоят')) / 3);
	// Шнурок's face in the lit window of the car
	const [wx, wy] = (() => {
		const v = onFloor(cm, -1.375, -0.42, 2.75);
		return [v.x, v.y];
	})();
	const wppm = onFloor(cm, -1.375, -0.42, 2.75).ppm;
	return (
		<>
			<Canvas3D>
				<Rig shot={cam} />
				<Sky top="#0b1430" bottom="#2b3d6b" />
				<fog attach="fog" args={['#26365e', 18, 90]} />
				<ambientLight intensity={0.6} color="#9fb2e8" />
				<directionalLight position={[20, 30, 25]} intensity={0.8} color="#b9ccff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
				<Moon p={[-30, 40, -90]} r={4} />
				<Ground />
				<Rails z={-2} />
				<CarBody x={0} z={-2} lit={(i) => (i === 3 ? 1 : 0.05)} />
				<CarBody x={-13.6} z={-2} lit={() => 0.05} />
				<CarBody x={13.6} z={-2} lit={() => 0.05} />
				<pointLight position={[-1.4, 2.7, 0.4]} intensity={5} color="#ffcf7a" distance={7} decay={1.3} />
				<Forest zFrom={-9} zTo={-50} xSpan={110} n={100} />
				<Forest zFrom={8} zTo={20} xSpan={70} n={24} seed={70} avoid={(x) => Math.abs(x - 2) < 6} />
				<Flakes3D t={a} center={[1, 0, 5]} n={110} spread={12} />
			</Canvas3D>
			<Overlay>
				{/* Шнурок looking out of the lit window */}
				<clipPath id="win6">
					<rect x={wx - 0.4 * wppm} y={wy - 0.3 * wppm} width={0.8 * wppm} height={0.6 * wppm} />
				</clipPath>
				<g clipPath="url(#win6)">
					<Shnurok x={wx} y={wy + 1.45 * wppm} s={wppm / PPM_CHAR} face={a > tFrozen ? 'shock' : 'neutral'} look={0.5} />
				</g>
				{Z.map(([x, z], i) => {
					const p = onFloor(cm, x, z);
					const s = p.ppm / PPM_CHAR;
					return (
						<g key={i}>
							<ellipse cx={p.x} cy={p.y} rx={0.35 * p.ppm} ry={0.08 * p.ppm} fill="#3b4a70" opacity={0.35} />
							<Zombie x={p.x} y={p.y} s={s} t={a} v={0} frozen={frozenK} kind={i + 1} />
							{/* knee-deep snow */}
							<path d={`M ${p.x - 190 * s} ${p.y + 10 * s} Q ${p.x - 120 * s} ${p.y - 130 * s} ${p.x} ${p.y - 120 * s} Q ${p.x + 120 * s} ${p.y - 130 * s} ${p.x + 190 * s} ${p.y + 10 * s} Z`} fill="#e6ecf6" />
							<path d={`M ${p.x - 190 * s} ${p.y + 10 * s} Q ${p.x - 120 * s} ${p.y - 130 * s} ${p.x} ${p.y - 120 * s} Q ${p.x + 120 * s} ${p.y - 130 * s} ${p.x + 190 * s} ${p.y + 10 * s}`} fill="none" stroke={O} strokeWidth={OW * s} />
						</g>
					);
				})}
				<Snow2D t={a} n={60} />
				<Frost k={ease((a - tFrozen) / 0.6) * 0.6} id="fr6" />
				<Vig id="v6" />
			</Overlay>
		</>
	);
};

// ================================================================== S7: blankets, open all doors, the car freezes
const S7: React.FC<SceneProps> = ({a}) => {
	const t0 = B[6];
	const tOpen = T('открывает');
	const tCool = T('вагон');
	const tStill = T('стихают');
	const doorK = ease((a - tOpen) / 0.8);
	const cold = ease((a - tOpen) / (tStill - tOpen));
	const cam: Shot = lerpShot({pos: [0.66, 1.55, 1.2], look: [0.62, 1.2, -12], fov: 72}, {pos: [0.66, 1.5, 0.2], look: [0.62, 1.2, -12], fov: 66}, ease((a - t0) / 12));
	const cm = makeCam(cam);
	const layers = ease((a - T('надевает')) / 1.2);
	// Шнурок walks to the end door, then comes back to the camera side
	const toDoor = ease((a - T('открывает') + 1.2) / 1.0);
	const zS = -3.6 - 1.4 * toDoor + 1.0 * ease((a - tCool) / 1.2);
	const fS = onFloor(cm, 0.44, zS);
	const sS = fS.ppm / PPM_CHAR;
	// slowing zombies in the far aisle
	const zz = [-8.2, -9.6];
	const v = 1 - ease((a - tCool) / (tStill - tCool));
	const lampsOn = (i: number) => (i === 0 ? 0.9 : i === 4 ? flick(a, 2) * 0.5 : 0.25);
	return (
		<>
			<Canvas3D bg="#0b1226">
				<Rig shot={cam} />
				<fog attach="fog" args={[cold > 0.3 ? '#3a4a6e' : '#0b1226', 3, 14]} />
				<ambientLight color={cold > 0.2 ? '#b9cfff' : '#7f8fc0'} intensity={0.45 + 0.35 * cold} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.25]} />
				{Array.from({length: 6}).map((_, i) => (
					<pointLight key={i} position={[0.62, 2.3, -i * 1.9 - 0.95]} color="#ffcf7a" intensity={3.5 * lampsOn(i) * (1 - 0.5 * cold)} distance={4.5} decay={1.2} />
				))}
				<Car t={a} zEnd={-11.6} bays={6} lampsOn={lampsOn} />
				{/* the end door slides open onto the snowy night */}
				<Box3 p={[0.62 + 0.7 * doorK, 1.0, -11.53]} s={[0.72, 2.0, 0.04]} c="#9aa3ad" o={0.02} />
				<mesh position={[0.62, 1.0, -11.58]}>
					<planeGeometry args={[0.7, 2.0]} />
					<meshBasicMaterial color={doorK > 0.05 ? '#c9d6ea' : '#0c1226'} />
				</mesh>
				{doorK > 0 && <Flakes3D t={a} center={[0.62, -4, -9]} n={80} spread={2.4} wind={-0.2} />}
			</Canvas3D>
			<Overlay>
				{zz.map((z, i) => {
					const p = onFloor(cm, 0.86 + (i ? 0.06 : -0.04), z + ease((a - t0) / 8) * 1.2 * (0.3 + 0.7 * v));
					const s = p.ppm / PPM_CHAR;
					return <Zombie key={i} x={p.x} y={p.y} s={s} t={a * (0.3 + 0.7 * v)} v={v} frozen={cold} kind={i + 2} />;
				})}
				<ellipse cx={fS.x} cy={fS.y} rx={0.4 * fS.ppm} ry={0.09 * fS.ppm} fill="#000" opacity={0.3} />
				{layers < 0.5 ? (
					<Shnurok x={fS.x} y={fS.y} s={sS} face="determined" armL={[70, -40]} armR={[70, -40]} />
				) : (
					<Cocoon x={fS.x} y={fS.y} s={sS} t={a} face={a > tStill - 0.4 ? 'shock' : 'determined'} />
				)}
				<Pill text="все двери открыты" t={a - T('все')} y={260} color="#9fd0e8" />
				<Frost k={cold} id="fr7" />
				<Vig id="v7" />
			</Overlay>
		</>
	);
};

// ================================================================== S8: dawn, oncoming train with dark windows
const S8: React.FC<SceneProps> = ({a}) => {
	const t0 = B[7];
	const tHorn = T('гудок');
	const tDark = T('вот');
	const k = ease((a - tHorn) / (tDark + 1.5 - tHorn));
	const push = ease((a - tDark) / 1.6);
	const cam: Shot = lerpShot(
		lerpShot({pos: [-6, 1.8, 10], look: [0, 2.6, -2], fov: 56}, {pos: [-4, 1.8, 9], look: [4, 2.6, -4], fov: 56}, ease((a - t0) / 3)),
		{pos: [17, 2.6, 4.5], look: [22.6, 2.75, -4.6], fov: 24},
		push,
	);
	const cm = makeCam(cam);
	const ox = 80 - 70 * k; // oncoming loco x on the far track, stops at x=10
	const [wx, wy] = (() => {
		const v = onFloor(cm, 0, -0.42, 2.75);
		return [v.x, v.y];
	})();
	const wppm = onFloor(cm, 0, -0.42, 2.75).ppm;
	return (
		<>
			<Canvas3D>
				<Rig shot={cam} />
				<Sky top="#5b6fa8" bottom="#f2b48a" />
				<fog attach="fog" args={['#c9a6a0', 30, 120]} />
				<ambientLight intensity={0.75} color="#ffd9c4" />
				<directionalLight position={[-40, 12, -60]} intensity={1.1} color="#ffc39a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
				<mesh position={[-60, 6, -100]}>
					<sphereGeometry args={[6, 32, 16]} />
					<meshBasicMaterial color="#ffd27a" fog={false} />
				</mesh>
				<Ground c="#f3ecf2" />
				<Rails z={-2} />
				<Rails z={-6.2} />
				<CarBody x={0} z={-2} lit={(i) => (i === 4 ? 1 : 0.05)} frost={1} body="#b04a44" />
				<CarBody x={-13.6} z={-2} lit={() => 0.05} frost={1} body="#b04a44" />
				<Loco x={ox} z={-6.2} dir={-1} light={1} />
				<CarBody x={ox + 12.6} z={-6.2} lit={() => 0} />
				<CarBody x={ox + 26.2} z={-6.2} lit={() => 0} />
				<Forest zFrom={-12} zTo={-55} xSpan={130} n={100} snow="#ffffff" />
				<Forest zFrom={6} zTo={20} xSpan={80} n={24} seed={90} avoid={(x) => Math.abs(x + 4) < 7} />
			</Canvas3D>
			<Overlay>
				<clipPath id="win8">
					<rect x={wx - 0.4 * wppm} y={wy - 0.3 * wppm} width={0.8 * wppm} height={0.6 * wppm} />
				</clipPath>
				<g clipPath="url(#win8)">
					<rect x={wx - 0.4 * wppm} y={wy - 0.3 * wppm} width={0.8 * wppm} height={0.6 * wppm} fill="#d7e4f4" />
					<Cocoon x={wx} y={wy + 1.45 * wppm} s={wppm / PPM_CHAR} t={a} face={a > tHorn ? 'shock' : 'closed'} />
				</g>
				{(() => {
					const g = onFloor(cm, ox + 12.6, -4.62, 2.75);
					const ga = clamp01((a - T('горит') - 0.5) / 0.8) * 0.75;
					if (ga <= 0) return null;
					return (
						<g opacity={ga}>
							<clipPath id="gw8">
								<rect x={g.x - 0.4 * g.ppm} y={g.y - 0.3 * g.ppm} width={0.8 * g.ppm} height={0.6 * g.ppm} />
							</clipPath>
							<g clipPath="url(#gw8)">
								<Zombie x={g.x} y={g.y + 1.35 * g.ppm} s={g.ppm / PPM_CHAR} t={a} v={0.2} kind={3} />
							</g>
						</g>
					);
				})()}
				<Pill text="утро" t={a - T('утру')} y={260} color="#f5c542" />
				<Vig id="v8" k={0.35 + 0.4 * push} />
			</Overlay>
		</>
	);
};

// ================================================================== S9: choice for the viewer
const S9: React.FC<SceneProps> = ({a}) => {
	const cam: Shot = {pos: [0.66, 1.45, -0.6], look: [0.62, 1.2, -12], fov: 66};
	const cm = makeCam(cam);
	const f = onFloor(cm, 0.6, -3.6);
	const s = f.ppm / PPM_CHAR;
	const t1 = T('один');
	const t2 = T('два');
	const lampsOn = (i: number) => (i === 1 ? flick(a, 5) : 0.1);
	const Choice: React.FC<{x: number; n: string; text: string; t: number; color: string}> = ({x, n, text, t, color}) =>
		t < 0 ? null : (
			<g transform={`translate(${x} 520) scale(${back(t / 0.4)})`}>
				<circle r={125} fill={color} stroke={O} strokeWidth={6} />
				<text textAnchor="middle" y={52} fontFamily="Inter" fontWeight={900} fontSize={150} fill="#fff">
					{n}
				</text>
				<text textAnchor="middle" y={200} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">
					{text}
				</text>
			</g>
		);
	return (
		<>
			<Canvas3D bg="#0b1226">
				<Rig shot={cam} />
				<fog attach="fog" args={['#3a4a6e', 3, 12]} />
				<ambientLight color="#b9cfff" intensity={0.65} />
				<hemisphereLight args={['#ffe6b8', '#2a2440', 0.25]} />
				{Array.from({length: 4}).map((_, i) => (
					<pointLight key={i} position={[0.62, 2.3, -i * 1.9 - 0.95]} color="#ffcf7a" intensity={3 * lampsOn(i)} distance={4.5} decay={1.2} />
				))}
				<Car t={a} zEnd={-7.8} bays={4} lampsOn={lampsOn} />
			</Canvas3D>
			<Overlay>
				<ellipse cx={f.x} cy={f.y} rx={0.4 * f.ppm} ry={0.09 * f.ppm} fill="#000" opacity={0.3} />
				<Cocoon x={f.x} y={f.y} s={s} t={a} face="think" />
				<Choice x={290} n="1" text="в поезд" t={a - t1} color="#c8675b" />
				<Choice x={790} n="2" text="остаться" t={a - t2} color="#5b86c4" />
				<Frost k={0.75} id="fr9" />
				{lampsOn(1) < 0.5 && <rect width={W} height={H} fill="#070b18" opacity={0.35} />}
				<Vig id="v9" />
			</Overlay>
		</>
	);
};

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
const FADE = 0.35;

const Layer: React.FC<{idx: number; from: number; lead: number; dur: number; first: boolean; C: React.FC<SceneProps>}> = ({idx, from, lead, dur, first, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
	const a = t + from;
	const op = first ? 1 : clamp01((t + lead) / FADE);
	const enter = first ? 0 : 1 - Easing.out(Easing.cubic)(clamp01((t + lead) / 0.6));
	const exit = Easing.in(Easing.cubic)(clamp01((t - (dur - FADE)) / FADE));
	const dir = idx % 2 ? -1 : 1;
	const drift = ease(t / Math.max(1, dur));
	const z = 1.02 + 0.05 * (dir > 0 ? drift : 1 - drift) + 0.18 * enter + 0.2 * exit;
	return (
		<ShotCtx.Provider value={{t: a, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: op, transform: `scale(${z})`, transformOrigin: '540px 900px'}}>
				<Scene a={a} />
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const ZombieEp01: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [ZOMBIE01_DURATION - 0.8, ZOMBIE01_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			{SCENES.map((Sc, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : ZOMBIE01_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round(to * FPS) - start)}>
						<Layer idx={i} from={from} lead={from - start / FPS} dur={to - from} first={i === 0} C={Sc} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} keepSpoken />}
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #0008'}}>Зомби · серия 1</div>
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
