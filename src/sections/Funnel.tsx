import { useState } from 'react';
import { api } from '../api';
import { int, shortDay } from '../format';
import { BIRTH_HOUR, MONEY, ONBOARDING, PAYWALL_PLACE, SOURCE, USE, deviceLabel, label, type Step } from '../labels';
import { ErrorNote, FunnelRows, Loading, PeriodPicker, Section, presetPeriod, previousPeriod, useAsync } from '../ui';


export function Funnel() {
  const [period, setPeriod] = useState(() => presetPeriod('30'));
  const { from, to } = period;
  const funnel = useAsync(() => api.funnel(from, to), [from, to]);
  const places = useAsync(() => api.funnelDetail('paywall_seen', from, to), [from, to]);
  const bySource = useAsync(() => api.funnelBySource(from, to), [from, to]);
  const devices = useAsync(() => api.funnelDetail('onboarding_started', from, to), [from, to]);
  const birth = useAsync(() => api.funnelDetail('birth_data_done', from, to), [from, to]);
  const [comparing, setComparing] = useState(true);
  const before = previousPeriod(period);
  const prevFunnel = useAsync(
    () => (comparing ? api.funnel(before.from, before.to) : Promise.resolve([])),
    [comparing, before.from, before.to],
  );
  const times = useAsync(() => api.stepTimes(ONBOARDING.map((s) => s.key), from, to), [from, to]);
  const counts = new Map((funnel.data ?? []).map((r) => [r.step, Number(r.people)]));
  const prevCounts = new Map((prevFunnel.data ?? []).map((r) => [r.step, Number(r.people)]));
  const secs = new Map((times.data ?? []).map((r) => [r.step, Number(r.median_seconds)]));
  const rows = (steps: Step[], withTimes = false) =>
    steps.map((s) => ({
      label: s.label,
      hint: s.hint,
      people: counts.get(s.key) ?? 0,
      prev: comparing ? (prevCounts.get(s.key) ?? 0) : undefined,
      seconds: withTimes ? secs.get(s.key) : undefined,
    }));

  return (
    <div className="stack">
      <div className="row-between">
        <p className="muted">
          Personas distintas que dieron cada paso en el rango. Una persona cuenta una vez por paso. Sin el equipo ni el
          robot de pruebas.
        </p>
        <div className="period">
          <label className="check">
            <input type="checkbox" checked={comparing} onChange={(e) => setComparing(e.target.checked)} />
            Comparar con el periodo anterior
          </label>
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>
      </div>
      {funnel.error && <ErrorNote>{funnel.error}</ErrorNote>}
      <Section title="Onboarding: dónde se va la gente">
        {funnel.loading ? <Loading /> : <FunnelRows rows={rows(ONBOARDING, true)} comparing={comparing} />}
        {comparing && (
          <p className="note">
            El borde detrás de cada barra es el periodo anterior ({shortDay(before.from)} al {shortDay(before.to)}), con los mismos días.
          </p>
        )}
      </Section>
      <Section title="De dónde llegan">
        {bySource.error && <ErrorNote>{bySource.error}</ErrorNote>}
        {bySource.loading ? <Loading /> : <SourceTable rows={bySource.data ?? []} />}
        <p className="note">
          El origen sale de la etiqueta del link y, si no trae, del navegador o la página desde donde llegó (desde el 22
          de octubre).
        </p>
      </Section>
      <div className="grid-2">
        <Section title="Celular o computador">
          {devices.loading ? <Loading /> : <DetailTable rows={devices.data ?? []} name={deviceLabel} />}
        </Section>
        <Section title="En los datos de nacimiento">
          {birth.loading ? (
            <Loading />
          ) : (
            <DetailTable rows={birth.data ?? []} name={(d) => label(BIRTH_HOUR, d)} />
          )}
          <p className="note">
            Escribieron una ciudad y no apareció en la lista: <b>{int(counts.get('birth_city_not_found') ?? 0)}</b>{' '}
            {counts.get('birth_city_not_found') === 1 ? 'persona' : 'personas'} (desde el 22 de octubre).
          </p>
        </Section>
      </div>
      <div className="grid-2">
        <Section title="Uso después del onboarding">
          {funnel.loading ? <Loading /> : <FunnelRows rows={rows(USE)} comparing={comparing} />}
          <p className="note">
            Pronto: si vuelven al día siguiente, a la semana y al mes, qué usan cada semana y cómo califican las prácticas.
          </p>
        </Section>
        <Section title="Pago">
          {funnel.loading ? <Loading /> : <FunnelRows rows={rows(MONEY)} comparing={comparing} />}
          <h3 className="h-sub">Dónde vieron Premium</h3>
          {places.loading ? (
            <Loading />
          ) : (
            <table className="table">
              <tbody>
                {(places.data ?? [])
                  .sort((a, b) => Number(b.people) - Number(a.people))
                  .map((p) => (
                    <tr key={p.detail}>
                      <td>{label(PAYWALL_PLACE, p.detail)}</td>
                      <td className="num">{int(Number(p.people))}</td>
                    </tr>
                  ))}
                {(places.data ?? []).length === 0 && (
                  <tr>
                    <td className="muted">Nadie en este rango.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}

/** Rows of one detail, most people first, with their share. */
function DetailTable({ rows, name }: { rows: { detail: string; people: number }[]; name: (d: string) => string }) {
  const total = rows.reduce((n, r) => n + Number(r.people), 0);
  if (total === 0) return <p className="muted">Nadie en este rango.</p>;
  return (
    <table className="table">
      <tbody>
        {[...rows]
          .sort((a, b) => Number(b.people) - Number(a.people))
          .map((r) => (
            <tr key={r.detail}>
              <td>{name(r.detail)}</td>
              <td className="num">{int(Number(r.people))}</td>
              <td className="num muted">{Math.round((Number(r.people) / total) * 100)}%</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

const SOURCE_STEPS = [
  { key: 'onboarding_started', label: 'Empezaron' },
  { key: 'soul_map_seen', label: 'Vieron su mapa' },
  { key: 'account_created', label: 'Crearon cuenta' },
  { key: 'trial_started', label: 'Mes gratis' },
] as const;

/** The funnel by origin: one row per origin, the main steps across. */
function SourceTable({ rows }: { rows: { source: string; step: string; people: number }[] }) {
  const by = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = by.get(r.source) ?? new Map<string, number>();
    m.set(r.step, Number(r.people));
    by.set(r.source, m);
  }
  const sources = [...by.keys()]
    .filter((s) => (by.get(s)?.get('onboarding_started') ?? 0) > 0 || (by.get(s)?.get('account_created') ?? 0) > 0)
    .sort((a, b) => (by.get(b)?.get('onboarding_started') ?? 0) - (by.get(a)?.get('onboarding_started') ?? 0));
  if (sources.length === 0) return <p className="muted">Nadie en este rango.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Origen</th>
            {SOURCE_STEPS.map((s) => (
              <th key={s.key} className="num">
                {s.label}
              </th>
            ))}
            <th className="num">Cuenta / empezaron</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((src) => {
            const m = by.get(src)!;
            const started = m.get('onboarding_started') ?? 0;
            const accounts = m.get('account_created') ?? 0;
            return (
              <tr key={src}>
                <td>{SOURCE[src] ?? src}</td>
                {SOURCE_STEPS.map((s) => (
                  <td key={s.key} className="num">
                    {int(m.get(s.key) ?? 0)}
                  </td>
                ))}
                <td className="num muted">{started > 0 ? `${Math.round((accounts / started) * 100)}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
