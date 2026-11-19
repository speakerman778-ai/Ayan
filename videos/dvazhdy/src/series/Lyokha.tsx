import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, CharProps, OL, OW} from '../cartoon/parts';

// Лёха — главный герой канала «Вселенная Лёхи».
// Вихор на макушке, веснушки, охристое худи с нашивкой-планетой, синие джинсы.

export const LYOKHA = {
	hair: '#7a4a2a',
	hoodie: '#e8a93a',
	jeans: '#3d5a8a',
};

export const Lyokha: React.FC<Partial<CharProps> & {x: number; y: number; thinking?: boolean}> = ({thinking = false, face, armR, armL, ...rest}) => (
	<Char
		{...rest}
		hair="lyokha"
		hairColor={LYOKHA.hair}
		freckles
		hoodie
		patch
		jacket={LYOKHA.hoodie}
		pants={LYOKHA.jeans}
		face={face ?? (thinking ? 'think' : 'smile')}
		armR={thinking ? [-76, 223] : armR}
		foreR={1}
		armL={thinking ? [18, -78] : armL}
		armROver={thinking || rest.armROver}
		look={thinking ? 0.6 : rest.look}
	/>
);

const QMark: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x} ${y + Math.sin(t * 2.2) * 10}) rotate(${12 + Math.sin(t * 1.6) * 5}) scale(${s})`}>
		<text x={0} y={0} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={300} fill={C.ochre} stroke={OL} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
			?
		</text>
	</g>
);

const Space: React.FC<{t: number; w: number; h: number}> = ({t, w, h}) => (
	<>
		<rect width={w} height={h} fill="#1d2b4f" />
		{Array.from({length: 46}).map((_, i) => (
			<circle key={i} cx={hash(i) * w} cy={hash(i + 11) * h} r={3 + hash(i + 5) * 4} fill="#fff6c8" opacity={0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + i))} />
		))}
		{/* planet with ring */}
		<g transform={`translate(${w * 0.25} ${h * 0.27}) rotate(${-14 + Math.sin(t) * 2})`}>
			<circle r={70} fill="#d9483b" stroke={OL} strokeWidth={OW} />
			<path d="M -60 -20 Q 0 -8 62 -26" fill="none" stroke="#b33a2f" strokeWidth={10} />
			<ellipse rx={118} ry={28} fill="none" stroke={OL} strokeWidth={18} />
			<ellipse rx={118} ry={28} fill="none" stroke={C.ochre} strokeWidth={8} />
			<path d="M -70 0 A 70 70 0 0 0 70 0" fill="#d9483b" stroke={OL} strokeWidth={OW} />
		</g>
		{/* small moon */}
		<circle cx={w * 0.86} cy={h * 0.78} r={42} fill="#fff1c0" stroke={OL} strokeWidth={OW} />
		<circle cx={w * 0.86 - 12} cy={h * 0.78 - 10} r={9} fill="#f3d98a" />
	</>
);

/** Avatar for the channel: Лёха thinking, a big question mark, space behind. Square 1080. */
export const LyokhaAvatar: React.FC = () => {
	const t = useCurrentFrame() / 30;
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill>
				<svg width={1080} height={1080} viewBox="0 0 1080 1080">
					<Space t={t} w={1080} h={1080} />
					<Lyokha x={470} y={1512} s={1.7} thinking />
					<QMark x={790} y={400} s={0.85} t={t} />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

/** Character sheet: full height + emotions. */
export const LyokhaSheet: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const faces: [CharProps['face'], string][] = [
		['smile', 'рад'],
		['think', 'думает'],
		['shock', 'удивлён'],
		['laugh', 'смеётся'],
	];
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{background: C.wall}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<rect x={60} y={60} width={960} height={120} rx={18} fill={C.paper} stroke={OL} strokeWidth={OW} />
					<rect x={60} y={60} width={34} height={120} rx={10} fill={C.red} stroke={OL} strokeWidth={OW} />
					<text x={130} y={140} fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>
						Лёха · главный герой
					</text>
					<rect x={40} y={1100} width={1000} height={26} rx={13} fill={C.wood} stroke={OL} strokeWidth={6} />
					<Lyokha x={300} y={1100} s={1.0} face="smile" armR={[30, -20]} />
					<Lyokha x={780} y={1100} s={1.0} thinking />
					<g transform="translate(940 380)">
						<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={160} fill={C.ochre} stroke={OL} strokeWidth={10} paintOrder="stroke">
							?
						</text>
					</g>
					<text x={300} y={1180} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={OL}>
						Лёха
					</text>
					<text x={300} y={1222} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={30} fill={C.red}>
						рассказчик, всё ему интересно
					</text>
					<text x={780} y={1180} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={OL}>
						фирменная поза
					</text>
					<text x={780} y={1222} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={30} fill={C.red}>
						«а почему так?»
					</text>
					<rect x={40} y={1720} width={1000} height={26} rx={13} fill={C.wood} stroke={OL} strokeWidth={6} />
					{faces.map(([f, l], i) => (
						<g key={l}>
							<Lyokha x={170 + i * 245} y={1720} s={0.55} face={f} />
							<text x={170 + i * 245} y={1790} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={32} fill={OL}>
								{l}
							</text>
						</g>
					))}
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
