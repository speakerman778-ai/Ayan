import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, hash} from '../lib';
import {C, Char, NameTag, OL, OW} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {Shnurok} from './Shnurok';
import {Badge, Basement, Box, Cam, ClubInside, Desk, Hud, KID, Kid, KidKey, Monitor, QMark, Row, Tower, clamp01, ease, pop, prog} from './PcClub';
import rawWords from '../../public/shnurok/ep02-words.json';

// ПК-клуб, серия 2 «Своя команда» (зрители выбрали вариант 2).

const FPS = 30;
const WORDS: Word[] = (() => {
	const out: Word[] = [];
	for (const w of rawWords as Word[]) {
		if (!/[\p{L}\p{N}]/u.test(w.text) && out.length) out[out.length - 1] = {...out[out.length - 1], text: out[out.length - 1].text + ' ' + w.text};
		else out.push({...w});
	}
	return out;
})();
export const PCCLUB2_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 100) + 2.2);

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
const idx = (w: string, from = 0) => WORDS.findIndex((x, k) => k >= from && norm(x.text) === w.toLowerCase());
const T = (w: string, from = 0) => {
	const i = idx(w, from);
	return i >= 0 ? WORDS[i].start : 0;
};

// scene starts (absolute seconds)
const B = (() => {
	const s = (i: number) => Math.max(0, (WORDS[Math.max(0, i)]?.start ?? 0) - 0.25);
	const i2 = idx('первым');
	const i3 = idx('шёл') - 1;
	const i4 = idx('так');
	const i5 = idx('тренировки');
	const i6 = idx('потом') - 1;
	const i7 = idx('финал', i6);
	const i8 = idx('вытаскивает') - 1;
	const i9 = idx('следующий') - 1;
	const i10 = idx('маленький') - 2;
	const i11 = idx('выбираешь') - 1;
	return [0, s(i2), s(i3), s(i4), s(i5), s(i6), s(i7), s(i8), s(i9), s(i10), s(i11)];
})();

const PINK = '#ff4fd8';
const TeamKid: React.FC<{k: KidKey; x: number; y: number; s?: number; face?: 'joy' | 'smile' | 'determined' | 'shock' | 'think'; arms?: boolean; jacket?: string}> = ({k, x, y, s = 0.6, face = 'smile', arms, jacket = C.ochre}) => (
	<Char {...KID[k]} jacket={jacket} hoodie x={x} y={y} s={s} headS={0.82} headDrop={18} face={face} armL={arms ? [150, 20] : undefined} armR={arms ? [150, 20] : undefined} blinkSeed={k.charCodeAt(0)} />
);

const Confetti: React.FC<{t: number; from: number}> = ({t, from}) =>
	t < from ? null : (
		<>
			{Array.from({length: 40}).map((_, i) => {
				const k = t - from;
				const x = hash(i) * 1080 + Math.sin(k * 3 + i) * 30;
				const y = -40 + k * (300 + hash(i + 3) * 300);
				return <rect key={i} x={x} y={y % 2000} width={18} height={10} fill={[C.red, C.ochre, '#6fb4d0', '#7dbb6a', PINK][i % 5]} transform={`rotate(${k * 200 + i * 30} ${x} ${y % 2000})`} />;
			})}
		</>
	);

const Scoreboard: React.FC<{x: number; y: number; l: string; r: string; lt?: string; rt?: string}> = ({x, y, l, r, lt = 'ШНУРКИ', rt = 'КИБЕР·АРЕНА'}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-330} y={-110} width={660} height={220} rx={24} fill="#14161f" stroke={OL} strokeWidth={OW} />
		<text x={-170} y={-50} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.ochre}>
			{lt}
		</text>
		<text x={170} y={-50} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={30} fill={PINK}>
			{rt}
		</text>
		<text x={0} y={70} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill="#fffaf0">
			{l} : {r}
		</text>
	</g>
);

