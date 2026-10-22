import { useState } from 'react';
import { api, type Hourly } from '../api';
import { dayIso, int, shortDay, usd } from '../format';
import { PURPOSE, SURFACE, label } from '../labels';
import { DayBars, ErrorNote, Loading, Range, Section, Stat, useAsync } from '../ui';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

export function Overview() {
  const [days, setDays] = useState(30);
  const overview = useAsync(() => api.overview(), []);
  const daily = useAsync(() => api.daily(days), [days]);
  const spend = useAsync(() => api.spend(days), [days]);
  const crisis = useAsync(() => api.crisis(days), [days]);
  const [hoursAgo, setHoursAgo] = useState(0);
  const hourly = useAsync(() => api.hourly(dayIso(hoursAgo)), [hoursAgo]);
  const o = overview.data;

  const spendByDay = new Map<string, number>();
  const spendByPurpose = new Map<string, { calls: number; failed: number; cost: number }>();
  for (const r of spend.data ?? []) {
    spendByDay.set(r.day, (spendByDay.get(r.day) ?? 0) + Number(r.cost_usd));
    const p = spendByPurpose.get(r.purpose) ?? { calls: 0, failed: 0, cost: 0 };
    p.calls += Number(r.calls);
    p.failed += Number(r.failed);
    p.cost += Number(r.cost_usd);
    spendByPurpose.set(r.purpose, p);
  }
  const crisisBySurface = new Map<string, { high: number; low: number; notTheirs: number }>();
  for (const r of crisis.data ?? []) {
    const c = crisisBySurface.get(r.surface) ?? { high: 0, low: 0, notTheirs: 0 };
    if (r.severity === 'high') c.high += Number(r.alerts);
    else c.low += Number(r.alerts);
    c.notTheirs += Number(r.not_their_case);
    crisisBySurface.set(r.surface, c);
  }
  const days_ = daily.data ?? [];

  return (
    <div className="stack">
      {overview.error && <ErrorNote>{overview.error}</ErrorNote>}
      <div className="stats">
        <Stat label="Personas con cuenta" value={o ? int(o.accounts) : '…'} note={o ? `${int(o.accounts_7d)} nuevas en 7 días` : null} />
        <Stat label="Usaron la app en 7 días" value={o ? int(o.active_7d) : '…'} note="Solo personas con cuenta" />
        <Stat label="Pagando" value={o ? int(o.premium_paying) : '…'} note={o ? `Con al menos un cobro · ${int(o.premium_gifted)} con Premium regalado` : null} />
        <Stat label="En mes gratis" value={o ? int(o.premium_trial) : '…'} note="Empezaron Premium y aún no hay cobro" />
        <Stat label="Gasto en IA este mes" value={o ? usd(o.ai_spend_month) : '…'} />
        <a className="stat-link" href="#alertas">
          <Stat label="Alertas de crisis en 7 días" value={o ? int(o.crisis_alerts_7d) : '…'} note="Ver quién y cuándo →" />
        </a>
        <Stat label="Sesiones sin cuenta" value={o ? int(o.anonymous) : '…'} note="Entraron y no crearon cuenta" />
      </div>

      <p className="note">Sin el equipo (admins) ni el robot de pruebas.</p>

      <div className="row-between">
        <h2 className="h-section">Hora por hora</h2>
        <Range
          value={hoursAgo}
          onChange={setHoursAgo}
          options={[
            { days: 0, label: 'Hoy' },
            { days: 1, label: 'Ayer' },
          ]}
        />
      </div>
      <Section title="Empezaron, vieron su mapa y crearon cuenta">
        {hourly.error && <ErrorNote>{hourly.error}</ErrorNote>}
        {hourly.loading ? (
          <Loading />
        ) : (
          <HourTable rows={hourly.data ?? []} />
        )}
      </Section>

      <div className="row-between">
        <h2 className="h-section">Por día</h2>
        <Range value={days} onChange={setDays} options={RANGES} />
      </div>

      <div className="grid-3">
        <Section title="Empezaron el onboarding">
          {daily.loading ? <Loading /> : <DayBars rows={days_.map((d) => ({ label: shortDay(d.day), value: Number(d.started) }))} />}
        </Section>
        <Section title="Crearon cuenta">
          {daily.loading ? <Loading /> : <DayBars rows={days_.map((d) => ({ label: shortDay(d.day), value: Number(d.accounts) }))} />}
        </Section>
        <Section title="Abrieron la app">
          {daily.loading ? <Loading /> : <DayBars rows={days_.map((d) => ({ label: shortDay(d.day), value: Number(d.opened) }))} />}
        </Section>
      </div>
      {daily.error && <ErrorNote>{daily.error}</ErrorNote>}

      <div className="grid-2">
        <Section title="Gasto en IA por día">
          {spend.loading ? (
            <Loading />
          ) : (
            <>
              <DayBars
                format={usd}
                rows={days_.map((d) => ({ label: shortDay(d.day), value: spendByDay.get(d.day) ?? 0 }))}
              />
              <table className="table">
                <thead>
                  <tr>
                    <th>En qué</th>
                    <th className="num">Respuestas</th>
                    <th className="num">Fallidas</th>
                    <th className="num">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {[...spendByPurpose.entries()]
                    .sort((a, b) => b[1].cost - a[1].cost)
                    .map(([purpose, p]) => (
                      <tr key={purpose}>
                        <td>{label(PURPOSE, purpose)}</td>
                        <td className="num">{int(p.calls)}</td>
                        <td className="num">{int(p.failed)}</td>
                        <td className="num">{usd(p.cost)}</td>
                      </tr>
                    ))}
                  {spendByPurpose.size === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">Sin uso en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          {spend.error && <ErrorNote>{spend.error}</ErrorNote>}
        </Section>

        <Section
          title="Alertas de crisis"
          aside={
            <a className="link small" href="#alertas">
              Ver quién y cuándo →
            </a>
          }
        >
          {crisis.loading ? (
            <Loading />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Dónde</th>
                  <th className="num">Altas</th>
                  <th className="num">Bajas</th>
                  <th className="num">«No es mi caso»</th>
                </tr>
              </thead>
              <tbody>
                {[...crisisBySurface.entries()].map(([surface, c]) => (
                  <tr key={surface}>
                    <td>{label(SURFACE, surface)}</td>
                    <td className="num">{int(c.high)}</td>
                    <td className="num">{int(c.low)}</td>
                    <td className="num">{int(c.notTheirs)}</td>
                  </tr>
                ))}
                {crisisBySurface.size === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">Sin alertas en este rango.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {crisis.error && <ErrorNote>{crisis.error}</ErrorNote>}
        </Section>
      </div>
    </div>
  );
}

/** The hours with somebody in them, then the day's totals of people per hour. */
function HourTable({ rows }: { rows: Hourly[] }) {
  const live = rows.filter((r) => Number(r.started) + Number(r.map_seen) + Number(r.accounts) > 0);
  if (live.length === 0) return <p className="muted">Nadie todavía en este día.</p>;
  const sum = (k: 'started' | 'map_seen' | 'accounts') => live.reduce((n, r) => n + Number(r[k]), 0);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Hora</th>
            <th className="num">Empezaron</th>
            <th className="num">Vieron su mapa</th>
            <th className="num">Crearon cuenta</th>
          </tr>
        </thead>
        <tbody>
          {live.map((r) => (
            <tr key={r.hour}>
              <td>{`${String(r.hour).padStart(2, '0')}:00`}</td>
              <td className="num">{int(Number(r.started))}</td>
              <td className="num">{int(Number(r.map_seen))}</td>
              <td className="num">{int(Number(r.accounts))}</td>
            </tr>
          ))}
          <tr>
            <td><b>Total del día</b></td>
            <td className="num"><b>{int(sum('started'))}</b></td>
            <td className="num"><b>{int(sum('map_seen'))}</b></td>
            <td className="num"><b>{int(sum('accounts'))}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
