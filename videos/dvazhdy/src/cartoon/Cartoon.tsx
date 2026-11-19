import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from '../../public/timeline.json';
import {ShotCtx, useShot, clamp, prog, easeOut, easeInOut, hash} from '../lib';
import {Bubble, C, Cap, Char, NameTag, OL, OW, Thought, pop, shake} from './parts';
import {Hanko, House, Mushroom, Outdoor, Room, SealMark, Tatami} from './bg';

type L = Record<string, {start: number; end: number}>;
const TL = timeline;
const lineStart = (id: string) => (TL.lines as L)[id].start;
const shotStart = (name: string) => TL.scenes.find((s) => s.name === name)!.start;
const rel = (name: string, id: string, off = 0) => lineStart(id) - shotStart(name) + off;

const walk = (t: number, speed = 7, amp = 22) => Math.sin(t * speed) * amp;

// ------------------------------------------------------------------ calendar (used twice)
const Calendar: React.FC<{day: string; tear?: boolean; capA: string; capB?: string; bAt?: number}> = ({day, tear = false, capA, capB, bAt = 99}) => {
	const {t} = useShot();
	const swing = Math.sin(t * 2.2) * 2.5;
	const tearP = easeInOut(prog(t, 0.5, 0.7));
	const circle = easeInOut(prog(t, tear ? 1.3 : 1.1, 0.9));
	const page = (num: string, red: boolean) => (
		<g>
			<rect x={250} y={520} width={580} height={700} rx={14} fill={C.white} stroke={OL} strokeWidth={OW} />
			<rect x={250} y={520} width={580} height={150} rx={14} fill={C.red} stroke={OL} strokeWidth={OW} />
			<text x={540} y={620} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={64} fill={C.white}>
				АВГУСТ 1945
			</text>
			<text x={540} y={1050} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={330} fill={red ? C.red : OL}>
				{num}
			</text>
			<text x={540} y={1160} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={44} fill="#8a7a6a">
				{num === '6' ? 'ПОНЕДЕЛЬНИК' : num === '8' ? 'СРЕДА' : 'ЧЕТВЕРГ'}
			</text>
		</g>
	);
	return (
		<>
			<Room shoji={false} window={false} />
			<g transform={`rotate(${swing} 540 470)`}>
				<line x1={540} y1={470} x2={400} y2={530} stroke={OL} strokeWidth={6} />
				<line x1={540} y1={470} x2={680} y2={530} stroke={OL} strokeWidth={6} />
				<circle cx={540} cy={470} r={14} fill={C.woodDark} stroke={OL} strokeWidth={5} />
				{page(day, false)}
				{tear && (
					<g transform={`translate(${tearP * 1100} ${tearP * -500}) rotate(${tearP * 50} 540 520)`} opacity={1 - tearP}>
						{page('8', false)}
					</g>
				)}
				<ellipse
					cx={540}
					cy={940}
					rx={210}
					ry={190}
					fill="none"
					stroke={C.red}
					strokeWidth={16}
					strokeLinecap="round"
					pathLength={1}
					strokeDasharray={`${circle} 1`}
					transform="rotate(-80 540 940)"
				/>
			</g>
			<Cap text={capA} from={0.4} to={capB ? bAt - 0.2 : undefined} />
			{capB && <Cap text={capB} from={bAt} />}
		</>
	);
};

// ------------------------------------------------------------------ shots
const Hook: React.FC = () => {
	const {t} = useShot();
	const two = rel('hook', '02');
	const p2 = pop(t, two, 0.4);
	return (
		<>
			<Room />
			<Char x={470} y={1330} s={1.1} face={t > two ? 'determined' : 'neutral'} armR={[8, -4]} />
			<g transform="translate(560 1110)">
				<rect x={0} y={20} width={170} height={120} rx={14} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
				<rect x={55} y={0} width={60} height={30} rx={10} fill="none" stroke={OL} strokeWidth={10} />
				<line x1={0} y1={70} x2={170} y2={70} stroke={OL} strokeWidth={5} />
			</g>
			<NameTag name="Цутому Ямагути" role="инженер · 29 лет" from={0.5} to={two - 0.15} x={60} y={180} avatar={<Char x={0} y={224} s={0.4} />} />
			{t > two && (
				<g transform={`translate(780 520) scale(${p2}) rotate(-8)`}>
					<circle r={130} fill={C.red} stroke={OL} strokeWidth={OW} />
					<circle r={108} fill="none" stroke={C.white} strokeWidth={6} />
					<text y={40} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill={C.white}>
						×2
					</text>
				</g>
			)}
			<Cap text="ПЕРЕЖИЛ АТОМНУЮ БОМБУ" from={0.35} to={two - 0.15} />
			<Cap text="ДВАЖДЫ" from={two} big red />
		</>
	);
};