// ------------------------------------------------------------------ scenes (t = scene-local seconds; A = absolute start of the scene)
const S1: React.FC<{t: number}> = ({t}) => {
	const two = ease((t - 0.4) / 0.6);
	return (
		<>
			<Cam z={1.02 + 0.04 * ease(t / 6)} cx={540} cy={1000}>
				<ClubInside t={t} />
				<Row t={t} screens={['game', 'game', 'game', 'game', 'game']} ons={[true, true, true, true, true]} />
				<g transform="translate(300 700)" opacity={1 - two * 0.65}>
					<rect x={-150} y={-160} width={300} height={320} rx={30} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
					<text textAnchor="middle" y={70} fontFamily="Inter" fontWeight={900} fontSize={200} fill={C.red}>
						1
					</text>
				</g>
				<g transform={`translate(780 700) scale(${1 + two * 0.15})`}>
					<rect x={-150} y={-160} width={300} height={320} rx={30} fill={two > 0.5 ? C.ochre : '#f7ecd6'} stroke={OL} strokeWidth={OW} />
					<text textAnchor="middle" y={70} fontFamily="Inter" fontWeight={900} fontSize={200} fill="#2b5bd7">
						2
					</text>
				</g>
				<Shnurok x={540} y={1720} s={0.85} face="joy" armL={[150, 20]} armR={[150, 20]} />
			</Cam>
			<Confetti t={t} from={0.6} />
			<NameTag name="Шнурок" role="ПК-клуб · серия 2" from={0.3} x={60} y={120} avatar={<Shnurok x={0} y={250} s={0.42} />} />
		</>
	);
};

const S2: React.FC<{t: number}> = ({t}) => {
	const A = B[1];
	const queue = ease((t - (T('субботу') - A) - 0.3) / 1.5);
	const thirty = T('тридцать') - A;
	return (
		<>
			<Cam z={1.02 + 0.05 * ease(t / 6)} cx={540} cy={1100}>
				<rect width={1080} height={1920} fill="#9fd0e8" />
				<rect x={0} y={500} width={1080} height={900} fill="#c9b39a" stroke={OL} strokeWidth={OW} />
				{Array.from({length: 8}).map((_, r) =>
					Array.from({length: 6}).map((__, c) => <rect key={`${r}${c}`} x={c * 200 - (r % 2) * 100} y={500 + r * 110} width={196} height={106} fill="#bfa78c" stroke="#a8917a" strokeWidth={4} />),
				)}
				<rect x={330} y={850} width={420} height={550} fill="#5a4a52" stroke={OL} strokeWidth={OW} />
				<rect x={300} y={760} width={480} height={80} rx={12} fill="#1d2b4f" stroke={OL} strokeWidth={6} />
				<text x={540} y={815} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill={C.ochre}>
					ШНУРОК·КЛУБ
				</text>
				<g transform={`translate(540 1060) rotate(-3) scale(${pop(t, 0.3)})`}>
					<rect x={-170} y={-130} width={340} height={260} fill="#fffaf0" stroke={OL} strokeWidth={OW} />
					<text x={0} y={-60} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={C.red}>
						ИЩУ 5 ИГРОКОВ
					</text>
					<text x={0} y={0} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill={OL}>
						в команду
					</text>
					<text x={0} y={60} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill={OL}>
						Отбор — суббота
					</text>
				</g>
				<rect x={0} y={1400} width={1080} height={520} fill="#9aa0aa" stroke={OL} strokeWidth={OW} />
				{(['a', 'b', 'c', 'd', 'e', 'a', 'c', 'b', 'e', 'd'] as KidKey[]).map((k, i) => {
					const x = 1180 - queue * (640 - i * 95);
					return <Kid key={i} k={k} x={x + i * 95} y={1620 + (i % 2) * 30} s={0.5} face="smile" />;
				})}
			</Cam>
			<Hud t={thirty} rows={[['Пришло', '30', '#5f9e55']]} />
		</>
	);
};

const S3: React.FC<{t: number}> = ({t}) => {
	const A = B[2];
	const loud = T('кричал') - A;
	const quiet = T('тихо') - A;
	const pick = T('брал') - A;
	return (
		<Cam z={1.03} cx={540} cy={1100}>
			<ClubInside t={t} />
			<Desk x={540} y={1080} w={1000} />
			{[220, 540, 860].map((x, i) => (
				<Monitor key={i} x={x} y={1080} s={0.7} screen="game" t={t + i} />
			))}
			<Kid k="b" x={220} y={1600} s={0.65} face={t > loud ? 'laugh' : 'smile'} armL={t > loud ? [150, 30] : undefined} />
			{t > loud && <Badge x={220} y={760} text="!!!" t={t} at={loud} size={80} />}
			<Kid k="d" x={540} y={1600} s={0.65} face="smile" />
			<Kid k="c" x={860} y={1600} s={0.65} face="neutral" />
			{t > quiet + 0.6 && <Badge x={860} y={760} text="✓" t={t} at={quiet + 0.6} color="#5f9e55" size={110} />}
			{t > pick && <Badge x={220} y={880} text="✗" t={t} at={pick} size={110} />}
			{t > pick && (
				<g transform={`translate(540 520) scale(${pop(t, pick)})`}>
					<rect x={-330} y={-70} width={660} height={120} rx={24} fill={C.paper} stroke={OL} strokeWidth={OW} />
					<text x={0} y={12} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill={OL}>
						играют ВМЕСТЕ
					</text>
				</g>
			)}
		</Cam>
	);
};

