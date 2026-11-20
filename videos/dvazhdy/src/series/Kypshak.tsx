import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import rawWords from '../../public/kypshak/words.json';

// «Кто такие кыпчаки?» — познавательный мультик для урока. Шнурок попадает в степь XII века.

const FPS = 30;
const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();
export const KYPSHAK_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 2.2);

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

/** Start time of the first word that begins with `w` (searching from word index `from`). */
const at = (w: string, from = 0): number => {
	const i = WORDS.findIndex((x, k) => k >= from && x.text.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase().startsWith(w.toLowerCase()));
	return i >= 0 ? WORDS[i].start : 0;
};
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && x.text.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase().startsWith(w.toLowerCase()));

// scene boundaries = first word of each paragraph
const B = (() => {
	const i2 = idx('Шнурок', 5);
	const i3 = idx('Кыпчаки');
	const i4 = idx('На', i3);
	const i5 = idx('Жили');
	const i6 = idx('А', i5 + 3);
	const i7 = idx('Но', i6);
	const i8 = idx('Но', i7 + 3);
	const i9 = idx('Шнурок', i8);
	const i10 = idx('А', i9 + 3);
	return [0, i2, i3, i4, i5, i6, i7, i8, i9, i10].map((i, k) => (k === 0 ? 0 : Math.max(0, WORDS[i].start - 0.25)));
})();

// ------------------------------------------------------------------ helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const prog = (t: number, a: number, d: number) => clamp01((t - a) / d);
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const pop = (t: number, a: number) => Easing.out(Easing.back(2))(clamp01((t - a) / 0.35));
const Cam: React.FC<{z: number; cx: number; cy: number; children: React.ReactNode}> = ({z, cx, cy, children}) => (
	<g transform={`translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>
);
const Label: React.FC<{x: number; y: number; text: string; size?: number; color?: string; t?: number; from?: number; rot?: number}> = ({x, y, text, size = 56, color = C.red, t = 99, from = 0, rot = 0}) =>
	t < from ? null : (
		<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${pop(t, from)})`}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={OL} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);

// ------------------------------------------------------------------ props
const STONE = '#a9a39a';
const StoneWarrior: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<rect x={-90} y={-30} width={180} height={30} fill="#8f897f" stroke={OL} strokeWidth={OW} />
		<path d="M -70 -30 L -78 -300 Q -80 -360 -40 -380 L 40 -380 Q 80 -360 78 -300 L 70 -30 Z" fill={STONE} stroke={OL} strokeWidth={OW} />
		<ellipse cx={0} cy={-440} rx={62} ry={74} fill={STONE} stroke={OL} strokeWidth={OW} />
		<path d="M -50 -470 Q 0 -540 50 -470" fill="#8f897f" stroke={OL} strokeWidth={6} />
		<path d="M -28 -440 l 18 0 M 10 -440 l 18 0 M -6 -425 l 6 22 M -20 -395 q 20 10 40 0" stroke={OL} strokeWidth={6} fill="none" strokeLinecap="round" />
		{/* hands holding a bowl at the belly — typical for Kipchak statues */}
		<path d="M -76 -280 Q -40 -200 -20 -190 M 76 -280 Q 40 -200 20 -190" stroke={OL} strokeWidth={8} fill="none" />
		<path d="M -40 -200 Q 0 -150 40 -200 Z" fill="#8f897f" stroke={OL} strokeWidth={6} />
		<path d="M -60 -120 L 60 -120" stroke={OL} strokeWidth={5} opacity={0.5} />
		<path d="M -50 -330 q 6 20 0 40 M 40 -300 q -6 20 4 40" stroke="#8f897f" strokeWidth={5} fill="none" />
	</g>
);

