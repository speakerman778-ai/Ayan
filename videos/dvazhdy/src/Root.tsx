import React from 'react';
import {Composition} from 'remotion';
import {Dvazhdy} from './Video';
import {Sheet} from './cartoon/Sheet';
import {DvazhdyCartoon} from './cartoon/Cartoon';
import {SubsDemo} from './subs/Karaoke';
import {KeeperPreview} from './series/Keeper';
import {Ep01Characters, Ep01Props} from './series/Ep01Sheets';
import {Ep01, EP01_DURATION} from './series/Ep01';
import {PcClub, PCCLUB_DURATION} from './series/PcClub';
import {PcClub2, PCCLUB2_DURATION} from './series/PcClub2';
import {Kypshak, KYPSHAK_DURATION} from './series/Kypshak';
import {ShnurokAvatar, ShnurokHairOptions, ShnurokSheet} from './series/Shnurok';
import timeline from '../public/timeline.json';

export const Root: React.FC = () => (
	<>
	<Composition id="DvazhdyCartoon" component={DvazhdyCartoon} width={1080} height={1920} fps={30} durationInFrames={Math.ceil(timeline.total * 30)} />
	<Composition id="SubsDemo" component={SubsDemo} width={1080} height={1920} fps={30} durationInFrames={180} />
	<Composition id="KeeperPreview" component={KeeperPreview} width={1080} height={1920} fps={30} durationInFrames={72} />
	<Composition id="Ep01" component={Ep01} width={1080} height={1920} fps={30} durationInFrames={Math.round(EP01_DURATION * 30)} defaultProps={{audio: 'keeper/ep01-mix.wav'}} />
	<Composition id="ShnurokAvatar" component={ShnurokAvatar} width={1080} height={1080} fps={30} durationInFrames={90} />
	<Composition id="ShnurokHairOptions" component={ShnurokHairOptions} width={1080} height={1920} fps={30} durationInFrames={30} />
	<Composition id="ShnurokSheet" component={ShnurokSheet} width={1080} height={1920} fps={30} durationInFrames={90} />
	<Composition id="Kypshak" component={Kypshak} width={1080} height={1920} fps={30} durationInFrames={KYPSHAK_DURATION * 30} defaultProps={{audio: 'kypshak/mix.wav'}} />
	<Composition id="PcClub2" component={PcClub2} width={1080} height={1920} fps={30} durationInFrames={PCCLUB2_DURATION * 30} defaultProps={{audio: 'shnurok/ep02-mix.wav'}} />
	<Composition id="PcClub" component={PcClub} width={1080} height={1920} fps={30} durationInFrames={Math.round(PCCLUB_DURATION * 30)} defaultProps={{audio: 'shnurok/ep01-mix.wav'}} />
	<Composition id="Ep01Characters" component={Ep01Characters} width={1080} height={1920} fps={30} durationInFrames={120} />
	<Composition id="Ep01Props" component={Ep01Props} width={1080} height={1920} fps={30} durationInFrames={120} />
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