const S4: React.FC<{t: number}> = ({t}) => {
	const A = B[3];
	const name = T('шнурки') - A;
	const hood = T('одинаковые') - A;
	const team: KidKey[] = ['a', 'c', 'd', 'e'];
	return (
		<Cam z={1.03 + 0.04 * ease(t / 7)} cx={540} cy={1100}>
			<ClubInside t={t} />
			<g transform={`translate(540 600) scale(${pop(t, name)})`}>
				<rect x={-360} y={-90} width={720} height={170} rx={30} fill={C.ochre} stroke={OL} strokeWidth={OW} />
				<text x={0} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={100} fill={OL}>
					ШНУРКИ
				</text>
			</g>
			{team.map((k, i) => (
				<g key={k} transform={`translate(0 ${(1 - pop(t, i * 0.35)) * 80})`} opacity={clamp01(t / 0.3 - i * 0.3)}>
					<TeamKid k={k} x={150 + i * 260 + (i > 1 ? 0 : 0)} y={1700} s={0.62} jacket={t > hood ? C.ochre : KID[k].jacket} face="joy" arms={t > hood} />
				</g>
			))}
			<Shnurok x={540} y={1650} s={0.7} face="joy" />
		</Cam>
	);
};

const S5: React.FC<{t: number}> = ({t}) => {
	const A = B[4];
	const lose0 = T('проигрывали') - A;
	const losses = Math.min(10, Math.max(0, Math.floor((t - lose0) * 2.2)));
	return (
		<>
			<Cam z={1.03} cx={540} cy={1100}>
				<ClubInside t={t} />
				<Row t={t} screens={['game', 'game', 'game', 'game', 'game']} ons={[true, true, true, true, true]} />
				{(['a', 'c', 'd', 'e'] as KidKey[]).map((k, i) => (
					<TeamKid key={k} k={k} x={150 + i * 260} y={1720} s={0.55} face={losses > 0 ? 'shock' : 'determined'} />
				))}
				<g transform="translate(540 600)">
					<rect x={-300} y={-110} width={600} height={220} rx={24} fill="#14161f" stroke={OL} strokeWidth={OW} />
					<text x={-150} y={-50} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={28} fill="#7dbb6a">
						ПОБЕДЫ
					</text>
					<text x={150} y={-50} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={28} fill={C.red}>
						ПОРАЖЕНИЯ
					</text>
					<text x={0} y={70} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill="#fffaf0">
						0 : {losses}
					</text>
				</g>
			</Cam>
		</>
	);
};

const S6: React.FC<{t: number}> = ({t}) => {
	const A = B[5];
	const vs = T('финале') - A;
	const pcs = T('компьютеры', idx('финале')) - A;
	return (
		<Cam z={1.02 + 0.05 * ease(t / 8)} cx={540} cy={1000}>
			<rect width={1080} height={1920} fill="#1d2b4f" />
			{Array.from({length: 30}).map((_, i) => (
				<circle key={i} cx={hash(i) * 1080} cy={hash(i + 4) * 900} r={4} fill="#fff6c8" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
			))}
			<g transform={`translate(540 380) scale(${pop(t, 0.2)})`}>
				<rect x={-420} y={-110} width={840} height={200} rx={24} fill={C.red} stroke={OL} strokeWidth={OW} />
				<text x={0} y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#fffaf0">
					ГОРОДСКОЙ ТУРНИР
				</text>
			</g>
			<rect x={0} y={1350} width={1080} height={570} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
			{(['a', 'c', 'd'] as KidKey[]).map((k, i) => (
				<TeamKid key={k} k={k} x={120 + i * 130} y={1560} s={0.55} face="determined" />
			))}
			{t > vs &&
				(['b', 'e', 'a'] as KidKey[]).map((k, i) => (
					<g key={k} transform={`translate(${(1 - ease((t - vs) / 0.6)) * 400} 0)`}>
						<TeamKid k={k} x={700 + i * 130} y={1560} s={0.6} face="determined" jacket={PINK} />
					</g>
				))}
			{t > vs && <Badge x={540} y={1050} text="VS" t={t} at={vs} size={150} color={C.ochre} />}
			{t > pcs && (
				<g transform={`translate(830 900) scale(${pop(t, pcs)})`}>
					<Tower x={-80} y={0} s={0.7} on led={PINK} t={t} />
					<Tower x={80} y={0} s={0.7} on led={PINK} t={t} />
				</g>
			)}
		</Cam>
	);
};

