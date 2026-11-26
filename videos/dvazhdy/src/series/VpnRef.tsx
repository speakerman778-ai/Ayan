import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ShotCtx, clamp, easeOut, hash, prog} from '../lib';
import {C, OL, OW} from '../cartoon/parts';
import {Room} from './Keeper';
import {Shnurok, SHNUROK} from './Shnurok';
import {KaraokeLine, Word} from '../subs/Karaoke';

// Референс нативной рекламы Ares VPN (~12 с) для рекламодателя.
// Сюжет: Шнурок хочет позвонить → Телеграм висит на «соединение…» → одна кнопка Ares VPN → звонок прошёл → плашка Ares.
// Фирменные цвета Ares (чёрный, красное свечение, спартанский шлем) перерисованы в плоском 2D канала.

const TG = '#2aa3e0';
const ARES_BG = '#120d10';
const ARES_RED = '#d9261c';
const ARES_DARK = '#6e120d';
const HELM = '#ece6dc';
const HELM_SH = '#b7ada1';
const BOT = '@Aress_vpn_bot';

const S2 = 3.3; // крупно: включает Ares VPN
const S3 = 6.6; // звонок прошёл
const S4 = 9.6; // плашка Ares
export const VPN_REF_DUR = 12.3;

// ---------------------------------------------------------------- фирменные элементы Ares
/** Спартанский шлем — плоский, с контуром. Размер ~ 200 × 300. */
const Helmet: React.FC<{x: number; y: number; s?: number; id: string; t: number}> = ({x, y, s = 1, id, t}) => {
	const outer = 'M -76 -6 Q -78 -98 0 -104 Q 78 -98 76 -6 L 72 72 L 30 104 L 22 34 L -22 34 L -30 104 L -72 72 Z';
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`}>
			{/* гребень */}
			<path d={`M -18 -96 Q 10 -200 120 -196 Q ${70 + Math.sin(t * 3) * 4} -160 42 -92 Z`} fill={HELM} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			{[0, 1, 2, 3].map((i) => (
				<path key={i} d={`M ${-4 + i * 14} -104 Q ${20 + i * 16} -170 ${70 + i * 12} -186`} stroke={HELM_SH} strokeWidth={5} fill="none" strokeLinecap="round" />
			))}
			<path d={outer} fill={HELM} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<clipPath id={id}>
				<rect x={0} y={-120} width={100} height={240} />
			</clipPath>
			<path d={outer} fill={HELM_SH} clipPath={`url(#${id})`} />
			<path d={outer} fill="none" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			{/* Т-образная прорезь */}
			<path d="M -62 -20 Q 0 -36 62 -20 L 58 4 Q 30 -6 12 6 L 12 104 L -12 104 L -12 6 Q -30 -6 -58 4 Z" fill={ARES_BG} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
			<rect x={-7} y={-26} width={14} height={60} rx={5} fill={HELM} stroke={OL} strokeWidth={4} />
			<path d="M -40 -60 Q 0 -74 40 -60" stroke={HELM_SH} strokeWidth={6} fill="none" strokeLinecap="round" />
		</g>
	);
};

/** Красное «свечение» — плоскими кругами без градиентов */
const Glow: React.FC<{x: number; y: number; r: number; k?: number}> = ({x, y, r, k = 1}) => (
	<g>
		{[1.5, 1.3, 1.15].map((m, i) => (
			<circle key={i} cx={x} cy={y} r={r * m} fill={ARES_RED} opacity={0.1 * k} />
		))}
	</g>
);

