import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Char} from '../cartoon/parts';
import {SideChar} from '../cartoon/SideChar';
import {ShotCtx} from '../lib';

// «Стена» — сериал про Саню, которого зовут «Жирный». Character sheet.

type F = React.ComponentProps<typeof Char>['face'];
const NECK = 560; // body top (below the head) in Char units at s=1
/** Big kid: body stretched wide, head drawn on top un-stretched but larger → round full face. */
export const Sanya: React.FC<{x: number; y: number; s: number; face?: F; armL?: [number, number]; armR?: [number, number]; talk?: number; gloves?: boolean}> = ({x, y, s, face = 'smile', armL, armR, talk = 0, gloves}) => {
	const p = {hair: 'crew' as const, hairColor: '#5a3a24', jacket: '#4f8a5b', pants: '#3a4560', hoodie: true, headS: 0.92, bodyS: 1.4, headDrop: 30, face, talk, freckles: true, ...(armL ? {armL} : {}), ...(armR ? {armR} : {})};
	return (
		<g>
			<g transform={`translate(${x} ${y}) scale(1.75 1) translate(${-x} ${-y})`}>
				<Char x={x} y={y} s={s} {...p} headS={0.001} />
			</g>
			<Char x={x} y={y} s={s} {...p} headS={1.16} headOnly />
			{gloves && armL && armR && null}
		</g>
	);
};
export const SanyaSide: React.FC<{x: number; y: number; s: number; dir?: 1 | -1; face?: React.ComponentProps<typeof SideChar>['face']; walk?: number}> = ({x, y, s, dir = 1, face = 'smile', walk = 0}) => (
	<g transform={`translate(${x} ${y}) scale(1.6 1) translate(${-x} ${-y})`}>
		<SideChar x={x} y={y} s={s} dir={dir} face={face} walk={walk} bodyS={1.4} hair="short" hairColor="#5a3a24" jacket="#4f8a5b" pants="#3a4560" hoodie freckles />
	</g>
);
const Max: React.FC<{x: number; y: number; s: number; face?: F; armR?: [number, number]}> = (p) => <Char {...p} hair="lyokha" hairColor="#e0b04a" jacket="#d9483b" pants="#f4f1ea" hoodie headS={0.85} bodyS={1.14} headDrop={18} />;
const Coach: React.FC<{x: number; y: number; s: number; face?: F}> = (p) => <Char {...p} hair="old" hairColor="#9a9a9a" mustache jacket="#2f4f86" pants="#2f4f86" hoodie headS={0.82} bodyS={1.14} headDrop={18} />;
const Striker: React.FC<{x: number; y: number; s: number; face?: F}> = (p) => <Char {...p} hair="buzz" hairColor="#1b1410" jacket="#1d1f2a" pants="#1d1f2a" hoodie headS={0.85} bodyS={1.16} headDrop={18} />;
/** Mom: long hair falls BEHIND her back (drawn first), front keeps only a fringe. */
export const Mom: React.FC<{x: number; y: number; s: number; face?: F; armL?: [number, number]; armR?: [number, number]; talk?: number}> = (p) => {
	const {x, y, s} = p;
	return (
		<g>
			<path
				d={`M ${x - 128 * s} ${y - 560 * s} Q ${x - 150 * s} ${y - 700 * s} ${x} ${y - 712 * s} Q ${x + 150 * s} ${y - 700 * s} ${x + 128 * s} ${y - 560 * s} L ${x + 150 * s} ${y - 300 * s} Q ${x} ${y - 270 * s} ${x - 150 * s} ${y - 300 * s} Z`}
				fill="#5a3a24"
				stroke="#3b2a22"
				strokeWidth={7 * s}
				strokeLinejoin="round"
			/>
			<Char {...p} hair="wife" hairColor="#5a3a24" jacket="#c0603e" pants="#3a4560" skirt="#3a4560" headS={0.82} bodyS={1.1} headDrop={18} />
		</g>
	);
};

const Label: React.FC<{x: number; y: number; name: string; role: string}> = ({x, y, name, role}) => (
	<g>
		<text x={x} y={y} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={36} fill="#3b2a22">{name}</text>
		<text x={x} y={y + 40} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={24} fill="#d9483b">{role}</text>
	</g>
);
export const StenaSheet: React.FC = () => (
	<ShotCtx.Provider value={{t: 1.3, dur: 1, scatter: 0}}>
		<AbsoluteFill style={{background: '#f6ecd8'}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920">
				<text x={540} y={80} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={58} fill="#3b2a22">«СТЕНА» · персонажи</text>
				{/* Sanya: front, emotions, side */}
				<Sanya x={210} y={860} s={0.74} face="sad" />
				<Sanya x={500} y={860} s={0.52} face="determined" />
				<Sanya x={740} y={860} s={0.52} face="joy" armL={[150, 20]} armR={[150, 20]} />
				<SanyaSide x={975} y={860} s={0.52} dir={-1} face="determined" walk={0.6} />
				<Label x={540} y={940} name="Саня «Стена»" role="главный герой · вратарь" />
				{/* others */}
				<Max x={160} y={1700} s={0.62} face="smile" />
				<Label x={160} y={1770} name="Макс" role="капитан" />
				<Coach x={380} y={1700} s={0.62} face="neutral" />
				<Label x={380} y={1770} name="Тренер" role="физрук" />
				<Striker x={620} y={1700} s={0.62} face="smile" />
				<Label x={630} y={1770} name="Нападающий" role="лучший в школе" />
				<Mom x={870} y={1700} s={0.62} face="smile" />
				<Label x={870} y={1770} name="Мама" role="на трибуне" />
			</svg>
		</AbsoluteFill>
	</ShotCtx.Provider>
);