const S7: React.FC<{t: number}> = ({t}) => {
	const A = B[6];
	const one = T('остаётся') - A;
	const shake = Math.sin(t * 40) * (t > one ? 3 : 0);
	return (
		<Cam z={1.05 + 0.15 * ease(t / 7)} cx={540} cy={800}>
			<rect width={1080} height={1920} fill="#14161f" />
			<g transform={`translate(${shake} 0)`}>
				<Scoreboard x={540} y={320} l="12" r="12" />
				<rect x={90} y={520} width={900} height={560} rx={20} fill="#2a2e3d" stroke={OL} strokeWidth={OW} />
				<rect x={120} y={550} width={840} height={500} fill="#5f9e55" />
				<rect x={120} y={550} width={840} height={200} fill="#9fd0e8" />
				{/* our last player vs three */}
				<circle cx={300} cy={850} r={40} fill={C.ochre} stroke={OL} strokeWidth={6} />
				{t > one &&
					[0, 1, 2].map((i) => <circle key={i} cx={700 + i * 80} cy={800 + (i % 2) * 80} r={36} fill={PINK} stroke={OL} strokeWidth={6} />)}
				{t > one && <Badge x={540} y={700} text="1 vs 3" t={t} at={one} size={90} color="#fffaf0" />}
			</g>
			<Shnurok x={540} y={1800} s={0.8} face="shock" handOnHead={t > one} />
		</Cam>
	);
};

const S8: React.FC<{t: number}> = ({t}) => {
	const A = B[7];
	const win = T('выиграли') - A;
	return (
		<>
			<Cam z={1.03} cx={540} cy={1000}>
				<rect width={1080} height={1920} fill="#1d2b4f" />
				<Scoreboard x={540} y={320} l={t > 0.4 ? '13' : '12'} r="12" />
				<g transform={`translate(540 760) scale(${pop(t, 0.6) * (1 + 0.04 * Math.sin(t * 5))})`}>
					<path d="M -110 -150 L 110 -150 Q 110 20 0 60 Q -110 20 -110 -150 Z" fill={C.ochre} stroke={OL} strokeWidth={OW} />
					<path d="M -110 -110 Q -180 -110 -160 -40 Q -140 10 -90 0 M 110 -110 Q 180 -110 160 -40 Q 140 10 90 0" fill="none" stroke={OL} strokeWidth={10} />
					<rect x={-24} y={60} width={48} height={70} fill={C.ochre} stroke={OL} strokeWidth={6} />
					<rect x={-90} y={130} width={180} height={40} rx={8} fill={C.woodDark} stroke={OL} strokeWidth={6} />
				</g>
				<rect x={0} y={1350} width={1080} height={570} fill="#3a3f55" stroke={OL} strokeWidth={OW} />
				{(['a', 'c', 'd', 'e'] as KidKey[]).map((k, i) => (
					<g key={k} transform={`translate(0 ${t > win ? -Math.abs(Math.sin(t * 8 + i)) * 40 : 0})`}>
						<TeamKid k={k} x={130 + i * 270} y={1680} s={0.6} face="joy" arms={t > win} />
					</g>
				))}
				<g transform={`translate(0 ${t > win ? -Math.abs(Math.sin(t * 8)) * 40 : 0})`}>
					<Shnurok x={540} y={1640} s={0.7} face="joy" armL={[150, 20]} armR={[150, 20]} />
				</g>
			</Cam>
			<Confetti t={t} from={win} />
		</>
	);
};

const S9: React.FC<{t: number}> = ({t}) => {
	const A = B[8];
	const come = ease((t - 1.5) / 1.4);
	const ask = T('проситься') - A;
	return (
		<Cam z={1.03} cx={540} cy={1100}>
			<Basement t={t} />
			<Row t={t} screens={['game', 'off', 'game', 'game', 'off']} ons={[true, false, true, true, false]} />
			<rect x={760} y={760} width={280} height={560} fill={come > 0 ? '#9fd0e8' : '#5a4a52'} stroke={OL} strokeWidth={OW} />
			{(['b', 'e', 'a'] as KidKey[]).map((k, i) => (
				<g key={k} transform={`translate(${(1 - come) * 300 - i * 150 * come} 0)`}>
					<TeamKid k={k} x={900} y={1700} s={0.58} jacket={PINK} face={t > ask ? 'joy' : 'smile'} />
				</g>
			))}
			<Shnurok x={220} y={1700} s={0.75} face={t > ask ? 'shock' : 'smile'} handOnHead={t > ask} />
			{t > ask && (
				<g transform={`translate(700 560) scale(${pop(t, ask)})`}>
					<rect x={-260} y={-70} width={520} height={120} rx={60} fill="#fffaf0" stroke={OL} strokeWidth={OW} />
					<text x={0} y={14} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={OL}>
						Возьмёшь нас?
					</text>
				</g>
			)}
		</Cam>
	);
};

