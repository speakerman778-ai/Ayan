import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Char} from '../cartoon/parts';
import {KaraokeLine, Word} from '../subs/Karaoke';
import {ShotCtx} from '../lib';
import {Sanya, Max, Coach, Striker, Mom} from './Stena';
import rawWords from '../../public/shnurok/stena01-words.json';
import envRaw from '../../public/shnurok/stena01-env.json';

// «Стена», серия 1 «Жирный» — flat 2D in the channel style (clear and readable).

const FPS = 30;
const VW = 1080;
const VH = 1920;
const O = '#3b2a22';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
const back = (v: number) => Easing.out(Easing.back(1.7))(clamp01(v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const WORDS = rawWords as Word[];
export const STENA2D_DURATION = Math.ceil((WORDS[WORDS.length - 1]?.end ?? 90) + 3.2);
const CAPTIONS: Word[][] = (() => {
	const caps: Word[][] = [];
	let cur: Word[] = [];
	WORDS.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		if (prev && (cur.length >= 4 || /[.!?:…»]$/.test(prev.text) || w.start - prev.end > 0.6)) {
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
const S = (w: string, from = 0) => Math.max(0, T(w, from) + 0.02);
const ENV = envRaw as number[];
// lip sync for quoted lines
const SPEAK: {who: string; start: number; end: number}[] = (() => {
	const who = [null, null, null, 'max', null, null, 'str'];
	const out: {who: string; start: number; end: number}[] = [];
	let q = -1;
	let st = 0;
	WORDS.forEach((w) => {
		if (w.text.includes('«')) {
			q++;
			st = w.start;
		}
		if (w.text.includes('»') && who[q]) out.push({who: who[q] as string, start: st, end: w.end});
	});
	return out;
})();
const talkOf = (who: string, abs: number) => (SPEAK.some((s) => s.who === who && abs >= s.start - 0.03 && abs <= s.end + 0.05) ? clamp01(((ENV[Math.round(abs * FPS)] ?? 0) - 0.12) * 1.5) : 0);

// ------------------------------------------------------------------ flat backgrounds
const Classroom: React.FC = () => (
	<g>
		<rect width={VW} height={VH} fill="#f3e3c3" />
		<rect y={0} width={VW} height={130} fill="#e8d4ad" />
		<rect x={140} y={250} width={800} height={430} rx={16} fill="#2f5a45" stroke={O} strokeWidth={10} />
		<rect x={120} y={680} width={840} height={22} rx={8} fill="#c98c55" stroke={O} strokeWidth={6} />
		<text x={540} y={420} textAnchor="middle" fontFamily="Comic Sans MS, Inter" fontWeight={700} fontSize={64} fill="#f4f1ea" opacity={0.85}>2 + 2 = ?</text>
		<text x={540} y={520} textAnchor="middle" fontFamily="Comic Sans MS, Inter" fontWeight={700} fontSize={44} fill="#f4f1ea" opacity={0.7}>Классная работа</text>
		<rect x={30} y={240} width={70} height={360} rx={10} fill="#bfe0ff" stroke={O} strokeWidth={8} />
		<rect x={980} y={240} width={70} height={360} rx={10} fill="#bfe0ff" stroke={O} strokeWidth={8} />
		{[0, 1, 2, 3].map((k) => (
			<rect key={k} x={170 + k * 210} y={140} width={60} height={80} rx={6} fill={['#d9483b', '#3d6fb5', '#e8a93a', '#5f9e55'][k]} stroke={O} strokeWidth={5} />
		))}
		<rect y={1350} width={VW} height={VH - 1350} fill="#c98c55" />
		{Array.from({length: 6}).map((_, i) => (
			<path key={i} d={`M 0 ${1400 + i * 90} L ${VW} ${1400 + i * 90}`} stroke="#9c6338" strokeWidth={5} opacity={0.6} />
		))}
	</g>
);
const Desk: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g>
		<rect x={x - 150} y={y} width={300} height={34} rx={8} fill="#d9b07a" stroke={O} strokeWidth={7} />
		<rect x={x - 140} y={y + 34} width={24} height={170} fill="#9c6338" stroke={O} strokeWidth={5} />
		<rect x={x + 116} y={y + 34} width={24} height={170} fill="#9c6338" stroke={O} strokeWidth={5} />
	</g>
);
const Gym: React.FC<{t: number; banner?: string}> = ({t, banner}) => (
	<g>
		<rect width={VW} height={VH} fill="#efe2c4" />
		{[0, 1, 2, 3].map((k) => (
			<rect key={k} x={60 + k * 255} y={150} width={200} height={160} rx={10} fill="#cfe9ff" stroke={O} strokeWidth={8} />
		))}
		{/* wall bars */}
		{[0, 1].map((side) => (
			<g key={side} transform={`translate(${side ? 930 : 40} 400)`}>
				<rect x={0} y={0} width={14} height={720} fill="#c98c55" stroke={O} strokeWidth={4} />
				<rect x={96} y={0} width={14} height={720} fill="#c98c55" stroke={O} strokeWidth={4} />
				{Array.from({length: 9}).map((_, i) => (
					<rect key={i} x={0} y={30 + i * 78} width={110} height={10} rx={5} fill="#c98c55" stroke={O} strokeWidth={3} />
				))}
			</g>
		))}
		{banner && (
			<g>
				<rect x={240} y={360} width={600} height={110} rx={14} fill="#d9483b" stroke={O} strokeWidth={8} />
				<text x={540} y={432} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={52} fill="#fff">{banner}</text>
			</g>
		)}
		<rect y={1150} width={VW} height={VH - 1150} fill="#d8a467" />
		{Array.from({length: 9}).map((_, i) => (
			<path key={i} d={`M ${i * 130} 1150 L ${i * 130 - 160} ${VH}`} stroke="#c48f55" strokeWidth={5} />
		))}
		<path d={`M 0 1500 L ${VW} 1500`} stroke="#fff" strokeWidth={8} opacity={0.8} />
		<ellipse cx={540} cy={1500} rx={260} ry={70} fill="none" stroke="#fff" strokeWidth={8} opacity={0.8} />
		{/* bench of kids */}
		<rect x={0} y={1080} width={VW} height={40} fill="#3d6fb5" stroke={O} strokeWidth={6} />
		{Array.from({length: 8}).map((_, i) => (
			<g key={i} transform={`translate(${70 + i * 135} ${1080 - Math.abs(Math.sin(t * 3 + i)) * 6})`}>
				<circle cy={-120} r={40} fill="#f6c9a0" stroke={O} strokeWidth={6} />
				<path d="M -40 -130 Q 0 -190 40 -130 Z" fill={['#2b211d', '#7a4a2a', '#e0b04a', '#1b1410'][i % 4]} stroke={O} strokeWidth={5} />
				<rect x={-46} y={-80} width={92} height={80} rx={20} fill={['#5f9e55', '#8a5a9a', '#3d6fb5', '#e8a93a', '#c0603e'][i % 5]} stroke={O} strokeWidth={6} />
				<circle cx={-14} cy={-122} r={6} fill={O} />
				<circle cx={14} cy={-122} r={6} fill={O} />
			</g>
		))}
	</g>
);
const GoalFrame: React.FC<{y?: number}> = ({y = 1500}) => (
	<g>
		<rect x={150} y={y - 700} width={780} height={700} fill="none" stroke="#f4f1ea" strokeWidth={26} />
		<rect x={150} y={y - 700} width={780} height={700} fill="none" stroke={O} strokeWidth={6} />
		{Array.from({length: 13}).map((_, i) => (
			<path key={i} d={`M ${163 + i * 58} ${y - 690} L ${163 + i * 58} ${y}`} stroke="#fff" strokeWidth={3} opacity={0.6} />
		))}
		{Array.from({length: 12}).map((_, i) => (
			<path key={i} d={`M 163 ${y - 690 + i * 58} L 917 ${y - 690 + i * 58}`} stroke="#fff" strokeWidth={3} opacity={0.6} />
		))}
	</g>
);
const Ball: React.FC<{x: number; y: number; r?: number; spin?: number}> = ({x, y, r = 46, spin = 0}) => (
	<g transform={`translate(${x} ${y}) rotate(${spin})`}>
		<circle r={r} fill="#fff" stroke={O} strokeWidth={6} />
		<path d={`M 0 ${-r * 0.4} L ${r * 0.38} ${-r * 0.12} L ${r * 0.24} ${r * 0.32} L ${-r * 0.24} ${r * 0.32} L ${-r * 0.38} ${-r * 0.12} Z`} fill={O} />
	</g>
);
const Gloves: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = 0}) => (
	<g transform={`translate(${x} ${y}) rotate(${r})`}>
		{[-34, 34].map((dx) => (
			<g key={dx} transform={`translate(${dx} 0)`}>
				<rect x={-28} y={-38} width={56} height={76} rx={20} fill="#f2c230" stroke={O} strokeWidth={6} />
				<rect x={-28} y={16} width={56} height={22} rx={6} fill="#2b2b2b" />
			</g>
		))}
	</g>
);
const Sticker: React.FC<{t: number; at: number; text: string; x: number; y: number; r: number}> = ({t, at, text, x, y, r}) =>
	t < at ? null : (
		<g transform={`translate(${x} ${y}) rotate(${r}) scale(${back((t - at) / 0.3)})`}>
			<rect x={-text.length * 24 - 30} y={-54} width={text.length * 48 + 60} height={108} rx={16} fill="#d9483b" stroke={O} strokeWidth={8} />
			<text y={24} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={70} fill="#fff">{text}</text>
		</g>
	);
const Big: React.FC<{t: number; at: number; text: string; y?: number; size?: number; color?: string; out?: number}> = ({t, at, text, y = 600, size = 140, color = '#f5c542', out = 1e9}) =>
	t < at || t > out ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.3)})`}>
			<text textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={size} fill={color} stroke={O} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">{text}</text>
		</g>
	);
const Pill: React.FC<{t: number; at: number; text: string; y?: number}> = ({t, at, text, y = 260}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y}) scale(${back((t - at) / 0.35)})`}>
			<rect x={-text.length * 16 - 40} y={-42} width={text.length * 32 + 80} height={84} rx={42} fill="#f2c230" stroke={O} strokeWidth={7} />
			<text y={14} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={O}>{text}</text>
		</g>
	);