/** Эмблема: шлем в круге с красным кольцом */
const Emblem: React.FC<{x: number; y: number; r: number; t: number; id: string; k?: number}> = ({x, y, r, t, id, k = 1}) => (
	<g>
		<Glow x={x} y={y} r={r} k={k * (0.85 + 0.15 * Math.sin(t * 4))} />
		<circle cx={x} cy={y} r={r} fill={ARES_DARK} stroke={OL} strokeWidth={OW} />
		<circle cx={x} cy={y} r={r * 0.86} fill={ARES_BG} stroke={ARES_RED} strokeWidth={r * 0.05} opacity={1} />
		{/* силуэт крепости внизу */}
		<clipPath id={`${id}c`}>
			<circle cx={x} cy={y} r={r * 0.84} />
		</clipPath>
		<g clipPath={`url(#${id}c)`}>
			<path
				d={`M ${x - r} ${y + r * 0.62} L ${x - r * 0.8} ${y + r * 0.62} L ${x - r * 0.8} ${y + r * 0.38} L ${x - r * 0.72} ${y + r * 0.3} L ${x - r * 0.64} ${y + r * 0.38} L ${x - r * 0.64} ${y + r * 0.55} L ${x + r * 0.6} ${y + r * 0.55} L ${x + r * 0.6} ${y + r * 0.32} L ${x + r * 0.7} ${y + r * 0.22} L ${x + r * 0.8} ${y + r * 0.32} L ${x + r * 0.8} ${y + r * 0.62} L ${x + r} ${y + r * 0.62} L ${x + r} ${y + r} L ${x - r} ${y + r} Z`}
				fill={ARES_DARK}
			/>
		</g>
		<Helmet x={x - r * 0.08} y={y + r * 0.12} s={r / 190} id={id} t={t} />
	</g>
);

const AresWord: React.FC<{x: number; y: number; s?: number; sub?: boolean}> = ({x, y, s = 1, sub = true}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<text x={0} y={0} textAnchor="middle" fontFamily="Inter" fontWeight={300} fontSize={110} letterSpacing={44} fill="#e9e4dc">
			ΛRES
		</text>
		{sub && (
			<g>
				<line x1={-240} y1={52} x2={-80} y2={52} stroke={ARES_RED} strokeWidth={4} />
				<line x1={80} y1={52} x2={240} y2={52} stroke={ARES_RED} strokeWidth={4} />
				<text x={0} y={66} textAnchor="middle" fontFamily="Inter" fontWeight={400} fontSize={44} letterSpacing={20} fill="#e9e4dc">
					VPN
				</text>
			</g>
		)}
	</g>
);

const Embers: React.FC<{t: number; w: number; h: number}> = ({t, w, h}) => (
	<g>
		{Array.from({length: 26}).map((_, i) => {
			const sp = 60 + hash(i) * 90;
			const yy = h - ((t * sp + hash(i + 3) * h) % (h + 40));
			const xx = hash(i + 7) * w + Math.sin(t * 1.5 + i) * 20;
			return <circle key={i} cx={xx} cy={yy} r={3 + hash(i + 2) * 5} fill={i % 3 ? ARES_RED : '#ff8a5c'} opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />;
		})}
	</g>
);

// ---------------------------------------------------------------- телефон
const Phone: React.FC<{x: number; y: number; w: number; h: number; rot?: number; children: React.ReactNode; id: string}> = ({x, y, w, h, rot = 0, children, id}) => {
	const r = w * 0.16;
	const pad = w * 0.06;
	return (
		<g transform={`translate(${x} ${y}) rotate(${rot})`}>
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill="#2a2430" stroke={OL} strokeWidth={OW} />
			<clipPath id={id}>
				<rect x={-w / 2 + pad} y={-h / 2 + pad} width={w - pad * 2} height={h - pad * 2} rx={r * 0.7} />
			</clipPath>
			<g clipPath={`url(#${id})`}>
				<g transform={`translate(${-w / 2 + pad} ${-h / 2 + pad}) scale(${(w - pad * 2) / 600})`}>{children}</g>
			</g>
			<rect x={-w * 0.14} y={-h / 2 + pad + 6} width={w * 0.28} height={w * 0.06} rx={w * 0.03} fill="#2a2430" />
		</g>
	);
};

