import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Char, C, OL} from './parts';

export const Sheet: React.FC = () => (
	<AbsoluteFill style={{background: C.wall}}>
		<svg width={1080} height={1920} viewBox="0 0 1080 1920">
			<rect x={0} y={880} width={1080} height={80} fill={C.tatami} stroke={OL} strokeWidth={6} />
			<Char x={270} y={900} s={1} face="smile" />
			<Char x={780} y={900} s={1} face="shock" bandage burns armL={[150, 20]} armR={[150, 20]} />
			<rect x={0} y={1780} width={1080} height={80} fill={C.tatami} stroke={OL} strokeWidth={6} />
			<Char x={200} y={1800} s={0.8} hair="wife" skirt="#7aa37a" face="smile" />
			<Char x={420} y={1800} s={0.8} hair="boy" kid jacket="#e8a93a" pants="#4a4f5c" face="laugh" />
			<Char x={650} y={1800} s={0.8} hair="boss" glasses mustache jacket="#6d5a4a" face="laugh" />
			<Char x={900} y={1800} s={0.8} hair="old" cane stoop={0.6} face="smile" />
		</svg>
	</AbsoluteFill>
);
