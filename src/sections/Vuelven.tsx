import { useState } from 'react';
import { api } from '../api';
import { CohortChart, GrowthChart, HBars, Kpi } from '../charts';
import { dayIso, int } from '../format';
import { MONEY, ONBOARDING, USE } from '../labels';
import { ErrorNote, useAsync } from '../ui';
import { settledCohorts } from './Sirve';
import { Card, Head, share, pctText, weekLabel, type ViewProps } from './views';

const STEP: Record<string, string> = Object.fromEntries(
  [...ONBOARDING, ...USE, ...MONEY, { key: 'birth_city_not_found', label: 'No encontró su ciudad' }].map((s) => [s.key, s.label]),
);

export function Vuelven(_: ViewProps) {
  const growth = useAsync(() => api.growth(12), []);
  const curve = useAsync(() => api.cohortCurve(8), []);
  const retention = useAsync(() => api.retention(12), []);
  const thisWeek = dayIso(0);
  const last = useAsync(() => api.lastSteps(thisWeek), [thisWeek]);
  const [table, setTable] = useState(false);

  const g = growth.data ?? [];
  const now = g[g.length - 1];
  const ratio = now && Number(now.lost) > 0 ? (Number(now.new_people) + Number(now.returned)) / Number(now.lost) : null;
  const cohorts = settledCohorts(retention.data ?? []);
  const acc = cohorts.reduce((s, r) => s + Number(r.accounts), 0);
  const d1 = cohorts.reduce((s, r) => s + Number(r.back_d1), 0);
  const w1 = cohorts.reduce((s, r) => s + Number(r.back_w1), 0);
  const m1 = cohorts.reduce((s, r) => s + Number(r.back_m1), 0);
  const oldest = (retention.data ?? []).find((r) => Number(r.accounts) > 0)?.week_start;
  const monthReady = oldest ? oldest <= dayIso(31) : false;

  const byCohort = new Map<string, number[]>();
  for (const p of curve.data ?? []) {
    const list = byCohort.get(p.cohort) ?? [];
    list[Number(p.week_n)] = Number(p.accounts) ? Math.round((Number(p.active) / Number(p.accounts)) * 100) : 0;
    byCohort.set(p.cohort, list);
  }
  // A week still running is not drawn: its point would look like a drop.
  const cohorts4 = [...byCohort.entries()]
    .map(([k, v]) => ({ label: weekLabel(k), values: v.slice(0, Math.max(1, v.length - 1)) }))
    .filter((c) => c.values.length >= 2)
    .slice(-4);

  const lostRows = (last.data ?? []).map((r) => ({ label: STEP[r.step] ?? r.step, value: Number(r.people) }));
  const lostTotal = lostRows.reduce((s, r) => s + r.value, 0);

  return (
    <section className="page">
      <Head
        kick="¿Vuelven?"
        em="retención"
        title={ratio !== null ? (ratio >= 1 ? 'Sí: llegan o vuelven más de los que se van' : 'Se van más de los que llegan o vuelven') : 'Esta semana nadie se fue'}
        answer={
          ratio !== null ? (
            <>
              Por cada persona que se fue esta semana, <b>llegaron o volvieron {ratio.toFixed(1).replace('.', ',')}</b>.
            </>
          ) : undefined
        }
      />
      {growth.error && <ErrorNote>{growth.error}</ErrorNote>}

      <div className="grid g4">
        <Card>
          <Kpi label="Vuelven al día siguiente" def="De las cuentas con su primera semana cumplida, las que abrieron la app el día después de crearla." value={pctText(share(d1, acc))} ctx={`${int(d1)} de ${int(acc)}`} />
        </Card>
        <Card>
          <Kpi label="Vuelven en su primera semana" def="Abrieron la app entre el día 1 y el 7 después de crear su cuenta." value={pctText(share(w1, acc))} ctx={`${int(w1)} de ${int(acc)}`} />
        </Card>
        <Card>
          <Kpi
            label="Vuelven entre los días 15 y 30"
            value={monthReady ? pctText(share(m1, acc)) : '—'}
            ctx={monthReady ? `${int(m1)} de ${int(acc)}` : 'se mide cuando las primeras cuentas cumplan un mes'}
          />
        </Card>
        <Card>
          <Kpi
            label="Razón de crecimiento"
            def="(Nuevas + las que volvieron) ÷ las que se fueron, en la semana. Bajo 1, Natus se achica aunque lleguen muchos."
            value={ratio === null ? '—' : ratio.toFixed(1).replace('.', ',')}
            ctx={now ? `(${int(now.new_people)} + ${int(now.returned)}) ÷ ${int(now.lost)}` : undefined}
          />
        </Card>
      </div>

      <Card
        title="Contabilidad del crecimiento, por semana"
        sub="Se lee de abajo arriba: siguen + nuevas + volvieron = activas. Bajo la línea, las que se fueron."
        aside={
          <button type="button" className="btn ghost" onClick={() => setTable((t) => !t)}>
            {table ? 'Ver como gráfico' : 'Ver como tabla'}
          </button>
        }
      >
        {table ? (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Semana</th>
                  <th className="r">Siguen</th>
                  <th className="r">Nuevas</th>
                  <th className="r">Volvieron</th>
                  <th className="r">Activas</th>
                  <th className="r">Se fueron</th>
                  <th className="r">Razón</th>
                </tr>
              </thead>
              <tbody>
                {g.map((r) => (
                  <tr key={r.week_start}>
                    <td>{weekLabel(r.week_start)}</td>
                    <td className="r">{int(r.kept)}</td>
                    <td className="r">{int(r.new_people)}</td>
                    <td className="r">{int(r.returned)}</td>
                    <td className="r">
                      <b>{int(Number(r.kept) + Number(r.new_people) + Number(r.returned))}</b>
                    </td>
                    <td className="r">{int(r.lost)}</td>
                    <td className="r">
                      {Number(r.lost) ? ((Number(r.new_people) + Number(r.returned)) / Number(r.lost)).toFixed(1).replace('.', ',') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <GrowthChart
            rows={g.map((r) => ({ kept: Number(r.kept), new_people: Number(r.new_people), returned: Number(r.returned), lost: Number(r.lost) }))}
            labels={g.map((r) => weekLabel(r.week_start))}
          />
        )}
      </Card>

      <div className="grid g21">
        <Card title="Curvas de retención" sub="Qué parte de cada grupo usó la app en cada semana desde que llegó. La semana en curso no se dibuja.">
          {cohorts4.length ? <CohortChart cohorts={cohorts4} /> : <p className="small muted">Hace falta al menos una semana completa después de la llegada.</p>}
        </Card>
        <Card title="Lo último que hicieron quienes se fueron" sub={`${int(lostTotal)} personas que vinieron la semana pasada y esta no`}>
          <HBars rows={lostRows} />
        </Card>
      </div>
    </section>
  );
}