const Packing: React.FC = () => {
	const {t} = useShot();
	const lid = easeInOut(prog(t, 1.9, 0.3));
	const reach = Math.sin(t * 4) * 10;
	return (
		<>
			<Room />
			<Char x={360} y={1330} s={1.05} stoop={0.45} face="smile" armL={[20, -20]} armR={[55 + reach, -40]} />
			<g transform="translate(560 1330)">
				<rect x={0} y={-130} width={330} height={130} rx={14} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
				<rect x={20} y={-110} width={290} height={90} rx={8} fill="#7a4a2a" />
				{[0, 1, 2].map((i) => {
					const p = easeOut(prog(t, 0.3 + i * 0.45, 0.4));
					return (
						<g key={i} transform={`translate(${40 + i * 85} ${-100 - (1 - p) * 300})`} opacity={p}>
							<rect width={80} height={56} rx={10} fill={[C.white, C.sky, '#f2dfc0'][i]} stroke={OL} strokeWidth={5} />
							<path d="M 25 0 L 40 18 L 55 0" fill="none" stroke={OL} strokeWidth={4} />
						</g>
					);
				})}
				<g transform={`rotate(${(1 - lid) * -110} 0 -130)`}>
					<rect x={0} y={-160} width={330} height={34} rx={12} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
				</g>
			</g>
			<g transform="translate(130 380)">
				<rect width={300} height={300} fill="none" />
			</g>
			<Cap text="ХИРОСИМА · КОМАНДИРОВКА" from={0.25} />
		</>
	);
};

const Photo: React.FC = () => {
	const {t} = useShot();
	const z = 1 + t * 0.03;
	return (
		<g transform={`translate(540 900) scale(${z}) translate(-540 -900)`}>
			<Room shoji={false} window={false} />
			<circle cx={540} cy={860} r={520} fill="#ffd89a" opacity={0.35} />
			<rect x={80} y={1240} width={920} height={60} rx={10} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<rect x={260} y={480} width={560} height={760} rx={24} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
			<rect x={300} y={520} width={480} height={680} rx={10} fill={C.sky} stroke={OL} strokeWidth={OW} />
			<path d="M 300 1000 Q 420 940 540 990 Q 660 940 780 990 L 780 1200 L 300 1200 Z" fill={C.green} stroke={OL} strokeWidth={5} />
			<circle cx={700} cy={620} r={50} fill={C.ochre} stroke={OL} strokeWidth={5} />
			<Char x={450} y={1180} s={0.72} hair="wife" skirt="#c96b6b" face="smile" armR={[30, -60]} blinkSeed={1} />
			<Char x={630} y={1180} s={0.62} hair="boy" kid jacket={C.ochre} face="laugh" armL={[150, 10]} blinkSeed={2} />
			{[0, 1, 2, 3].map((i) => {
				const p = ((t * 0.5 + i * 0.25) % 1);
				return (
					<path
						key={i}
						transform={`translate(${200 + i * 220 + Math.sin(t * 2 + i) * 20} ${520 - p * 300}) scale(${0.8 + 0.4 * hash(i)})`}
						d="M 0 12 C -30 -14 -18 -40 0 -24 C 18 -40 30 -14 0 12 Z"
						fill={C.red}
						stroke={OL}
						strokeWidth={4}
						opacity={1 - p}
					/>
				);
			})}
			<Cap text="ЗАВТРА — ДОМОЙ" from={0.25} />
		</g>
	);
};

const Seal: React.FC = () => {
	const {t, dur} = useShot();
	const found = rel('seal', '05', 2.45);
	const stamp = rel('seal', '05', 3.8);
	const walkT = clamp((t - (stamp + 0.3)) / (dur - stamp - 0.3));
	const x = 540 - easeInOut(walkT) * 340;
	const pat = t < found ? Math.abs(Math.sin(t * 7)) * 25 : 0;
	const walking = walkT > 0;
	const press = t < stamp ? easeInOut(prog(t, stamp - 0.35, 0.35)) : 1 - easeOut(prog(t, stamp + 0.1, 0.4));
	return (
		<>
			<Outdoor />
			<Char
				x={x}
				y={1360}
				s={1.0}
				face={t < found ? 'shock' : walking ? 'determined' : 'think'}
				armL={walking ? [walk(t, 9, 25), -10] : [12, -8]}
				armR={walking ? [-walk(t, 9, 25), -10] : [35 + pat, -95]}
				legL={walking ? walk(t, 9, 18) : 3}
				legR={walking ? -walk(t, 9, 18) : 3}
			/>
			<Bubble x={760} y={640} text="?!" from={0.5} to={found - 0.2} size={90} tail={[-120, 140]} />
			<Thought x={640} y={400} r={230} from={found} to={stamp + 0.5} tailTo={[620, 700]}>
				<rect x={-320} y={60} width={640} height={200} fill={C.wood} />
				<g transform={`translate(0 ${press * 90})`}>
					<Hanko x={0} y={100} s={0.9} />
				</g>
				{t > stamp && <SealMark x={0} y={140} r={60} />}
			</Thought>
			<Cap text="ЗАБЫЛ ЛИЧНУЮ ПЕЧАТЬ" from={rel('seal', '05', 1.0)} to={stamp + 0.2} />
			<Cap text="ВОЗВРАЩАЕТСЯ ЗА НЕЙ" from={stamp + 0.4} />
		</>
	);
};

