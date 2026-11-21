import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {ShotCtx} from '../lib';
import {Char, C, OL, OW} from '../cartoon/parts';
import {KaraokeLine, timeWords} from '../subs/Karaoke';
import {Car, Cam, Clock} from './Train3D';

const W = 1080;
const H = 1920;

// flicker pattern for a dying lamp
const flick = (t: number) => {
	const k = Math.sin(t * 23.1) + Math.sin(t * 7.7 + 1) * 0.8 + Math.sin(t * 41) * 0.4;
	return k > -0.9 ? 1 : 0.15;
};

const Lights: React.FC<{t: number; bays: number; lampsOn: (i: number) => number; amb?: number}> = ({bays, lampsOn, amb = 1}) => (
	<>
		<ambientLight color="#7f8fc0" intensity={0.9 * amb} />
		<hemisphereLight args={['#ffe6b8', '#2a2440', 0.5 * amb]} />
		{Array.from({length: bays}).map((_, i) => (
			<pointLight key={i} position={[0.62, 2.3, -i * 1.9 - 0.95]} color="#ffcf7a" intensity={4 * lampsOn(i)} distance={4.5} decay={1.2} />
		))}
	</>
);

// ------------------------------------------------------------------ hero: you, in a pom-pom beanie and red scarf
const Hero: React.FC<{x: number; y: number; s: number; face: 'shock' | 'neutral' | 'determined'; look?: number; armL?: [number, number]; armR?: [number, number]}> = (p) => (
	<Char x={p.x} y={p.y} s={p.s} hair="guy" hat="beanie" hatColor={C.ochre} scarf={C.red} jacket="#5f9e55" pants="#3d4a66" face={p.face} look={p.look} armL={p.armL} armR={p.armR} blinkSeed={0.3} />
);

// ------------------------------------------------------------------ scene A: waking up on the upper berth
const SA = timeWords('Ты просыпаешься в три часа ночи.', 0.1, 2.0);

const HERO_X = 835;
const HIP_Y = 985;
const HERO_S = 0.86;

const SceneA: React.FC<{t: number}> = ({t}) => {
	const on = flick(t + 3);
	const lampsOn = (i: number) => (i === 1 ? on : 0.15);
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			<ThreeCanvas width={W} height={H} shadows gl={{antialias: true}}>
				<Cam pos={[0.85, 1.85, -1.9 - 0.95]} look={[-1.5, 1.05, -1.9 - 0.95]} fov={78} />
				<fog attach="fog" args={['#1d2b4f', 5, 18]} />
				<Lights t={t} bays={4} lampsOn={lampsOn} />
				<Car t={t} zEnd={-7.8} bays={4} lampsOn={lampsOn} emptyUpperRight={-1} teaShake={1} />
				<Clock p={[-1.5, 1.98, -1.9 - 0.95]} />
			</ThreeCanvas>
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
				<defs>
					<radialGradient id="vig" cx="50%" cy="45%" r="70%">
						<stop offset="60%" stopColor="#0b1020" stopOpacity={0} />
						<stop offset="100%" stopColor="#0b1020" stopOpacity={0.55} />
					</radialGradient>
				</defs>
				{/* hero sitting up on the right upper berth, legs under the blanket */}
				<clipPath id="waist"><rect x={0} y={0} width={W} height={HIP_Y + 30} /></clipPath>
				<g clipPath="url(#waist)">
					<Hero x={HERO_X} y={HIP_Y + 220 * HERO_S} s={HERO_S} face="shock" look={-1} armL={[40, -70]} armR={[34, -80]} />
				</g>
				<path d={`M ${HERO_X - 190} ${HIP_Y + 60} Q ${HERO_X - 170} ${HIP_Y - 40} ${HERO_X - 60} ${HIP_Y - 10} Q ${HERO_X + 20} ${HIP_Y - 50} ${HERO_X + 120} ${HIP_Y - 10} Q ${HERO_X + 210} ${HIP_Y - 30} ${HERO_X + 240} ${HIP_Y + 40} L ${HERO_X + 260} ${HIP_Y + 110} L ${HERO_X - 200} ${HIP_Y + 120} Z`} fill="#3d5a8a" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
				<path d={`M ${HERO_X - 120} ${HIP_Y + 30} Q ${HERO_X - 60} ${HIP_Y + 10} ${HERO_X} ${HIP_Y + 40} M ${HERO_X + 60} ${HIP_Y + 20} Q ${HERO_X + 130} ${HIP_Y + 5} ${HERO_X + 190} ${HIP_Y + 40}`} stroke={OL} strokeWidth={5} opacity={0.4} fill="none" strokeLinecap="round" />
				<rect width={W} height={H} fill="url(#vig)" />
				{on < 0.5 && <rect width={W} height={H} fill="#0b1020" opacity={0.35} />}
			</svg>
			<KaraokeLine words={SA} t={t} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ scene B: the conductor in the aisle
const SB = timeWords('По проходу идёт проводница.', 0.1, 1.8);

const SceneB: React.FC<{t: number}> = ({t}) => {
	const lampsOn = (i: number) => (i === 2 ? flick(t) * 0.9 : i < 2 ? 0 : 0.18);
	const sway = Math.sin(t * 3) * 4;
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			<ThreeCanvas width={W} height={H} shadows gl={{antialias: true}}>
				<Cam pos={[0.66, 1.5, 0.6]} look={[0.62, 1.25, -12]} fov={72} />
				<fog attach="fog" args={['#0f1730', 3, 12]} />
				<Lights t={t} bays={6} lampsOn={lampsOn} amb={0.45} />
				<Car t={t} zEnd={-11.6} bays={6} lampsOn={lampsOn} />
			</ThreeCanvas>
			<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
				<defs>
					<radialGradient id="vig2" cx="50%" cy="45%" r="70%">
						<stop offset="55%" stopColor="#0b1020" stopOpacity={0} />
						<stop offset="100%" stopColor="#0b1020" stopOpacity={0.75} />
					</radialGradient>
				</defs>
				{/* zombie conductor, mid-aisle */}
				<g transform={`rotate(${sway} 545 1290)`}>
					<Char x={545} y={1290} s={0.56} hair="wife" hat="cap" hatColor="#24324f" skin="#a9c49a" skirt="#24324f" face="zombie" headTilt={18} armL={[62, 40]} armR={[48, 60]} blinkSeed={0.4} />
				</g>
				<rect width={W} height={H} fill="url(#vig2)" />
			</svg>
			<KaraokeLine words={SB} t={t} />
		</AbsoluteFill>
	);
};

export const ZombiePreview: React.FC = () => {
	const frame = useCurrentFrame();
	const t = frame / 30;
	const a = frame < 60;
	return (
		<ShotCtx.Provider value={{t, dur: 2, scatter: 0}}>
			{a ? <SceneA t={t} /> : <SceneB t={t - 2} />}
		</ShotCtx.Provider>
	);
};