// Экраны рисуются в системе 600 × 1180
const StatusBar: React.FC<{vpn?: number; bars: number; dark?: boolean}> = ({vpn = 0, bars, dark = false}) => {
	const col = dark ? '#fff' : OL;
	return (
		<g>
			<text x={40} y={66} fontFamily="Inter" fontWeight={800} fontSize={34} fill={col}>
				23:02
			</text>
			{[0, 1, 2, 3].map((i) => (
				<rect key={i} x={400 + i * 18} y={62 - (i + 1) * 9} width={12} height={(i + 1) * 9} rx={3} fill={col} opacity={i < bars ? 1 : 0.25} />
			))}
			{vpn > 0 && (
				<g transform={`translate(${520} 44) scale(${0.6 + 0.4 * vpn})`} opacity={vpn}>
					<rect x={-38} y={-20} width={76} height={38} rx={10} fill={ARES_RED} stroke={OL} strokeWidth={4} />
					<text x={0} y={10} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={24} fill="#fff">
						VPN
					</text>
				</g>
			)}
		</g>
	);
};

const Plane: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<circle r={50} fill={TG} stroke={OL} strokeWidth={6} />
		<path d="M -28 -2 L 30 -24 L 20 28 L 2 14 L -8 26 L -6 8 Z" fill="#fff" stroke={OL} strokeWidth={4} strokeLinejoin="round" />
		<path d="M -6 8 L 22 -16" stroke={OL} strokeWidth={4} />
	</g>
);

/** Телеграм висит на «соединение…» */
const ScreenLoading: React.FC<{t: number}> = ({t}) => (
	<g>
		<rect width={600} height={1180} fill="#f4efe4" />
		<StatusBar bars={1} />
		<rect y={96} width={600} height={130} fill="#e6dcc8" />
		<Plane x={80} y={160} s={0.75} />
		<text x={150} y={152} fontFamily="Inter" fontWeight={900} fontSize={46} fill={OL}>
			Дима
		</text>
		<text x={150} y={200} fontFamily="Inter" fontWeight={800} fontSize={34} fill={C.red}>
			{'соединение' + '.'.repeat(1 + (Math.floor(t * 3) % 3))}
		</text>
		<g transform={`translate(300 560) rotate(${t * 300})`}>
			<circle r={80} fill="none" stroke="#d9cfb8" strokeWidth={22} />
			<path d="M 0 -80 A 80 80 0 0 1 80 0" fill="none" stroke={TG} strokeWidth={22} strokeLinecap="round" />
		</g>
		<text x={300} y={740} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={44} fill="#9b8f78">
			не грузится…
		</text>
		<g transform="translate(300 980)">
			<circle r={90} fill="#c9c4bd" stroke={OL} strokeWidth={6} />
			<path d="M -30 -34 Q -40 0 -8 30 Q 22 54 38 34 L 26 16 Q 14 24 2 14 Q -16 0 -14 -14 L -4 -24 Z" fill="#fff" stroke={OL} strokeWidth={4} strokeLinejoin="round" transform="scale(1.3)" />
		</g>
	</g>
);

/** Приложение Ares VPN: одна большая кнопка */
const ScreenAres: React.FC<{t: number; on: number}> = ({t, on}) => {
	const pulse = on > 0.99 ? (t * 0.9) % 1 : 0;
	const lit = on > 0.5;
	return (
		<g>
			<rect width={600} height={1180} fill={ARES_BG} />
			<Embers t={t} w={600} h={1180} />
			<StatusBar bars={lit ? 4 : 1} vpn={lit ? clamp((on - 0.5) * 2) : 0} dark />
			<AresWord x={300} y={230} s={0.82} />
			{/* кнопка-эмблема */}
			<g>
				{on > 0.99 && <circle cx={300} cy={600} r={200 + pulse * 90} fill="none" stroke={ARES_RED} strokeWidth={10} opacity={1 - pulse} />}
				<g transform={`translate(300 600) scale(${1 - 0.06 * Math.sin(clamp(on) * Math.PI)}) translate(-300 -600)`}>
					<g opacity={lit ? 1 : 0.45}>
						<Emblem x={300} y={600} r={200} t={t} id="hb" k={lit ? 1.4 : 0} />
					</g>
				</g>
			</g>
			<text x={300} y={910} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} letterSpacing={4} fill={lit ? '#fff' : '#8a8088'}>
				{lit ? 'ПОДКЛЮЧЕНО' : 'НАЖМИ НА ШЛЕМ'}
			</text>
			<g opacity={lit ? 1 : 0.35}>
				<rect x={80} y={970} width={440} height={100} rx={26} fill="#241a1e" stroke={ARES_RED} strokeWidth={4} />
				<circle cx={140} cy={1020} r={14} fill={lit ? '#7dde6a' : '#8a8088'} />
				<text x={176} y={1032} fontFamily="Inter" fontWeight={800} fontSize={34} fill="#fff">
					Защищено · быстро
				</text>
			</g>
		</g>
	);
};

