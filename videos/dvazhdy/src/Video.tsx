import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from '../public/timeline.json';
import {
	AMBER,
	Caption,
	DotText,
	Dots,
	GOLD,
	Rays,
	ShotCtx,
	WHITE,
	circle,
	clamp,
	easeInOut,
	easeOut,
	ellipse,
	hanko,
	hash,
	line,
	mushroom,
	person,
	poly,
	prog,
	rect,
	skyline,
	useShot,
} from './lib';

type TL = typeof timeline;
const TLX = timeline as TL;
const lineStart = (id: string) => (TLX.lines as Record<string, {start: number; end: number}>)[id].start;
const lineEnd = (id: string) => (TLX.lines as Record<string, {start: number; end: number}>)[id].end;
const shotStart = (name: string) => TLX.scenes.find((s) => s.name === name)!.start;
/** time of line `id` relative to the start of shot `name` */
const rel = (name: string, id: string, off = 0) => lineStart(id) - shotStart(name) + off;

// ------------------------------------------------------------------ shots
const Hook: React.FC = () => {
	const {t} = useShot();
	const two = rel('hook', '02');
	const bob = Math.sin(t * 5) * 6;
	const grow = easeOut(prog(t, two, 0.6));
	return (
		<>
			<g opacity={grow}>
				<DotText x={540} y={760} size={760} color={AMBER} weight={200} dash={22}>
					2
				</DotText>
			</g>
			<Rays cx={540} cy={760} r0={170} r1={560} intensity={0.35 + 0.65 * grow} />
			<g transform={`translate(0 ${bob})`}>
				<Dots d={person(500, 1260, 1.45, {la: 8, ra: 10})} progress={prog(t, 0.1, 1.3)} />
				<Dots d={[rect(600, 1080, 150, 120, 12), rect(650, 1060, 50, 22, 6)]} progress={prog(t, 0.6, 1.0)} seed={3} />
			</g>
			<Caption text="АТОМНАЯ БОМБА" from={0.4} to={two - 0.2} />
			<Caption text="ДВАЖДЫ" from={two} big amber />
		</>
	);
};

const Calendar: React.FC<{day: string; month?: string; captionA: string; captionB?: string; bAt?: number; tear?: boolean}> = ({
	day,
	month = 'АВГУСТ 1945',
	captionA,
	captionB,
	bAt = 99,
	tear = false,
}) => {
	const {t} = useShot();
	const circ = easeInOut(prog(t, tear ? 1.3 : 1.0, 0.9));
	const tearP = easeInOut(prog(t, 0.5, 0.8));
	return (
		<>
			{/* drifting pages */}
			{Array.from({length: 7}).map((_, i) => {
				const y = ((t * (60 + hash(i) * 40) + hash(i + 9) * 1600) % 1700) - 150;
				const x = 120 + hash(i + 3) * 800;
				return (
					<g key={i} transform={`translate(${x} ${y}) rotate(${t * 30 * (hash(i + 5) - 0.5) + i * 40})`} opacity={0.35}>
						<Dots d={rect(-35, -45, 70, 90, 6)} spacing={14} r={2} seed={i + 20} />
					</g>
				);
			})}
			<Dots d={[rect(230, 430, 620, 760, 18), line(230, 620, 850, 620)]} progress={prog(t, 0, 1.0)} />
			<Dots d={[0, 1, 2, 3].map((i) => rect(318 + i * 140, 395, 26, 70, 13))} progress={prog(t, 0.3, 0.6)} seed={5} />
			<DotText x={540} y={530} size={64} spacing={0.18}>
				{month}
			</DotText>
			{tear && (
				<g
					transform={`translate(${tearP * 520} ${-tearP * 420}) rotate(${tearP * 50} 540 900)`}
					opacity={1 - tearP}
				>
					<Dots d={rect(250, 640, 580, 530, 12)} spacing={15} seed={8} />
					<DotText x={540} y={920} size={380} weight={200} dash={16}>
						8
					</DotText>
				</g>
			)}
			<g opacity={tear ? tearP : 1}>
				<DotText x={540} y={920} size={380} weight={200} dash={16}>
					{day}
				</DotText>
			</g>
			<Dots d={ellipse(540, 920, 220, 200)} progress={circ} color={AMBER} r={4} spacing={15} seed={11} />
			{circ > 0.95 && <Rays cx={540} cy={920} r0={230} r1={480} intensity={0.5} n={20} />}
			<Caption text={captionA} from={0.5} to={captionB ? bAt - 0.2 : undefined} />
			{captionB && <Caption text={captionB} from={bAt} />}
		</>
	);
};

