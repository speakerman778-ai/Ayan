import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import {Badge, Cam, Kitchen, QMark, clamp01, ease, pop} from './PcClub';
import rawWords from '../../public/shnurok/ep03-words.json';

// «Шнурок размером с муравья» — выдуманная история с настоящими фактами.

const FPS = 30;
const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();
export const MURAVEI_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 2.2);

const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:]»?$/.test(prev.text);
		const ell = prev && /…$/.test(prev.text) && cur.length > 1;
		if (cur.length && (cur.length >= 5 || end || ell || gap > 0.6)) {
			caps.push(cur);
			cur = [];
		}
		cur.push(w);
		if (i === WORDS.length - 1) caps.push(cur);
	});
	return caps.map((c) => c.map((w, i) => (i < c.length - 1 ? {...w, end: c[i + 1].start} : w)));
})();

const norm = (s: string) => s.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && norm(x.text) === w);
const T = (w: string, from = 0) => {
	const i = idx(w, from);
	return i >= 0 ? WORDS[i].start : 0;
};
const B = (() => {
	const s = (i: number) => Math.max(0, (WORDS[Math.max(0, i)]?.start ?? 0) - 0.25);
	return [0, s(idx('первым')), s(idx('запыхался') - 1), s(idx('молча') - 1), s(idx('голодному')), s(idx('привели') - 1), s(idx('рассказала') - 1), s(idx('ещё') - 1), s(idx('тут')), s(idx('какой'))];
})();

// ------------------------------------------------------------------ props
const ANT = '#5a3a28';
const Ant: React.FC<{x: number; y: number; s?: number; t: number; walk?: boolean; crown?: boolean; glowSpir?: number; glowBelly?: number; flip?: boolean}> = ({x, y, s = 1, t, walk = false, crown = false, glowSpir = 0, glowBelly = 0, flip = false}) => {
	const st = walk ? Math.sin(t * 12) * 14 : Math.sin(t * 2) * 3;
	return (
		<g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
			<ellipse cx={0} cy={6} rx={170} ry={14} fill="#000" opacity={0.15} />
			{/* legs */}
			{[-50, 0, 50].map((lx, i) => (
				<g key={i}>
					<path d={`M ${lx} -70 L ${lx - 30 + (i % 2 ? st : -st)} -110 L ${lx - 50 + (i % 2 ? st : -st)} 0`} stroke={OL} strokeWidth={10} fill="none" strokeLinejoin="round" strokeLinecap="round" />
					<path d={`M ${lx} -70 L ${lx + 30 + (i % 2 ? -st : st)} -110 L ${lx + 50 + (i % 2 ? -st : st)} 0`} stroke={OL} strokeWidth={10} fill="none" strokeLinejoin="round" strokeLinecap="round" />
				</g>
			))}
			{/* abdomen, thorax, head */}
			<ellipse cx={-120} cy={-90} rx={80} ry={62} fill={ANT} stroke={OL} strokeWidth={OW} />
			{glowBelly > 0 && (
				<g opacity={glowBelly}>
					<circle cx={-140} cy={-95} r={26} fill={C.ochre} stroke={OL} strokeWidth={4} />
					<circle cx={-95} cy={-90} r={20} fill="#7dbb6a" stroke={OL} strokeWidth={4} />
				</g>
			)}
			<ellipse cx={0} cy={-90} rx={56} ry={36} fill={ANT} stroke={OL} strokeWidth={OW} />
			{glowSpir > 0 &&
				[-150, -110, -70, -20, 20].map((sx, i) => <circle key={i} cx={sx} cy={-80 + (i % 2) * 10} r={7} fill="#9fd0e8" stroke={OL} strokeWidth={3} opacity={glowSpir * (0.6 + 0.4 * Math.sin(t * 6 + i))} />)}
			<g transform="translate(95 -120)">
				<path d={`M 10 -50 Q 40 -${120 + Math.sin(t * 3) * 10} 90 -110 M 30 -50 Q 70 -${100 + Math.cos(t * 3) * 10} 110 -80`} stroke={OL} strokeWidth={8} fill="none" strokeLinecap="round" />
				<ellipse cx={0} cy={0} rx={62} ry={56} fill={ANT} stroke={OL} strokeWidth={OW} />
				<ellipse cx={22} cy={-8} rx={20} ry={24} fill="#fff" stroke={OL} strokeWidth={5} />
				<ellipse cx={28} cy={-6} rx={11} ry={15} fill={OL} />
				<circle cx={32} cy={-12} r={5} fill="#fff" />
				<path d="M 30 30 Q 45 40 56 26" stroke={OL} strokeWidth={6} fill="none" strokeLinecap="round" />
				<ellipse cx={-10} cy={20} rx={12} ry={7} fill={C.cheek} opacity={0.6} />
				{crown && <path d="M -40 -50 L -30 -100 L -10 -70 L 10 -110 L 30 -70 L 50 -100 L 56 -50 Z" fill={C.ochre} stroke={OL} strokeWidth={6} strokeLinejoin="round" />}
			</g>
		</g>
	);
};

