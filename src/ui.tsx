import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AdminError } from './api';
import { dayIso, int } from './format';

/** Loads once per key change; `reload` asks again. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    load()
      .then((d) => live && setData(d))
      .catch((e: unknown) => live && setError(messageOf(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

const KNOWN: Record<string, string> = {
  not_admin: 'Esta cuenta no tiene acceso al panel.',
  no_account: 'No hay una cuenta con ese correo. La persona tiene que haber entrado a Natus con Google.',
  already_paying: 'Esa persona ya paga Premium con PayPal.',
  not_gifted: 'Esa persona no tiene Premium regalado.',
  months_out_of_range: 'Elige entre 1 y 36 meses.',
};

export function messageOf(e: unknown): string {
  if (e instanceof AdminError) return KNOWN[e.message] ?? e.message;
  return e instanceof Error ? e.message : String(e);
}

export function Loading() {
  return <p className="muted">Cargando…</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="error">{children}</p>;
}

export function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note && <p className="stat-note">{note}</p>}
    </div>
  );
}

export function Range({ value, onChange, options }: {
  value: number;
  onChange: (n: number) => void;
  options: { days: number; label: string }[];
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.days}
          type="button"
          role="radio"
          aria-checked={value === o.days}
          className={value === o.days ? 'on' : ''}
          onClick={() => onChange(o.days)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One series of daily values as thin bars on a recessive baseline. The
 * title names the series, so no legend; hovering a bar shows its day and
 * value, and the table under it carries the same numbers.
 */