const Packing: React.FC = () => {
	const {t} = useShot();
	const lid = easeInOut(prog(t, 1.9, 0.35)); // lid closes
	return (
		<>
			<g opacity={0.45}>
				<Dots d={skyline(60, 1020, 720, 4, 200)} spacing={16} r={2.4} seed={4} />
			</g>
			<Dots d={person(330, 1300, 1.3, {la: 10, ra: 70, bend: 0.5})} progress={prog(t, 0, 1.1)} />
			{/* suitcase base */}
			<Dots d={rect(520, 1110, 340, 190, 16)} progress={prog(t, 0.2, 0.8)} seed={2} />
			{/* lid hinged at the top-left corner of the base */}
			<g transform={`rotate(${(1 - lid) * -100} 520 1110)`}>
				<Dots d={[rect(520, 1110 - 0, 340, 26, 10)]} progress={prog(t, 0.3, 0.6)} seed={6} />
			</g>
			{/* shirts dropping in */}
			{[0, 1, 2].map((i) => {
				const p = easeOut(prog(t, 0.4 + i * 0.45, 0.4));
				return (
					<g key={i} transform={`translate(0 ${(1 - p) * -260})`} opacity={p * (1 - lid * 0.7)}>
						<Dots d={rect(560 + i * 90, 1170 - i * 8, 80, 50, 8)} spacing={12} r={2.4} seed={30 + i} />
					</g>
				);
			})}
			<Caption text="ХИРОСИМА · КОМАНДИРОВКА" from={0.3} to={2.9} />
		</>
	);
};

const Photo: React.FC = () => {
	const {t} = useShot();
	const z = 1 + t * 0.025;
	return (
		<g transform={`translate(540 900) scale(${z}) translate(-540 -900)`}>
			<Rays cx={540} cy={880} r0={260} r1={620} intensity={0.8} />
			<Dots d={[rect(250, 520, 580, 700, 16), rect(285, 555, 510, 630, 8)]} color={AMBER} progress={prog(t, 0, 0.9)} />
			<Dots d={person(450, 1130, 1.2, {la: 12, ra: 35})} progress={prog(t, 0.2, 1.0)} seed={4} />
			<Dots d={[...person(640, 1130, 0.75, {la: -30, ra: 15})]} progress={prog(t, 0.4, 0.9)} seed={7} />
			<Dots d={poly([[380, 790], [450, 760], [520, 790]])} progress={prog(t, 0.6, 0.5)} color={GOLD} r={2.5} seed={8} />
			<Caption text="ЗАВТРА — ДОМОЙ" from={0.25} amber />
		</g>
	);
};

const Seal: React.FC = () => {
	const {t} = useShot();
	const found = rel('seal', '05', 2.45);
	const stampAt = rel('seal', '05', 3.8);
	const walk = easeInOut(prog(t, found, 1.3));
	const press = t < stampAt ? easeInOut(prog(t, stampAt - 0.35, 0.35)) : 1 - easeOut(prog(t, stampAt + 0.1, 0.4));
	const mark = prog(t, stampAt, 0.15);
	const qm = 1 - prog(t, found - 0.3, 0.3);
	return (
		<>
			{/* man: pats pocket, then walks back */}
			<g transform={`translate(${-walk * 140} 0)`}>
				<Dots d={person(330, 1320, 1.25, {la: 15, ra: 5 + 30 * Math.abs(Math.sin(t * 4)) * qm})} progress={prog(t, 0, 1)} />
				<g opacity={qm}>
					<DotText x={330} y={760} size={160} weight={200}>
						?
					</DotText>
				</g>
				<Dots d={rect(380, 1120, 54, 60, 8)} progress={prog(t, 0.4, 0.5)} color={GOLD} r={2.4} seed={9} opacity={qm} />
			</g>
			{/* the seal */}
			<g opacity={clamp((t - found + 0.2) / 0.5)}>
				<Rays cx={680} cy={720} r0={150} r1={420} intensity={0.9} />
				<g transform={`translate(0 ${press * 300})`}>
					<Dots d={hanko(680, 590, 130, 240)} color={AMBER} r={3.6} progress={prog(t, found, 0.7)} />
				</g>
				<Dots d={rect(520, 1140, 330, 40, 6)} progress={prog(t, found + 0.3, 0.5)} seed={12} opacity={0.6} />
				<g opacity={mark}>
					<Dots d={circle(680, 1100, 60)} color={AMBER} r={3.4} spacing={11} seed={14} />
					<DotText x={680} y={1102} size={64} family="IPAGothic" color={AMBER} dash={5}>
						山口
					</DotText>
				</g>
			</g>
			<Caption text="ЗАБЫЛ ПЕЧАТЬ" from={rel('seal', '05', 1.2)} to={found + 0.9} />
			<Caption text="ВОЗВРАЩАЕТСЯ" from={found + 1.0} />
		</>
	);
};