const Crumb: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -150 0 L -170 -90 L -100 -170 L 20 -190 L 140 -140 L 170 -40 L 130 0 Z" fill="#d9a860" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		{[[-80, -90], [20, -120], [70, -60], [-20, -40], [100, -110]].map(([cx, cy], i) => (
			<circle key={i} cx={cx} cy={cy} r={10} fill="#b88a40" />
		))}
	</g>
);

const MicroWorld: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#bfe3f0" />
		<circle cx={860} cy={260} r={90} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
		{/* giant grass blades */}
		{Array.from({length: 9}).map((_, i) => {
			const x = 40 + i * 130 + hash(i) * 40;
			const sw = Math.sin(t * 1.2 + i) * 14;
			return <path key={i} d={`M ${x - 26} 1300 Q ${x + sw} 700 ${x + 10 + sw * 2} ${380 + hash(i + 2) * 260} Q ${x + 20} 760 ${x + 26} 1300 Z`} fill={i % 2 ? '#5f9e55' : '#7dbb6a'} stroke={OL} strokeWidth={OW} />;
		})}
		<rect x={0} y={1280} width={1080} height={640} fill="#9c6f48" stroke={OL} strokeWidth={OW} />
		{Array.from({length: 14}).map((_, i) => (
			<ellipse key={i} cx={hash(i + 5) * 1080} cy={1360 + hash(i + 9) * 500} rx={30 + hash(i) * 40} ry={18 + hash(i + 1) * 20} fill="#b8b2a8" stroke={OL} strokeWidth={5} />
		))}
	</>
);

const FactCard: React.FC<{text: string; t: number; from: number; y?: number}> = ({text, t, from, y = 250}) =>
	t < from ? null : (
		<g transform={`translate(540 ${y}) scale(${pop(t, from)})`}>
			<rect x={-500} y={-90} width={1000} height={180} rx={26} fill={C.ochre} stroke={OL} strokeWidth={OW} />
			<rect x={-480} y={-72} width={150} height={56} rx={12} fill={C.red} stroke={OL} strokeWidth={5} />
			<text x={-405} y={-32} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">
				ФАКТ
			</text>
			<text x={0} y={46} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={text.length > 30 ? 40 : 50} fill={OL}>
				{text}
			</text>
		</g>
	);