const Clock: React.FC = () => {
	const {t, dur} = useShot();
	const minute = t > dur - 0.4 ? 15 : 14;
	const sec = Math.floor(t / 0.5) * 30;
	const k = clamp(t / dur);
	const sx = Math.sin(t * 70) * k * 7;
	const pend = Math.sin(t * Math.PI * 2) * 18;
	return (
		<g transform={`translate(${sx} ${Math.cos(t * 61) * k * 5})`}>
			<Room shoji={false} window={false} />
			<rect x={300} y={360} width={480} height={980} rx={40} fill={C.woodDark} stroke={OL} strokeWidth={OW} />
			<rect x={380} y={1000} width={320} height={300} rx={14} fill="#5a3a24" stroke={OL} strokeWidth={OW} />
			<g transform={`rotate(${pend} 540 1000)`}>
				<line x1={540} y1={1000} x2={540} y2={1210} stroke={OL} strokeWidth={10} />
				<circle cx={540} cy={1220} r={40} fill={C.ochre} stroke={OL} strokeWidth={OW} />
			</g>
			<circle cx={540} cy={690} r={230} fill={C.white} stroke={OL} strokeWidth={OW} />
			{Array.from({length: 12}).map((_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return <line key={i} x1={540 + Math.sin(a) * 190} y1={690 - Math.cos(a) * 190} x2={540 + Math.sin(a) * 212} y2={690 - Math.cos(a) * 212} stroke={OL} strokeWidth={i % 3 ? 6 : 12} strokeLinecap="round" />;
			})}
			<g transform={`rotate(${(8 + minute / 60) * 30} 540 690)`}>
				<line x1={540} y1={700} x2={540} y2={570} stroke={OL} strokeWidth={18} strokeLinecap="round" />
			</g>
			<g transform={`rotate(${minute * 6} 540 690)`}>
				<line x1={540} y1={700} x2={540} y2={500} stroke={OL} strokeWidth={12} strokeLinecap="round" />
			</g>
			<g transform={`rotate(${sec} 540 690)`}>
				<line x1={540} y1={720} x2={540} y2={490} stroke={C.red} strokeWidth={5} strokeLinecap="round" />
			</g>
			<circle cx={540} cy={690} r={16} fill={C.red} stroke={OL} strokeWidth={5} />
			<circle cx={540} cy={690} r={300} fill="#fff4d0" opacity={k * 0.35} />
			<Cap text="8:15" from={0.2} big />
		</g>
	);
};

const Flash1: React.FC = () => {
	const {t} = useShot();
	const g = easeOut(prog(t, 0.3, 2.2));
	return (
		<>
			<Outdoor sky="#f2b27a" hills="#c98a6a" />
			<circle cx={620} cy={700} r={420} fill="#ffe2a8" opacity={0.6} />
			<g>
				<Mushroom x={640} y={1180} s={1.05} grow={g} />
			</g>
			<g transform="translate(0 0)">
				<House x={120} y={1330} w={220} h={160} />
				<House x={990} y={1330} w={200} h={140} body="#f2dfc0" roof="#6b4f3a" />
			</g>
			<Char x={330} y={1380} s={0.9} face="shock" armL={[150, 30]} armR={[150, 30]} />
			<Cap text="ЯРЧЕ ТЫСЯЧИ СОЛНЦ" from={rel('flash', '07', 0)} />
		</>
	);
};

const Thrown: React.FC = () => {
	const {t} = useShot();
	const fly = easeOut(prog(t, 0.0, 0.5));
	const sh = shake(t, 0.5, 0.45, 18);
	const headX = 880 - 470;
	return (
		<g transform={`translate(${sh} ${sh * 0.5})`}>
			<Outdoor sky="#d9b08c" hills="#b08a72" broken={0.6} />
			<g transform="translate(170 900) scale(0.35)">
				<Mushroom x={0} y={0} />
			</g>
			<path d="M 230 1000 Q 400 1080 520 1170" fill="none" stroke={OL} strokeWidth={8} strokeDasharray="18 16" opacity={prog(t, 1.0, 0.4)} />
			<g opacity={prog(t, 1.2, 0.4)} transform="translate(300 1010) rotate(-12)">
				<rect x={-90} y={-46} width={180} height={92} rx={14} fill={C.paper} stroke={OL} strokeWidth={OW} />
				<text y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={C.red}>
					3 КМ
				</text>
			</g>
			<g transform={`translate(${880 - (1 - fly) * 500} ${1290 - Math.sin(fly * Math.PI) * 160}) rotate(${-90 + (1 - fly) * 60})`}>
				<Char x={0} y={0} s={0.85} face="wince" burns armL={[60, -20]} armR={[40, -10]} legL={8} legR={12} />
			</g>
			{t > 0.6 &&
				[0, 1, 2].map((i) => {
					const a = t * 3 + (i * Math.PI * 2) / 3;
					return (
						<path
							key={i}
							transform={`translate(${headX + Math.cos(a) * 110} ${1180 + Math.sin(a) * 34})`}
							d="M 0 -20 L 6 -6 L 20 -6 L 9 4 L 13 18 L 0 10 L -13 18 L -9 4 L -20 -6 L -6 -6 Z"
							fill={C.ochre}
							stroke={OL}
							strokeWidth={4}
						/>
					);
				})}
			{t > 2.2 &&
				[0, 1, 2].map((i) => {
					const p = ((t - 2.2) * 1.2 + i / 3) % 1;
					return <path key={i} d={`M ${headX - 30 - p * 60} ${1300 + 40} q -${20 + p * 40} -40 0 -${80 + p * 60}`} fill="none" stroke={OL} strokeWidth={6} opacity={1 - p} strokeLinecap="round" />;
				})}
			<Cap text="3 КМ ОТ ЭПИЦЕНТРА" from={0.6} to={2.4} />
			<Cap text="ОЖОГИ · ПЕРЕПОНКИ" from={2.6} />
		</g>
	);
};