const Clock: React.FC = () => {
	const {t, dur} = useShot();
	const ticks = Math.floor(t / 0.5);
	const minute = t > dur - 0.45 ? 15 : 14;
	const secA = ticks * 6 * 5;
	const glow = clamp(t / dur);
	const shake = glow * 6;
	const sx = Math.sin(t * 60) * shake;
	return (
		<g transform={`translate(${sx} ${Math.cos(t * 53) * shake})`}>
			<Rays cx={540} cy={860} r0={340} r1={640} intensity={0.25 + glow * 0.75} />
			<Dots d={circle(540, 860, 330)} progress={prog(t, 0, 0.6)} r={3.4} />
			{Array.from({length: 12}).map((_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return <Dots key={i} d={line(540 + Math.sin(a) * 280, 860 - Math.cos(a) * 280, 540 + Math.sin(a) * 310, 860 - Math.cos(a) * 310)} spacing={10} seed={i} />;
			})}
			<g transform={`rotate(${(8 + minute / 60) * 30} 540 860)`}>
				<Dots d={line(540, 870, 540, 690)} r={4} spacing={12} seed={40} />
			</g>
			<g transform={`rotate(${minute * 6} 540 860)`}>
				<Dots d={line(540, 870, 540, 590)} r={3.4} spacing={12} seed={41} />
			</g>
			<g transform={`rotate(${secA} 540 860)`}>
				<Dots d={line(540, 900, 540, 570)} r={2.2} color={AMBER} spacing={10} seed={42} />
			</g>
			<circle cx={540} cy={860} r={9} fill={AMBER} />
			<Caption text="8:15" from={0.2} big />
		</g>
	);
};

const Flash1: React.FC = () => {
	const {t} = useShot();
	const rise = easeOut(prog(t, 0.5, 2.4));
	return (
		<>
			<Rays cx={540} cy={640} r0={200} r1={900} intensity={1} n={40} />
			<g transform={`translate(540 1200) scale(${0.35 + 0.65 * rise}) translate(-540 -1200)`}>
				<Dots d={mushroom(540, 1200, 1.15)} progress={prog(t, 0.4, 1.6)} color={WHITE} r={3.2} />
			</g>
			<Dots d={[line(40, 1200, 1040, 1200)]} spacing={18} r={2.2} />
			<g opacity={0.4 * (1 - rise)}>
				<Dots d={skyline(80, 1000, 1200, 7, 120)} spacing={16} r={2.4} seed={7} />
			</g>
			<Caption text="ЯРЧЕ ТЫСЯЧИ СОЛНЦ" from={rel('flash', '07', 0)} amber />
		</>
	);
};

const Thrown: React.FC = () => {
	const {t} = useShot();
	const hit = 0.55;
	const fly = easeOut(prog(t, 0.05, 0.5));
	const shake = t > hit && t < hit + 0.4 ? Math.sin(t * 90) * 14 * (1 - (t - hit) / 0.4) : 0;
	return (
		<g transform={`translate(${shake} ${shake * 0.6})`}>
			{/* small cloud at epicenter */}
			<g opacity={0.55}>
				<Dots d={mushroom(170, 1150, 0.42)} spacing={12} r={2.4} seed={3} />
			</g>
			<Dots d={line(40, 1150, 1040, 1150)} spacing={18} r={2.2} seed={2} />
			{/* distance marker */}
			<Dots d={line(170, 1240, 640 + 120, 1240)} progress={prog(t, 0.9, 1.0)} color={AMBER} spacing={20} r={3.2} seed={5} />
			<DotText x={470} y={1300} size={58} color={AMBER} opacity={prog(t, 1.4, 0.5)}>
				3 КМ
			</DotText>
			{/* lying man, thrown in from the left */}
			<g transform={`translate(${(1 - fly) * -380} ${-(1 - fly) * 160}) rotate(${-90 + (1 - fly) * 40} 700 1110)`}>
				<Dots d={person(700, 1110, 1.05, {la: 60, ra: 40, legs: 10})} />
			</g>
			{/* ear-damage waves */}
			{[0, 1, 2].map((i) => {
				const p = ((t - 2.2 + i * 0.5) % 1.5) / 1.5;
				if (t < 2.2) return null;
				return <circle key={i} cx={350} cy={1110} r={40 + p * 200} fill="none" stroke={WHITE} strokeWidth={2} strokeDasharray="0 12" strokeLinecap="round" opacity={(1 - p) * 0.7} />;
			})}
			{/* burns: amber specks */}
			{Array.from({length: 18}).map((_, i) => (
				<circle key={i} cx={560 + hash(i) * 330} cy={1050 + hash(i + 4) * 80} r={3} fill={AMBER} opacity={prog(t, 2.0 + i * 0.05, 0.3) * (0.5 + 0.5 * Math.sin(t * 6 + i))} />
			))}
			<Caption text="3 КМ ОТ ЭПИЦЕНТРА" from={0.7} to={2.4} />
			<Caption text="ОЖОГИ · ПЕРЕПОНКИ" from={2.6} />
		</g>
	);
};