// ------------------------------------------------------------------ scenes
const S1: React.FC<{t: number}> = ({t}) => {
	const shrink = T('стал') - 0.3;
	const k = ease((t - shrink) / 0.8);
	const flash = t > shrink - 0.1 && t < shrink + 0.6 ? 1 - Math.abs(t - shrink - 0.2) / 0.4 : 0;
	return (
		<>
			{k < 0.95 ? (
				<Cam z={1.03} cx={540} cy={1100}>
					<Kitchen t={t} />
					<rect x={160} y={1080} width={760} height={26} rx={8} fill={C.wood} stroke={OL} strokeWidth={OW} />
					<g transform={`translate(560 1080) scale(${1 - k * 0.9})`}>
						{t < shrink ? (
							<>
								{/* drinking: glass in the right hand at the mouth, head tipped back */}
								<Shnurok x={0} y={250} s={0.95} face="closed" armR={[-46, 213]} armROver headTilt={-10} look={0.5} legL={10} legR={-4} />
								<g transform={`translate(34 -218) rotate(${-25 - 15 * clamp01(t / Math.max(0.1, shrink))})`}>
									<clipPath id="lemon"><rect x={-26} y={-70} width={52} height={78} rx={8} /></clipPath>
									<rect x={-30} y={-74} width={60} height={86} rx={10} fill="#e8f6f8" stroke={OL} strokeWidth={6} opacity={0.95} />
									<g clipPath="url(#lemon)">
										<rect x={-40} y={-66 + 70 * clamp01(t / Math.max(0.1, shrink))} width={80} height={90} fill="#9be86a" />
										{[0, 1, 2].map((i) => (
											<circle key={i} cx={-12 + i * 12} cy={-((t * 50 + i * 22) % 60)} r={4} fill="#fff" opacity={0.85} />
										))}
									</g>
									<circle cx={0} cy={-30} r={60} fill="#bff59a" opacity={0.18 + 0.08 * Math.sin(t * 10)} />
								</g>
							</>
						) : (
							<Shnurok x={0} y={250} s={0.95} face="shock" armR={[150, 20]} armL={[150, 20]} />
						)}
					</g>
				</Cam>
			) : (
				<Cam z={1} cx={540} cy={1100}>
					<MicroWorld t={t} />
					<Crumb x={760} y={1300} s={1.2} />
					<Shnurok x={330} y={1320} s={0.75} face="shock" handOnHead />
				</Cam>
			)}
			<rect width={1080} height={1920} fill="#eaffd0" opacity={Math.max(0, flash)} />
			<NameTag name="Шнурок" role="Вселенная Шнурка" from={0.3} x={60} y={120} avatar={<Shnurok x={0} y={250} s={0.42} />} />
		</>
	);
};

const S2: React.FC<{t: number}> = ({t}) => {
	const A = B[1];
	const lift = ease((t - 1.0) / 0.8);
	const fact = T('десятки') - A - 0.6;
	const pull = T('шнурок', idx('десятки')) - A;
	const tug = t > pull - 1 ? Math.sin(t * 16) * 6 : 0;
	return (
		<Cam z={1.02} cx={540} cy={1100}>
			<MicroWorld t={t} />
			<Ant x={700} y={1330} s={1.5} t={t} />
			<g transform={`translate(${790} ${1300 - lift * 250})`}>
				<Crumb x={0} y={0} s={0.75} />
			</g>
			<g transform={`translate(${tug} 0)`}>
				<Shnurok x={250} y={1340} s={0.75} face={t > pull ? 'shock' : 'determined'} armL={[40, -60]} armR={[40, -60]} />
			</g>
			<FactCard text="поднимают в десятки раз больше себя" t={t} from={fact} />
			{t > pull + 0.4 && <Badge x={250} y={760} text="не могу!" t={t} at={pull + 0.4} size={60} />}
		</Cam>
	);
};

const S3: React.FC<{t: number}> = ({t}) => {
	const A = B[2];
	const lungs = T('лёгких') - A;
	const pant = Math.abs(Math.sin(t * 8));
	return (
		<Cam z={1.02 + 0.08 * ease((t - lungs) / 1.5)} cx={600} cy={1150}>
			<MicroWorld t={t} />
			<Ant x={700} y={1330} s={1.6} t={t} glowSpir={ease((t - lungs) / 0.6)} />
			<g transform={`translate(0 ${pant * 6})`}>
				<Shnurok x={230} y={1340} s={0.75} face="wince" />
			</g>
			{[0, 1, 2].map((i) => (
				<path key={i} d="M 0 0 Q 8 12 0 20 Q -8 12 0 0 Z" transform={`translate(${170 + i * 60} ${820 + ((t * 60 + i * 30) % 80)})`} fill="#9fd0e8" stroke={OL} strokeWidth={3} />
			))}
			<FactCard text="нет лёгких — дышат дырочками по бокам" t={t} from={lungs} />
		</Cam>
	);
};

const S4: React.FC<{t: number}> = ({t}) => {
	const A = B[3];
	const smell = T('запахами') - A;
	return (
		<Cam z={1.02} cx={540} cy={1100}>
			<MicroWorld t={t} />
			<Ant x={250} y={1330} s={1.1} t={t} />
			<Ant x={830} y={1330} s={1.1} t={t + 1} flip />
			{t > smell - 0.5 &&
				Array.from({length: 7}).map((_, i) => {
					const k = (t * 0.6 + i / 7) % 1;
					return <circle key={i} cx={440 + k * 200} cy={1080 - Math.sin(k * Math.PI) * 80} r={18 + i * 2} fill={['#f29b8a', '#ffe08a', '#9fd0e8'][i % 3]} opacity={0.8} stroke={OL} strokeWidth={3} />;
				})}
			{/* scent trail home */}
			{t > smell &&
				Array.from({length: 10}).map((_, i) => (
					<circle key={i} cx={100 + i * 100} cy={1500 + Math.sin(i) * 30} r={10} fill="#f29b8a" opacity={clamp01((t - smell) * 3 - i * 0.2)} />
				))}
			<Shnurok x={540} y={1330} s={0.55} thinking />
			<FactCard text="общаются запахами" t={t} from={smell} />
		</Cam>
	);
};