const Phone: React.FC<{t: number; at: number; children: React.ReactNode; y?: number; s?: number}> = ({t, at, children, y = 860, s = 1}) =>
	t < at ? null : (
		<g transform={`translate(540 ${y + 40 * (1 - ease((t - at) / 0.4))}) rotate(-3) scale(${s * back((t - at) / 0.4)})`}>
			<rect x={-250} y={-440} width={500} height={880} rx={56} fill="#15171f" stroke={O} strokeWidth={10} />
			<rect x={-224} y={-400} width={448} height={800} rx={30} fill="#1e2433" />
			{children}
		</g>
	);
const Clock: React.FC<{t: number; x: number; y: number}> = ({t, x, y}) => (
	<g transform={`translate(${x} ${y}) rotate(${(t * 240) % 360})`}>
		<circle r={12} fill="none" stroke="#cfe0ff" strokeWidth={3} />
		<path d="M 0 0 L 0 -8" stroke="#cfe0ff" strokeWidth={3} />
	</g>
);
const Kid: React.FC<{x: number; y: number; s: number; k: number; face?: React.ComponentProps<typeof Char>['face']; armR?: [number, number]}> = ({k, ...p}) => {
	const tops = ['#3d6fb5', '#8a5a9a', '#e8a93a', '#5f9e55', '#c0603e', '#2b9a9a'];
	const hairs = ['boy', 'curly', 'crew', 'sweep', 'buzz', 'shaggy'] as const;
	const hc = ['#2b211d', '#7a4a2a', '#e0b04a', '#1b1410', '#a0522d', '#4a3a30'];
	return <Char {...p} hair={hairs[k % 6]} hairColor={hc[k % 6]} jacket={tops[k % 6]} pants="#3a4560" hoodie headS={0.85} bodyS={1.14} headDrop={18} />;
};

