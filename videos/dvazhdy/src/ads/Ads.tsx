import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {ShotCtx, clamp, easeOut, hash, prog} from '../lib';
import {OL, OW, pop} from '../cartoon/parts';
import {Cat, Keeper, Outside} from '../series/Keeper';

// Рекламные ролики «Мультмаяк»: 6 с, 1080×1920, без звука. Фирменный стиль канала.
const P = {
	cream: '#f6ecd8',
	paper: '#fbf5e9',
	red: '#d9483b',
	ochre: '#e8a93a',
	yellow: '#f2c230',
	night: '#1d2b4f',
	sea: '#2b4a7a',
	wave: '#6f9ad0',
	grass: '#5f9e55',
};
const FONT = 'Inter';

/** Слово влетает с пружиной и лёгким поворотом. */
const Slam: React.FC<{text: string; t: number; at: number; y: number; size?: number; color?: string; bg?: string; rot?: number}> = ({
	text, t, at, y, size = 130, color = OL, bg, rot = -3,
}) => {
	const k = pop(t, at, 0.4);
	if (t < at) return null;
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					transform: `scale(${0.3 + 0.7 * k}) rotate(${rot * (1.4 - k)}deg)`,
					opacity: clamp(k * 2),
					fontFamily: FONT,
					fontWeight: 900,
					fontSize: size,
					lineHeight: 1,
					letterSpacing: -2,
					textTransform: 'uppercase',
					color,
					background: bg,
					padding: bg ? '14px 34px 20px' : 0,
					borderRadius: 24,
					border: bg ? `${OW}px solid ${OL}` : undefined,
					boxShadow: bg ? `10px 10px 0 ${OL}` : undefined,
					WebkitTextStroke: !bg && color !== OL ? `6px ${OL}` : undefined,
					paintOrder: 'stroke fill',
				}}
			>
				{text}
			</div>
		</div>
	);
};

/** Фирменный значок: маяк с вращающимся лучом. */
const Logo: React.FC<{t: number; s?: number}> = ({t, s = 1}) => {
	const beam = Math.sin(t * 3) * 0.5 + 0.5;
	return (
		<g transform={`scale(${s})`}>
			<path d={`M 40 -150 L 420 ${-230 + beam * 60} L 420 ${-70 + beam * 60} Z`} fill={P.yellow} opacity={0.55} />
			<path d="M -48 0 L -34 -160 L 34 -160 L 48 0 Z" fill="#fff" stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
			<path d="M -42 -60 L 42 -60 L 39 -95 L -39 -95 Z" fill={P.red} />
			<path d="M -37 -125 L 37 -125 L 35 -150 L -35 -150 Z" fill={P.red} />
			<rect x={-40} y={-200} width={80} height={44} rx={6} fill={P.yellow} stroke={OL} strokeWidth={OW} />
			<path d="M -48 -198 L 0 -250 L 48 -198 Z" fill={P.red} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
		</g>
	);
};