/** Звонок прошёл */
const ScreenCall: React.FC<{t: number}> = ({t}) => {
	const sec = Math.max(0, Math.floor(t - S3));
	const wave = (i: number) => 18 + 40 * Math.abs(Math.sin(t * 9 + i * 1.3));
	return (
		<g>
			<rect width={600} height={1180} fill={TG} />
			<StatusBar bars={4} vpn={1} dark />
			<text x={300} y={170} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={34} fill="#fff" opacity={0.9}>
				Телеграм · звонок
			</text>
			<g transform="translate(300 400)">
				<circle r={130} fill={C.ochre} stroke={OL} strokeWidth={8} />
				<circle cy={-24} r={52} fill={C.skin} stroke={OL} strokeWidth={7} />
				<path d="M -84 96 Q -80 30 0 30 Q 80 30 84 96" fill={C.red} stroke={OL} strokeWidth={7} />
			</g>
			<text x={300} y={630} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={64} fill="#fff">
				Дима
			</text>
			<text x={300} y={700} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={44} fill="#fff">
				{`00:0${sec}`}
			</text>
			{[0, 1, 2, 3, 4, 5, 6].map((i) => (
				<rect key={i} x={186 + i * 34} y={810 - wave(i) / 2} width={20} height={wave(i)} rx={10} fill="#fff" />
			))}
			<g transform="translate(300 1000)">
				<circle r={84} fill={C.red} stroke={OL} strokeWidth={6} />
				<path d="M -44 6 Q 0 -30 44 6 L 36 22 L 16 14 L 14 -2 Q 0 -6 -14 -2 L -16 14 L -36 22 Z" fill="#fff" stroke={OL} strokeWidth={4} strokeLinejoin="round" />
			</g>
		</g>
	);
};

// ---------------------------------------------------------------- плашка в конце
const EndCard: React.FC<{t: number}> = ({t}) => {
	const a = easeOut(prog(t, S4, 0.5));
	const b = easeOut(prog(t, S4 + 0.35, 0.5));
	const c = easeOut(prog(t, S4 + 0.7, 0.5));
	return (
		<g>
			<rect width={1080} height={1920} fill={ARES_BG} />
			<Embers t={t} w={1080} h={1920} />
			<g transform={`translate(540 560) scale(${0.7 + 0.3 * a}) translate(-540 -560)`} opacity={a}>
				<Emblem x={540} y={560} r={300} t={t} id="he" k={1.6} />
			</g>
			<g opacity={b} transform={`translate(0 ${(1 - b) * 30})`}>
				<AresWord x={560} y={1030} s={1.2} />
			</g>
			<g opacity={c} transform={`translate(0 ${(1 - c) * 30})`}>
				<line x1={130} y1={1150} x2={200} y2={1150} stroke={ARES_RED} strokeWidth={5} />
				<text x={220} y={1164} fontFamily="Inter" fontWeight={600} fontSize={40} letterSpacing={6} fill="#cfc6c0">
					VPN-СЕРВИС В TELEGRAM
				</text>
				<g transform="translate(540 1270)">
					<rect x={-280} y={-56} width={560} height={112} rx={56} fill="#241a1e" stroke={ARES_RED} strokeWidth={6} />
					<Plane x={-212} y={0} s={0.72} />
					<text x={30} y={16} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={46} fill="#fff">
						{BOT}
					</text>
				</g>
			</g>
		</g>
	);
};