const Alive: React.FC = () => {
	const {t} = useShot();
	const ecg = poly([
		[60, 900], [330, 900], [370, 860], [410, 900], [450, 900], [480, 700], [520, 1080], [560, 900], [620, 900], [650, 870], [690, 900], [1020, 900],
	]);
	return (
		<>
			<Dots d={ecg} progress={prog(t, 0, 0.9)} color={AMBER} r={3.6} spacing={11} />
			<Rays cx={500} cy={880} r0={90} r1={300} intensity={prog(t, 0.5, 0.5)} n={18} />
			<Caption text="ОН ЖИВ" from={0.15} big />
		</>
	);
};

const Shelter: React.FC = () => {
	const {t} = useShot();
	return (
		<>
			{Array.from({length: 40}).map((_, i) => (
				<circle key={i} cx={hash(i) * 1000 + 40} cy={hash(i + 7) * 650 + 180} r={1.5 + hash(i + 3) * 2.5} fill={WHITE} opacity={0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))} />
			))}
			<Dots d={circle(790, 380, 80)} color={GOLD} progress={prog(t, 0, 0.6)} r={2.6} />
			<Dots d={[`M 160 1250 A 380 300 0 0 1 920 1250`, line(60, 1250, 1020, 1250)]} progress={prog(t, 0, 0.8)} />
			<Dots d={person(540, 1250, 0.9, {la: 50, ra: 50, legs: 40, bend: 0.8})} progress={prog(t, 0.2, 0.8)} seed={4} />
			<Caption text="НОЧЬ В УКРЫТИИ" from={0.15} />
		</>
	);
};

const wheel = (cx: number, cy: number, r: number) => [circle(cx, cy, r)];
const Train: React.FC = () => {
	const {t} = useShot();
	const x = -260 + t * 260;
	return (
		<>
			<Dots d={line(0, 1230, 1080, 1230)} spacing={16} r={2.2} />
			{Array.from({length: 14}).map((_, i) => (
				<line key={i} x1={((i * 90 - t * 500) % 1260 + 1260) % 1260 - 90} y1={1250} x2={((i * 90 - t * 500) % 1260 + 1260) % 1260 - 30} y2={1250} stroke={WHITE} strokeWidth={3} strokeDasharray="0 12" strokeLinecap="round" opacity={0.5} />
			))}
			<g transform={`translate(${x} 0)`}>
				<Dots d={[rect(180, 980, 400, 200, 14), rect(450, 880, 130, 100, 8), rect(240, 900, 50, 80, 6), rect(-300, 990, 440, 190, 14), rect(-240, 1030, 90, 70, 8), rect(-110, 1030, 90, 70, 8)]} />
				{[260, 380, 500, -220, -40].map((cx, i) => (
					<g key={i} transform={`rotate(${t * 400} ${cx} 1190)`}>
						<Dots d={[...wheel(cx, 1190, 38), line(cx - 34, 1190, cx + 34, 1190)]} spacing={10} r={2.6} seed={i} />
					</g>
				))}
				{[0, 1, 2, 3].map((i) => {
					const p = ((t * 0.9 + i * 0.25) % 1);
					return <circle key={i} cx={265 - p * 260} cy={880 - p * 300} r={22 + p * 70} fill="none" stroke={WHITE} strokeWidth={3} strokeDasharray="0 13" strokeLinecap="round" opacity={(1 - p) * 0.8} />;
				})}
			</g>
			<Caption text="УТРОМ — ПОЕЗД" from={0.1} />
		</>
	);
};

