import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { int } from './format';

/**
 * The panel's charts, drawn by hand in SVG and HTML (approved mockup «Panel
 * Natus como la app», 23 Oct 2026): one cream for the data, a second and
 * third colour only where a chart has several series, every mark with a
 * hover that says its number, and a legend whenever there are two series
 * or more.
 */

/** Hover text for anything with `data-tip`: one layer for the whole panel. */
export function TipLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tip = ref.current;
    if (!tip) return;
    const place = (e: PointerEvent) => {
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      let x = e.clientX + 14;
      let y = e.clientY + 16;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > innerHeight - 8) y = e.clientY - h - 16;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${Math.max(8, y)}px`;
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.('[data-tip]');
      if (!t) {
        tip.hidden = true;
        return;
      }
      tip.textContent = t.getAttribute('data-tip');
      tip.hidden = false;
      place(e);
    };
    const move = (e: PointerEvent) => {
      if (!tip.hidden) place(e);
    };
    const hide = () => (tip.hidden = true);
    document.addEventListener('pointerover', over);
    document.addEventListener('pointermove', move);
    document.addEventListener('scroll', hide, { passive: true, capture: true });
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('scroll', hide, { capture: true });
    };
  }, []);
  return <div id="tip" ref={ref} hidden />;
}

/** The exact definition behind a word, on hover or touch. */
export function Def({ text }: { text: string }) {
  return (
    <button type="button" className="def" data-tip={text} aria-label={text}>
      i
    </button>
  );
}

/** Width of an element, followed as it changes, so SVG text stays at its real size. */
function useWidth<T extends Element>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const n = Math.round(e?.contentRect.width ?? 0);
      if (n > 0) setW(n);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function Kpi({ label, value, ctx, def, big }: {
  label: ReactNode;
  value: ReactNode;
  ctx?: ReactNode;
  def?: string;
  big?: boolean;
}) {
  return (
    <div className={`kpi${big ? ' big' : ''}`}>
      <span className="lbl">
        {label}
        {def && <Def text={def} />}
      </span>
      <span className="num">{value}</span>
      {ctx && <span className="ctx">{ctx}</span>}
    </div>
  );
}

/** ▲ / ▼ against the period before; nothing when there is nothing to compare. */
export function Delta({ now, before, unit = '', points = false }: {
  now: number;
  before: number | null | undefined;
  unit?: string;
  points?: boolean;
}) {
  if (before === null || before === undefined) return null;
  const d = Math.round(now - before);
  if (d === 0) return <span className="delta flat">= {points ? `${Math.round(before)}%` : int(before)} antes</span>;
  const word = points ? `${Math.abs(d)} ${Math.abs(d) === 1 ? 'punto' : 'puntos'}` : `${int(Math.abs(d))}${unit}`;
  return (
    <span className={`delta ${d > 0 ? 'up' : 'down'}`}>
      {d > 0 ? '▲' : '▼'} {word} ({points ? `${Math.round(before)}%` : int(before)} antes)
    </span>
  );
}

export function Spark({ values, color = '--s1' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 120;
  const H = 34;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const X = (i: number) => 2 + ((W - 8) * i) / (values.length - 1);
  const Y = (v: number) => H - 4 - ((H - 8) * (v - min)) / (max - min || 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="spark">
      <path d={`${d} L${X(values.length - 1)},${H} L${X(0)},${H} Z`} style={{ fill: `var(${color})`, fillOpacity: 0.12 }} />
      <path d={d} style={{ fill: 'none', stroke: `var(${color})`, strokeWidth: 2, strokeLinejoin: 'round' }} />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1]!)} r={3.5} style={{ fill: `var(${color})` }} />
    </svg>
  );
}

/** Horizontal bars, largest first as given. */
export function HBars({ rows, max }: { rows: { label: ReactNode; value: number; text?: string; tip?: string }[]; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hb">
      {rows.map((r, i) => (
        <div key={i} className="hrow" data-tip={r.tip}>
          <span className="nm">{r.label}</span>
          <span className="tr">
            <i style={{ width: `${(r.value / m) * 100}%` }} />
          </span>
          <span className="v">{r.text ?? int(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export type FunnelBar = {
  label: string;
  people: number | null;
  /** The same step in the period before, drawn as an outline on the same scale. */
  prev?: number | null;
  tag?: ReactNode;
  /** Shown under the share: «ref. 35%». */
  reference?: string;
  /** For a step not measurable yet: «se sabe el 13 nov». */
  pending?: string;
  newData?: boolean;
  tip?: string;
};

/** A funnel: bars against the first step, the share kept from the step before, the largest drop marked. */
export function Funnel({ rows, compare = false, onPick }: {
  rows: FunnelBar[];
  compare?: boolean;
  onPick?: (i: number) => void;
}) {
  const first = rows[0]?.people ?? 0;
  const firstPrev = rows[0]?.prev ?? 0;
  const top = Math.max(first, compare ? firstPrev ?? 0 : 0, 1);
  // The largest drop, in people (the same rule as the Pulso's problem of the day).
  let worst = -1;
  let worstLost = 0;
  rows.forEach((r, i) => {
    const before = rows[i - 1]?.people;
    if (i && r.people !== null && before) {
      const lost = before - r.people;
      if (lost > worstLost) {
        worstLost = lost;
        worst = i;
      }
    }
  });
  return (
    <div className="funnel-v2">
      <div className="fhead">
        <span>Paso</span>
        <span>Personas</span>
        <span>N.º</span>
        <span>Siguen del paso anterior</span>
      </div>
      {rows.map((r, i) => {
        const before = rows[i - 1]?.people;
        const share = i && r.people !== null && before ? Math.min(100, Math.round((r.people / before) * 100)) : null;
        const prevBefore = rows[i - 1]?.prev;
        const prevShare = compare && i && r.prev != null && prevBefore ? Math.min(100, Math.round((r.prev / prevBefore) * 100)) : null;
        const lost = i && r.people !== null && before ? before - r.people : null;
        const tip = [
          r.label,
          r.people === null ? 'Todavía no se puede medir' : `${int(r.people)} personas`,
          lost !== null && lost > 0 ? `Se fueron en este paso: ${int(lost)}` : '',
          r.tip ?? '',
        ]
          .filter(Boolean)
          .join('\n');
        const Tag = onPick && i > 0 ? 'button' : 'div';
        return (
          <Tag
            key={r.label}
            type={Tag === 'button' ? 'button' : undefined}
            className={`frow${i === worst ? ' worst' : ''}${r.newData ? ' newdata-row' : ''}`}
            data-tip={tip}
            onClick={onPick && i > 0 ? () => onPick(i) : undefined}
          >
            <span className="nm">
              {r.label}
              {i === worst && <span className="tag worst-tag">▼ mayor caída</span>}
              {r.newData && <span className="tag new">dato nuevo</span>}
              {r.tag}
            </span>
            <span className="track">
              {compare && r.prev != null && <span className="gh" style={{ width: `${Math.min(100, (r.prev / top) * 100)}%` }} />}
              {r.people !== null && <span className="b" style={{ width: `${Math.max(0.6, Math.min(100, (r.people / top) * 100))}%` }} />}
            </span>
            <span className="n">{r.people === null ? '—' : int(r.people)}</span>
            <span className="pass">
              {r.people === null ? r.pending ?? '—' : share === null ? '' : `${share}%`}
              {prevShare !== null && ` · antes ${prevShare}%`}
              {r.reference && (
                <>
                  <br />
                  <span className="ref">ref. {r.reference}</span>
                </>
              )}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}

/** Active people per week: kept + new + returned above the line, lost below it. */
export function GrowthChart({ rows, labels }: {
  rows: { kept: number; new_people: number; returned: number; lost: number }[];
  labels: string[];
}) {
  const [ref, W] = useWidth<HTMLDivElement>(640);
  const H = 260;
  const pad = { l: 44, r: 78, t: 16, b: 30 };
  const up = rows.map((r) => r.kept + r.new_people + r.returned);
  const step = niceStep(Math.max(1, ...up));
  const maxUp = Math.max(step, Math.ceil(Math.max(1, ...up) / step) * step);
  const maxDn = Math.max(step, Math.ceil(Math.max(1, ...rows.map((r) => r.lost)) / step) * step);
  const plotH = H - pad.t - pad.b;
  const zero = pad.t + (plotH * maxUp) / (maxUp + maxDn);
  const k = (zero - pad.t) / maxUp;
  const n = rows.length || 1;
  const slot = (W - pad.l - pad.r) / n;
  const bw = Math.min(48, slot * 0.56);
  const series = [
    { key: 'kept', name: 'Siguen', color: '--s1' },
    { key: 'new_people', name: 'Nuevas', color: '--s2' },
    { key: 'returned', name: 'Volvieron', color: '--s3' },
  ] as const;
  const ticks: number[] = [];
  for (let t = step; t <= maxUp; t += step) ticks.push(t);
  const last = rows.length - 1;
  return (
    <div ref={ref} className="chart-box">
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}>
            <i className="sw" style={{ background: `var(${s.color})` }} />
            {s.name}
          </span>
        ))}
        <span>
          <i className="sw hatch" />
          Se fueron (bajo la línea)
        </span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Activas por semana">
        <defs>
          <pattern id="hatch-lost" width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={5} height={5} style={{ fill: 'var(--lost)', fillOpacity: 0.35 }} />
            <line x1={0} y1={0} x2={0} y2={5} style={{ stroke: 'var(--lost)', strokeWidth: 2 }} />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={zero - t * k} y2={zero - t * k} />
            <text x={pad.l - 8} y={zero - t * k + 4} textAnchor="end">
              {int(t)}
            </text>
          </g>
        ))}
        <text x={pad.l - 8} y={zero + 4} textAnchor="end">
          0
        </text>
        <text x={pad.l - 8} y={zero + maxDn * k} textAnchor="end">
          −{int(maxDn)}
        </text>
        {rows.map((r, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const x = cx - bw / 2;
          let y = zero;
          const segs = series.map((s, j) => {
            const v = r[s.key];
            const h = v * k;
            if (h <= 0) return null;
            const gap = Math.min(2, h / 2);
            const rect = (
              <rect
                key={s.key}
                x={x}
                y={y - h + gap}
                width={bw}
                height={Math.max(1, h - gap)}
                rx={j === 2 ? 3 : 0}
                style={{ fill: `var(${s.color})` }}
                data-tip={`Semana del ${labels[i]}\n${s.name}: ${int(v)}`}
              />
            );
            y -= h;
            return rect;
          });
          const hd = r.lost * k;
          return (
            <g key={i}>
              {segs}
              {r.lost > 0 && (
                <rect
                  x={x}
                  y={zero + 2}
                  width={bw}
                  height={Math.max(1, hd - 2)}
                  rx={2}
                  style={{ fill: 'url(#hatch-lost)', stroke: 'var(--lost)', strokeWidth: 1 }}
                  data-tip={`Semana del ${labels[i]}\nSe fueron: ${int(r.lost)}`}
                />
              )}
              {(rows.length - 1 - i) % (slot < 48 ? 2 : 1) === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle">
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={zero} y2={zero} style={{ stroke: 'var(--line-2)', strokeWidth: 1.5 }} />
        {last >= 0 && (
          <>
            <text
              x={pad.l + slot * last + slot / 2 + bw / 2 + 6}
              y={zero - up[last]! * k + 10}
              textAnchor="start"
              className="strong"
            >
              {int(up[last]!)} activas
            </text>
            {rows[last]!.lost > 0 && (
              <text x={pad.l + slot * last + slot / 2 + bw / 2 + 6} y={zero + rows[last]!.lost * k - 2} textAnchor="start">
                −{int(rows[last]!.lost)}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

/** Retention: one line per week of arrival, newer weeks brighter. */
export function CohortChart({ cohorts }: { cohorts: { label: string; values: number[] }[] }) {
  const [ref, W] = useWidth<HTMLDivElement>(560);
  const H = 260;
  const pad = { l: 44, r: 96, t: 14, b: 30 };
  const weeks = Math.max(2, ...cohorts.map((c) => c.values.length));
  const X = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (weeks - 1);
  const Y = (v: number) => H - pad.b - ((H - pad.b - pad.t) * v) / 100;
  const colors = ['--c1', '--c2', '--c3', '--c4'];
  const shown = cohorts.slice(-4);
  return (
    <div ref={ref} className="chart-box">
      <div className="legend">
        {shown.map((c, i) => (
          <span key={c.label}>
            <i className="sw line" style={{ background: `var(${colors[i + 4 - shown.length]})` }} />
            Llegaron la semana del {c.label}
          </span>
        ))}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Curvas de retención">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end">
              {t}%
            </text>
          </g>
        ))}
        {Array.from({ length: weeks }, (_, i) => (
          <text key={i} x={X(i)} y={H - 8} textAnchor="middle">
            {i === 0 ? 'Llegada' : `Sem ${i}`}
          </text>
        ))}
        {shown.map((c, ci) => {
          const color = `var(${colors[ci + 4 - shown.length]})`;
          const pts = c.values.map((v, i) => [X(i), Y(v)] as const);
          const lastPt = pts[pts.length - 1]!;
          return (
            <g key={c.label}>
              <path
                d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')}
                style={{ fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }}
              />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 4} style={{ fill: color, stroke: 'var(--bg)', strokeWidth: 2 }} />
                  <circle
                    cx={p[0]}
                    cy={p[1]}
                    r={12}
                    style={{ fill: 'transparent' }}
                    data-tip={`Llegaron el ${c.label} · ${i === 0 ? 'semana de llegada' : `semana ${i}`}\n${c.values[i]}% usó la app`}
                  />
                </g>
              ))}
              <text x={lastPt[0] + 8} y={lastPt[1] - 8} textAnchor="start" className="halo">
                {c.label} · {c.values[c.values.length - 1]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Seven rows of 24 hours, one cream from faint to full. */
export function Heatmap({ cells }: { cells: { dow: number; hour: number; actions: number }[] }) {
  const days = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const max = Math.max(1, ...cells.map((c) => c.actions));
  const at = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.actions]));
  return (
    <div className="tw">
      <div className="hm">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="h">
            {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
          </span>
        ))}
        {days.map((d, di) => (
          <HeatRow key={d} day={d} values={Array.from({ length: 24 }, (_, h) => at.get(`${di + 1}-${h}`) ?? 0)} max={max} />
        ))}
      </div>
    </div>
  );
}

function HeatRow({ day, values, max }: { day: string; values: number[]; max: number }) {
  return (
    <>
      <span>{day}</span>
      {values.map((v, h) => {
        const q = v === 0 ? 1 : Math.min(7, 2 + Math.floor((v / max) * 5.99));
        return <i key={h} style={{ background: `var(--q${q})` }} data-tip={`${day} · ${String(h).padStart(2, '0')}:00\n${int(v)} acciones`} />;
      })}
    </>
  );
}

/** 24 hourly bars; hours still to come drawn as outlines. */
export function Hours({ values, now }: { values: number[]; now: number }) {
  const max = Math.max(1, ...values);
  return (
    <>
      <div className="hours" role="img" aria-label="Por hora">
        {values.map((v, h) =>
          h > now ? (
            <i key={h} className="later" style={{ height: '18%' }} data-tip={`${String(h).padStart(2, '0')}:00 · aún no pasa`} />
          ) : (
            <i key={h} style={{ height: `${(v / max) * 100}%` }} data-tip={`${String(h).padStart(2, '0')}:00 · ${int(v)} personas`} />
          ),
        )}
      </div>
      <div className="hlabels">
        {values.map((_, h) => (
          <span key={h}>{h % 6 === 0 ? String(h).padStart(2, '0') : ''}</span>
        ))}
      </div>
    </>
  );
}

function niceStep(max: number): number {
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** «pocos datos» when a group is under 30 people: its share can still move a lot. */
export function Few({ n }: { n: number }) {
  return n > 0 && n < 30 ? <span className="tag few">pocos datos</span> : null;
}
