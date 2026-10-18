import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AdminError } from './api';
import { int } from './format';

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
export function FunnelRows({ rows }: { rows: { label: string; hint?: string | undefined; people: number }[] }) {
  const first = rows[0]?.people ?? 0;
  return (
    <ol className="funnel">
      {rows.map((r, i) => {
        const prev = i === 0 ? null : rows[i - 1]!.people;
        const ofFirst = first > 0 ? (r.people / first) * 100 : 0;
        const ofPrev = prev && prev > 0 ? (r.people / prev) * 100 : null;
        const lost = prev !== null ? prev - r.people : null;
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
              <span style={{ width: `${Math.min(100, ofFirst)}%` }} />
            </div>
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