const TrainWindow: React.FC = () => {
	const {t} = useShot();
	return (
		<>
			{/* landscape streaming past */}
			<g clipPath="url(#win)">
				{Array.from({length: 9}).map((_, i) => {
					const y = 560 + i * 60;
					const off = (t * (300 + i * 60)) % 400;
					return <line key={i} x1={-400 + off} y1={y} x2={1300 + off} y2={y} stroke={WHITE} strokeWidth={2.5} strokeDasharray={`0 ${18 + i * 3}`} strokeLinecap="round" opacity={0.25 + 0.05 * i} />;
				})}
			</g>
			<Dots d={[rect(170, 460, 740, 640, 40), rect(195, 485, 690, 590, 30)]} progress={prog(t, 0, 0.8)} />
			{/* bandaged head, profile */}
			<g transform={`translate(0 ${Math.sin(t * 9) * 4})`}>
				<Dots d={[circle(470, 880, 120), `M 590 860 L 625 905 L 588 915`, `M 380 990 Q 470 1060 560 990`, line(350, 1075, 590, 1075)]} progress={prog(t, 0.2, 0.8)} seed={6} />
				<Dots d={[line(370, 820, 585, 900), line(360, 860, 575, 945), line(380, 790, 560, 830)]} color={GOLD} r={2.6} spacing={10} progress={prog(t, 0.6, 0.6)} seed={9} />
			</g>
			{/* sign */}
			<Dots d={rect(280, 1140, 520, 110, 12)} progress={prog(t, 0.8, 0.5)} color={AMBER} seed={13} />
			<DotText x={420} y={1196} size={58} color={AMBER} opacity={prog(t, 1.0, 0.4)} spacing={0.15}>
				ДОМ →
			</DotText>
			<rect x={530} y={1168} width={230} height={56} rx={6} fill={WHITE} opacity={prog(t, 1.1, 0.3) * (0.75 + 0.25 * Math.sin(t * 13))} />
			<Caption text="ТУДА, ГДЕ БЕЗОПАСНО" from={0.4} />
		</>
	);
};

const Office: React.FC = () => {
	const {t} = useShot();
	const draw = easeInOut(prog(t, 1.4, 1.4));
	const crumble = prog(t, 3.0, 1.2);
	return (
		<>
			<Dots d={[line(80, 1100, 1000, 1100), line(160, 1100, 160, 1300), line(920, 1100, 920, 1300)]} progress={prog(t, 0, 0.6)} />
			<Dots d={person(270, 1300, 1.1, {la: 10, ra: 75, bend: 0.4})} progress={prog(t, 0, 0.8)} seed={3} />
			<Dots d={[line(225, 940, 410, 950), line(230, 970, 400, 975)]} color={GOLD} r={2.4} spacing={10} progress={prog(t, 0.4, 0.5)} seed={4} />
			<Dots d={person(820, 1300, 1.2, {la: 25, ra: 10})} progress={prog(t, 0.2, 0.8)} seed={8} />
			{/* drawn circle with a city collapsing inside */}
			<Dots d={ellipse(560, 1040, 170, 46)} color={AMBER} progress={draw} r={3.6} seed={20} />
			<g transform={`translate(560 1050) scale(1 ${1 - crumble * 0.8}) translate(-560 -1050)`} opacity={1 - crumble * 0.8}>
				<Dots d={skyline(430, 690, 1050, 11, 90)} spacing={11} r={2.4} seed={21} progress={prog(t, 1.6, 0.6)} />
			</g>
			<Caption text="БОМБА СТЁРЛА ГОРОД" from={0.3} />
		</>
	);
};

const Boss: React.FC = () => {
	const {t} = useShot();
	const l = rel('boss', '12');
	const laugh = Math.abs(Math.sin(t * 14)) * (t > l && t < l + 1.4 ? 1 : 0.25);
	const bubbles: [string, number][] = [
		['ОДНА БОМБА?', l + 1.25],
		['ЦЕЛЫЙ ГОРОД?', l + 2.3],
		['ТЫ БРЕДИШЬ', l + 3.3],
	];
	const cur = [...bubbles].reverse().find((b) => t >= b[1]);
	const pop = cur ? easeOut(prog(t, cur[1], 0.25)) : 0;
	return (
		<>
			<g transform={`translate(0 ${laugh * -8})`}>
				<Dots d={[circle(420, 980, 190), `M 330 1040 Q 420 ${1080 + laugh * 40} 510 1040`, line(340, 940, 390, 930), line(450, 930, 500, 940), `M 230 1320 Q 420 1150 610 1320`]} progress={prog(t, 0, 0.8)} r={3.4} />
			</g>
			{cur && (
				<g transform={`translate(700 640) scale(${0.85 + 0.15 * pop}) translate(-700 -640)`} opacity={pop}>
					<Dots d={[ellipse(690, 640, 240, 120), poly([[560, 730], [500, 820], [610, 745]])]} color={cur[0] === 'ТЫ БРЕДИШЬ' ? AMBER : WHITE} spacing={14} seed={cur[1]} />
					<DotText x={690} y={642} size={50} color={cur[0] === 'ТЫ БРЕДИШЬ' ? AMBER : WHITE} spacing={0.06} weight={400} dash={6}>
						{cur[0]}
					</DotText>
				</g>
			)}
			<Caption text="НАЧАЛЬНИК СМЕЁТСЯ" from={l} to={l + 1.2} />
		</>
	);
};