// ------------------------------------------------------------------ scenes
type Scene = {at: number; draw: (t: number, abs: number) => React.ReactNode; zoom?: (t: number) => [number, number, number]};
const SC: Scene[] = [];

// 1. hook
SC.push({
	at: 0,
	zoom: (t) => [1 + 0.05 * t / 7, 540, 1100],
	draw: (t) => (
		<>
			<rect width={VW} height={VH} fill="#2c3354" />
			<circle cx={540} cy={1000} r={520} fill="#3a4470" />
			<Sanya x={540} y={1640} s={1.15} face="sad" />
			<Sticker t={t} at={T('жирный')} text="ЖИРНЫЙ" x={290} y={520} r={-10} />
			<Sticker t={t} at={T('пончик')} text="ПОНЧИК" x={800} y={680} r={8} />
			<Sticker t={t} at={T('шкаф')} text="ШКАФ" x={330} y={860} r={-5} />
		</>
	),
});

// 2. classroom: walk in, «хрю», laughter
{
	const at = S('каждое');
	const walk = T('захожу') - at;
	const oink = T('хрюкает') - at;
	SC.push({
		at,
		zoom: (t) => [1, 540, 960],
		draw: (t) => (
			<>
				<Classroom />
				{[[230, 0], [540, 1], [850, 2]].map(([x, k]) => (
					<g key={k}>
						<Kid x={x} y={1330} s={0.48} k={k} face={t > oink ? 'laugh' : 'neutral'} armR={t > oink && k === 1 ? [140, 30] : undefined} />
						<Desk x={x} y={1160} />
					</g>
				))}
				<Sanya x={lerp(1250, 800, ease((t - walk) / 2))} y={1760} s={0.7} face={t > oink + 0.5 ? 'sad' : 'neutral'} />
				<Big t={t} at={oink} out={oink + 1.6} text="ХРЮ!" y={1000} size={170} color="#ff9fb0" />
				{t > oink + 0.4 && [0, 1, 2].map((k) => <text key={k} x={180 + k * 330} y={1010 - Math.abs(Math.sin(t * 6 + k)) * 20} fontFamily="Inter" fontWeight={900} fontSize={50} fill="#d9483b">ха-ха</text>)}
			</>
		),
	});
}

