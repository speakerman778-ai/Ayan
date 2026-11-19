import React from 'react';
import {Composition} from 'remotion';
import {Dvazhdy} from './Video';
import timeline from '../public/timeline.json';

export const Root: React.FC = () => (
	<Composition
		id="Dvazhdy"
		component={Dvazhdy}
		width={1080}
		height={1920}
		fps={30}
		durationInFrames={Math.ceil(timeline.total * 30)}
	/>
);