const WindowLight: React.FC = () => {
	const {t, dur} = useShot();
	const g = Math.pow(prog(t, 0.6, dur - 0.6), 2);
	return (
		<>
			<circle cx={540} cy={760} r={200 + g * 600} fill="url(#amberGlow)" opacity={0.2 + g} />
			<Rays cx={540} cy={760} r0={120} r1={300 + g * 500} intensity={g} n={30} />
			<g opacity={0.6}>
				<Dots d={skyline(250, 830, 980, 13, 160)} spacing={14} r={2.4} />
			</g>
			<Dots d={[rect(220, 380, 640, 640, 10), line(540, 380, 540, 1020), line(220, 700, 860, 700)]} progress={prog(t, 0, 0.8)} r={3.4} />
			<Dots d={person(330, 1400, 1.1, {la: 8, ra: 8})} progress={prog(t, 0.2, 0.8)} seed={5} />
			<Caption text="И В ЭТУ СЕКУНДУ…" from={rel('window', '13', 0)} to={dur - 0.4} />
		</>
	);
};

const Nagasaki: React.FC = () => {
	const {t} = useShot();
	const reveal = TLX.events.reveal - shotStart('nagasaki');
	const r = easeOut(prog(t, reveal, 0.35));
	const shake = t > reveal && t < reveal + 0.45 ? Math.sin(t * 95) * 16 * (1 - (t - reveal) / 0.45) : 0;
	return (
		<g transform={`translate(${shake} ${shake * 0.5})`}>
			<Rays cx={540} cy={900} r0={260} r1={700 + r * 300} intensity={0.35 + 0.65 * r} n={44} />
			<Dots d={rect(110, 760, 860, 280, 20)} color={AMBER} progress={prog(t, 0.9, 0.8)} r={3.6} />
			<DotText x={540} y={830} size={60} color={AMBER} opacity={prog(t, 1.2, 0.5)} spacing={0.25}>
				ДОМ →
			</DotText>
			{/* censor bar burns away */}
			<rect x={170 + r * 360} y={880} width={740 * (1 - r)} height={120} rx={8} fill={WHITE} opacity={prog(t, 1.3, 0.4) * (0.85 + 0.15 * Math.sin(t * 17))} />
			<g opacity={r}>
				<DotText x={540} y={945} size={120} color={WHITE} weight={500} spacing={0.06} dash={8}>
					НАГАСАКИ
				</DotText>
			</g>
			<Caption text="ЕГО РОДНОЙ ГОРОД…" from={rel('nagasaki', '15', 0)} to={reveal - 0.1} />
			<Caption text="НАГАСАКИ" from={reveal + 0.1} big amber />
		</g>
	);
};

const Again: React.FC = () => {
	const {t} = useShot();
	return (
		<>
			<g opacity={0.6}>
				<Dots d={mushroom(230, 1150, 0.55)} progress={prog(t, 0, 1.0)} spacing={12} r={2.6} />
			</g>
			<Dots d={line(40, 1150, 1040, 1150)} spacing={18} r={2.2} seed={2} />
			<Dots d={line(230, 1230, 760, 1230)} progress={prog(t, 0.5, 0.9)} color={AMBER} spacing={20} r={3.2} seed={5} />
			<DotText x={500} y={1290} size={58} color={AMBER} opacity={prog(t, 1.0, 0.5)}>
				3 КМ
			</DotText>
			<Rays cx={760} cy={880} r0={110} r1={380} intensity={prog(t, 1.2, 0.8)} n={22} />
			<Dots d={person(760, 1150, 1.1, {la: 20, ra: 20})} progress={prog(t, 0.6, 0.9)} seed={9} />
			<Caption text="СНОВА 3 КМ. СНОВА ЖИВ" from={0.3} />
		</>
	);
};

