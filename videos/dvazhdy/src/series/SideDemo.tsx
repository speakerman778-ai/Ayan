import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx} from '../lib';
import {C, OL, OW} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {Shnurok} from './Shnurok';

export const SideSheet: React.FC = () => {
	const t = useCurrentFrame() / 30;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: C.wall}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<rect x={60} y={60} width={960} height={120} rx={18} fill={C.paper} stroke={OL} strokeWidth={OW} />
					<rect x={60} y={60} width={34} height={120} rx={10} fill={C.red} stroke={OL} strokeWidth={OW} />
					<text x={130} y={140} fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>Шнурок · вид сбоку</text>
					<rect x={40} y={1000} width={1000} height={26} rx={13} fill={C.wood} stroke={OL} strokeWidth={6} />
					<Shnurok x={230} y={1000} s={0.95} />
					<ShnurokSide x={560} y={1000} s={0.95} />
					<ShnurokSide x={880} y={1000} s={0.95} dir={-1} face="joy" />
					{['анфас', 'боком', 'в другую сторону'].map((l, i) => (
						<text key={l} x={[230, 560, 880][i]} y={1070} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={34} fill={OL}>{l}</text>
					))}
					<rect x={40} y={1760} width={1000} height={26} rx={13} fill={C.wood} stroke={OL} strokeWidth={6} />
					{[0, 0.25, 0.5, 0.75].map((ph, i) => (
						<SideChar key={i} x={170 + i * 245} y={1760} s={0.6} walk={1} speed={0} phase={ph} hair="lyokha" hairColor="#7a4a2a" jacket="#e8a93a" pants="#3d5a8a" hoodie freckles />
					))}
					<text x={540} y={1840} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={34} fill={OL}>шаг: фазы ходьбы</text>
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const SideWalk: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const x = -150 + t * 230;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: C.wall}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<rect x={0} y={1300} width={1080} height={620} fill={C.wood} stroke={OL} strokeWidth={OW} />
					<ShnurokSide x={x} y={1320} s={1.0} walk={1} />
					<SideChar x={x - 260} y={1320} s={1.0} walk={1} phase={0.4} hair="old" beard hat jacket="#f2c230" pants="#3d4a66" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
