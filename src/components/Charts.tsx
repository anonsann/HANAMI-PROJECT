/**
 * Hand-rolled SVG charts — zero chart-library dependencies keeps the bundle lean.
 */
import { useMemo } from 'react';
import { cls, clamp } from '../lib/utils';
import { useInView } from '../hooks';

export interface SeriesPoint {
  label: string;
  value: number;
  hint?: string;
  color?: string;
}

/* ---------------------------------- Bars ------------------------------------ */

export function BarChart({
  data,
  height = 180,
  format = (n: number) => n.toLocaleString(),
  labelEvery = 1,
  className
}: {
  data: SeriesPoint[];
  height?: number;
  format?: (n: number) => string;
  labelEvery?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return null;
  return (
    <div ref={ref} className={cls('w-full', className)} role="img" aria-label={`Bar chart with ${data.length} bars, max ${format(max)}`}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={d.label + i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={d.hint ?? `${d.label}: ${format(d.value)}`}>
              <div
                className="w-full rounded-t-[3px] transition-[height] duration-700 ease-out"
                style={{
                  height: inView ? `${pct}%` : '0%',
                  background: d.color ?? 'linear-gradient(180deg, rgb(var(--c-brand) / .95), rgb(var(--c-brand2) / .75))'
                }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] text-ink opacity-0 shadow-card transition-opacity group-hover:opacity-100">
                {d.label}: {format(d.value)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] border-t border-line pt-1.5 text-[10px] text-faint">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 overflow-hidden text-center">
            {i % Math.max(1, labelEvery) === 0 ? d.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Donut ----------------------------------- */

export function DonutChart({
  data,
  size = 170,
  cutout = 0.62,
  format = (n: number) => n.toLocaleString(),
  className
}: {
  data: SeriesPoint[];
  size?: number;
  cutout?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const total = data.reduce((a, d) => a + d.value, 0);
  const segments = useMemo(() => {
    const palette = [
      'rgb(var(--c-brand))',
      'rgb(var(--c-brand2))',
      'rgb(var(--c-gold))',
      'rgb(var(--c-sky))',
      'rgb(var(--c-good))',
      'rgb(var(--c-warn))',
      'rgb(var(--c-mute) / .6)'
    ];
    let acc = 0;
    return data.map((d, i) => {
      const start = acc;
      acc += d.value;
      return { ...d, start, end: acc, color: d.color ?? palette[i % palette.length] };
    });
  }, [data]);

  if (total <= 0) return null;
  const radius = 50;
  return (
    <div ref={ref} className={cls('flex flex-wrap items-center gap-5', className)} role="img" aria-label="Donut chart">
      <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(var(--c-line) / .4)" strokeWidth="12" />
        {segments.map((s) => {
          const frac = s.value / total;
          const dash = frac * 2 * Math.PI * radius;
          const gap = 2 * Math.PI * radius - dash;
          const offset = -(s.start / total) * 2 * Math.PI * radius;
          return (
            <circle
              key={s.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${inView ? dash : 0} ${gap}`}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dasharray .8s ease' }}
            />
          );
        })}
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-[rgb(var(--c-ink))]" style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: '11px', fontWeight: 600 }}>
          {format(total)}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm" style={{ flex: '1 1 140px' }}>
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-mute">{s.label}</span>
            <span className="font-mono text-xs text-faint">{((s.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <span aria-hidden="true" style={{ height: 0, width: 0, display: 'block', ['--cutout' as string]: cutout }} />
    </div>
  );
}

/* ---------------------------------- Lines ----------------------------------- */

export function LineChart({
  data,
  height = 180,
  format = (n: number) => n.toLocaleString(),
  labelEvery = Math.ceil(data.length / 8) || 1,
  className
}: {
  data: SeriesPoint[];
  height?: number;
  format?: (n: number) => string;
  labelEvery?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const w = 600;
  const h = 200;
  const pad = { l: 36, r: 8, t: 10, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x = pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
        const y = pad.t + (1 - d.value / max) * (h - pad.t - pad.b);
        return { x, y, ...d };
      }),
    [data, max, pad.b, pad.l, pad.r, pad.t]
  );

  if (data.length < 2) return null;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;
  const yTicks = [0.25, 0.5, 0.75, 1];

  return (
    <div ref={ref} className={cls('w-full', className)} style={{ height: 'auto' }} role="img" aria-label="Trend line chart">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ height, width: '100%' }} preserveAspectRatio="none">
        {yTicks.map((t) => {
          const y = pad.t + (1 - t) * (h - pad.t - pad.b);
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="rgb(var(--c-line) / .5)" strokeDasharray="3 4" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-[rgb(var(--c-faint))]" style={{ fontSize: 9 }}>
                {format(Math.round(max * t))}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#hanami-line-fill)" opacity={inView ? 0.25 : 0} style={{ transition: 'opacity .8s ease' }} />
        <path
          d={line}
          fill="none"
          stroke="rgb(var(--c-brand))"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={inView ? 1 : 1}
          strokeDashoffset={inView ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="9" fill="transparent">
              <title>{`${p.label}: ${format(p.value)}`}</title>
            </circle>
            <circle cx={p.x} cy={p.y} r="2.4" fill="rgb(var(--c-gold))" opacity={inView ? 1 : 0} style={{ transition: `opacity .5s ease ${i * 40}ms` }} />
          </g>
        ))}
        <defs>
          <linearGradient id="hanami-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-brand))" stopOpacity=".9" />
            <stop offset="100%" stopColor="rgb(var(--c-brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.map((p, i) =>
          i % Math.max(1, labelEvery) === 0 ? (
            <text key={`x-${i}`} x={p.x} y={h - 8} textAnchor="middle" className="fill-[rgb(var(--c-faint))]" style={{ fontSize: 9 }}>
              {p.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

/* ---------------------------------- Radar ----------------------------------- */

export function RadarChart({
  series,
  size = 280,
  className
}: {
  series: { name: string; color: string; values: { label: string; value: number }[] }[];
  size?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  if (series.length === 0 || series[0].values.length === 0) return null;
  const labels = series[0].values.map((v) => v.label);
  const n = labels.length;
  const cx = 100;
  const cy = 100;
  const r = 78;

  function point(i: number, v: number): string {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = clamp(v, 0, 1) * r;
    return `${(cx + rr * Math.cos(ang)).toFixed(1)},${(cy + rr * Math.sin(ang)).toFixed(1)}`;
  }

  return (
    <div ref={ref} className={cls('flex justify-center', className)} role="img" aria-label="Radar comparison chart">
      <svg width={size} height={size} viewBox="0 0 200 200">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon
            key={t}
            points={labels.map((_, i) => point(i, t)).join(' ')}
            fill="none"
            stroke="rgb(var(--c-line) / .6)"
            strokeWidth="0.6"
          />
        ))}
        {labels.map((lab, i) => (
          <text
            key={lab}
            x={cx + (r + 13) * Math.cos((Math.PI * 2 * i) / n - Math.PI / 2)}
            y={cy + (r + 13) * Math.sin((Math.PI * 2 * i) / n - Math.PI / 2)}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-[rgb(var(--c-faint))]"
            style={{ fontSize: 9 }}
          >
            {lab}
          </text>
        ))}
        {series.map((s) => (
          <polygon
            key={s.name}
            points={s.values.map((v, i) => point(i, inView ? v.value : 0)).join(' ')}
            fill={s.color.replace(')', ' / .18)')}
            stroke={s.color}
            strokeWidth="1.6"
            style={{ transition: 'all .8s cubic-bezier(.22,1,.36,1)' }}
          >
            <title>{s.name}</title>
          </polygon>
        ))}
      </svg>
    </div>
  );
}