const Yurt: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		{[0, 1].map((i) => {
			const k = (t * 0.4 + i * 0.5) % 1;
			return <path key={i} d={`M ${-6 + i * 10} ${-250 - k * 120} q 14 -20 0 -40`} stroke="#c9c4bd" strokeWidth={10} fill="none" strokeLinecap="round" opacity={1 - k} />;
		})}
		<path d="M -200 0 L -200 -120 Q -120 -240 0 -250 Q 120 -240 200 -120 L 200 0 Z" fill="#f4efe4" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		<path d="M -200 -120 Q 0 -150 200 -120" fill="none" stroke={C.red} strokeWidth={12} />
		<path d="M -200 -60 L 200 -60" stroke={C.red} strokeWidth={8} strokeDasharray="20 14" />
		<rect x={-50} y={-130} width={100} height={130} rx={6} fill={C.red} stroke={OL} strokeWidth={OW} />
		<path d="M -30 -100 l 30 -20 l 30 20 M -30 -60 l 30 -20 l 30 20" stroke={C.ochre} strokeWidth={6} fill="none" />
		<ellipse cx={0} cy={-246} rx={34} ry={10} fill={C.woodDark} stroke={OL} strokeWidth={5} />
	</g>
);

const Horse: React.FC<{x: number; y: number; s?: number; t: number; color?: string; flip?: boolean; gallop?: boolean}> = ({x, y, s = 1, t, color = '#9c6338', flip = false, gallop = false}) => {
	const sw = gallop ? Math.sin(t * 14) * 20 : Math.sin(t * 2) * 3;
	const bob = gallop ? Math.abs(Math.sin(t * 14)) * -10 : 0;
	return (
		<g transform={`translate(${x} ${y + bob}) scale(${flip ? -s : s} ${s})`}>
			{[[-90, sw], [-60, -sw], [70, -sw], [100, sw]].map(([lx, a], i) => (
				<g key={i} transform={`rotate(${a} ${lx} -130)`}>
					<rect x={lx - 12} y={-130} width={24} height={130} rx={10} fill={color} stroke={OL} strokeWidth={6} />
					<rect x={lx - 14} y={-14} width={28} height={16} rx={4} fill={OL} />
				</g>
			))}
			<ellipse cx={0} cy={-170} rx={140} ry={70} fill={color} stroke={OL} strokeWidth={OW} />
			<path d={`M -140 -190 q -40 ${30 + Math.sin(t * 3) * 8} -30 80`} stroke={OL} strokeWidth={22} fill="none" strokeLinecap="round" />
			<path d="M 100 -200 L 160 -300 L 220 -280 L 230 -250 L 170 -230 L 130 -150 Z" fill={color} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<path d="M 110 -210 L 150 -300 L 130 -290 L 95 -220" fill={OL} />
			<circle cx={190} cy={-275} r={7} fill={OL} />
			<path d="M 165 -305 l 6 -24 l 10 22" fill={color} stroke={OL} strokeWidth={5} />
		</g>
	);
};

