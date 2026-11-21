import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx} from '../lib';
import {FlatKid} from '../cartoon/FlatKid';

const Hall: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#9fb3c8" />
		<rect x={0} y={700} width={1080} height={520} fill="#f4f1ea" />
		{[0, 1, 2, 3].map((i) => (
			<rect key={i} x={40 + i * 260} y={760} width={220} height={420} rx={10} fill="none" stroke="#d9d4c8" strokeWidth={6} />
		))}
		<rect x={0} y={690} width={1080} height={16} fill="#e6e1d6" />
		<rect x={700} y={360} width={150} height={130} fill="#fffaf0" stroke="#2e2a2a" strokeWidth={4} />
		<circle cx={760} cy={430} r={20} fill="#e8a93a" />
		<rect x={790} y={420} width={30} height={60} fill="#5b86c4" />
		<rect x={0} y={1200} width={1080} height={720} fill="#e8d8bc" />
		{Array.from({length: 7}).map((_, r) =>
			Array.from({length: 9}).map((__, c) => (
				<path key={`${r}${c}`} d={`M ${c * 130 + (r % 2) * 65} ${1240 + r * 100} l 20 30 l -20 30 l -20 -30 Z`} fill="#c98c55" opacity={0.6} />
			)),
		)}
		<rect x={140} y={1330} width={520} height={110} fill="#b0453a" stroke="#2e2a2a" strokeWidth={4} />
		{[0, 1, 2].map((i) => (
			<path key={i} d={`M ${230 + i * 170} 1360 l 25 25 l -25 25 l -25 -25 Z`} fill="#e8a93a" />
		))}
		<circle cx={1000} cy={600} r={220} fill="#fff1c0" opacity={0.35 + 0.05 * Math.sin(t * 3)} />
	</>
);

export const FlatSheet: React.FC = () => {
	const t = useCurrentFrame() / 30;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: '#f4eee2'}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<FlatKid x={200} y={900} s={1.1} pose="front" />
					<FlatKid x={540} y={900} s={1.1} pose="stand" />
					<FlatKid x={880} y={900} s={1.1} pose="stand" dir={-1} face="surprised" />
					{[0, 0.25, 0.5, 0.75].map((ph, i) => (
						<FlatKid key={i} x={160 + i * 250} y={1750} s={0.95} pose="walk" speed={0} phase={ph} face={i % 2 ? 'happy' : 'smile'} />
					))}
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const FlatWalk: React.FC = () => {
	const t = useCurrentFrame() / 30;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Hall t={t} />
					<FlatKid x={-120 + t * 200} y={1420} s={1.3} pose="walk" face="neutral" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
