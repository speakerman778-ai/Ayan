import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {OL, OW} from '../cartoon/parts';
import {SideChar, ShnurokSide} from '../cartoon/SideChar';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import {Pill} from './FlatStyleDemo';
import rawWords from '../../public/shnurok/ep05-words.json';

// «Квартира 190» — страшная история: аномальная зима, двадцатиэтажка, угарный газ, непонятные союзники.

const FPS = 30;
const O = OL;
const W = 5;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.8))(clamp01(v));

const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();
export const KV190_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 150) + 2.5);
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		const gap = prev ? w.start - prev.end : 0;
		const end = prev && /[.!?:]»?$/.test(prev.text);
		const ell = prev && /…»?$/.test(prev.text) && cur.length > 1;
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
const S = (i: number) => Math.max(0, (WORDS[Math.max(0, i)]?.start ?? 0) - 0.2);
const B = [
	0,
	S(idx('соня')),
	S(idx('чате') - 1),
	S(idx('задёрнул') - 1),
	S(idx('постучала') - 2),
	S(idx('горели') - 2),
	S(idx('угарный')),
	S(idx('замигал') - 3),
	S(idx('снизу')),
	S(idx('дворник') - 2),
	S(idx('вздрогнул') - 1),
	S(idx('потянула') - 1),
	S(idx('зовёт') - 1),
	S(idx('один', idx('зовёт'))),
];

// ------------------------------------------------------------------ shared pieces
const Snow: React.FC<{t: number; n?: number; wind?: number; op?: number}> = ({t, n = 90, wind = 1, op = 0.9}) => (
	<>
		{Array.from({length: n}).map((_, i) => {
			const sp = 0.25 + hash(i + 3) * 0.35;
			const k = (t * sp + hash(i)) % 1;
			const x = ((hash(i + 7) * 1400 + k * 500 * wind + Math.sin(t * 2 + i) * 20) % 1400) - 160;
			return <circle key={i} cx={x} cy={k * 2000 - 40} r={2 + hash(i + 11) * 3} fill="#fff" opacity={op * 0.55 * (0.5 + hash(i + 5) * 0.5)} />;
		})}
	</>
);

const Breath: React.FC<{x: number; y: number; t: number; dir?: 1 | -1; ph?: number}> = ({x, y, t, dir = 1, ph = 0}) => {
	const k = ((t + ph) % 2.2) / 2.2;
	if (k > 0.6) return null;
	const p = k / 0.6;
	return (
		<g transform={`translate(${x + dir * p * 60} ${y - p * 30})`} opacity={0.75 * (1 - p)}>
			<circle r={10 + p * 22} fill="#eef4ff" />
			<circle cx={dir * 16} cy={-6} r={6 + p * 16} fill="#eef4ff" />
		</g>
	);
};

const Sonya: React.FC<{x: number; y: number; s?: number; dir?: 1 | -1; face?: 'smile' | 'neutral' | 'shock' | 'closed' | 'joy' | 'think'; armFront?: [number, number]}> = ({x, y, s = 0.55, dir = 1, face = 'neutral', armFront}) => (
	<SideChar x={x} y={y} s={s} dir={dir} face={face} hair="pigtails" hairColor="#7a4a2a" jacket="#f2a6c0" pants="#f2a6c0" shoes="#f4f1ea" headS={0.98} bodyS={0.78} headLower={30} armFront={armFront} phase={1.3} freckles />
);
const Vera: React.FC<{x: number; y: number; s?: number; dir?: 1 | -1; face?: 'smile' | 'neutral' | 'shock' | 'closed' | 'joy' | 'think'}> = ({x, y, s = 0.78, dir = 1, face = 'neutral'}) => (
	<SideChar x={x} y={y} s={s} dir={dir} face={face} hair="long" hairColor="#2b211d" jacket="#5b86c4" pants="#3a3f55" phase={2.1} />
);
const Mikhalych: React.FC<{x: number; y: number; s?: number; dir?: 1 | -1; t: number}> = ({x, y, s = 0.85, dir = -1, t}) => (
	<g>
		<SideChar x={x} y={y} s={s} dir={dir} face="neutral" hair="old" beard jacket="#e8742a" pants="#3a3f55" phase={0.4} armFront={[70, -40]} />
		{/* lantern */}
		<g transform={`translate(${x + dir * 95 * s} ${y - 330 * s + Math.sin(t * 2) * 4})`}>
			<circle r={110} fill="#ffd36a" opacity={0.25 + 0.05 * Math.sin(t * 9)} />
			<path d="M -14 -46 Q 0 -64 14 -46" fill="none" stroke={O} strokeWidth={5} />
			<rect x={-24} y={-44} width={48} height={64} rx={8} fill="#3a3f55" stroke={O} strokeWidth={5} />
			<rect x={-15} y={-34} width={30} height={44} rx={5} fill="#fff1b0" />
		</g>
		{/* frost on the beard */}
		{[0, 1, 2].map((i) => (
			<circle key={i} cx={x + dir * (40 + i * 12) * s} cy={y - 560 * s + i * 14 * s} r={5 * s + 2} fill="#eef4ff" />
		))}
	</g>
);