// 3. PE: picked last
{
	const at = S('на', idx('слышу'));
	const always = T('всегда') - at;
	const forgot = T('даже') - at;
	SC.push({
		at,
		draw: (t) => {
			const picked = Math.floor(clamp01(t / Math.max(1, forgot + 0.6)) * 4);
			return (
				<>
					<Gym t={t} />
					<Max x={170} y={1700} s={0.55} face="smile" armR={[80, 10]} />
					{[0, 1, 2, 3].map((i) => (
						<g key={i} opacity={i < picked ? 0.35 : 1}>
							<Kid x={360 + i * 140} y={1720} s={0.5} k={i + 1} face={i === 3 ? 'neutral' : 'smile'} />
						</g>
					))}
					{t > forgot && <Pill t={t} at={forgot} text="без формы" y={1080} />}
					<Sanya x={930} y={1740} s={0.55} face="sad" />
					<Pill t={t} at={0.1} text="физра" y={250} />
					<Pill t={t} at={always} text="последний. всегда." y={360} />
				</>
			);
		},
	});
}

// 4. tournament: Max yells
{
	const at = S('а', idx('форму'));
	const max = T('капитан') - at;
	const laugh = T('все', idx('влезет')) - at;
	SC.push({
		at,
		zoom: (t) => [t > max ? 1.15 : 1, 380, 1300],
		draw: (t, abs) => (
			<>
				<Gym t={t} banner="ШКОЛЬНЫЙ ТУРНИР" />
				<Pill t={t} at={T('наш') - at} text="вратарь заболел 🤒" y={260} />
				<Max x={330} y={1720} s={0.62} face={t > laugh ? 'laugh' : 'determined'} armR={t > max ? [95, 0] : undefined} talk={talkOf('max', abs)} />
				<Sanya x={800} y={1740} s={0.62} face="sad" />
				{t > laugh && <Big t={t} at={laugh} text="АХАХАХ" y={700} size={130} />}
			</>
		),
	});
}

// 5. coach throws gloves
{
	const at = S('но', idx('ржут'));
	const sigh = T('вздыхает') - at;
	const toss = T('кидает') - at;
	SC.push({
		at,
		draw: (t) => {
			const k = clamp01((t - toss) / 0.7);
			return (
				<>
					<Gym t={t} banner="ШКОЛЬНЫЙ ТУРНИР" />
					<Coach x={280} y={1740} s={0.66} face={t > sigh ? 'sad' : 'neutral'} />
					<Sanya x={800} y={1740} s={0.62} face={t > toss + 0.6 ? 'shock' : 'sad'} armL={t > toss + 0.6 ? [80, 30] : undefined} armR={t > toss + 0.6 ? [80, 30] : undefined} />
					{t > toss && <Gloves x={lerp(360, 800, k)} y={lerp(1300, 1360, k) - Math.sin(k * Math.PI) * 300} r={k * 540} />}
					{t > sigh && t < toss && <text x={280} y={1000} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={60} fill={O}>эх…</text>}
				</>
			);
		},
	});
}