const Sheep: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x} ${y + Math.sin(t * 2 + x) * 2}) scale(${s})`}>
		<rect x={-40} y={-50} width={14} height={50} fill={OL} />
		<rect x={26} y={-50} width={14} height={50} fill={OL} />
		{[[-40, -90], [-10, -110], [24, -100], [44, -80], [-30, -60], [10, -60], [40, -60]].map(([cx, cy], i) => (
			<circle key={i} cx={cx} cy={cy} r={34} fill="#f4f1ea" stroke={OL} strokeWidth={6} />
		))}
		<ellipse cx={80} cy={-100} rx={26} ry={34} fill="#3b2a22" />
		<circle cx={88} cy={-108} r={5} fill="#fff" />
	</g>
);

const Grass: React.FC<{t: number; y: number; n?: number; color?: string}> = ({t, y, n = 40, color = '#c9b98a'}) => (
	<>
		{Array.from({length: n}).map((_, i) => {
			const x = hash(i) * 1100 - 10;
			const yy = y + hash(i + 7) * 500;
			const sw = Math.sin(t * 2 + i) * 12;
			return <path key={i} d={`M ${x} ${yy} q ${sw} -50 ${sw * 2 + 6} -110`} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" />;
		})}
	</>
);

const Steppe: React.FC<{t: number; dark?: number}> = ({t, dark = 0}) => (
	<>
		<rect width={1080} height={1920} fill={dark > 0.5 ? '#6b5d6e' : '#9fd0e8'} />
		<rect width={1080} height={1920} fill="#3a2f45" opacity={dark * 0.6} />
		<circle cx={820} cy={300} r={80} fill="#ffe08a" stroke={OL} strokeWidth={OW} opacity={1 - dark} />
		<path d={`M ${120 + t * 6} 300 q 30 -40 70 -16 q 40 -30 70 10 q 40 0 30 30 Z`} fill="#fffaf0" stroke={OL} strokeWidth={5} opacity={1 - dark * 0.7} />
		<path d="M -20 1000 Q 300 900 600 960 Q 850 1000 1100 930 L 1100 1940 L -20 1940 Z" fill="#b9b06a" stroke={OL} strokeWidth={OW} />
		<path d="M -20 1150 Q 300 1080 700 1130 Q 900 1150 1100 1100 L 1100 1940 L -20 1940 Z" fill="#a8a05a" stroke={OL} strokeWidth={OW} />
		<Grass t={t} y={1120} />
	</>
);

const Museum: React.FC<{t: number}> = ({t}) => (
	<>
		<rect width={1080} height={1920} fill="#e9dcc4" />
		<rect x={0} y={0} width={1080} height={90} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
		{[[150, 420], [930, 420]].map(([x, y], i) => (
			<g key={i}>
				<rect x={x - 110} y={y - 140} width={220} height={280} fill={C.ochre} stroke={OL} strokeWidth={OW} />
				<rect x={x - 86} y={y - 116} width={172} height={232} fill={i ? '#9fd0e8' : '#b9b06a'} stroke={OL} strokeWidth={5} />
				{i ? <circle cx={x} cy={y - 20} r={40} fill="#ffe08a" stroke={OL} strokeWidth={5} /> : <path d={`M ${x - 80} ${y + 60} Q ${x} ${y - 40} ${x + 80} ${y + 60}`} fill="#a8a05a" stroke={OL} strokeWidth={5} />}
			</g>
		))}
		{[0, 1, 2].map((i) => (
			<circle key={i} cx={300 + i * 240} cy={160} r={70} fill="#fff1c0" opacity={0.25 + 0.04 * Math.sin(t * 6 + i)} />
		))}
		<rect x={0} y={1300} width={1080} height={620} fill="#b98a5e" stroke={OL} strokeWidth={OW} />
		{Array.from({length: 9}).map((_, i) => (
			<line key={i} x1={i * 140 - 60} y1={1300} x2={i * 140 - 260} y2={1920} stroke="#9c6f48" strokeWidth={6} />
		))}
		{/* rope barrier */}
		{[340, 740].map((x) => (
			<g key={x}>
				<rect x={x - 10} y={1160} width={20} height={150} fill={C.ochre} stroke={OL} strokeWidth={5} />
				<circle cx={x} cy={1160} r={18} fill={C.ochre} stroke={OL} strokeWidth={5} />
			</g>
		))}
		<path d="M 340 1180 Q 540 1260 740 1180" stroke={C.red} strokeWidth={14} fill="none" />
		<rect x={300} y={1230} width={480} height={0} />
	</>
);

// ------------------------------------------------------------------ scenes
const S1: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.02 + 0.05 * ease(t / 6)} cx={540} cy={900}>
			<Museum t={t} />
			<rect x={420} y={1080} width={240} height={110} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<StoneWarrior x={540} y={1080} s={1} />
			<rect x={600} y={1110} width={140} height={60} rx={6} fill="#f7ecd6" stroke={OL} strokeWidth={5} />
			<text x={670} y={1150} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={22} fill={OL}>
				XII век
			</text>
			<Shnurok x={220} y={1420} s={0.9} thinking />
			<Label x={250} y={640} text="?" size={160} color={C.ochre} t={t} from={3.5} />
		</Cam>
		<NameTag name="Шнурок" role="вселенная Лёхи" from={0.3} x={60} y={120} avatar={<Shnurok x={0} y={250} s={0.42} />} />
	</>
);

const Flash: React.FC<{t: number}> = ({t}) => {
	const a = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.4);
	return <rect width={1080} height={1920} fill="#fffaf0" opacity={a} />;
};

const S2: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.0 + 0.06 * ease(t / 6)} cx={540} cy={1000}>
			<Steppe t={t} />
			<Yurt x={240} y={1000} s={0.45} t={t} />
			<Yurt x={420} y={985} s={0.35} t={t} />
			{[0, 1, 2, 3].map((i) => (
				<Horse key={i} x={700 + i * 90 - ((t * 20) % 60)} y={1010 + (i % 2) * 20} s={0.22} t={t + i} gallop />
			))}
			<Shnurok x={540} y={1500} s={1.0} face="shock" />
		</Cam>
		<Flash t={t + 0.25} />
		<Label x={540} y={560} text="Земля кыпчаков" size={70} t={t} from={2.6} />
	</>
);

const S3: React.FC<{t: number}> = ({t}) => {
	const glow = ease((t - 2.2) / 2.5);
	return (
		<>
			<rect width={1080} height={1920} fill="#f7ecd6" />
			<rect x={40} y={300} width={1000} height={1100} rx={30} fill="#efe0c2" stroke={OL} strokeWidth={OW} />
			{/* rough land mass */}
			<path d="M 80 700 Q 200 560 380 600 Q 560 520 760 560 Q 950 520 1020 640 L 1020 1340 Q 800 1300 600 1340 Q 360 1380 80 1320 Z" fill="#c9d9a0" stroke={OL} strokeWidth={6} />
			<path d="M 80 1100 Q 300 1200 520 1150 L 560 1340 L 80 1340 Z" fill="#6f9ad0" stroke={OL} strokeWidth={5} opacity={0.9} />
			<text x={230} y={1260} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={30} fill="#fffaf0">
				Чёрное море
			</text>
			{/* steppe band, grows from right (Irtysh) to left (Danube) */}
			<clipPath id="band"><rect x={1020 - 940 * glow} y={0} width={1080} height={1920} /></clipPath>
			<path clipPath="url(#band)" d="M 120 930 Q 300 820 520 850 Q 760 800 980 840 L 990 1000 Q 760 990 520 1040 Q 300 1080 130 1060 Z" fill={C.ochre} stroke={OL} strokeWidth={OW} opacity={0.9} />
			<path d="M 960 640 Q 980 760 970 900" stroke="#2b5bd7" strokeWidth={8} fill="none" />
			<path d="M 140 1010 Q 110 960 90 900" stroke="#2b5bd7" strokeWidth={8} fill="none" />
			<Label x={930} y={620} text="Иртыш" size={40} color="#2b5bd7" t={t} from={at('Иртыша') - B[2]} />
			<Label x={170} y={870} text="Дунай" size={40} color="#2b5bd7" t={t} from={at('Дуная') - B[2]} />
			<Label x={560} y={960} text="ДЕШТ-И-КЫПЧАК" size={58} color={C.red} t={t} from={at('Дешт') - B[2]} />
			<Label x={540} y={220} text="XI–XIII века" size={64} color={OL} t={t} from={at('одиннадцатом') - B[2]} />
			<Shnurok x={900} y={1820} s={0.55} face="smile" armL={[150, 20]} />
		</>
	);
};

const Scroll: React.FC<{x: number; y: number; title: string; sub: string; t: number; from: number; color?: string}> = ({x, y, title, sub, t, from, color = C.red}) =>
	t < from ? null : (
		<g transform={`translate(${x} ${y}) scale(${pop(t, from)})`}>
			<rect x={-150} y={-200} width={300} height={400} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
			<rect x={-170} y={-220} width={340} height={40} rx={20} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<rect x={-170} y={180} width={340} height={40} rx={20} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<text x={0} y={-60} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={32} fill={OL}>
				{sub}
			</text>
			<text x={0} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={46} fill={color}>
				{title}
			</text>
		</g>
	);

const S4: React.FC<{t: number}> = ({t}) => {
	const same = at('Но', idx('На', idx('Кыпчаки'))) - B[3];
	return (
		<>
			<Steppe t={t} />
			<rect width={1080} height={1920} fill="#f7ecd6" opacity={0.55} />
			<Scroll x={290} y={620} sub="на Руси" title="половцы" t={t} from={0.2} />
			<Scroll x={790} y={620} sub="в Европе" title="куманы" t={t} from={at('Европе') - B[3]} color="#2b5bd7" />
			{t > same && (
				<g transform={`translate(540 1060) scale(${pop(t, same)})`}>
					<rect x={-300} y={-80} width={600} height={140} rx={30} fill={C.ochre} stroke={OL} strokeWidth={OW} />
					<text x={0} y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={60} fill={OL}>
						= КЫПЧАКИ
					</text>
				</g>
			)}
		</>
	);
};

const S5: React.FC<{t: number}> = ({t}) => {
	const fall = at('Шнурок', idx('седле')) - B[4];
	const f = ease((t - fall) / 0.6);
	return (
		<Cam z={1.02 + 0.04 * ease(t / 9)} cx={540} cy={1100}>
			<Steppe t={t} />
			<Yurt x={260} y={1180} s={0.95} t={t} />
			{[0, 1, 2, 3, 4].map((i) => (
				<Sheep key={i} x={620 + (i % 3) * 120} y={1240 + Math.floor(i / 3) * 70} s={0.55} t={t} />
			))}
			<Horse x={760} y={1560} s={0.75} t={t} />
			{/* Kipchak boy */}
			<Char x={420} y={1640} s={0.62} hair="buzz" hairColor="#2b211d" jacket="#7a4a2a" pants="#3a3f55" headS={0.82} headDrop={18} face="laugh" armR={[60, -20]} />
			{/* Shnurok on the horse → falls */}
			<g transform={`translate(${760 + f * 160} ${1330 + f * 300}) rotate(${f * 80})`}>
				<Shnurok x={0} y={0} s={0.62} face={f > 0.1 ? 'shock' : 'smile'} legL={40} legR={40} armL={[120, 20]} armR={[120, 20]} />
			</g>
		</Cam>
	);
};

const S6: React.FC<{t: number}> = ({t}) => (
	<Cam z={1.0 + 0.08 * ease(t / 8)} cx={540} cy={1000}>
		<Steppe t={t} />
		<path d="M 180 1220 Q 540 820 900 1220 Z" fill="#9c9450" stroke={OL} strokeWidth={OW} />
		<StoneWarrior x={540} y={1010} s={0.65} />
		<Char x={330} y={1300} s={0.55} hair="guy" hairColor="#2b211d" jacket="#7a4a2a" pants="#3a3f55" headS={0.82} bodyS={1.14} headDrop={18} mustache face="neutral" armR={[70, -30]} />
		<Char x={760} y={1300} s={0.5} hair="wife" hairColor="#2b211d" skirt="#d9483b" headS={0.82} headDrop={18} face="smile" />
		<Shnurok x={900} y={1560} s={0.6} face="joy" armL={[150, 20]} armR={[150, 20]} />
		<Label x={540} y={420} text="в память о предках" size={56} t={t} from={1.5} />
	</Cam>
);

const S7: React.FC<{t: number}> = ({t}) => {
	const dark = ease(t / 2);
	const dust = ease((t - 0.5) / 3);
	return (
		<Cam z={1.0 + 0.05 * ease(t / 9)} cx={540} cy={1000}>
			<Steppe t={t} dark={dark} />
			<path d="M -20 1300 Q 300 1260 600 1320 Q 850 1360 1100 1300" stroke="#6f9ad0" strokeWidth={60} fill="none" />
			<path d="M -20 1300 Q 300 1260 600 1320 Q 850 1360 1100 1300" stroke={OL} strokeWidth={6} fill="none" transform="translate(0 32)" />
			{Array.from({length: 7}).map((_, i) => (
				<circle key={i} cx={700 + i * 70 - dust * 200} cy={950 - (i % 3) * 30} r={60 + i * 6} fill="#b9a07a" opacity={0.7 * dust} />
			))}
			{Array.from({length: 6}).map((_, i) => (
				<Horse key={i} x={1150 + i * 70 - dust * 420} y={1000 + (i % 2) * 20} s={0.18} t={t + i} gallop color="#4a3328" flip />
			))}
			{[0, 1, 2].map((i) => (
				<Horse key={i} x={120 + i * 90} y={1060 + (i % 2) * 20} s={0.2} t={t + i} gallop={t > 4} />
			))}
			<Label x={540} y={520} text="1223 · река Калка" size={64} t={t} from={at('тысяча', idx('Но', idx('А', idx('Жили') + 3))) - B[6]} />
		</Cam>
	);
};

const S8: React.FC<{t: number}> = ({t}) => {
	const lang = at('А', idx('Бейбарс')) - B[7];
	const l = ease((t - lang) / 0.6);
	return (
		<>
			<rect width={1080} height={1920} fill="#f7ecd6" />
			<g opacity={1 - l}>
				{/* Baybars on a throne */}
				<rect x={240} y={500} width={600} height={900} rx={40} fill="#e8c070" stroke={OL} strokeWidth={OW} />
				<path d="M 300 560 Q 540 400 780 560" fill="#d9483b" stroke={OL} strokeWidth={OW} />
				<Char x={540} y={1300} s={0.85} hair="crew" hairColor="#2b211d" jacket="#2b5bd7" pants="#3a3f55" headS={0.82} bodyS={1.14} headDrop={18} mustache face="determined" />
				<path d="M 470 680 Q 540 610 610 680 Q 540 660 470 680 Z" fill="#fffaf0" stroke={OL} strokeWidth={6} transform="translate(0 0)" />
				<Label x={540} y={440} text="Бейбарс — султан Египта" size={52} t={t} from={0.8} />
			</g>
			<g opacity={l}>
				<rect x={60} y={420} width={960} height={900} rx={30} fill="#efe0c2" stroke={OL} strokeWidth={OW} />
				<text x={540} y={510} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill={C.red}>
					кыпчакская группа языков
				</text>
				{['казахский', 'татарский', 'башкирский', 'кыргызский'].map((w, i) => (
					<g key={w} transform={`translate(540 ${640 + i * 160}) scale(${pop(t, lang + 0.4 + i * 0.5)})`}>
						<rect x={-260} y={-60} width={520} height={110} rx={24} fill={[C.ochre, '#7fae6a', '#6fb4d0', '#d9483b'][i]} stroke={OL} strokeWidth={OW} />
						<text x={0} y={18} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>
							{w}
						</text>
					</g>
				))}
			</g>
		</>
	);
};

const S9: React.FC<{t: number}> = ({t}) => (
	<>
		<Cam z={1.05} cx={540} cy={900}>
			<Museum t={t} />
			<rect x={420} y={1080} width={240} height={110} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<StoneWarrior x={540} y={1080} s={1} />
			<Shnurok x={220} y={1420} s={0.9} face="joy" armR={[150, 20]} />
		</Cam>
		<Flash t={t + 0.25} />
	</>
);

const S10: React.FC<{t: number}> = ({t}) => (
	<Cam z={1.1 + 0.05 * ease(t / 5)} cx={540} cy={900}>
		<Steppe t={t} />
		<Yurt x={200} y={1000} s={0.4} t={t} />
		<Shnurok x={540} y={1650} s={1.05} thinking />
		<Label x={830} y={700} text="?" size={220} color={C.ochre} t={t} from={0.3} rot={10} />
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

export const Kypshak: React.FC<{audio?: string}> = ({audio = 'kypshak/mix.wav'}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [KYPSHAK_DURATION - 0.6, KYPSHAK_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			{SCENES.map((S, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : KYPSHAK_DURATION;
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