const S5: React.FC<{t: number}> = ({t}) => {
	const A = B[4];
	const fu = T('фу') - A;
	const belly = T('второй') - A;
	return (
		<Cam z={1.02} cx={540} cy={1100}>
			<MicroWorld t={t} />
			<Ant x={760} y={1330} s={1.5} t={t} flip glowBelly={ease((t - belly) / 0.5)} />
			{t < fu + 0.5 && <circle cx={530 - ease(t / 1.5) * 80} cy={1180} r={22} fill="#ffe08a" stroke={OL} strokeWidth={5} />}
			<Shnurok x={300} y={1340} s={0.75} face={t > fu ? 'wince' : 'smile'} />
			{t > fu && <Badge x={300} y={800} text="ФУ!" t={t} at={fu} size={90} color="#7dbb6a" />}
			<FactCard text="второй желудок — чтобы делиться едой" t={t} from={belly} />
		</Cam>
	);
};

const Tunnels: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#7a5236" />
		{Array.from({length: 20}).map((_, i) => (
			<circle key={i} cx={hash(i) * 1080} cy={hash(i + 3) * 1920} r={10 + hash(i + 6) * 20} fill="#6a4630" />
		))}
		<path d="M 80 1500 Q 300 1300 540 1340 Q 800 1380 1000 1200" stroke="#a07050" strokeWidth={120} fill="none" strokeLinecap="round" />
		<ellipse cx={540} cy={1000} rx={460} ry={360} fill="#a07050" stroke={OL} strokeWidth={OW} />
		<circle cx={540} cy={700} r={120} fill="#ffe89a" opacity={0.25 + 0.05 * Math.sin(t * 5)} />
	</>
);

const S6: React.FC<{t: number}> = ({t}) => {
	const A = B[5];
	const age = T('тридцать') - A;
	return (
		<Cam z={1.02 + 0.04 * ease(t / 6)} cx={540} cy={1050}>
			<Tunnels t={t} />
			<rect x={300} y={1180} width={480} height={60} rx={20} fill={C.red} stroke={OL} strokeWidth={OW} />
			<Ant x={560} y={1200} s={1.15} t={t} crown />
			<Ant x={200} y={1400} s={0.45} t={t} />
			<Ant x={900} y={1420} s={0.45} t={t + 2} flip />
			<Shnurok x={180} y={1350} s={0.55} face="shock" />
			<FactCard text="королева живёт почти 30 лет" t={t} from={age} />
		</Cam>
	);
};

const S7: React.FC<{t: number}> = ({t}) => {
	const trail = ease((t - 1.2) / 4);
	return (
		<>
			<rect width={1080} height={1920} fill="#f7ecd6" />
			<rect x={40} y={420} width={1000} height={900} rx={30} fill="#6f9ad0" stroke={OL} strokeWidth={OW} />
			{/* rough coasts: Europe north, Africa south */}
			<path d="M 40 420 L 1040 420 L 1040 700 Q 900 760 820 700 Q 760 820 680 760 Q 600 700 540 820 Q 460 900 420 760 Q 340 700 260 760 Q 180 820 120 720 Q 80 700 40 740 Z" fill="#c9d9a0" stroke={OL} strokeWidth={6} />
			<path d="M 40 1320 L 1040 1320 L 1040 1080 Q 800 1040 600 1100 Q 400 1140 220 1060 Q 120 1040 40 1080 Z" fill="#e8cf9a" stroke={OL} strokeWidth={6} />
			<clipPath id="tr"><rect x={0} y={0} width={60 + 980 * trail} height={1920} /></clipPath>
			<path clipPath="url(#tr)" d="M 70 740 Q 180 840 260 780 Q 340 720 420 780 Q 460 920 540 840 Q 600 720 680 780 Q 760 840 820 720 Q 900 780 1010 720" stroke={C.red} strokeWidth={16} fill="none" strokeDasharray="4 20" strokeLinecap="round" />
			<FactCard text="одна семья ≈ 6000 км вдоль моря" t={t} from={T('шесть') - B[6]} y={260} />
			<text x={540} y={1240} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={OL}>
				Средиземное море
			</text>
			<Ant x={60 + 900 * trail} y={760} s={0.22} t={t} walk />
		</>
	);
};