// 6. saves
{
	const at = S('первый');
	const s1 = T('прыгаю') - at;
	const s2 = T('отбиваю') - at;
	const s3 = T('лицо') - at;
	const pain = T('больно') - at;
	const no = T('но', idx('больно')) - at;
	SC.push({
		at,
		draw: (t) => {
			const shot = (tc: number, ex: number, ey: number) => (t > tc - 0.6 && t < tc + 0.05 ? {k: clamp01((t - tc + 0.6) / 0.6), ex, ey} : null);
			const sh = shot(s1, 380, 1050) ?? shot(s2, 760, 950) ?? shot(s3, 540, 1020);
			const dive = t > s1 - 0.2 && t < s1 + 0.6 ? -1 : t > s2 - 0.2 && t < s2 + 0.6 ? 1 : 0;
			return (
				<>
					<Gym t={t} />
					<GoalFrame />
					<g transform={`rotate(${dive * 18} 540 1560)`}>
						<Sanya x={540 + dive * 120} y={1560} s={0.72} face={t > s3 && t < pain + 1.2 ? 'wince' : 'determined'} armL={dive < 0 ? [160, 10] : [70, 40]} armR={dive > 0 ? [160, 10] : [70, 40]} />
					</g>
					{sh && <Ball x={lerp(540, sh.ex, sh.k)} y={lerp(1880, sh.ey, sh.k)} r={lerp(80, 40, sh.k)} spin={t * 400} />}
					{t > s1 && t < s2 - 0.6 && <Ball x={380} y={1080} r={40} />}
					{t > s2 && t < s2 + 0.6 && <Ball x={lerp(760, 1100, (t - s2) / 0.6)} y={lerp(950, 600, (t - s2) / 0.6)} r={40} spin={t * 500} />}
					{t > s3 && t < s3 + 0.35 && <rect width={VW} height={VH} fill="#fff" opacity={0.8 * (1 - (t - s3) / 0.35)} />}
					<Big t={t} at={s1} out={s2 - 0.4} text="ПОЙМАЛ!" color="#5fdc7a" y={560} />
					<Big t={t} at={s2} out={s3 - 0.5} text="ОТБИЛ!" color="#5fdc7a" y={560} />
					<Big t={t} at={pain} out={no - 0.1} text="БОЛЬНО…" color="#ff6b6b" y={560} />
					<Big t={t} at={no} text="НЕ ПРОШЁЛ" y={560} size={120} />
				</>
			);
		},
	});
}

// 7. silence
{
	const at = S('в', idx('прошёл'));
	SC.push({
		at,
		zoom: (t) => [1 + 0.05 * t / 3, 540, 1200],
		draw: (t) => (
			<>
				<Gym t={0} />
				<rect width={VW} height={VH} fill="#000" opacity={0.15} />
				<Max x={300} y={1720} s={0.6} face="shock" />
				<Sanya x={760} y={1740} s={0.62} face="determined" />
				<Pill t={t} at={0.4} text="тишина" y={260} />
			</>
		),
	});
}

// 8. final reached; message to mom stuck
{
	const at = S('мы', idx('смеётся'));
	const write = T('написать') - at;
	const block = T('но', idx('воротах')) - at;
	const clock = T('часики') - at;
	const fail = T('не', idx('часики')) - at;
	SC.push({
		at,
		draw: (t) => (
			<>
				<Gym t={t} banner="ФИНАЛ!" />
				<Sanya x={540} y={1760} s={0.7} face={t > fail ? 'sad' : 'joy'} />
				<rect width={VW} height={VH} fill="#0b1226" opacity={t > write ? 0.45 : 0} />
				<Phone t={t} at={write - 0.1} y={820} s={0.9}>
					<text x={0} y={-340} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">Мама ❤️</text>
					<text x={0} y={-300} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={24} fill={t > clock ? '#ff7a7a' : '#9fb7d6'}>{t > clock ? 'соединение…' : 'была недавно'}</text>
					{t > block && (
						<g transform="translate(-210 -250)">
							<rect width={420} height={64} rx={16} fill="#3a2230" />
							<text x={210} y={42} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={24} fill="#ff9a9a">School_WiFi: Telegram заблокирован</text>
						</g>
					)}
					{t > write + 0.6 && (
						<g transform="translate(-20 -130)">
							<rect width={230} height={74} rx={22} fill="#3d6fb5" />
							<text x={18} y={48} fontFamily="Inter" fontWeight={700} fontSize={30} fill="#fff">Я на воротах!</text>
							{t > clock - 0.4 && <Clock t={t} x={208} y={62} />}
						</g>
					)}
					{t > fail && <text x={0} y={60} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill="#ff7a7a">не отправлено</text>}
				</Phone>
			</>
		),
	});
}