const Life: React.FC = () => {
	const {t, dur} = useShot();
	const split = 2.8;
	const year = Math.round(1945 + 65 * easeInOut(prog(t, 0.2, 2.3)));
	const age = easeInOut(prog(t, 0.3, 2.2));
	const out1 = prog(t, split - 0.3, 0.4);
	const in2 = prog(t, split, 0.6);
	return (
		<>
			<g opacity={1 - out1}>
				<DotText x={540} y={560} size={190} weight={200} dash={10}>
					{year}
				</DotText>
				<Dots d={person(480, 1300, 1.2, {bend: age * 0.9, la: 10, ra: 10 + age * 20})} seed={1} />
				<g opacity={age}>
					<Dots d={line(645, 1080, 680, 1300)} color={GOLD} seed={2} />
				</g>
				<g opacity={prog(t, 1.2, 0.6)}>
					<Dots d={person(760, 1300, 0.55, {la: 30, ra: 20})} seed={3} r={2.6} />
				</g>
				<g opacity={prog(t, 1.7, 0.6)}>
					<Dots d={person(300, 1300, 0.5, {la: 20, ra: 40})} seed={4} r={2.6} />
				</g>
			</g>
			<g opacity={in2}>
				<Rays cx={540} cy={860} r0={250} r1={600} intensity={0.7} />
				<Dots d={[rect(270, 470, 540, 760, 14), line(330, 620, 750, 620), line(330, 690, 750, 690), line(330, 760, 650, 760)]} progress={prog(t, split, 1.0)} />
				<DotText x={540} y={545} size={54} spacing={0.2}>
					2009
				</DotText>
				<Dots d={[circle(430, 940, 70), circle(650, 940, 70)]} color={AMBER} progress={prog(t, split + 0.7, 0.8)} r={3.4} seed={6} />
				<DotText x={430} y={942} size={46} color={AMBER} opacity={prog(t, split + 1.2, 0.4)}>
					6.08
				</DotText>
				<DotText x={650} y={942} size={46} color={AMBER} opacity={prog(t, split + 1.4, 0.4)}>
					9.08
				</DotText>
				<Dots d={circle(680, 1120, 55)} color={AMBER} progress={prog(t, split + 2.4, 0.3)} r={3} spacing={11} seed={7} />
				<DotText x={680} y={1122} size={56} family="IPAGothic" color={AMBER} opacity={prog(t, split + 2.5, 0.3)} dash={5}>
					認定
				</DotText>
			</g>
			<Caption text="93 ГОДА" from={0.3} to={split - 0.3} big />
			<Caption text="ПЕРВЫЙ ПРИЗНАННЫЙ ОФИЦИАЛЬНО" from={split + 0.3} to={dur - 2.1} />
			<Caption text="1916 — 2010" from={dur - 1.9} />
		</>
	);
};

const Ending: React.FC = () => {
	const {t, dur} = useShot();
	const stampAt = rel('ending', '19', 3.0);
	const press = t < stampAt ? easeInOut(prog(t, stampAt - 0.4, 0.4)) : 1 - easeOut(prog(t, stampAt + 0.15, 0.5));
	const mark = prog(t, stampAt, 0.12);
	const fadeEnd = prog(t, dur - 0.9, 0.9);
	return (
		<g opacity={1 - fadeEnd * 0.6}>
			<Rays cx={540} cy={700} r0={170} r1={520} intensity={0.85} />
			<Dots d={rect(220, 1120, 640, 90, 10)} progress={prog(t, 0, 0.7)} opacity={0.6} />
			<g transform={`translate(0 ${press * 300})`}>
				<Dots d={hanko(540, 610, 150, 260)} color={AMBER} progress={prog(t, 0, 0.9)} r={3.8} />
				{/* fingers + thumb pinching the seal */}
				<Dots d={[rect(420, 650, 110, 46, 23), rect(415, 705, 125, 46, 23), rect(425, 760, 110, 46, 23), rect(555, 680, 105, 50, 25), `M 420 650 Q 330 700 360 830 L 300 980`, `M 425 806 Q 450 880 420 980`]} progress={prog(t, 0.3, 0.9)} seed={5} />
			</g>
			<g opacity={mark}>
				<Dots d={circle(540, 1080, 72)} color={AMBER} r={3.4} spacing={11} seed={14} />
				<DotText x={540} y={1083} size={76} family="IPAGothic" color={AMBER} dash={5}>
					山口
				</DotText>
			</g>
			<Caption text="ВСЁ НАЧАЛОСЬ С ПЕЧАТИ" from={0.3} to={stampAt + 0.6} />
			<Caption text="А ТЫ БЫ ВЕРНУЛСЯ?" from={stampAt + 0.8} amber />
		</g>
	);
};