const AdMark: React.FC<{dark?: boolean}> = ({dark}) => (
	<g transform="translate(40 40)">
		<rect width={190} height={58} rx={14} fill={dark ? '#241a1e' : C.paper} stroke={dark ? ARES_RED : OL} strokeWidth={5} opacity={0.92} />
		<text x={95} y={39} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill={dark ? '#e9e4dc' : OL}>
			Реклама
		</text>
	</g>
);

const words = (phrase: string, start: number, end: number): Word[] => {
	const ws = phrase.split(' ');
	const total = ws.reduce((a, w) => a + w.length + 2, 0);
	let cur = start;
	return ws.map((w) => {
		const d = ((w.length + 2) / total) * (end - start);
		const o = {text: w, start: cur, end: cur + d};
		cur += d;
		return o;
	});
};

const SUBS: Word[][] = [
	words('Хотел позвонить Диме,', 0.3, 1.5),
	words('а Телеграм — «соединение…»', 1.5, 3.0),
	words('Включаю Ares VPN —', 3.4, 4.7),
	words('одна кнопка.', 4.7, 6.2),
	words('И всё летает.', 6.8, 8.0),
	words('Алло, Дима, слышно?', 8.1, 9.4),
	words('Ares VPN — бот в Телеграме.', 9.9, 12.0),
];

// ---------------------------------------------------------------- композиция
const handPos = (x: number, y: number, s: number, a1: number, a2: number) => {
	const d2r = Math.PI / 180;
	const shY = -(100 * 1.14) * 2 - 10 - 210 * 1.14;
	let hx = 84 - 8;
	let hy = shY + 26;
	hx += Math.sin(a1 * d2r) * 110;
	hy += Math.cos(a1 * d2r) * 110;
	hx += Math.sin((a1 + a2) * d2r) * 100;
	hy += Math.cos((a1 + a2) * d2r) * 100;
	return [x + hx * s, y + hy * s];
};

/** Крупный план: рука держит телефон с Ares VPN, большой палец жмёт на шлем */
const CloseUp: React.FC<{t: number}> = ({t}) => {
	const on = easeOut(prog(t, 4.6, 0.5));
	const reach = easeOut(prog(t, 3.8, 0.7)) - 0.92 * easeOut(prog(t, 5.1, 0.5));
	const tx = 300 + reach * 230;
	const ty = 1320 - reach * 560;
	return (
		<g>
			<Room t={t} />
			<rect width={1080} height={1920} fill={ARES_BG} opacity={0.6} />
			<Phone id="ph2" x={540} y={760} w={640} h={1220} rot={-3}>
				<ScreenAres t={t} on={on} />
			</Phone>
			{/* пальцы с правого края */}
			{[0, 1, 2].map((i) => (
				<ellipse key={i} cx={862 - i * 4} cy={760 + i * 90} rx={46} ry={38} fill={C.skin} stroke={OL} strokeWidth={OW} />
			))}
			{/* рукав и ладонь */}
			<path d="M 0 1920 L 120 1420 L 360 1440 L 330 1920 Z" fill={SHNUROK.hoodie} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<ellipse cx={250} cy={1330} rx={130} ry={120} fill={C.skin} stroke={OL} strokeWidth={OW} />
			<path d={`M 250 1320 L ${tx} ${ty}`} stroke={OL} strokeWidth={88 + OW * 2} strokeLinecap="round" />
			<path d={`M 250 1320 L ${tx} ${ty}`} stroke={C.skin} strokeWidth={88} strokeLinecap="round" />
			<ellipse cx={tx + 4} cy={ty - 6} rx={22} ry={15} fill="#fbe3cf" transform={`rotate(-30 ${tx + 4} ${ty - 6})`} />
		</g>
	);
};