const Alive: React.FC = () => {
	const {t} = useShot();
	const beat = 1 + 0.15 * Math.max(0, Math.sin(t * 9));
	return (
		<>
			<rect width={1080} height={1920} fill="#d9b08c" />
			<circle cx={540} cy={900} r={560} fill="#f2cfa8" />
			<Char x={540} y={2350} s={2.3} face={t < 0.45 ? 'closed' : 'smile'} bandage burns />
			<g transform={`translate(850 420) scale(${beat})`}>
				<path d="M 0 40 C -90 -20 -60 -100 0 -60 C 60 -100 90 -20 0 40 Z" fill={C.red} stroke={OL} strokeWidth={OW} />
			</g>
			<Cap text="ОН ЖИВ" from={0.1} big red />
		</>
	);
};

const Shelter: React.FC = () => {
	const {t} = useShot();
	return (
		<>
			<rect width={1080} height={1920} fill={C.navy} />
			{Array.from({length: 30}).map((_, i) => (
				<circle key={i} cx={hash(i) * 1080} cy={hash(i + 4) * 700 + 100} r={3 + hash(i + 8) * 4} fill="#fff8d0" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))} />
			))}
			<circle cx={840} cy={300} r={80} fill="#fff1c0" stroke={OL} strokeWidth={OW} />
			<circle cx={870} cy={280} r={70} fill={C.navy} />
			<path d="M 60 1360 Q 540 560 1020 1360 Z" fill="#6b5240" stroke={OL} strokeWidth={OW} />
			<path d="M 230 1360 Q 540 860 850 1360 Z" fill="#2a2018" stroke={OL} strokeWidth={OW} />
			<circle cx={720} cy={1260} r={120} fill="#ffb84a" opacity={0.18 + 0.05 * Math.sin(t * 10)} />
			<rect x={700} y={1250} width={30} height={60} rx={6} fill={C.white} stroke={OL} strokeWidth={5} />
			<path d={`M 715 1250 q ${-8 + Math.sin(t * 12) * 4} -20 0 -36 q 8 16 0 36`} fill={C.ochre} stroke={OL} strokeWidth={4} />
			<Char x={470} y={1400} s={0.8} face="sad" bandage burns legL={70} legR={70} armL={[25, -70]} armR={[25, -70]} />
			<rect x={0} y={1350} width={1080} height={570} fill="#4a3a2e" stroke={OL} strokeWidth={OW} />
			<Cap text="НОЧЬ В УКРЫТИИ" from={0.15} />
		</>
	);
};

const Train: React.FC = () => {
	const {t} = useShot();
	const x = -200 + t * 330;
	return (
		<>
			<Outdoor houses={false} ground={1250} />
			{Array.from({length: 6}).map((_, i) => {
				const px = ((i * 260 - t * 500) % 1560 + 1560) % 1560 - 240;
				return (
					<g key={i}>
						<line x1={px} y1={1250} x2={px} y2={1000} stroke={OL} strokeWidth={10} />
						<line x1={px - 40} y1={1020} x2={px + 40} y2={1020} stroke={OL} strokeWidth={8} />
					</g>
				);
			})}
			<rect x={0} y={1235} width={1080} height={14} fill="#7a6a5a" stroke={OL} strokeWidth={5} />
			<g transform={`translate(${x} 0)`}>
				<rect x={-540} y={980} width={420} height={230} rx={22} fill="#8a5a3a" stroke={OL} strokeWidth={OW} />
				{[0, 1, 2].map((i) => (
					<rect key={i} x={-510 + i * 130} y={1020} width={100} height={80} rx={10} fill={C.sky} stroke={OL} strokeWidth={5} />
				))}
				<circle cx={-120} cy={1060} r={24} fill={C.skin} stroke={OL} strokeWidth={5} />
				<rect x={-146} y={1036} width={52} height={14} fill={C.bandage} stroke={OL} strokeWidth={3} />
				<rect x={-90} y={950} width={460} height={260} rx={26} fill={C.navy} stroke={OL} strokeWidth={OW} />
				<rect x={-90} y={1110} width={460} height={26} fill={C.red} stroke={OL} strokeWidth={5} />
				<rect x={220} y={880} width={150} height={90} rx={12} fill={C.navy} stroke={OL} strokeWidth={OW} />
				<rect x={20} y={880} width={60} height={80} rx={8} fill="#3a3a48" stroke={OL} strokeWidth={OW} />
				{[-40, 80, 200, 320, -470, -210].map((cx, i) => (
					<g key={i} transform={`rotate(${t * 500} ${cx} 1215)`}>
						<circle cx={cx} cy={1215} r={42} fill="#3a3a48" stroke={OL} strokeWidth={OW} />
						<line x1={cx - 36} y1={1215} x2={cx + 36} y2={1215} stroke={C.ochre} strokeWidth={6} />
					</g>
				))}
				{[0, 1, 2, 3].map((i) => {
					const p = (t * 1.1 + i * 0.25) % 1;
					return <circle key={i} cx={50 - p * 260} cy={860 - p * 260} r={30 + p * 70} fill={C.white} stroke={OL} strokeWidth={6} opacity={1 - p * 0.8} />;
				})}
			</g>
			<Cap text="УТРОМ — ПОЕЗД" from={0.1} />
		</>
	);
};