export function DayBars({ rows, format = int }: {
  rows: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const shown = hover !== null ? rows[hover] : rows[rows.length - 1];
  return (
    <div className="daybars">
      <p className="daybars-read">
        <span className="muted">{shown?.label}</span> <b>{shown ? format(shown.value) : ''}</b>
      </p>
      <div className="daybars-plot" onMouseLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <div
            key={r.label + i}
            className={`daybar${hover === i ? ' hot' : ''}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={0}
            aria-label={`${r.label}: ${format(r.value)}`}
          >
            <span style={{ height: `${(r.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="daybars-axis muted">
        <span>{rows[0]?.label}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** A funnel: one row per step, the bar against the first step. */
/** «1 min 50 s», «3 h 05 min», «2 d 4 h»: a median time between two steps. */
export function duration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
  return `${Math.floor(s / 86_400)} d ${Math.floor((s % 86_400) / 3600)} h`;
}

export type FunnelRow = {
  label: string;
  hint?: string | undefined;
  people: number;
  /** The same step in the period before, when comparing. */
  prev?: number | undefined;
  /** Median seconds from the step before. */
  seconds?: number | undefined;
};

export function FunnelRows({ rows, comparing = false }: { rows: FunnelRow[]; comparing?: boolean }) {
  const first = rows[0]?.people ?? 0;
  const firstPrev = rows[0]?.prev ?? 0;
  // One scale for both periods, so the bars can be compared by eye.
  const top = Math.max(first, comparing ? firstPrev : 0, 1);
  return (
    <ol className="funnel">
      {rows.map((r, i) => {
        const prevStep = i === 0 ? null : rows[i - 1]!.people;
        const ofPrev = prevStep && prevStep > 0 ? (r.people / prevStep) * 100 : null;
        const lost = prevStep !== null ? prevStep - r.people : null;
        const before = rows[i - 1]?.prev;
        const ofPrevThen = comparing && i > 0 && before && before > 0 && r.prev !== undefined ? (r.prev / before) * 100 : null;
        return (
          <li key={r.label}>
            <div className="funnel-text">
              <span className="funnel-label">
                {r.label}
                {r.hint && <small className="muted"> · {r.hint}</small>}
              </span>
              <span className="funnel-num">
                <b>{int(r.people)}</b>
                {ofPrev !== null && (
                  <span className={`muted${lost && lost > 0 ? ' drop' : ''}`}>
                    {' '}
                    {Math.round(ofPrev)}% del paso anterior
                    {lost !== null && lost > 0 ? ` · se fueron ${int(lost)}` : ''}
                  </span>
                )}
              </span>
            </div>
            <div className="funnel-track">
              {comparing && r.prev !== undefined && (
                <i className="funnel-ghost" style={{ width: `${Math.min(100, (r.prev / top) * 100)}%` }} />
              )}
              <span style={{ width: `${Math.min(100, (r.people / top) * 100)}%` }} />
            </div>
            {(comparing || r.seconds !== undefined) && (
              <p className="funnel-meta muted">
                {comparing && r.prev !== undefined && (
                  <>
                    Periodo anterior: {int(r.prev)}
                    {ofPrevThen !== null && ` · ${Math.round(ofPrevThen)}% del paso anterior`}
                    {ofPrev !== null && ofPrevThen !== null && (
                      <span className={ofPrev >= ofPrevThen ? 'up' : 'drop'}>
                        {' '}
                        ({ofPrev >= ofPrevThen ? '+' : '−'}
                        {Math.abs(Math.round(ofPrev - ofPrevThen))} puntos)
                      </span>
                    )}
                  </>
                )}
                {comparing && r.prev !== undefined && r.seconds !== undefined && ' · '}
                {r.seconds !== undefined && <>Tardan {duration(r.seconds)} desde el paso anterior (mediana)</>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Any value from the database, readable: text as text, the rest as JSON. */
export function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="muted">—</span>;
  if (typeof value === 'string') return <span className="pre">{value}</span>;
  if (typeof value === 'number' || typeof value === 'boolean') return <span>{String(value)}</span>;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return <span>{value.join(', ') || '—'}</span>;
  return (
    <details className="json">
      <summary>Ver datos</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

/** The first day the funnel has data (15 Oct 2026): «Todo» starts here. */
export const FIRST_DAY = '2026-10-15';

export type Period = { key: string; from: string; to: string };

const PRESETS: { key: string; label: string; days: number | null }[] = [
  { key: 'hoy', label: 'Hoy', days: 1 },
  { key: '7', label: '7 días', days: 7 },
  { key: '30', label: '30 días', days: 30 },
  { key: '90', label: '90 días', days: 90 },
  { key: 'todo', label: 'Todo', days: null },
];

export function presetPeriod(key: string): Period {
  const p = PRESETS.find((x) => x.key === key) ?? PRESETS[2]!;
  return { key: p.key, from: p.days === null ? FIRST_DAY : dayIso(p.days - 1), to: dayIso(0) };
}

/** The same number of days, right before. */
export function previousPeriod(p: Period): Period {
  const day = 86_400_000;
  const from = new Date(`${p.from}T12:00:00Z`).getTime();
  const to = new Date(`${p.to}T12:00:00Z`).getTime();
  const length = Math.round((to - from) / day) + 1;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { key: 'prev', from: iso(from - length * day), to: iso(from - day) };
}

/** Quick ranges, plus any dates: «Desde» and «Hasta» (the same day for one day). */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const custom = value.key === 'fechas';
  return (
    <div className="period">
      <div className="seg" role="radiogroup">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={value.key === p.key}
            className={value.key === p.key ? 'on' : ''}
            onClick={() => onChange(presetPeriod(p.key))}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          className={custom ? 'on' : ''}
          onClick={() => onChange({ ...value, key: 'fechas' })}
        >
          Elegir fechas
        </button>
      </div>
      {custom && (
        <div className="period-dates">
          <label>
            <span className="muted small">Desde</span>
            <input
              type="date"
              value={value.from}
              min={FIRST_DAY}
              max={value.to}
              onChange={(e) => e.target.value && onChange({ key: 'fechas', from: e.target.value, to: value.to })}
            />
          </label>
          <label>
            <span className="muted small">Hasta</span>
            <input
              type="date"
              value={value.to}
              min={value.from}
              max={dayIso(0)}
              onChange={(e) => e.target.value && onChange({ key: 'fechas', from: value.from, to: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