// 9. AD in the story: hand + phone Ares → tap helmet → connected → sent → end card
{
	const at = S('тогда');
	const tap = T('одна', idx('ares')) - at;
	const flies = T('сообщение', idx('кнопка')) - at;
	const card = T('ares', idx('улетает')) - at;
	SC.push({
		at,
		draw: (t) => {
			if (t > card) {
				const k = ease((t - card) / 0.5);
				return (
					<g>
						<rect width={VW} height={VH} fill="#0d0b10" />
						{Array.from({length: 30}).map((_, i) => <circle key={i} cx={(i * 337) % VW} cy={(i * 211) % VH} r={2 + (i % 3)} fill="#d9283b" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />)}
						<circle cx={540} cy={640} r={330 + 20 * Math.sin(t * 4)} fill="#d9283b" opacity={0.12} />
						<foreignObject x={240} y={340} width={600} height={600} transform={`translate(540 640) scale(${0.85 + 0.15 * k}) translate(-540 -640)`}><Img src={staticFile('shnurok/ares-helmet.png')} style={{width: 600, height: 600}} /></foreignObject>
						<foreignObject x={155} y={960} width={770} height={300} opacity={k}><Img src={staticFile('shnurok/ares-logo.png')} style={{width: 770, height: 300}} /></foreignObject>
						<g opacity={k} transform="translate(540 1300)">
							<rect x={-250} y={-48} width={500} height={96} rx={48} fill="none" stroke="#d9283b" strokeWidth={5} />
							<circle cx={-195} cy={0} r={24} fill="#2aa3e0" />
							<text x={-160} y={14} fontFamily="Inter" fontWeight={900} fontSize={42} fill="#fff">@Aress_vpn_bot</text>
						</g>
					</g>
				);
			}
			const on = t > tap + 0.25;
			const fx = lerp(820, 540, ease((t - tap + 0.6) / 0.5));
			const fy = lerp(1700, 830, ease((t - tap + 0.6) / 0.5));
			const away = t > tap + 0.5 ? ease((t - tap - 0.5) / 0.4) : 0;
			return (
				<g>
					<rect width={VW} height={VH} fill="#efe2c4" />
					<rect width={VW} height={VH} fill="#0b1226" opacity={0.5} />
					<path d="M 80 1920 L 260 1500 L 420 1560 L 300 1920 Z" fill="#4f8a5b" stroke={O} strokeWidth={8} />
					<g transform="translate(540 980) rotate(-4)">
						<rect x={-300} y={-620} width={600} height={1180} rx={70} fill="#1b1c26" stroke={O} strokeWidth={12} />
						<rect x={-270} y={-585} width={540} height={1110} rx={46} fill={t < flies ? '#141017' : '#e9eef5'} />
						<text x={-230} y={-530} fontFamily="Inter" fontWeight={800} fontSize={30} fill={t < flies ? '#fff' : O}>14:20</text>
						{t < flies ? (
							<g>
								<foreignObject x={-200} y={-500} width={400} height={156}><Img src={staticFile('shnurok/ares-logo.png')} style={{width: 400, height: 156}} /></foreignObject>
								<circle cx={0} cy={-80} r={on ? 230 : 200} fill="#d9283b" opacity={on ? 0.22 + 0.08 * Math.sin(t * 6) : 0.06} />
								<foreignObject x={-180} y={-260} width={360} height={360} style={{filter: on ? 'none' : 'grayscale(0.85) brightness(0.6)'}}><Img src={staticFile('shnurok/ares-helmet.png')} style={{width: 360, height: 360}} /></foreignObject>
								<text x={0} y={200} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill="#fff">{on ? 'ПОДКЛЮЧЕНО' : 'НАЖМИ НА ШЛЕМ'}</text>
								<rect x={-200} y={240} width={400} height={64} rx={32} fill="none" stroke="#d9283b" strokeWidth={4} />
								<circle cx={-160} cy={272} r={10} fill={on ? '#3ad16b' : '#666'} />
								<text x={10} y={284} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={28} fill="#ddd">Защищено · быстро</text>
							</g>
						) : (
							<g>
								<text x={0} y={-470} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={40} fill={O}>Мама ❤️</text>
								<text x={0} y={-425} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={28} fill="#2b9a3b">в сети</text>
								<g transform="translate(-40 -250)">
									<rect width={320} height={110} rx={28} fill="#3d6fb5" />
									<text x={24} y={70} fontFamily="Inter" fontWeight={700} fontSize={40} fill="#fff">Я на воротах!</text>
									<g transform="translate(250 92)" stroke="#9ff0b5" strokeWidth={5} fill="none" strokeLinecap="round">
										<path d="M 0 0 L 8 8 L 22 -8" />
										<path d="M 14 0 L 22 8 L 36 -8" />
									</g>
								</g>
								<text x={0} y={60} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={60} fill="#2b9a3b">✓✓ отправлено</text>
							</g>
						)}
					</g>
					<ellipse cx={300} cy={1520} rx={70} ry={46} fill="#f6c9a0" stroke={O} strokeWidth={7} transform="rotate(-30 300 1520)" />
					{t < flies && (
						<g transform={`translate(${lerp(fx, 900, away)} ${lerp(fy, 1800, away)}) rotate(-25)`}>
							<rect x={-42} y={0} width={84} height={700} rx={42} fill="#f6c9a0" stroke={O} strokeWidth={7} />
						</g>
					)}
					{on && t < tap + 0.7 && <circle cx={540} cy={890} r={60 + 200 * (t - tap - 0.25)} fill="none" stroke="#ff4b4b" strokeWidth={10} opacity={1 - (t - tap - 0.25) / 0.45} />}
				</g>
			);
		},
	});
}