const TrainWin: React.FC = () => {
	const {t} = useShot();
	const bob = Math.sin(t * 11) * 4;
	return (
		<g transform={`translate(0 ${bob * 0.4})`}>
			<rect width={1080} height={1920} fill="#a8774e" />
			{Array.from({length: 12}).map((_, i) => (
				<line key={i} x1={i * 95} y1={0} x2={i * 95} y2={1920} stroke="#8e6240" strokeWidth={6} />
			))}
			<clipPath id="tw">
				<rect x={140} y={430} width={800} height={560} rx={36} />
			</clipPath>
			<g clipPath="url(#tw)">
				<rect x={0} y={400} width={1080} height={600} fill={C.sky} />
				{[0, 1].map((k) => {
					const off = ((t * 400 + k * 1100) % 2200) - 1100;
					return <path key={k} d={`M ${-off - 200} 1000 Q ${-off + 100} 700 ${-off + 400} 860 Q ${-off + 700} 680 ${-off + 1000} 860 L ${-off + 1000} 1000 Z`} fill={C.green} stroke={OL} strokeWidth={6} />;
				})}
				{Array.from({length: 4}).map((_, i) => {
					const px = ((i * 320 - t * 900) % 1280 + 1280) % 1280 - 100;
					return <line key={i} x1={px} y1={1000} x2={px} y2={700} stroke={OL} strokeWidth={12} />;
				})}
			</g>
			<rect x={140} y={430} width={800} height={560} rx={36} fill="none" stroke={OL} strokeWidth={OW + 4} />
			<rect x={120} y={990} width={840} height={40} rx={10} fill="#7a4e30" stroke={OL} strokeWidth={OW} />
			<g transform="translate(300 290) rotate(-2)">
				<rect width={480} height={100} rx={14} fill={C.paper} stroke={OL} strokeWidth={OW} />
				<text x={140} y={68} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={OL}>
					ДОМ →
				</text>
				<rect x={260} y={22} width={190} height={58} rx={8} fill={OL} />
				<text x={355} y={68} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill={C.paper}>
					? ? ?
				</text>
			</g>
			<Char x={540} y={1780} s={1.25} face="sad" look={-1} bandage burns armL={[15, -40]} armR={[15, -40]} />
			<rect x={60} y={1420} width={960} height={500} rx={30} fill="#5b6f8f" stroke={OL} strokeWidth={OW} />
			<Cap text="ТУДА, ГДЕ БЕЗОПАСНО" from={0.3} />
		</g>
	);
};

const OfficeBG: React.FC<{light?: number}> = ({light = 0}) => (
	<g>
		<rect width={1080} height={1920} fill="#dfe3d0" />
		<rect x={0} y={1300} width={1080} height={620} fill="#a8774e" stroke={OL} strokeWidth={OW} />
		{Array.from({length: 8}).map((_, i) => (
			<line key={i} x1={i * 150} y1={1300} x2={i * 150 - 200} y2={1920} stroke="#8e6240" strokeWidth={5} />
		))}
		<rect x={80} y={330} width={380} height={460} rx={10} fill={light > 0 ? `rgb(${159 + light * 96},${208 + light * 40},${232 - light * 30})` : C.sky} stroke={OL} strokeWidth={OW} />
		<path d="M 80 640 Q 200 560 300 620 Q 400 580 460 610 L 460 790 L 80 790 Z" fill={C.green} stroke={OL} strokeWidth={5} />
		<path d="M 330 790 L 330 480 L 420 480" fill="none" stroke={OL} strokeWidth={10} />
		<line x1={420} y1={480} x2={420} y2={560} stroke={OL} strokeWidth={4} />
		<line x1={270} y1={330} x2={270} y2={790} stroke={C.woodDark} strokeWidth={12} />
		<rect x={80} y={330} width={380} height={460} rx={10} fill="none" stroke={OL} strokeWidth={OW} />
		<g transform="translate(580 360) rotate(3)">
			<rect width={360} height={260} fill="#3f6fb0" stroke={OL} strokeWidth={OW} />
			<path d="M 40 200 L 120 120 L 220 150 L 320 60" fill="none" stroke={C.white} strokeWidth={5} />
			<rect x={40} y={40} width={110} height={60} fill="none" stroke={C.white} strokeWidth={4} />
			<path d="M 60 230 L 300 230 L 280 250 L 80 250 Z" fill="none" stroke={C.white} strokeWidth={4} />
		</g>
	</g>
);

const Office: React.FC = () => {
	const {t} = useShot();
	const wide = easeOut(prog(t, 0.6, 0.6));
	return (
		<>
			<OfficeBG />
			<Char x={760} y={1250} s={0.95} hair="boss" glasses mustache jacket="#6d5a4a" face="think" blinkSeed={3} />
			<rect x={560} y={1060} width={460} height={260} rx={10} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<rect x={600} y={1030} width={140} height={30} fill={C.white} stroke={OL} strokeWidth={5} />
			<Char x={300} y={1420} s={1.05} face="shock" bandage burns armL={[20 + wide * 90, -20 * wide]} armR={[20 + wide * 90, -20 * wide]} talk={Math.abs(Math.sin(t * 12))} />
			<Thought x={420} y={500} r={240} from={1.0} tailTo={[330, 760]}>
				<rect x={-300} y={60} width={600} height={200} fill="#d9c49a" />
				<House x={-160} y={80} w={120} h={80} broken={0.8} />
				<House x={150} y={80} w={120} h={80} broken={-0.8} />
				<g transform="translate(0 80) scale(0.38)">
					<Mushroom x={0} y={0} />
				</g>
			</Thought>
			<Cap text="БОМБА СТЁРЛА ГОРОД" from={0.3} />
		</>
	);
};

