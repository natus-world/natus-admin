import { Fragment, useState } from 'react';
import { api, type AppError } from '../api';
import { dateTime, int } from '../format';
import { PURPOSE, deviceLabel, label } from '../labels';
import { ErrorNote, Loading, PeriodPicker, Section, presetPeriod, useAsync } from '../ui';

/** Why a model answer failed, in words. */
const OUTCOME: Record<string, string> = {
  copy_violation: 'Rompió una regla de redacción',
  invalid_json: 'Respuesta con formato roto',
  api_error: 'Error del servicio de IA',
  timeout: 'Tardó demasiado',
  rate_limited: 'Demasiadas peticiones a la vez',
  budget_exceeded: 'Sin presupuesto',
};
const LINT: Record<string, string> = {
  percentage: 'puso un porcentaje',
  command: 'dio una orden',
  route: 'mencionó una ruta interna',
  voseo: 'usó voseo',
  diagnosis: 'sonó a diagnóstico',
};

function reason(outcome: string, kind: string): string {
  const base = OUTCOME[outcome] ?? outcome;
  const lint = kind.match(/lint:([a-z_]+)/)?.[1];
  if (lint) return `${base}: ${LINT[lint] ?? lint}`;
  const field = kind.match(/schema:([a-z_]+)/)?.[1];
  if (field) return `${base} (campo ${field})`;
  const sub = kind.split(':')[1];
  return sub && sub !== outcome ? `${base} (${sub})` : base;
}

/** «Celular · navegador» from a user agent, the same words as the funnel. */
function device(ua: string | null): string {
  if (!ua) return '—';
  const kind = /Instagram/i.test(ua)
    ? 'instagram'
    : /FBAN|FBAV|FB_IAB/i.test(ua)
      ? 'facebook'
      : /musical_ly|BytedanceWebview|TikTok/i.test(ua)
        ? 'tiktok'
        : 'navegador';
  const dev = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
    ? 'tablet'
    : /Mobi|iPhone|Android/i.test(ua)
      ? 'movil'
      : 'computador';
  const os = /iPhone|iPad|Mac OS/i.test(ua) ? ' · Apple' : /Android/i.test(ua) ? ' · Android' : /Windows/i.test(ua) ? ' · Windows' : '';
  return `${deviceLabel(`${dev}-${kind}`)}${os}`;
}

type Group = { key: string; message: string; path: string | null; rows: AppError[] };

export function Errors({ onOpenPerson }: { onOpenPerson: (id: string) => void }) {
  const [period, setPeriod] = useState(() => presetPeriod('7'));
  const { from, to } = period;
  const app = useAsync(() => api.appErrors(from, to), [from, to]);
  const ai = useAsync(() => api.aiFailures(from, to), [from, to]);
  const [open, setOpen] = useState<string | null>(null);

  const groups = new Map<string, Group>();
  for (const e of app.data ?? []) {
    const key = `${e.message}|${e.path ?? ''}`;
    const g = groups.get(key) ?? { key, message: e.message, path: e.path, rows: [] };
    g.rows.push(e);
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort((a, b) => b.rows.length - a.rows.length);

  return (
    <div className="stack">
      <div className="row-between">
        <p className="muted">Lo que falló en la app y en las respuestas de la IA. Toca un error para ver cada vez que pasó.</p>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <Section title="Errores de la app">
        {app.error && <ErrorNote>{app.error}</ErrorNote>}
        {app.loading ? (
          <Loading />
        ) : sorted.length === 0 ? (
          <p className="muted">Ningún error de la app en este rango.</p>
        ) : (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Error</th>
                  <th>Pantalla</th>
                  <th className="num">Veces</th>
                  <th className="num">Personas</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => {
                  const people = new Set(g.rows.map((r) => r.user_id ?? r.id)).size;
                  const isOpen = open === g.key;
                  return (
                    <Fragment key={g.key}>
                      <tr
                        tabIndex={0}
                        onClick={() => setOpen(isOpen ? null : g.key)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(isOpen ? null : g.key)}
                      >
                        <td className="notes">{g.message}</td>
                        <td>{g.path ?? '—'}</td>
                        <td className="num">{int(g.rows.length)}</td>
                        <td className="num">{int(people)}</td>
                        <td>{dateTime(g.rows[0]!.created_at)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="error-detail">
                          <td colSpan={5}>
                            {g.message === 'Script error.' && (
                              <p className="note">
                                «Script error.» es un error que el navegador no deja leer (suele venir de una extensión o de
                                un script de otro sitio). Si se repite mucho, avísame y lo investigo.
                              </p>
                            )}
                            <ul className="error-list">
                              {g.rows.map((r) => (
                                <li key={r.id}>
                                  <p>
                                    <b>{dateTime(r.created_at)}</b> · {device(r.user_agent)}
                                    {r.release && <span className="muted"> · versión {r.release.slice(0, 7)}</span>} ·{' '}
                                    {r.user_id && (r.name || r.email) ? (
                                      <button type="button" className="link" onClick={() => onOpenPerson(r.user_id!)}>
                                        {r.name || r.email}
                                      </button>
                                    ) : (
                                      <span className="muted">sin cuenta</span>
                                    )}
                                  </p>
                                  {r.stack && <pre className="stack-trace">{r.stack}</pre>}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Respuestas de la IA que fallaron">
        {ai.error && <ErrorNote>{ai.error}</ErrorNote>}
        {ai.loading ? (
          <Loading />
        ) : (ai.data ?? []).length === 0 ? (
          <p className="muted">Ninguna respuesta falló en este rango.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>En qué</th>
                  <th>Qué pasó</th>
                  <th className="num">Veces</th>
                  <th className="num">Personas</th>
                  <th className="num">Se arregló sola</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {[...(ai.data ?? [])]
                  .sort((a, b) => Number(b.calls) - Number(a.calls))
                  .map((f) => {
                    const calls = Number(f.calls);
                    const rec = Number(f.recovered);
                    return (
                      <tr key={`${f.purpose}|${f.outcome}|${f.error_kind}`}>
                        <td>{label(PURPOSE, f.purpose)}</td>
                        <td>{reason(f.outcome, f.error_kind)}</td>
                        <td className="num">{int(calls)}</td>
                        <td className="num">{int(Number(f.people))}</td>
                        <td className={`num${rec < calls ? ' alert-text' : ''}`}>
                          {int(rec)} de {int(calls)}
                        </td>
                        <td>{dateTime(f.last_at)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">
          «Se arregló sola»: la app volvió a pedir la respuesta y salió bien antes de 5 minutos, así que la persona sí la recibió.
          Las que no se arreglaron son las que conviene mirar.
        </p>
      </Section>
    </div>
  );
}
