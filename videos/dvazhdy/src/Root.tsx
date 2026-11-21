import React from 'react';
import {Composition} from 'remotion';
import {Dvazhdy} from './Video';
import {Sheet} from './cartoon/Sheet';
import {DvazhdyCartoon} from './cartoon/Cartoon';
import {SubsDemo} from './subs/Karaoke';
import {KeeperPreview, KeeperLoop} from './series/Keeper';
import timeline from '../public/timeline.json';

export const Root: React.FC = () => (
	<>
	<Composition id="DvazhdyCartoon" component={DvazhdyCartoon} width={1080} height={1920} fps={30} durationInFrames={Math.ceil(timeline.total * 30)} />
	<Composition id="SubsDemo" component={SubsDemo} width={1080} height={1920} fps={30} durationInFrames={180} />
	<Composition id="KeeperPreview" component={KeeperPreview} width={1080} height={1920} fps={30} durationInFrames={72} />
	<Composition id="KeeperLoop" component={KeeperLoop} width={1080} height={1920} fps={30} durationInFrames={240} />
	<Composition id="Sheet" component={Sheet} width={1080} height={1920} fps={30} durationInFrames={30} />
	<Composition
		id="Dvazhdy"
		component={Dvazhdy}
		width={1080}
		height={1920}
		fps={30}
		durationInFrames={Math.ceil(timeline.total * 30)}
	/>
	</>
);