const Boss: React.FC = () => {
	const {t} = useShot();
	const l = rel('boss', '12');
	const laughing = t > l && t < l + 1.6;
	const bounce = laughing ? Math.abs(Math.sin(t * 16)) * 14 : 0;
	return (
		<>
			<OfficeBG />
			<g transform={`translate(0 ${-bounce})`}>
				<Char x={540} y={1850} s={1.55} hair="boss" glasses mustache jacket="#6d5a4a" face={t > l ? 'laugh' : 'think'} armL={[30, -100]} armR={laughing ? [140, 40] : [20, -20]} blinkSeed={3} />
			</g>
			<rect x={0} y={1500} width={1080} height={420} fill={C.wood} stroke={OL} strokeWidth={OW} />
			<Bubble x={300} y={330} text="Одна бомба?" from={l + 1.25} to={l + 2.2} tail={[60, 120]} />
			<Bubble x={770} y={460} text="Целый город?" from={l + 2.3} to={l + 3.2} tail={[-80, 120]} />
			<Bubble x={540} y={330} text="Ты бредишь!" from={l + 3.3} tail={[0, 130]} size={64} />
			{laughing && (
				<text x={880} y={300} fontFamily="Inter" fontWeight={900} fontSize={70} fill={C.red} transform={`rotate(12 880 300)`}>
					ХА-ХА
				</text>
			)}
			<Cap text="НАЧАЛЬНИК СМЕЁТСЯ" from={l} to={l + 1.2} />
		</>
	);
};

const WindowLight: React.FC = () => {
	const {t, dur} = useShot();
	const g = Math.pow(prog(t, 0.5, dur - 0.5), 2);
	const sil = '#3b2a22';
	return (
		<>
			<rect width={1080} height={1920} fill="#dfe3d0" />
			<clipPath id="wl">
				<rect x={140} y={300} width={800} height={900} rx={12} />
			</clipPath>
			<g clipPath="url(#wl)">
				<rect x={0} y={0} width={1080} height={1300} fill={`rgb(${159 + g * 96},${208 + g * 30},${232 - g * 80})`} />
				<circle cx={640} cy={760} r={60 + g * 700} fill="#fff6dc" opacity={0.3 + g * 0.7} />
				<path d="M 140 900 Q 300 760 480 860 Q 640 740 800 850 Q 880 800 940 840 L 940 1200 L 140 1200 Z" fill={C.green} stroke={OL} strokeWidth={6} opacity={1 - g * 0.6} />
				<rect x={140} y={1050} width={800} height={150} fill="#6fa0c8" stroke={OL} strokeWidth={5} opacity={1 - g * 0.5} />
				<path d="M 760 1050 L 760 900 L 880 900" fill="none" stroke={OL} strokeWidth={10} opacity={1 - g * 0.5} />
			</g>
			<rect x={140} y={300} width={800} height={900} rx={12} fill="none" stroke={OL} strokeWidth={OW + 6} />
			<line x1={540} y1={300} x2={540} y2={1200} stroke={C.woodDark} strokeWidth={16} />
			<line x1={140} y1={750} x2={940} y2={750} stroke={C.woodDark} strokeWidth={16} />
			<rect x={0} y={1300} width={1080} height={620} fill="#a8774e" stroke={OL} strokeWidth={OW} />
			{/* silhouettes seen from behind */}
			{[
				[360, 1.0],
				[740, 1.08],
			].map(([x, s], i) => (
				<g key={i} transform={`translate(${x} 1560) scale(${s})`}>
					<rect x={-95} y={-330} width={190} height={330} rx={50} fill={sil} />
					<ellipse cx={0} cy={-420} rx={105} ry={115} fill={sil} />
					{i === 0 && <path d="M -105 -460 C -60 -500 60 -500 105 -460 L 100 -432 C 60 -470 -60 -470 -100 -432 Z" fill={C.bandage} />}
				</g>
			))}
			<rect width={1080} height={1920} fill="#fff4d6" opacity={g * 0.35} />
			<Cap text="И В ЭТУ СЕКУНДУ…" from={rel('window', '13', 0)} to={dur - 0.3} />
		</>
	);
};

const Nagasaki: React.FC = () => {
	const {t} = useShot();
	const reveal = TL.events.reveal - shotStart('nagasaki');
	const r = easeOut(prog(t, reveal, 0.35));
	const sh = shake(t, reveal, 0.45, 18);
	const g = easeOut(prog(t, 0.3, 2.5));
	return (
		<g transform={`translate(${sh} ${sh * 0.5})`}>
			<Outdoor sky="#f2a86a" hills="#c98a6a" houses={false} />
			<Mushroom x={760} y={1330} s={0.9} grow={g} />
			<g transform={`translate(0 ${(1 - easeOut(prog(t, 0.8, 0.5))) * 900})`}>
				<rect x={250} y={900} width={30} height={430} fill="#6b6b78" stroke={OL} strokeWidth={OW} />
				<rect x={800} y={900} width={30} height={430} fill="#6b6b78" stroke={OL} strokeWidth={OW} />
				<rect x={110} y={620} width={860} height={330} rx={16} fill={C.white} stroke={OL} strokeWidth={OW + 2} />
				<rect x={110} y={880} width={860} height={70} fill={C.navy} stroke={OL} strokeWidth={OW} />
				<text x={540} y={930} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={40} fill={C.white}>
					ДОМ · 9 АВГУСТА 1945
				</text>
				<text x={540} y={700} textAnchor="middle" fontFamily="IPAGothic" fontWeight={700} fontSize={60} fill={OL} opacity={r}>
					長崎
				</text>
				<text x={540} y={830} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={130} fill={C.red} opacity={r}>
					НАГАСАКИ
				</text>
				<g transform={`translate(${r * 900} 0)`}>
					<rect x={150} y={650} width={780} height={210} rx={12} fill={OL} />
					<text x={540} y={800} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill={C.paper}>
						? ? ?
					</text>
				</g>
			</g>
			<Cap text="ЕГО РОДНОЙ ГОРОД…" from={rel('nagasaki', '15', 0)} to={reveal - 0.1} />
			<Cap text="НАГАСАКИ" from={reveal + 0.1} big red />
		</g>
	);
};