// 10. mom replies
{
	const at = S('мама', idx('телеграме'));
	const rep = T('я', idx('сразу')) - at;
	SC.push({
		at,
		draw: (t) => (
			<>
				<Gym t={t} banner="ФИНАЛ!" />
				<Sanya x={540} y={1760} s={0.7} face={t > rep ? 'joy' : 'smile'} />
				<rect width={VW} height={VH} fill="#0b1226" opacity={0.4} />
				<Phone t={t} at={0} y={820} s={0.9}>
					<text x={0} y={-340} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff">Мама ❤️</text>
					<text x={0} y={-300} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={24} fill="#5fdc7a">в сети</text>
					<g transform="translate(-20 -220)">
						<rect width={230} height={74} rx={22} fill="#3d6fb5" />
						<text x={18} y={48} fontFamily="Inter" fontWeight={700} fontSize={30} fill="#fff">Я на воротах!</text>
					</g>
					{t > rep && (
						<g transform={`translate(-210 -110) scale(${back((t - rep) / 0.35)})`}>
							<rect width={280} height={74} rx={22} fill="#f4f1ea" />
							<text x={18} y={48} fontFamily="Inter" fontWeight={800} fontSize={30} fill={O}>Я уже бегу! 🏃‍♀️</text>
						</g>
					)}
				</Phone>
			</>
		),
	});
}

// 11. final: penalties; mom arrives
{
	const at = S('финал', idx('бегу'));
	const mom = T('а', idx('чемпионы')) - at;
	SC.push({
		at,
		draw: (t) => (
			<>
				<Gym t={t} />
				{t < mom ? (
					<>
						<GoalFrame />
						<Sanya x={540} y={1560} s={0.72} face="determined" armL={[70, 40]} armR={[70, 40]} />
					</>
				) : (
					<>
						<Mom x={540} y={1760} s={0.75} face="joy" armR={[150, 20]} />
						<text x={540} y={900} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={80} fill="#d9483b" stroke={O} strokeWidth={8} paintOrder="stroke">САНЯ, ДАВАЙ! ❤️</text>
					</>
				)}
				<g transform="translate(540 260)">
					<rect x={-320} y={-56} width={640} height={112} rx={24} fill="#15171f" stroke={O} strokeWidth={6} />
					<text y={18} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={48} fill="#f5c542">ФИНАЛ · 3:3 · ПЕНАЛЬТИ</text>
				</g>
			</>
		),
	});
}

