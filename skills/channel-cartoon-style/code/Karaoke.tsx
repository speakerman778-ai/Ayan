import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';

export type Word = {text: string; start: number; end: number};

/**
 * Karaoke subtitle: the whole phrase is visible but faded;
 * only the word being spoken right now is solid and highlighted.
 */
export const KaraokeLine: React.FC<{words: Word[]; t: number; y?: number; maxPerRow?: number}> = ({words, t, y = 1440, maxPerRow = 3}) => {
	if (!words.length) return null;
	const first = words[0].start;
	const last = words[words.length - 1].end;
	if (t < first - 0.25 || t > last + 0.35) return null;
	const appear = interpolate(t, [first - 0.25, first], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const leave = interpolate(t, [last + 0.1, last + 0.35], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div
			style={{
				position: 'absolute',
				left: 70,
				right: 150,
				top: y,
				transform: `translateY(-50%) translateY(${(1 - appear) * 30}px)`,
				opacity: appear * leave,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 6,
			}}
		>
			{[words].map((row, ri) => (
				<div key={ri} style={{display: 'flex', columnGap: 30, rowGap: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%'}}>
					{row.map((w, wi) => {
						const active = t >= w.start && t < w.end;
						const k = active ? interpolate(t, [w.start, w.start + 0.12], [0, 1], {extrapolateRight: 'clamp'}) : 0;
						return (
							<span
								key={wi}
								style={{
									fontFamily: 'Inter',
									fontWeight: 900,
									fontSize: 78,
									lineHeight: 1.15,
									textTransform: 'uppercase',
									color: '#ffffff',
									opacity: active ? 1 : 0.32,
									WebkitTextStroke: active ? '10px #1a1424' : '0px',
									paintOrder: 'stroke fill',
									textShadow: active ? '0 6px 0 #1a1424, 0 0 24px rgba(0,0,0,0.45)' : '0 3px 8px rgba(0,0,0,0.35)',
									transform: `scale(${1 + 0.06 * k})`,
									display: 'inline-block',
								}}
							>
								{w.text}
							</span>
						);
					})}
				</div>
			))}
		</div>
	);
};

/** Spread words of a phrase over [start, end] proportionally to their length. */
export const timeWords = (phrase: string, start: number, end: number): Word[] => {
	const parts = phrase.split(/\s+/).filter(Boolean);
	const weights = parts.map((p) => p.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
	const total = weights.reduce((a, b) => a + b, 0);
	let cur = start;
	return parts.map((p, i) => {
		const d = ((end - start) * weights[i]) / total;
		const w = {text: p, start: cur, end: cur + d};
		cur += d;
		return w;
	});
};

const PHRASES = [
	timeWords('Каждую ночь старый смотритель зажигал свет.', 0.4, 3.0),
	timeWords('Но однажды свет погас сам.', 3.4, 5.6),
];

export const SubsDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const zoom = 1 + t * 0.006;
	return (
		<AbsoluteFill style={{background: '#1d2b4f'}}>
			<Img src={staticFile('series/lighthouse-bg.png')} style={{width: 1080, height: 1920, transform: `scale(${zoom})`}} />
			{PHRASES.map((p, i) => (
				<KaraokeLine key={i} words={p} t={t} />
			))}
		</AbsoluteFill>
	);
};