const Again: React.FC = () => {
	const {t} = useShot();
	return (
		<>
			<Outdoor sky="#d9b08c" hills="#b08a72" broken={0.5} />
			<g transform="translate(220 1000) scale(0.45)">
				<Mushroom x={0} y={0} />
			</g>
			<Char x={640} y={1360} s={1.05} face="determined" bandage burns armL={[14, -6]} armR={[14, -6]} />
			<path d="M 300 1060 Q 420 1180 520 1240" fill="none" stroke={OL} strokeWidth={8} strokeDasharray="18 16" opacity={prog(t, 0.6, 0.4)} />
			<g opacity={prog(t, 0.8, 0.4)} transform="translate(330 1210) rotate(-8)">
				<rect x={-90} y={-46} width={180} height={92} rx={14} fill={C.paper} stroke={OL} strokeWidth={OW} />
				<text y={20} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={54} fill={C.red}>
					3 КМ
				</text>
			</g>
			<Cap text="СНОВА 3 КМ. СНОВА ЖИВ" from={0.3} />
		</>
	);
};

const Life: React.FC = () => {
	const {t, dur} = useShot();
	const split = 2.8;
	const age = easeInOut(prog(t, 0.3, 2.2));
	const year = Math.round(1945 + 65 * age);
	const out1 = prog(t, split - 0.3, 0.3);
	const in2 = easeOut(prog(t, split, 0.4));
	return (
		<>
			<g opacity={1 - out1}>
				<Room shoji window={false} />
				<g transform="translate(130 360)">
					<rect width={340} height={300} rx={12} fill={C.white} stroke={OL} strokeWidth={OW} />
					<rect width={340} height={80} rx={12} fill={C.red} stroke={OL} strokeWidth={OW} />
					<text x={170} y={230} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={120} fill={OL}>
						{year}
					</text>
				</g>
				<Char x={420} y={1330} s={1.0} hair={age > 0.5 ? 'old' : 'guy'} stoop={age * 0.5} cane={age > 0.65} face="smile" armR={age > 0.65 ? [18, -30] : [12, -8]} />
				<g opacity={prog(t, 1.2, 0.3)}>
					<Char x={760} y={1330} s={0.75} hair="boy" kid jacket={C.ochre} face="laugh" armL={[150, 10]} blinkSeed={2} />
				</g>
				<g opacity={prog(t, 1.7, 0.3)}>
					<Char x={170} y={1330} s={0.7} hair="wife" kid skirt="#c96b6b" face="smile" blinkSeed={4} />
				</g>
			</g>
			<g opacity={in2}>
				<rect width={1080} height={1920} fill={C.wood} />
				{Array.from({length: 10}).map((_, i) => (
					<line key={i} x1={0} y1={i * 200 + 40} x2={1080} y2={i * 200 + 80} stroke={C.woodDark} strokeWidth={6} opacity={0.4} />
				))}
				<g transform={`translate(0 ${(1 - in2) * 200}) rotate(-3 540 900)`}>
					<rect x={190} y={330} width={700} height={1000} rx={10} fill={C.paper} stroke={OL} strokeWidth={OW} />
					<text x={540} y={440} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={50} fill={OL}>
						СВИДЕТЕЛЬСТВО
					</text>
					<text x={540} y={500} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={34} fill="#8a7a6a">
						Япония · 2009
					</text>
					{[560, 610, 660].map((y) => (
						<line key={y} x1={270} y1={y} x2={810} y2={y} stroke="#cdbfa6" strokeWidth={8} strokeLinecap="round" />
					))}
					{[
						[390, 'ХИРОСИМА', '6.08'],
						[690, 'НАГАСАКИ', '9.08'],
					].map(([x, n, d], i) => (
						<g key={i} transform={`translate(${x} 850) scale(${pop(t, split + 0.6 + i * 0.4)})`}>
							<circle r={115} fill={C.white} stroke={OL} strokeWidth={OW} />
							<text y={-10} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={56} fill={C.red}>
								{d}
							</text>
							<text y={46} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={30} fill={OL}>
								{n}
							</text>
						</g>
					))}
					<g transform={`translate(700 1150) scale(${pop(t, split + 2.4, 0.3)}) rotate(-10)`}>
						<SealMark x={0} y={0} r={90} text="認定" />
					</g>
				</g>
			</g>
			<Cap text="93 ГОДА" from={0.3} to={split - 0.3} big />
			<Cap text="ПЕРВЫЙ ПРИЗНАННЫЙ ОФИЦИАЛЬНО" from={split + 0.3} to={dur - 2.1} />
			<Cap text="1916 — 2010" from={dur - 1.9} />
		</>
	);
};