const Phone: React.FC<{t: number; msgs: {at: number; from: string; text: string; me?: boolean}[]}> = ({t, msgs}) => (
	<g transform={`translate(540 ${900 + (1 - ease(t / 0.4)) * 400}) rotate(${-3 + Math.sin(t * 1.5) * 0.6})`}>
		<rect x={-300} y={-560} width={600} height={1120} rx={60} fill="#1b1e2b" stroke={O} strokeWidth={W} />
		<rect x={-270} y={-520} width={540} height={1040} rx={30} fill="#e9ecf2" />
		<rect x={-270} y={-520} width={540} height={110} rx={30} fill="#3a3f55" />
		<text x={0} y={-450} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={38} fill="#fff">
			Чат «Наш дом»
		</text>
		{msgs.map((m, i) => {
			if (t < m.at) return null;
			const k = back((t - m.at) / 0.3);
			const y = -360 + i * 210;
			const lines = m.text.match(/.{1,22}(\s|$)/g) ?? [m.text];
			const h = 60 + lines.length * 40;
			return (
				<g key={i} transform={`translate(${m.me ? 40 : -250} ${y}) scale(${k})`}>
					<rect x={0} y={0} width={460} height={h} rx={24} fill={m.me ? '#cfe8c8' : '#fffaf0'} stroke={O} strokeWidth={4} />
					<text x={22} y={36} fontFamily="Inter" fontWeight={900} fontSize={26} fill="#c8675b">
						{m.from}
					</text>
					{lines.map((l, j) => (
						<text key={j} x={22} y={76 + j * 40} fontFamily="Inter" fontWeight={700} fontSize={32} fill={O}>
							{l.trim()}
						</text>
					))}
				</g>
			);
		})}
	</g>
);

const Flicker = (t: number, k = 1) => Math.pow(0.5 + 0.5 * Math.sin(t * 1.6), 6) * 0.16 * k;