const S8: React.FC<{t: number}> = ({t}) => {
	const A = B[7];
	const dino = T('динозавров') - A;
	return (
		<Cam z={1.02} cx={540} cy={1100}>
			<rect width={1080} height={1920} fill="#f2c98a" />
			<circle cx={820} cy={300} r={100} fill="#ffe08a" stroke={OL} strokeWidth={OW} />
			{[0, 1, 2].map((i) => (
				<path key={i} d={`M ${100 + i * 330} 1250 L ${180 + i * 330} 900 L ${260 + i * 330} 1250 Z`} fill="#c98c55" stroke={OL} strokeWidth={6} opacity={0.6} />
			))}
			<rect x={0} y={1250} width={1080} height={670} fill="#9c6f48" stroke={OL} strokeWidth={OW} />
			{t > dino - 0.6 && (
				<g transform={`translate(${700 + (1 - ease((t - dino + 0.6) / 0.8)) * 500} 1260) scale(1.2)`}>
					<path d="M -260 0 L -230 -120 Q -260 -160 -360 -150 Q -300 -210 -200 -190 Q -100 -300 40 -280 Q 120 -420 200 -400 Q 260 -390 250 -340 Q 200 -330 160 -300 Q 180 -200 120 -140 L 140 0 L 80 0 L 60 -100 L -100 -100 L -120 0 Z" fill="#7dbb6a" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
					<circle cx={210} cy={-370} r={10} fill={OL} />
				</g>
			)}
			<Ant x={260} y={1270} s={0.5} t={t} />
			<FactCard text="муравьи живут на Земле 100+ млн лет" t={t} from={0.3} />
		</Cam>
	);
};

const S9: React.FC<{t: number}> = ({t}) => {
	const grow = 0.6;
	const k = ease((t - grow) / 0.6);
	const flash = t > grow - 0.1 && t < grow + 0.6 ? 1 - Math.abs(t - grow - 0.2) / 0.4 : 0;
	const carry = T('вынес') - B[8];
	const c = ease((t - carry) / 1.5);
	return (
		<>
			<Cam z={1.03} cx={540} cy={1100}>
				<Kitchen t={t} />
				<rect x={160} y={1080} width={760} height={26} rx={8} fill={C.wood} stroke={OL} strokeWidth={OW} />
				<g transform={`translate(${560 - c * 200} 1080) scale(${0.1 + k * 0.9})`}>
					<Shnurok x={0} y={250} s={0.95} face="joy" armR={c > 0 ? [100, -40] : [150, 20]} armL={[150, 20]} />
				</g>
				<Ant x={560 - c * 200 + (c > 0 ? 110 : 140)} y={c > 0 ? 960 : 1080} s={0.09} t={t} />
			</Cam>
			<rect width={1080} height={1920} fill="#eaffd0" opacity={Math.max(0, flash)} />
		</>
	);
};

const S10: React.FC<{t: number}> = ({t}) => (
	<Cam z={1.05} cx={540} cy={900}>
		<MicroWorld t={t} />
		<Shnurok x={540} y={1700} s={1.0} thinking />
		<Ant x={820} y={1720} s={0.45} t={t} flip />
		<QMark x={820} y={760} t={t} s={0.9} />
	</Cam>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
const FADE = 0.25;

const Layer: React.FC<{lead: number; C: React.FC<{t: number}>}> = ({lead, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
	const a = lead === 0 ? 1 : clamp01((t + lead) / FADE);
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: a}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<Scene t={t} />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const Muravei: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [MURAVEI_DURATION - 0.6, MURAVEI_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			{SCENES.map((S, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : MURAVEI_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				const end = Math.round(to * FPS);
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, end - start)}>
						<Layer lead={from - start / FPS} C={S} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} />}
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