const SHOTS: Record<string, React.FC> = {
	hook: Hook,
	calendar: () => <Calendar day="6" captionA="6 АВГУСТА 1945" captionB="ИНЖЕНЕР ЦУТОМУ ЯМАГУТИ" bAt={rel('calendar', '03', 2.2)} />,
	packing: Packing,
	photo: Photo,
	seal: Seal,
	clock: Clock,
	flash: Flash1,
	thrown: Thrown,
	alive: Alive,
	shelter: Shelter,
	train: Train,
	trainwin: TrainWindow,
	aug9: () => <Calendar day="9" captionA="9 АВГУСТА · НА РАБОТУ" tear />,
	office: Office,
	boss: Boss,
	window: WindowLight,
	nagasaki: Nagasaki,
	again: Again,
	life: Life,
	ending: Ending,
};

// shots that cut in from a white flash instead of the dot-scatter transition
const FLASH_IN = new Set(['flash', 'nagasaki', 'thrown']);

const Shot: React.FC<{name: string; dur: number; next?: string}> = ({name, dur, next}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const IN = 0.55;
	const OUT = 0.4;
	const sIn = FLASH_IN.has(name) ? 0 : 1 - easeOut(prog(t, 0, IN));
	const sOut = next && FLASH_IN.has(next) ? 0 : easeInOut(prog(t, dur - OUT, OUT));
	const scatter = name === 'hook' ? sOut : Math.max(sIn, sOut);
	const C = SHOTS[name];
	const zoom = 1 + 0.035 * (t / dur);
	return (
		<ShotCtx.Provider value={{t, dur, scatter}}>
			<AbsoluteFill style={{transform: `scale(${zoom})`}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', overflow: 'visible'}}>
					<g filter="url(#glow)">
						<C />
					</g>
				</svg>
			</AbsoluteFill>
		</ShotCtx.Provider>
	);
};

const Defs: React.FC = () => (
	<svg width={0} height={0} style={{position: 'absolute'}}>
		<defs>
			<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="5" result="b" />
				<feMerge>
					<feMergeNode in="b" />
					<feMergeNode in="b" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			<radialGradient id="amberGlow">
				<stop offset="0%" stopColor="#ffb347" stopOpacity="0.45" />
				<stop offset="45%" stopColor="#ff8c2a" stopOpacity="0.14" />
				<stop offset="100%" stopColor="#ff8c2a" stopOpacity="0" />
			</radialGradient>
			<clipPath id="win">
				<rect x={195} y={485} width={690} height={590} rx={30} />
			</clipPath>
		</defs>
	</svg>
);

const Dust: React.FC = () => {
	const frame = useCurrentFrame();
	const t = frame / 30;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute'}}>
			{Array.from({length: 60}).map((_, i) => {
				const x = (hash(i) * 1080 + Math.sin(t * 0.3 + i) * 30 + 1080) % 1080;
				const y = ((hash(i + 11) * 1920 - t * (8 + hash(i + 4) * 18)) % 1920 + 1920) % 1920;
				return <circle key={i} cx={x} cy={y} r={1 + hash(i + 2) * 1.6} fill={WHITE} opacity={0.08 + 0.12 * Math.abs(Math.sin(t + i))} />;
			})}
		</svg>
	);
};

const FlashOverlay: React.FC = () => {
	const frame = useCurrentFrame();
	const g = frame / 30;
	const one = (at: number, hold: number, fade: number) => {
		if (g < at) return 0;
		if (g < at + hold) return 1;
		return Math.max(0, 1 - (g - at - hold) / fade);
	};
	const hookFlash = one(lineStart('02') - 0.03, 0.05, 0.35) * 0.6;
	const a = Math.max(one(TLX.events.flash1, 0.35, 2.2), one(TLX.events.flash2, 0.45, 2.4), hookFlash, one(TLX.events.reveal, 0.03, 0.4) * 0.5);
	return <AbsoluteFill style={{background: `rgba(255, 246, 230, ${a})`, mixBlendMode: 'screen'}} />;
};

export const Dvazhdy: React.FC = () => {
	const {fps} = useVideoConfig();
	const scenes = TLX.scenes;
	return (
		<AbsoluteFill style={{background: '#050507', fontFamily: 'Inter'}}>
			<Defs />
			<Dust />
			{scenes.map((s, i) => {
				const from = Math.round(s.start * fps);
				const to = Math.round(s.end * fps);
				return (
					<Sequence key={s.name} from={from} durationInFrames={to - from} layout="none">
						<Shot name={s.name} dur={(to - from) / fps} next={scenes[i + 1]?.name} />
					</Sequence>
				);
			})}
			<FlashOverlay />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none'}} />
			<Audio src={staticFile('soundtrack.wav')} />
		</AbsoluteFill>
	);
};