const S10: React.FC<{t: number}> = ({t}) => {
	const A = B[9];
	const v1 = T('первый', idx('маленький')) - A;
	const v2 = T('второй', idx('маленький')) - A;
	const split = t > v1 - 0.2;
	if (!split)
		return (
			<Cam z={1.03} cx={540} cy={1100}>
				<Basement t={t} />
				{Array.from({length: 14}).map((_, i) => (
					<Kid key={i} k={(['a', 'b', 'c', 'd', 'e'] as KidKey[])[i % 5]} x={80 + (i % 7) * 150} y={1500 + Math.floor(i / 7) * 220} s={0.45} face="smile" />
				))}
				<Badge x={540} y={700} text="ТЕСНО!" t={t} at={0.6} size={110} />
			</Cam>
		);
	const l = ease((t - v1 + 0.2) / 0.5);
	const r = ease((t - v2 + 0.2) / 0.5);
	return (
		<>
			<rect width={1080} height={1920} fill="#efe0c2" />
			<g opacity={l}>
				<rect x={20} y={200} width={510} height={1100} rx={30} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
				<text x={275} y={390} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={170} fill={C.red} stroke={OL} strokeWidth={8} paintOrder="stroke">
					1
				</text>
				<rect x={80} y={480} width={390} height={300} fill="#c9d9e8" stroke={OL} strokeWidth={OW} />
				{Array.from({length: 3}).map((_, i) => (
					<rect key={i} x={110 + i * 120} y={560} width={90} height={60} fill="#2a2e3d" stroke={OL} strokeWidth={4} />
				))}
				<g transform="translate(275 940) rotate(-5)">
					<rect x={-120} y={-100} width={240} height={200} fill="#fffaf0" stroke={OL} strokeWidth={OW} />
					<text x={0} y={-40} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={C.red}>
						КРЕДИТ
					</text>
					{[0, 1, 2].map((i) => (
						<line key={i} x1={-80} y1={10 + i * 30} x2={80} y2={10 + i * 30} stroke="#c9c4bd" strokeWidth={6} />
					))}
				</g>
				<text x={275} y={1170} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={36} fill={OL}>
					большое помещение
				</text>
			</g>
			<g opacity={r}>
				<rect x={550} y={200} width={510} height={1100} rx={30} fill="#f7ecd6" stroke={OL} strokeWidth={OW} />
				<text x={805} y={390} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={170} fill="#2b5bd7" stroke={OL} strokeWidth={8} paintOrder="stroke">
					2
				</text>
				<rect x={610} y={480} width={390} height={300} fill="#5a4a52" stroke={OL} strokeWidth={OW} />
				<rect x={640} y={500} width={330} height={60} rx={10} fill="#1d2b4f" stroke={OL} strokeWidth={5} />
				<text x={805} y={542} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={26} fill={C.ochre}>
					ШНУРОК·КЛУБ
				</text>
				<g transform="translate(805 940) rotate(4)">
					<rect x={-150} y={-70} width={300} height={140} rx={14} fill={C.ochre} stroke={OL} strokeWidth={OW} />
					<text x={0} y={-6} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={OL}>
						ТОЛЬКО
					</text>
					<text x={0} y={38} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill={OL}>
						ЛУЧШИЕ
					</text>
				</g>
				<text x={805} y={1170} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={36} fill={OL}>
					остаться в подвале
				</text>
			</g>
		</>
	);
};

const S11: React.FC<{t: number}> = ({t}) => (
	<Cam z={1.05 + 0.05 * ease(t / 6)} cx={540} cy={900}>
		<ClubInside t={t} />
		<Row t={t} screens={['game', 'game', 'game', 'game', 'game']} ons={[true, true, true, true, true]} />
		<Shnurok x={540} y={1700} s={1.0} thinking />
		<QMark x={250} y={780} t={t} s={0.75} text="1?" />
		<QMark x={830} y={780} t={t + 1} s={0.75} text="2?" />
	</Cam>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
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

export const PcClub2: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	const endFade = interpolate(t, [PCCLUB2_DURATION - 0.6, PCCLUB2_DURATION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.25 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			{SCENES.map((S, i) => {
				const from = B[i];
				const to = i < SCENES.length - 1 ? B[i + 1] : PCCLUB2_DURATION;
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

// unused helpers kept for future scenes
void Box;
void prog;