const Big: React.FC<{text: string; t: number; at: number; y?: number; size?: number; color?: string}> = ({text, t, at, y = 820, size = 260, color = '#eef4ff'}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.3)})`} opacity={clamp01(1.4 - (t - at) * 0.6)}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={O} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round">
				{text}
			</text>
		</g>
	);

// interiors ----------------------------------------------------------------
const Flat: React.FC<{t: number; dark?: number}> = ({t, dark = 0.45}) => (
	<>
		<rect width={1080} height={1920} fill="#56627a" />
		<rect x={80} y={340} width={170} height={210} fill="#1d2b4f" stroke={O} strokeWidth={W} />
		<circle cx={165} cy={445} r={36} fill="#c8675b" stroke={O} strokeWidth={4} />
		{/* radiator with frost */}
		<rect x={140} y={1100} width={260} height={150} rx={10} fill="#d9d4c8" stroke={O} strokeWidth={W} />
		{Array.from({length: 7}).map((_, i) => (
			<line key={i} x1={170 + i * 34} y1={1110} x2={170 + i * 34} y2={1240} stroke="#b8b2a6" strokeWidth={6} />
		))}
		<rect x={0} y={1300} width={1080} height={620} fill="#6b5446" stroke={O} strokeWidth={W} />
		{Array.from({length: 4}).map((_, i) => (
			<line key={i} x1={0} y1={1360 + i * 140} x2={1080} y2={1340 + i * 60} stroke="#62503f" strokeWidth={3} />
		))}
		<rect width={1080} height={1920} fill="#0b1226" opacity={dark} />
	</>
);

const FrostWindow: React.FC<{t: number; x?: number; y?: number; face?: number; hand?: number; curtain?: number}> = ({t, x = 560, y = 330, face = 0, hand = 0, curtain = 0}) => (
	<g>
		<rect x={x - 20} y={y - 20} width={460} height={620} fill="#c9c4bd" stroke={O} strokeWidth={W} />
		<clipPath id={`fw${x}`}><rect x={x} y={y} width={420} height={580} /></clipPath>
		<g clipPath={`url(#fw${x})`}>
			<rect x={x} y={y} width={420} height={580} fill="#14203d" />
			<Snow t={t} n={18} wind={1.2} />
			{/* frost patterns */}
			{Array.from({length: 6}).map((_, i) => {
				const cx = x + (i % 2 ? 420 : 0);
				const cy = y + hash(i) * 580;
				return <path key={i} d={`M ${cx} ${cy} q ${(i % 2 ? -1 : 1) * 60} -30 ${(i % 2 ? -1 : 1) * 120} 0 m ${(i % 2 ? 1 : -1) * 60} 0 q ${(i % 2 ? -1 : 1) * 20} 30 ${(i % 2 ? -1 : 1) * 70} 40`} stroke="#dfe9ff" strokeWidth={3} fill="none" opacity={0.3} />;
			})}
			{face > 0 && (
				<g opacity={face * (0.55 + 0.1 * Math.sin(t * 3))} transform={`translate(${x + 270} ${y + 260})`}>
					<ellipse rx={70} ry={90} fill="#dfe9ff" />
					<path d="M -80 -60 Q -100 60 -70 150 M 80 -60 Q 100 60 70 150" stroke="#dfe9ff" strokeWidth={30} fill="none" />
					<ellipse cx={-24} cy={-10} rx={10} ry={14} fill="#14203d" />
					<ellipse cx={24} cy={-10} rx={10} ry={14} fill="#14203d" />
					<path d="M -20 36 Q 0 50 20 36" stroke="#14203d" strokeWidth={5} fill="none" />
				</g>
			)}
			{hand > 0 && (
				<g transform={`translate(${x + 320} ${y + 300}) scale(${0.6 + 0.4 * hand})`} opacity={hand}>
					<ellipse rx={60} ry={70} fill="#eef4ff" />
					{[-60, -32, -4, 24, 52, 78].map((fx, i) => (
						<rect key={i} x={fx - 12} y={-160 + Math.abs(i - 2.5) * 12} width={24} height={110} rx={12} fill="#eef4ff" />
					))}
				</g>
			)}
		</g>
		<line x1={x + 210} y1={y} x2={x + 210} y2={y + 580} stroke="#c9c4bd" strokeWidth={14} />
		{/* curtains: two panels with folds, «curtain» = how far the left panel is pulled across */}
		<rect x={x - 50} y={y - 46} width={520} height={22} rx={10} fill="#9c6338" stroke={O} strokeWidth={W} />
		{[0, 1].map((side) => {
			const w0 = side === 0 ? 70 + curtain * 330 : 70;
			const x0 = side === 0 ? x - 40 : x + 420 + 40 - w0;
			const sway = Math.sin(t * 1.4 + side) * 6;
			const folds = 4;
			return (
				<g key={side}>
					<path d={`M ${x0} ${y - 30} L ${x0 + w0} ${y - 30} Q ${x0 + w0 + sway} ${y + 300} ${x0 + w0 + sway * 1.5} ${y + 620} ` + Array.from({length: folds}).map((_, i) => `Q ${x0 + w0 - (i + 0.5) * (w0 / folds)} ${y + 640} ${x0 + w0 - (i + 1) * (w0 / folds)} ${y + 620}`).join(' ') + ` Z`} fill="#8a3e3e" stroke={O} strokeWidth={W} strokeLinejoin="round" />
					{Array.from({length: folds - 1}).map((_, i) => (
						<path key={i} d={`M ${x0 + (i + 1) * (w0 / folds)} ${y - 20} Q ${x0 + (i + 1) * (w0 / folds) + sway * 0.6} ${y + 300} ${x0 + (i + 1) * (w0 / folds) + sway} ${y + 610}`} stroke="#6e2e2e" strokeWidth={5} fill="none" />
					))}
					{Array.from({length: 5}).map((_, i) => (
						<circle key={i} cx={x0 + 10 + i * ((w0 - 20) / 4)} cy={y - 36} r={8} fill="#e8a93a" stroke={O} strokeWidth={3} />
					))}
				</g>
			);
		})}
	</g>
);

const Stairwell: React.FC<{t: number; floor: string}> = ({t, floor}) => (
	<>
		<rect width={1080} height={1920} fill="#5f7a6a" />
		<rect x={0} y={0} width={1080} height={700} fill="#c9c4bd" />
		<rect x={0} y={690} width={1080} height={14} fill="#3a3f55" />
		<path d="M 0 1300 L 1080 1300" stroke={O} strokeWidth={W} />
		<rect x={0} y={1300} width={1080} height={620} fill="#7a7a80" />
		<text x={120} y={560} fontFamily="Inter" fontWeight={900} fontSize={200} fill="#c8675b" opacity={0.45}>
			{floor}
		</text>
		{/* lamp */}
		<line x1={540} y1={0} x2={540} y2={140} stroke={O} strokeWidth={5} />
		<circle cx={540} cy={170} r={34} fill="#fff6c8" stroke={O} strokeWidth={5} />
		<circle cx={540} cy={170} r={220} fill="#fff6c8" opacity={0.12} />
		{/* cracks + frost */}
		{Array.from({length: 6}).map((_, i) => (
			<circle key={i} cx={hash(i) * 1080} cy={680 + hash(i + 2) * 30} r={6 + hash(i + 4) * 8} fill="#eef4ff" opacity={0.5} />
		))}
		<rect width={1080} height={1920} fill="#000" opacity={Flicker(t)} />
	</>
);

