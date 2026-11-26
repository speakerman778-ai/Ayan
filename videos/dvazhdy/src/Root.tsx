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
import {Muravei, MURAVEI_DURATION} from './series/Muravei';
import {SideSheet, SideWalk} from './series/SideDemo';
import {FlatSheet, FlatWalk} from './series/FlatDemo';
import {FlatStyleDemo} from './series/FlatStyleDemo';
import {Prygnuli, PRYG_DURATION} from './series/Prygnuli';
import {Kv190, KV190_DURATION} from './series/Kv190';
import {Style3D, STYLE3D_DURATION} from './series/Style3D';
import {Ovoshch, OVOSHCH_DURATION} from './series/Ovoshch';
import {Mongols, MONGOLS_DURATION} from './series/Mongols';
import {Ovoshch2, OVOSHCH2_DURATION} from './series/Ovoshch2';
import {Ovoshch3, OVOSHCH3_DURATION} from './series/Ovoshch3';
import {Ovoshch4, OVOSHCH4_DURATION} from './series/Ovoshch4';
import {Ovoshch5, OVOSHCH5_DURATION} from './series/Ovoshch5';
import {Ovoshch6, OVOSHCH6_DURATION} from './series/Ovoshch6';
import {Ovoshch7, OVOSHCH7_DURATION} from './series/Ovoshch7';
import {Ovoshch8, OVOSHCH8_DURATION} from './series/Ovoshch8';
import {Collab01, COLLAB01_DURATION} from './series/Collab01';
import {Stream, STREAM_DURATION} from './series/Stream';
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
	<Composition id="Stream" component={Stream} width={1080} height={1920} fps={30} durationInFrames={STREAM_DURATION * 30} defaultProps={{audio: 'shnurok/ep12-mix.wav'}} />
	<Composition id="Ovoshch6" component={Ovoshch6} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH6_DURATION * 30} defaultProps={{audio: 'shnurok/ep11-mix.wav'}} />
	<Composition id="Ovoshch7" component={Ovoshch7} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH7_DURATION * 30} defaultProps={{audio: 'shnurok/ep13-mix.wav'}} />
	<Composition id="Ovoshch8" component={Ovoshch8} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH8_DURATION * 30} defaultProps={{audio: 'shnurok/ep14-mix.wav'}} />
	<Composition id="Collab01" component={Collab01} width={1080} height={1920} fps={30} durationInFrames={COLLAB01_DURATION * 30} defaultProps={{audio: 'collab/mix.wav'}} />
	<Composition id="Ovoshch5" component={Ovoshch5} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH5_DURATION * 30} defaultProps={{audio: 'shnurok/ep10-mix.wav'}} />
	<Composition id="Ovoshch4" component={Ovoshch4} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH4_DURATION * 30} defaultProps={{audio: 'shnurok/ep09-mix.wav'}} />
	<Composition id="Ovoshch3" component={Ovoshch3} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH3_DURATION * 30} defaultProps={{audio: 'shnurok/ep08-mix.wav'}} />
	<Composition id="Ovoshch2" component={Ovoshch2} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH2_DURATION * 30} defaultProps={{audio: 'shnurok/ep07-mix.wav'}} />
	<Composition id="Mongols" component={Mongols} width={1080} height={1920} fps={30} durationInFrames={MONGOLS_DURATION * 30} defaultProps={{audio: 'shnurok/mongols-mix.wav'}} />
	<Composition id="Ovoshch" component={Ovoshch} width={1080} height={1920} fps={30} durationInFrames={OVOSHCH_DURATION * 30} defaultProps={{audio: 'shnurok/ep06-mix.wav'}} />
	<Composition id="Style3D" component={Style3D} width={1080} height={1920} fps={30} durationInFrames={STYLE3D_DURATION * 30} />
	<Composition id="Kv190" component={Kv190} width={1080} height={1920} fps={30} durationInFrames={KV190_DURATION * 30} defaultProps={{audio: 'shnurok/ep05-mix.wav'}} />
	<Composition id="Prygnuli" component={Prygnuli} width={1080} height={1920} fps={30} durationInFrames={PRYG_DURATION * 30} defaultProps={{audio: 'shnurok/ep04-mix.wav'}} />
	<Composition id="FlatStyleDemo" component={FlatStyleDemo} width={1080} height={1920} fps={30} durationInFrames={480} />
	<Composition id="FlatSheet" component={FlatSheet} width={1080} height={1920} fps={30} durationInFrames={30} />
	<Composition id="FlatWalk" component={FlatWalk} width={1080} height={1920} fps={30} durationInFrames={180} />
	<Composition id="SideSheet" component={SideSheet} width={1080} height={1920} fps={30} durationInFrames={30} />
	<Composition id="SideWalk" component={SideWalk} width={1080} height={1920} fps={30} durationInFrames={180} />
	<Composition id="Muravei" component={Muravei} width={1080} height={1920} fps={30} durationInFrames={MURAVEI_DURATION * 30} defaultProps={{audio: 'shnurok/ep03-mix.wav'}} />
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