const Ending: React.FC = () => {
	const {t} = useShot();
	const stamp = rel('ending', '19', 3.0);
	const press = t < stamp ? easeInOut(prog(t, stamp - 0.4, 0.4)) : 1 - easeOut(prog(t, stamp + 0.15, 0.5));
	const lift = 1 - easeInOut(prog(t, 0, 0.6));
	const hy = 700 + press * 260 - lift * 400 - easeInOut(prog(t, stamp + 0.3, 0.7)) * 420;
	return (
		<>
			<rect width={1080} height={1920} fill={C.wood} />
			{Array.from({length: 10}).map((_, i) => (
				<line key={i} x1={0} y1={i * 200 + 40} x2={1080} y2={i * 200 + 80} stroke={C.woodDark} strokeWidth={6} opacity={0.4} />
			))}
			<rect x={190} y={760} width={700} height={560} rx={10} fill={C.paper} stroke={OL} strokeWidth={OW} transform="rotate(2 540 1040)" />
			{t > stamp && <SealMark x={540} y={1150} r={95} />}
			<g transform={`translate(0 ${hy - 700})`}>
				<Hanko x={540} y={1150} s={1.3} />
				<path d="M 1200 260 Q 900 420 640 760" stroke={OL} strokeWidth={150 + OW * 2} fill="none" strokeLinecap="round" />
				<path d="M 1200 260 Q 900 420 640 760" stroke={C.jacket} strokeWidth={150} fill="none" strokeLinecap="round" />
				<ellipse cx={600} cy={860} rx={110} ry={95} fill={C.skin} stroke={OL} strokeWidth={OW} />
				{[0, 1, 2].map((i) => (
					<rect key={i} x={470 + i * 10} y={830 + i * 50} width={150} height={52} rx={26} fill={C.skin} stroke={OL} strokeWidth={OW} />
				))}
			</g>
			<Cap text="ВСЁ НАЧАЛОСЬ С ПЕЧАТИ" from={0.3} to={stamp + 0.6} />
			<Cap text="А ТЫ БЫ ВЕРНУЛСЯ?" from={stamp + 0.8} red />
		</>
	);
};

const SHOTS: Record<string, React.FC> = {
	hook: Hook,
	calendar: () => <Calendar day="6" capA="6 АВГУСТА 1945" capB="ИНЖЕНЕР ЦУТОМУ ЯМАГУТИ" bAt={rel('calendar', '03', 2.2)} />,
	packing: Packing,
	photo: Photo,
	seal: Seal,
	clock: Clock,
	flash: Flash1,
	thrown: Thrown,
	alive: Alive,
	shelter: Shelter,
	train: Train,
	trainwin: TrainWin,
	aug9: () => <Calendar day="9" tear capA="9 АВГУСТА · НА РАБОТУ" />,
	office: Office,
	boss: Boss,
	window: WindowLight,
	nagasaki: Nagasaki,
	again: Again,
	life: Life,
	ending: Ending,
};

const CUT = new Set(['flash', 'thrown', 'nagasaki', 'hook']); // hard cuts (flash) instead of slide
const SLIDE = 0.35;

const Shot: React.FC<{name: string; dur: number}> = ({name, dur}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const S = SHOTS[name];
	const slide = CUT.has(name) ? 0 : 1 - easeOut(prog(t, 0, SLIDE));
	const zoom = 1 + 0.03 * clamp(t / dur);
	return (
		<ShotCtx.Provider value={{t, dur, scatter: 0}}>
			<AbsoluteFill style={{transform: `translateX(${slide * 1080}px) rotate(${slide * 4}deg) scale(${zoom})`, boxShadow: slide > 0 ? '-30px 0 60px rgba(0,0,0,0.35)' : undefined}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
					<S />
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

const FlashOverlay: React.FC = () => {
	const frame = useCurrentFrame();
	const g = frame / 30;
	const one = (at: number, hold: number, fade: number) => (g < at ? 0 : g < at + hold ? 1 : Math.max(0, 1 - (g - at - hold) / fade));
	const a = Math.max(one(TL.events.flash1, 0.35, 1.6), one(TL.events.flash2, 0.45, 1.8), one(lineStart('02') - 0.03, 0.05, 0.3) * 0.5, one(TL.events.reveal, 0.03, 0.35) * 0.5);
	return <AbsoluteFill style={{background: `rgba(255, 250, 235, ${a})`}} />;
};

export const DvazhdyCartoon: React.FC = () => {
	const {fps} = useVideoConfig();
	const total = Math.ceil(TL.total * fps);
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: 'Inter'}}>
			{TL.scenes.map((s, i) => {
				const from = Math.round(s.start * fps);
				const to = Math.round(s.end * fps);
				const next = TL.scenes[i + 1];
				const extra = next && !CUT.has(next.name) ? Math.round(SLIDE * fps) : 0;
				return (
					<Sequence key={s.name} from={from} durationInFrames={Math.min(total - from, to - from + extra)} layout="none">
						<Shot name={s.name} dur={(to - from) / fps} />
					</Sequence>
				);
			})}
			<FlashOverlay />
			<Audio src={staticFile('soundtrack.wav')} />
		</AbsoluteFill>
	);
};