/** Финальная карточка: логотип, цена, WhatsApp. */
const EndCard: React.FC<{t: number; at: number; price: string; what: string}> = ({t, at, price, what}) => {
	if (t < at) return null;
	const lt = t - at;
	const wipe = easeOut(prog(lt, 0, 0.45));
	return (
		<AbsoluteFill>
			<div style={{position: 'absolute', inset: 0, background: P.night, clipPath: `circle(${wipe * 140}% at 50% 50%)`}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
					{Array.from({length: 40}).map((_, i) => (
						<circle key={i} cx={hash(i) * 1080} cy={hash(i + 9) * 1920} r={3 + hash(i + 2) * 3} fill="#fff6c8" opacity={0.3 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
					))}
					<g transform={`translate(0 ${(1 - easeOut(prog(lt, 0.3, 0.5))) * 400})`}>
						<path d="M -20 1720 C 200 1680 500 1700 760 1690 C 900 1685 1000 1700 1100 1690 L 1100 1940 L -20 1940 Z" fill={P.grass} stroke={OL} strokeWidth={OW} />
						{[120, 330, 600, 880, 980].map((x, i) => (
							<g key={i} transform={`translate(${x} ${1725 + (i % 2) * 40})`}><circle r={12} fill={i % 2 ? P.yellow : '#fff'} stroke={OL} strokeWidth={4} /><circle r={5} fill={P.ochre} /></g>
						))}
						<Keeper x={230} y={1770} s={0.4} armR={[150, -40 + Math.sin(lt * 10) * 25]} />
						<Cat x={830} y={1745} s={0.45} t={t} look={-1} />
					</g>
					<g transform={`translate(330 ${620 - 40 * (1 - easeOut(prog(lt, 0.1, 0.5)))})`} opacity={easeOut(prog(lt, 0.1, 0.4))}>
						<Logo t={t} s={1.5} />
					</g>
				</svg>
				<div style={{position: 'absolute', top: 690, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 132, color: '#fff', letterSpacing: -3, opacity: easeOut(prog(lt, 0.2, 0.4)), transform: `translateY(${(1 - easeOut(prog(lt, 0.2, 0.4))) * 40}px)`}}>
					Мультмаяк
				</div>
				<div style={{position: 'absolute', top: 840, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 50, color: '#c4cbe0', opacity: easeOut(prog(lt, 0.35, 0.4))}}>
					{what}
				</div>
				<Slam text={price} t={t} at={at + 0.6} y={980} size={price.length > 10 ? 100 : 120} bg={P.yellow} rot={-5} />
				<div style={{position: 'absolute', top: 1260, left: 90, right: 90, display: 'flex', justifyContent: 'center', opacity: easeOut(prog(lt, 1.0, 0.35)), transform: `translateY(${(1 - easeOut(prog(lt, 1.0, 0.35))) * 40}px)`}}>
					<div style={{background: '#25d366', border: `${OW}px solid ${OL}`, borderRadius: 999, padding: '26px 46px', fontFamily: FONT, fontWeight: 900, fontSize: 54, color: '#fff', boxShadow: `8px 8px 0 ${OL}`, transform: `scale(${1 + 0.04 * Math.sin(lt * 8)})`}}>
						WhatsApp +7 708 813 86 60
					</div>
				</div>
				<div style={{position: 'absolute', top: 1450, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 44, color: P.yellow, opacity: easeOut(prog(lt, 1.3, 0.4))}}>
					Первый кадр — бесплатно
				</div>
			</div>
		</AbsoluteFill>
	);
};

/** Фон: кремовая стена с полосками и плавающими кружками. */
const CreamBg: React.FC<{t: number}> = ({t}) => (
	<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
		<rect width={1080} height={1920} fill={P.cream} />
		{Array.from({length: 14}).map((_, i) => (
			<rect key={i} x={-200 + i * 110 - ((t * 60) % 110)} y={0} width={40} height={1920} fill="#efe0c2" transform="skewX(-18)" />
		))}
		{Array.from({length: 8}).map((_, i) => (
			<circle key={i} cx={hash(i) * 1080} cy={(hash(i + 5) * 1920 - t * 80 * (0.5 + hash(i))) % 1920 + (hash(i + 5) * 1920 - t * 80 * (0.5 + hash(i)) < 0 ? 1920 : 0)} r={14 + hash(i + 1) * 20} fill={[P.yellow, P.red, P.wave, P.grass][i % 4]} stroke={OL} strokeWidth={5} />
		))}
	</svg>
);

// ======================================================================== 1. «Хочешь мультик?»
const STYLES = [
	['sunset', 'Закат'], ['comic', 'Комикс'], ['neon', 'Неон'], ['watercolor', 'Акварель'], ['pixel', 'Пиксель'],
	['winter', 'Зима'], ['ink', 'Тушь'], ['candy', 'Пастель'], ['glass', 'Витраж'], ['film', 'Плёнка'],
	['chalk', 'Мел'], ['poster', 'Плакат'], ['kids', 'Детский'],
] as const;

export const AdCartoon: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const cardIn = easeOut(prog(t, 0.5, 0.5));
	const flipStart = 1.6;
	const idx = Math.floor((t - flipStart) / 0.16);
	const flipping = t >= flipStart && idx < STYLES.length;
	const flash = flipping ? 1 - ((t - flipStart) % 0.16) / 0.16 : 0;
	return (
		<ShotCtx.Provider value={{t, dur: 6, scatter: 0}}>
			<AbsoluteFill>
				<CreamBg t={t} />
				<Slam text="Хочешь" t={t} at={0} y={110} size={120} />
				<Slam text="мультик?" t={t} at={0.25} y={240} size={150} color={P.red} />
				{/* карточка со сценой: 9:16, листает стили */}
				<div style={{position: 'absolute', left: 190, top: 450 + (1 - cardIn) * 900, width: 700, height: 1244, borderRadius: 36, overflow: 'hidden', border: `${OW + 2}px solid ${OL}`, boxShadow: `14px 14px 0 ${OL}`, transform: `rotate(${-2 + (flipping ? Math.sin(t * 40) * 1.2 : 0)}deg)`, background: P.night}}>
					{!flipping || idx < 0 ? (
						<svg width={700} height={1244} viewBox="0 0 1080 1920"><Outside t={t} /></svg>
					) : (
						<Img src={staticFile(`ads/s-${STYLES[idx][0]}.jpg`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
					)}
					<div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash * 0.35}} />
				</div>
				{flipping && idx >= 0 && (
					<div style={{position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
						<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 64, color: '#fff', background: P.red, border: `${OW}px solid ${OL}`, borderRadius: 20, padding: '8px 30px', transform: `rotate(3deg) scale(${1 + flash * 0.15})`}}>
							{STYLES[idx][1]}
						</div>
					</div>
				)}
				<Slam text="21 стиль" t={t} at={flipStart + STYLES.length * 0.16} y={820} size={150} bg={P.yellow} rot={4} />
				<EndCard t={t} at={4.0} price="от 4 900 ₸" what="мультики на заказ" />
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

// ======================================================================== 2. «Хочешь озвучку?»
const Bars: React.FC<{t: number; x: number; y: number; n?: number; amp: number; color: string}> = ({t, x, y, n = 15, amp, color}) => (
	<g transform={`translate(${x} ${y})`}>
		{Array.from({length: n}).map((_, i) => {
			const h = 20 + amp * (0.35 + 0.65 * Math.abs(Math.sin(t * 9 + i * 0.9) * Math.sin(t * 4.3 + i * 1.7)));
			return <rect key={i} x={i * 44 - (n * 44) / 2} y={-h / 2} width={26} height={h} rx={13} fill={color} stroke={OL} strokeWidth={5} />;
		})}
	</g>
);

export const AdVoice: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const dark = t >= 2.2 && t < 3.3;
	const sceneIn = easeOut(prog(t, 0.35, 0.5));
	return (
		<ShotCtx.Provider value={{t, dur: 6, scatter: 0}}>
			<AbsoluteFill style={{background: dark ? '#141c33' : P.cream}}>
				{!dark && <CreamBg t={t} />}
				<Slam text="Хочешь" t={t} at={0} y={110} size={120} color={dark ? '#fff' : OL} />
				<Slam text="озвучку?" t={t} at={0.2} y={240} size={150} color={P.red} />
				<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
					<g transform={`translate(0 ${(1 - sceneIn) * 700})`}>
						{/* микрофон */}
						<g transform={`translate(760 ${980 + Math.sin(t * 3) * 6}) rotate(14)`}>
							<rect x={-14} y={40} width={28} height={190} rx={10} fill="#5a5f75" stroke={OL} strokeWidth={OW} />
							<rect x={-70} y={-130} width={140} height={190} rx={70} fill={dark ? '#7a86a8' : '#c9ccd8'} stroke={OL} strokeWidth={OW} />
							{[-80, -40, 0].map((yy) => <line key={yy} x1={-60} x2={60} y1={yy} y2={yy} stroke={OL} strokeWidth={5} />)}
						</g>
						<Keeper x={380} y={1500} s={1.0} armR={[70, -60]} face={dark ? 'think' : 'smile'} />
					</g>
					<Bars t={t} x={540} y={1640} amp={dark ? 50 : 150} color={dark ? '#6f9ad0' : P.yellow} />
				</svg>
				{/* настроение: тепло → страшно → тепло */}
				{t > 0.9 && (
					<div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
						<div key={dark ? 'd' : 'w'} style={{fontFamily: FONT, fontWeight: 900, fontSize: 60, padding: '12px 34px', borderRadius: 999, border: `${OW}px solid ${OL}`, background: dark ? '#2b3a66' : '#fff', color: dark ? '#e8eefc' : OL, boxShadow: `6px 6px 0 ${OL}`, transform: `scale(${0.8 + 0.2 * pop(t, dark ? 2.2 : t < 2.2 ? 0.9 : 3.3, 0.35)})`}}>
							{dark ? '🌙 тихо и страшно…' : t < 2.2 ? '☀️ тепло и весело' : '🎉 или как захочешь!'}
						</div>
					</div>
				)}
				<EndCard t={t} at={4.0} price="от 1 500 ₸/мин" what="озвучка с субтитрами" />
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

// ======================================================================== 3. «Хочешь маскота?»
export const AdMascot: React.FC = () => {
	const t = useCurrentFrame() / 30;
	const catK = pop(t, 0.6, 0.5);
	const tag = easeOut(prog(t, 1.6, 0.4));
	const swap = t > 2.6;
	return (
		<ShotCtx.Provider value={{t, dur: 6, scatter: 0}}>
			<AbsoluteFill>
				<CreamBg t={t} />
				<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
					{/* лучи за котом */}
					<g transform={`translate(540 1180) rotate(${t * 20})`} opacity={clamp(catK)}>
						{Array.from({length: 12}).map((_, i) => (
							<path key={i} d="M 0 0 L 900 -110 L 900 110 Z" fill={i % 2 ? '#f6dd8a' : '#f3e5c0'} transform={`rotate(${i * 30})`} />
						))}
					</g>
					<g transform={`translate(540 1480) scale(${Math.max(0.001, catK)})`}>
						<Cat x={0} y={0} s={1.5} t={t} look={Math.sin(t * 2) * 0.6} />
					</g>
					{/* конфетти */}
					{t > 0.7 && Array.from({length: 36}).map((_, i) => {
						const lt = t - 0.7;
						const a = hash(i) * Math.PI * 2;
						const v = 500 + hash(i + 3) * 700;
						const x = 540 + Math.cos(a) * v * lt;
						const y = 1150 + Math.sin(a) * v * lt + 900 * lt * lt;
						return <rect key={i} x={x} y={y} width={22} height={34} rx={4} fill={[P.yellow, P.red, P.wave, P.grass][i % 4]} stroke={OL} strokeWidth={3} transform={`rotate(${lt * 400 + i * 40} ${x + 11} ${y + 17})`} opacity={clamp(2 - lt)} />;
					})}
				</svg>
				<Slam text="Хочешь" t={t} at={0} y={110} size={120} />
				<Slam text="маскота?" t={t} at={0.2} y={240} size={150} color={P.red} />
				{/* плашка с именем: Компас → ваш маскот */}
				{tag > 0 && <div style={{position: 'absolute', top: 1560, left: 140 + (1 - tag) * -800, width: 800, display: 'flex', alignItems: 'stretch', background: P.paper, border: `${OW}px solid ${OL}`, borderRadius: 22, boxShadow: `8px 8px 0 ${OL}`, overflow: 'hidden'}}>
					<div style={{width: 36, background: P.red, borderRight: `${OW}px solid ${OL}`}} />
					<div style={{padding: '18px 28px', fontFamily: FONT}}>
						<div style={{fontWeight: 900, fontSize: 60, color: OL, transform: `scale(${swap ? 0.9 + 0.1 * pop(t, 2.6, 0.3) : 1})`, transformOrigin: 'left'}}>{swap ? 'Ваш маскот' : 'Компас'}</div>
						<div style={{fontWeight: 700, fontSize: 38, color: P.red}}>{swap ? 'лицо вашего бренда в каждом ролике' : 'кот, старший помощник'}</div>
					</div>
				</div>}
				<EndCard t={t} at={4.0} price="от 3 500 ₸" what="маскот для бренда" />
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};