// ------------------------------------------------------------------ scenes
const S1: React.FC<{t: number}> = ({t}) => {
	const z = 1 + 0.9 * ease((t - 4) / 6);
	return (
		<>
			<rect width={1080} height={1920} fill="#0e1630" />
			<g transform={`translate(540 760) scale(${z}) translate(-540 -760)`}>
				{/* other buildings */}
				{[[60, 700, 220], [820, 820, 240]].map(([x, top, w], i) => (
					<g key={i}>
						<rect x={x} y={top} width={w} height={1400} fill="#1b2747" stroke={O} strokeWidth={W} />
						{Array.from({length: 10}).map((_, r) => (
							<rect key={r} x={x + 30} y={top + 40 + r * 110} width={w - 60} height={50} fill="#24335a" />
						))}
					</g>
				))}
				{/* our 20-storey tower */}
				<rect x={330} y={-200} width={420} height={2300} fill="#2a3a63" stroke={O} strokeWidth={W} />
				{Array.from({length: 20}).map((_, r) => {
					const floor = 20 - r;
					const yy = -160 + r * 105;
					return [0, 1, 2].map((c) => {
						const lit = floor === 17 && c === 1;
						return <rect key={`${r}${c}`} x={360 + c * 130} y={yy} width={100} height={60} fill={lit ? '#ffd36a' : '#1b2747'} stroke={O} strokeWidth={4} />;
					});
				})}
				<circle cx={540} cy={-160 + 3 * 105 + 30} r={90} fill="#ffd36a" opacity={0.15 + 0.05 * Math.sin(t * 3)} />
			</g>
			<Snow t={t} n={50} wind={1.4} />
			<g transform={`translate(860 300) scale(${back(t / 0.4)})`}>
				<rect x={-36} y={-220} width={72} height={360} rx={36} fill="#fffaf0" stroke={O} strokeWidth={W} />
				<rect x={-14} y={-190 + 200 * ease(t / 3)} width={28} height={290 - 200 * ease(t / 3)} rx={14} fill="#5b86c4" />
				<circle cy={150} r={50} fill="#5b86c4" stroke={O} strokeWidth={W} />
			</g>
			<Pill text="−52°" t={t - 1.2} y={190} />
		</>
	);
};

const S2: React.FC<{t: number}> = ({t}) => {
	const A = B[1];
	const ghost = ease((t - (T('тётей') - A)) / 1.0);
	return (
		<>
			<Flat t={t} />
			<FrostWindow t={t} face={ghost} />
			<Sonya x={640} y={1440} s={0.6} face={ghost > 0 ? 'smile' : 'neutral'} armFront={[160, 10 + Math.sin(t * 3) * 10]} />
			<Breath x={690} y={1210} t={t} />
			<ShnurokSide x={260} y={1600} s={0.9} face={ghost > 0.3 ? 'shock' : 'neutral'} armFront={[60, -60]} />
			<Breath x={330} y={1100} t={t} ph={1} />
			<Pill text="17 этаж" t={t - (T('семнадцатый', idx('тётей')) - A)} y={200} />
		</>
	);
};

const S3: React.FC<{t: number}> = ({t}) => {
	const A = B[2];
	return (
		<>
			<Flat t={t} dark={0.7} />
			<Phone
				t={t}
				msgs={[
					{at: 0.3, from: 'кв. 45', text: 'У кого-нибудь есть тепло?'},
					{at: T('сто') - A, from: 'кв. 190', text: 'Инструкция: не спускайтесь ниже 10 этажа.'},
					{at: T('подпускайте') - A - 0.5, from: 'кв. 190', text: 'И не подпускайте детей к окнам.'},
				]}
			/>
			<Pill text="кв. 190 — пустует" t={t - (T('живёт') - A)} y={200} />
		</>
	);
};

const S4: React.FC<{t: number}> = ({t}) => {
	const A = B[3];
	const cur = ease(t / 1.2) * 0.42;
	const hand = ease((t - (T('успел') - A)) / 0.6);
	const z = 1 + 0.5 * ease((t - (T('пять') - A)) / 1.5);
	const six = T('шестой') - A;
	return (
		<g transform={`translate(880 640) scale(${z}) translate(-880 -640)`}>
			<Flat t={t} />
			<FrostWindow t={t} hand={hand} curtain={cur} />
			<ShnurokSide x={420} y={1600} s={0.9} face={hand > 0.5 ? 'shock' : 'neutral'} armFront={[150, -20]} />
			{t > six && (
				<g transform="translate(888 600)">
					<circle r={60} fill="none" stroke="#c8675b" strokeWidth={10} opacity={0.6 + 0.15 * Math.sin(t * 3)} />
				</g>
			)}
		</g>
	);
};