export const VpnRef: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const scene = t < S2 ? 1 : t < S3 ? 2 : t < S4 ? 3 : 4;
	const t0 = [0, 0, S2, S3, S4][scene];
	const zoom = 1 + 0.04 * prog(t, t0, 3.4);

	const sx = 400;
	const sy = 1330;
	const ss = 1.35;
	const arm: [number, number] = [28, 122];
	const [hx, hy] = handPos(sx, sy, ss, arm[0], arm[1]);
	const shake = scene === 1 && t > 2.0 ? Math.sin(t * 40) * 4 * (1 - prog(t, 2.0, 1)) : 0;

	return (
		<ShotCtx.Provider value={{t, dur: VPN_REF_DUR, scatter: 0}}>
			<AbsoluteFill style={{background: '#e9dcc4'}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<g transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`}>
						{(scene === 1 || scene === 3) && (
							<g>
								<Room t={t} />
								<g transform={`translate(${shake} 0)`}>
									<Shnurok
										x={sx}
										y={sy}
										s={ss}
										face={scene === 1 ? (t < 1.5 ? 'smile' : 'wince') : 'joy'}
										armR={arm}
										armROver
										armL={scene === 3 ? [150, 30] : [14, -10]}
										look={scene === 1 ? 0.6 : 0.2}
										talk={scene === 3 && t > 8.1 ? Math.abs(Math.sin(t * 12)) * 0.6 : 0}
									/>
									<Phone id={`ph${scene}`} x={hx + 46} y={hy - 90} w={230} h={436} rot={8}>
										{scene === 1 ? <ScreenLoading t={t} /> : <ScreenCall t={t} />}
									</Phone>
									<circle cx={hx + 2} cy={hy + 6} r={26} fill={C.skin} stroke={OL} strokeWidth={OW} />
								</g>
								{scene === 1 && t > 1.7 && (
									<g transform={`translate(860 1000) scale(${easeOut(prog(t, 1.7, 0.3))})`}>
										<circle r={84} fill={C.paper} stroke={OL} strokeWidth={OW} />
										{[0, 1, 2, 3].map((i) => (
											<rect key={i} x={-46 + i * 24} y={34 - (i + 1) * 16} width={16} height={(i + 1) * 16} rx={4} fill={OL} opacity={i < 1 ? 1 : 0.2} />
										))}
										<path d="M 20 -52 L 56 -16 M 56 -52 L 20 -16" stroke={C.red} strokeWidth={12} strokeLinecap="round" />
									</g>
								)}
								{scene === 3 && (
									<g transform={`translate(760 300) scale(${easeOut(prog(t, 8.1, 0.3))})`}>
										<path d="M -40 50 L -120 130 L 10 58 Z" fill={C.white} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
										<rect x={-170} y={-60} width={340} height={120} rx={60} fill={C.white} stroke={OL} strokeWidth={OW} />
										<rect x={-60} y={44} width={90} height={20} fill={C.white} />
										<text x={0} y={18} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill={OL}>
											Алло!
										</text>
									</g>
								)}
							</g>
						)}
						{scene === 2 && <CloseUp t={t} />}
						{scene === 4 && <EndCard t={t} />}
					</g>
					{t > S2 && <AdMark dark={scene === 2 || scene === 4} />}
					<rect width={1080} height={1920} fill="#fff" opacity={t > S2 ? 0.5 * (1 - prog(t, t0, 0.18)) : 0} />
				</svg>
				{SUBS.map((w, i) => {
					const next = SUBS[i + 1];
					if (next && t >= next[0].start - 0.25) return null;
					return <KaraokeLine key={i} words={w} t={t} y={scene === 2 ? 1600 : scene === 4 ? 1500 : 1500} />;
				})}
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