// 12. striker: «Ну что, Жирный, влезешь?» → run-up → kick → freeze
{
	const at = S('на', idx('мама', idx('трибуне')));
	const close = T('он', idx('школы')) - at;
	const run = T('разбег') - at;
	const kick = T('удар', idx('разбег')) - at;
	const freeze = kick + 0.35;
	SC.push({
		at,
		zoom: (t) => (t >= close && t < run ? [1.35, 540, 900] : [1, 540, 960]),
		draw: (t, abs) => {
			const tt = Math.min(t, freeze);
			const k = clamp01((tt - kick) / 0.5);
			return (
				<>
					<Gym t={tt} />
					<GoalFrame y={1180} />
					<Sanya x={540} y={1220} s={0.42} face="determined" armL={[70, 40]} armR={[70, 40]} />
					<Ball x={lerp(560, 640, k)} y={lerp(1640, 1000, k)} r={lerp(60, 36, k)} spin={tt * 300 * (tt > kick ? 1 : 0)} />
					<Striker x={tt < run ? 760 : lerp(860, 660, ease((tt - run) / Math.max(0.3, kick - run)))} y={1880} s={0.85} face={tt > close ? 'smile' : 'determined'} talk={talkOf('str', abs)} />
					{tt > close && tt < run && <text x={540} y={560} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill="#fff" stroke={O} strokeWidth={8} paintOrder="stroke">«Ну что, влезешь?»</text>}
					{t > freeze && <rect width={VW} height={VH} fill="#000" opacity={0.35 * clamp01((t - freeze) / 0.4)} />}
					{t > freeze + 0.6 && (
						<g opacity={clamp01((t - freeze - 0.6) / 0.5)}>
							<text x={540} y={700} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={80} fill="#fff" stroke={O} strokeWidth={10} paintOrder="stroke">Продолжение</text>
							<text x={540} y={800} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={80} fill="#f5c542" stroke={O} strokeWidth={10} paintOrder="stroke">следует…</text>
							<text x={540} y={900} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={42} fill="#fff" stroke={O} strokeWidth={6} paintOrder="stroke">отобьёт Саня? пиши в комментах 👇</text>
						</g>
					)}
				</>
			);
		},
	});
}

// ------------------------------------------------------------------ composition
const FADE = 0.25;
const Layer: React.FC<{sc: Scene; first: boolean; isAd: boolean}> = ({sc, first, isAd}) => {
	const lt = useCurrentFrame() / FPS;
	const abs = sc.at + lt;
	const [z, cx, cy] = sc.zoom ? sc.zoom(lt) : [1 + 0.03 * Math.min(1, lt / 6), 540, 1100];
	const enter = first ? 1 : clamp01(lt / FADE);
	return (
		<ShotCtx.Provider value={{t: lt, dur: 1, scatter: 0}}>
			<AbsoluteFill style={{opacity: enter}}>
				<svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
					<g transform={`translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`}>{sc.draw(lt, abs)}</g>
					{isAd && (
						<g transform="translate(40 40)">
							<rect width={150} height={46} rx={10} fill="#ffffff" opacity={0.92} />
							<text x={75} y={32} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={26} fill={O}>Реклама</text>
						</g>
					)}
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
export const Stena2D: React.FC<{audio?: string}> = ({audio = ''}) => {
	const t = useCurrentFrame() / FPS;
	let ci = -1;
	CAPTIONS.forEach((c, i) => {
		if (c[0].start - 0.05 <= t) ci = i;
	});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SC.map((sc, i) => {
				const from = Math.round(sc.at * FPS);
				const to = i < SC.length - 1 ? Math.round((SC[i + 1].at + FADE) * FPS) : STENA2D_DURATION * FPS;
				return (
					<Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
						<Layer sc={sc} first={i === 0} isAd={i === 8} />
					</Sequence>
				);
			})}
			{ci >= 0 && t < WORDS[WORDS.length - 1].end + 0.6 && <KaraokeLine key={ci} words={CAPTIONS[ci]} t={t} y={880} keepSpoken />}
			<div style={{position: 'absolute', right: 40, top: 40, fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: '#fff', opacity: 0.9, textShadow: '0 2px 6px #000a'}}>Вселенная Шнурка</div>
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