const Door: React.FC<{open: number}> = ({open}) => (
	<g>
		<rect x={300} y={500} width={480} height={820} fill="#2a2e3d" stroke={O} strokeWidth={W} />
		<path d={`M 300 500 L ${300 + 480 * (1 - open * 0.8)} ${500 + open * 40} L ${300 + 480 * (1 - open * 0.8)} ${1320 - open * 40} L 300 1320 Z`} fill="#8a5a3a" stroke={O} strokeWidth={W} />
		<circle cx={300 + 440 * (1 - open * 0.8)} cy={920} r={14} fill="#e8a93a" stroke={O} strokeWidth={4} />
		<circle cx={300 + 240 * (1 - open * 0.8)} cy={700} r={10} fill="#14161f" />
	</g>
);

const S5: React.FC<{t: number}> = ({t}) => {
	const A = B[4];
	const open = ease((t - 0.6) / 0.6);
	const carry = T('взял') - A;
	return (
		<>
			<Flat t={t} />
			<Door open={open} />
			{open > 0.3 && <Vera x={560} y={1320} s={0.78} dir={-1} face="smile" />}
			{open > 0.3 && <Breath x={470} y={1000} t={t} dir={-1} />}
			{t < carry ? (
				<>
					<ShnurokSide x={180} y={1600} s={0.9} face="neutral" />
					<Sonya x={330} y={1600} s={0.55} face="neutral" />
				</>
			) : (
				<g>
					<ShnurokSide x={200} y={1600} s={0.9} face="think" armFront={[95, -70]} />
					<g transform="translate(280 1210) rotate(-15)">
						<Sonya x={0} y={0} s={0.45} face="closed" />
					</g>
				</g>
			)}
			{[0, 1, 2].map((i) => (t > 0.1 + i * 0.2 && t < 0.6 + i * 0.2 ? <text key={i} x={820} y={700 + i * 80} fontFamily="Inter" fontWeight={900} fontSize={60} fill="#eef4ff" stroke={O} strokeWidth={6} paintOrder="stroke">ТУК</text> : null))}
		</>
	);
};

const Stove: React.FC<{t: number; on: boolean}> = ({t, on}) => (
	<g transform="translate(760 1300)">
		<rect x={-160} y={-260} width={320} height={260} rx={10} fill="#f4f1ea" stroke={O} strokeWidth={W} />
		<rect x={-120} y={-170} width={240} height={140} rx={8} fill="#2a2e3d" stroke={O} strokeWidth={5} />
		{[-80, 80].map((bx) =>
			[-1].map(() => (
				<g key={bx}>
					<ellipse cx={bx} cy={-268} rx={56} ry={14} fill="#3a3f55" stroke={O} strokeWidth={4} />
					{on &&
						Array.from({length: 8}).map((_, i) => {
							const a = (i / 8) * Math.PI;
							return <path key={i} d={`M ${bx + Math.cos(a) * 46} -270 q ${Math.sin(t * 20 + i) * 4} -24 0 ${-30 - Math.sin(t * 15 + i) * 8}`} stroke="#6fb4ff" strokeWidth={8} fill="none" strokeLinecap="round" />;
						})}
				</g>
			)),
		)}
		{on && <circle cx={0} cy={-300} r={200} fill="#6fb4ff" opacity={0.12} />}
	</g>
);

const Sofa: React.FC<{t: number}> = () => (
	<g transform="translate(260 1340)">
		<rect x={-230} y={-160} width={460} height={110} rx={30} fill="#7a3a3a" stroke={O} strokeWidth={W} />
		<rect x={-250} y={-60} width={500} height={70} rx={20} fill="#8a4a4a" stroke={O} strokeWidth={W} />
		{[-120, 60].map((hx, i) => (
			<g key={i}>
				<path d={`M ${hx - 40} -62 Q ${hx + 60} -120 ${hx + 160} -62 Z`} fill="#5b86c4" stroke={O} strokeWidth={5} />
				<circle cx={hx - 30} cy={-92} r={36} fill="#f6c9a0" stroke={O} strokeWidth={5} />
				<path d={`M ${hx - 66} -100 Q ${hx - 30} -150 ${hx + 6} -100`} fill={i ? '#2b211d' : '#7a4a2a'} stroke={O} strokeWidth={4} />
				<path d={`M ${hx - 44} -90 q 6 6 12 0 M ${hx - 22} -90 q 6 6 12 0`} stroke={O} strokeWidth={4} fill="none" />
			</g>
		))}
	</g>
);

const VeraFlat: React.FC<{t: number; gas: number; open?: number}> = ({t, gas, open = 0}) => (
	<>
		<Flat t={t} dark={0.3} />
		{/* taped window */}
		<g transform="translate(560 330)">
			<rect x={-20} y={-20} width={460} height={520} fill="#c9c4bd" stroke={O} strokeWidth={W} />
			<rect x={0} y={0} width={420} height={480} fill="#14203d" />
			<rect x={0} y={0} width={420 * open} height={480} fill="#3a4a70" />
			{open > 0 && <Snow t={t} n={30} wind={-2} />}
			{open < 0.5 && <path d="M 0 0 L 420 480 M 420 0 L 0 480" stroke="#e8d8a8" strokeWidth={22} opacity={0.9} />}
		</g>
		<Sofa t={t} />
		<Stove t={t} on={gas > 0} />
		<rect width={1080} height={1920} fill="#9fb07a" opacity={gas * 0.22} />
	</>
);

const S6: React.FC<{t: number}> = ({t}) => {
	const A = B[5];
	const dizzy = clamp01((t - (T('заболела') - A)) / 2);
	const sleepS = T('посплю') - A;
	return (
		<g transform={`translate(${Math.sin(t * 1.2) * 6 * dizzy} 0) skewX(${Math.sin(t * 1.0) * 1.5 * dizzy})`}>
			<VeraFlat t={t} gas={0.4 + dizzy * 0.6} />
			<Vera x={560} y={1640} s={0.78} dir={-1} face="neutral" />
			<ShnurokSide x={980} y={1660} s={0.9} dir={-1} face={dizzy > 0.2 ? 'closed' : 'neutral'} armFront={dizzy > 0.2 ? [150, 60] : undefined} />
			<Sonya x={830} y={1680} s={0.5} dir={-1} face={t > sleepS ? 'closed' : 'neutral'} />
			{t > sleepS && [0, 1, 2].map((i) => <text key={i} x={790 - i * 20} y={1200 - ((t - sleepS) * 40 + i * 30) % 100} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#eef4ff" opacity={0.8}>z</text>)}
			<Pill text="все конфорки включены" t={t - 0.4} y={200} />
		</g>
	);
};

const S7: React.FC<{t: number}> = ({t}) => {
	const A = B[6];
	const off = T('выключил') - A;
	const call = T('набрал') - A;
	const wake = T('открыла') - A;
	const vera = T('вера', idx('открыла')) - A;
	const open = ease((t - off - 0.6) / 0.6);
	if (t > call - 0.1 && t < wake - 0.1)
		return (
			<>
				<Stairwell t={t} floor="16" />
				<g transform={`translate(540 950) scale(${back((t - call) / 0.3)})`}>
					<rect x={-220} y={-380} width={440} height={760} rx={50} fill="#1b1e2b" stroke={O} strokeWidth={W} />
					<rect x={-195} y={-345} width={390} height={690} rx={26} fill="#e9ecf2" />
					<text textAnchor="middle" y={-180} fontFamily="Inter" fontWeight={900} fontSize={120} fill="#c8675b">112</text>
					<circle cy={120} r={70} fill="#5f9e55" stroke={O} strokeWidth={5} />
					<path d="M -24 100 q 24 -30 48 0 q -10 30 -24 40 q -14 -10 -24 -40" fill="#fff" />
				</g>
			</>
		);
	if (t >= wake - 0.1)
		return (
			<>
				<Stairwell t={t} floor="16" />
				<ShnurokSide x={260} y={1680} s={0.9} face="shock" />
				<Sonya x={420} y={1680} s={0.55} face={t > wake ? 'neutral' : 'closed'} />
				<Vera x={760} y={1680} s={0.8} dir={-1} face="think" />
				{[[330, 1150], [490, 1380], [690, 1170]].map(([bx, by], i) => <Breath key={i} x={bx} y={by} t={t} ph={i * 0.7} dir={i === 2 ? -1 : 1} />)}
				{t > vera && <Pill text="«это 190-я велела…»" t={t - vera} y={200} />}
			</>
		);
	return (
		<>
			<VeraFlat t={t} gas={t < off ? 1 : 0} open={open} />
			<ShnurokSide x={620} y={1660} s={0.9} dir={1} face="shock" armFront={[100, -10]} />
			<Pill text="угарный газ: не видно, не слышно" t={t - 0.3} y={200} />
		</>
	);
};

const Lift: React.FC<{t: number; open: number; btn: number}> = ({t, open, btn}) => (
	<g>
		<rect x={300} y={560} width={480} height={760} fill="#8f8f95" stroke={O} strokeWidth={W} />
		<rect x={330} y={600} width={420} height={720} fill="#fff6c8" />
		<rect x={330} y={600} width={420} height={720} fill="#000" opacity={Flicker(t + 3, 0.6)} />
		<rect x={330} y={600} width={210 * (1 - open)} height={720} fill="#b8b2a6" stroke={O} strokeWidth={5} />
		<rect x={540 + 210 * open} y={600} width={210 * (1 - open)} height={720} fill="#b8b2a6" stroke={O} strokeWidth={5} />
		<g transform="translate(830 900)">
			<rect x={-40} y={-120} width={80} height={240} rx={12} fill="#3a3f55" stroke={O} strokeWidth={5} />
			{[0, 1, 2, 3].map((i) => (
				<circle key={i} cy={-80 + i * 54} r={18} fill={i === 2 && btn > 0 ? '#ffd36a' : '#8f8f95'} stroke={O} strokeWidth={3} />
			))}
			<text x={0} y={36} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={20} fill={O}>10</text>
		</g>
	</g>
);

const S8: React.FC<{t: number}> = ({t}) => {
	const A = B[7];
	const arrive = T('приехал') - A;
	const open = ease((t - (T('открылись') - A)) / 1.2);
	const btn = T('десятый') - A;
	const z = 1 + (t > btn ? 0.4 * ease((t - btn) / 1) : 0);
	return (
		<g transform={`translate(830 900) scale(${z}) translate(-830 -900)`}>
			<Stairwell t={t} floor="17" />
			<Lift t={t} open={open} btn={t > btn - 0.3 ? 1 : 0} />
			{t > arrive && t < arrive + 0.6 && <text x={540} y={520} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#eef4ff" stroke={O} strokeWidth={6} paintOrder="stroke">ДЗЫНЬ</text>}
			<ShnurokSide x={140} y={1700} s={0.85} face="shock" />
			<Sonya x={260} y={1700} s={0.5} face="neutral" />
		</g>
	);
};

const S9: React.FC<{t: number}> = ({t}) => {
	const A = B[8];
	const n14 = T('четырнадцатый') - A;
	const n15 = T('пятнадцатый') - A;
	const n16 = T('шестнадцатый') - A;
	const rise = ease((t - n14 + 0.5) / (n16 - n14 + 1.5));
	return (
		<>
			<rect width={1080} height={1920} fill="#141a24" />
			{/* stairwell viewed from above: spiral of flights */}
			{Array.from({length: 7}).map((_, i) => (
				<rect key={i} x={140 + i * 50} y={200 + i * 220} width={800 - i * 100} height={40} fill="#4a5060" stroke={O} strokeWidth={5} />
			))}
			<g transform={`translate(540 ${1800 - rise * 900})`}>
				<circle r={160} fill="#ffd36a" opacity={0.3 + 0.05 * Math.sin(t * 9)} />
				<rect x={-24} y={-44} width={48} height={64} rx={8} fill="#3a3f55" stroke={O} strokeWidth={5} />
				<rect x={-15} y={-34} width={30} height={44} rx={5} fill="#fff1b0" />
			</g>
			{t >= n14 && t < n15 && <Big text="14" t={t} at={n14} y={500} />}
			{t >= n15 && t < n16 && <Big text="15" t={t} at={n15} y={500} />}
			{t >= n16 && <Big text="16" t={t} at={n16} y={500} color="#c8675b" />}
			<rect width={1080} height={1920} fill="#000" opacity={Flicker(t) * 0.8} />
		</>
	);
};

const S10: React.FC<{t: number}> = ({t}) => {
	const A = B[9];
	const notice = T('заметил') - A;
	const no = T('михалыча', idx('заметил')) - A;
	return (
		<>
			<Stairwell t={t} floor="17" />
			<Mikhalych x={850} y={1700} s={0.9} dir={-1} t={t} />
			<ShnurokSide x={200} y={1700} s={0.85} face="neutral" />
			<Sonya x={330} y={1700} s={0.5} face="neutral" />
			<Vera x={480} y={1700} s={0.75} face="neutral" />
			{t > notice && [[270, 1130], [370, 1390], [540, 1180]].map(([bx, by], i) => <Breath key={i} x={bx} y={by} t={t} ph={i * 0.5} />)}
			{t > no && (
				<g transform={`translate(${850 - 45} ${1700 - 0.9 * 540})`}>
					<circle r={90} fill="none" stroke="#c8675b" strokeWidth={10} opacity={0.6 + 0.4 * Math.sin(t * 8)} />
					<text y={-110} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill="#c8675b" stroke={O} strokeWidth={4} paintOrder="stroke">нет пара</text>
				</g>
			)}
			<Pill text="«спускайтесь в котельную»" t={t - 0.6} y={200} />
		</>
	);
};

const S11: React.FC<{t: number}> = ({t}) => {
	const A = B[10];
	return (
		<>
			<Stairwell t={t} floor="17" />
			<Phone
				t={t}
				msgs={[
					{at: 0, from: 'кв. 190', text: 'Не спускайтесь ниже 10 этажа.'},
					{at: T('слушай') - A - 0.3, from: 'кв. 190', text: 'Не слушай дворника.'},
					{at: T('замёрз') - A - 0.3, from: 'кв. 190', text: 'Он замёрз ещё в прошлую зиму.'},
				]}
			/>
		</>
	);
};

const S12: React.FC<{t: number}> = ({t}) => {
	const A = B[11];
	const good = T('хороший') - A;
	const tetya = T('тётя') - A;
	return (
		<g transform={`translate(400 1500) scale(${1.15 + 0.08 * ease(t / 6)}) translate(-400 -1500)`}>
			<Stairwell t={t} floor="17" />
			<ShnurokSide x={300} y={1720} s={0.9} face={t > tetya ? 'shock' : 'neutral'} dir={1} />
			<Sonya x={470} y={1720} s={0.55} dir={-1} face="neutral" armFront={[150, 30]} />
			{t > good && <Pill text="«Михалыч хороший»" t={t - good} y={260} />}
			{t > tetya && <Pill text="«тётя из окна — это 190-я»" t={t - tetya} y={380} />}
		</g>
	);
};

const S13: React.FC<{t: number}> = ({t}) => (
	<>
		<Stairwell t={t} floor="17" />
		<g transform={`translate(0 ${Math.sin(t * 2) * 4})`}>
		</g>
		<Mikhalych x={180} y={1820} s={0.7} dir={1} t={t} />
		<ShnurokSide x={540} y={1700} s={0.9} face="think" />
		<Sonya x={660} y={1700} s={0.5} face="neutral" />
		<Vera x={820} y={1700} s={0.75} dir={-1} face="neutral" />
		<g transform={`translate(840 520) rotate(8) scale(${back((t - 0.3) / 0.4)})`}>
			<rect x={-110} y={-180} width={220} height={360} rx={26} fill="#1b1e2b" stroke={O} strokeWidth={W} />
			<rect x={-94} y={-160} width={188} height={320} rx={12} fill="#e9ecf2" />
			<text textAnchor="middle" y={-20} fontFamily="Inter" fontWeight={900} fontSize={44} fill="#c8675b">кв. 190</text>
		</g>
		<Big text="?" t={t} at={T('кому', B[12] ? 0 : 0) - B[12]} y={720} size={240} color="#f5c542" />
	</>
);

const S14: React.FC<{t: number}> = ({t}) => (
	<>
		<Stairwell t={t} floor="17" />
		<rect width={1080} height={1920} fill="#0b1226" opacity={0.35} />
		<Shnurok x={540} y={1780} s={1.0} face="shock" />
		<g transform={`translate(270 760) scale(${back((t - 0.2) / 0.4)})`}>
			<circle r={130} fill="#c8675b" stroke={O} strokeWidth={W} />
			<text textAnchor="middle" y={50} fontFamily="Inter" fontWeight={900} fontSize={150} fill="#fff">1</text>
			<text textAnchor="middle" y={200} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" stroke={O} strokeWidth={5} paintOrder="stroke">вниз</text>
		</g>
		<g transform={`translate(810 760) scale(${back((t - 0.6) / 0.4)})`}>
			<circle r={130} fill="#5b86c4" stroke={O} strokeWidth={W} />
			<text textAnchor="middle" y={50} fontFamily="Inter" fontWeight={900} fontSize={150} fill="#fff">2</text>
			<text textAnchor="middle" y={200} fontFamily="Inter" fontWeight={900} fontSize={40} fill="#fff" stroke={O} strokeWidth={5} paintOrder="stroke">кв. 190</text>
		</g>
	</>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14];

const FADE = 0.35;
const Layer: React.FC<{lead: number; dur: number; first: boolean; C: React.FC<{t: number}>}> = ({lead, dur, first, C: Scene}) => {
	const t = useCurrentFrame() / FPS - lead;
	const a = first ? 1 : clamp01((t + lead) / FADE);
	const z = 1.0 + 0.05 * ease(t / Math.max(1, dur));
	return (
		<ShotCtx.Provider value={{t, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: a}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<g transform={`translate(540 1000) scale(${z}) translate(-540 -1000)`}>
						<Scene t={t} />
					</g>
					{/* cold vignette */}
					<defs>
						<radialGradient id="vig" cx="50%" cy="50%" r="70%">
							<stop offset="60%" stopColor="#0b1226" stopOpacity={0} />
							<stop offset="100%" stopColor="#0b1226" stopOpacity={0.4} />
						</radialGradient>
					</defs>
					<rect width={1080} height={1920} fill="url(#vig)" />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

export const Kv190: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [KV190_DURATION - 0.8, KV190_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SCENES.map((Sc, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : KV190_DURATION;
				const start = Math.max(0, Math.round((from - (i ? FADE : 0)) * FPS));
				return (
					<Sequence key={i} from={start} durationInFrames={Math.max(1, Math.round(to * FPS) - start)}>
						<Layer lead={from - start / FPS} dur={to - from} first={i === 0} C={Sc} />
					</Sequence>
				);
			})}
			{ci >= 0 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} />}
			<div style={{position: 'absolute', left: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.8, textShadow: '0 2px 6px #0008'}}>Вселенная Шнурка</div>
			<AbsoluteFill style={{background: '#000', opacity: endFade}} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
