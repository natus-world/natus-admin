import { useState } from 'react';
import { api, type ByModality, type Retention } from '../api';
import { dayIso, int, shortDay } from '../format';
import { ErrorNote, Loading, PeriodPicker, Section, Stat, presetPeriod, useAsync } from '../ui';

/** A window of days after the account was made: [from, to]; `null` is open-ended (after 30). */
const WINDOWS: { key: keyof Retention; label: string; from: number; to: number | null }[] = [
  { key: 'back_d1', label: 'Al día siguiente', from: 1, to: 1 },
  { key: 'back_w1', label: 'Días 1 a 7', from: 1, to: 7 },
  { key: 'back_w2', label: 'Días 8 a 14', from: 8, to: 14 },
  { key: 'back_m1', label: 'Días 15 a 30', from: 15, to: 30 },
  { key: 'back_after', label: 'Después del día 30', from: 31, to: 31 },
];

const FIRST: Record<string, string> = {
  chat: 'Le escribió a Davraz',
  practica: 'Marcó una práctica',
  bitacora: 'Escribió en la bitácora',
  nada: 'Nada todavía (en 7 días)',
};

/** Days since a YYYY-MM-DD, in Santiago. */
function daysSince(iso: string): number {
  return Math.round((new Date(`${dayIso(0)}T12:00:00Z`).getTime() - new Date(`${iso}T12:00:00Z`).getTime()) / 86_400_000);
}

const pctOf = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');

export function Use() {
  const retention = useAsync(() => api.retention(12), []);
  const weekly = useAsync(() => api.weeklyUse(8), []);
  const [period, setPeriod] = useState(() => presetPeriod('30'));
  const first = useAsync(() => api.firstAction(period.from, period.to), [period.from, period.to]);
  const [therapyPeriod, setTherapyPeriod] = useState(() => presetPeriod('todo'));
  const therapies = useAsync(
    () => api.byModality(therapyPeriod.from, therapyPeriod.to),
    [therapyPeriod.from, therapyPeriod.to],
  );

  const rows = retention.data ?? [];
  // Only weeks whose 7 days have fully passed (the youngest account is 7 days old).
  const ripe = (r: Retention, lastDay: number) => daysSince(r.week_start) - 6 >= lastDay;
  const sum = (k: keyof Retention, lastDay: number) =>
    rows.filter((r) => ripe(r, lastDay)).reduce((n, r) => n + Number(r[k]), 0);
  const base = (lastDay: number) => sum('accounts', lastDay);

  return (
    <div className="stack">
      <p className="muted">
        Solo personas con cuenta, sin el equipo ni el robot de pruebas. «Activada»: en sus primeros 7 días marcó una práctica,
        le escribió a Davraz o escribió en la bitácora.
      </p>
      {retention.error && <ErrorNote>{retention.error}</ErrorNote>}
      <div className="stats">
        <Stat
          label="Activadas a 7 días"
          value={retention.loading ? '…' : pctOf(sum('activated', 7), base(7))}
          note={`De ${int(base(7))} cuentas con 7 días cumplidos`}
        />
        <Stat
          label="Vuelven al día siguiente"
          value={retention.loading ? '…' : pctOf(sum('back_d1', 1), base(1))}
          note={`De ${int(base(1))} cuentas`}
        />
        <Stat
          label="Vuelven en la primera semana"
          value={retention.loading ? '…' : pctOf(sum('back_w1', 7), base(7))}
          note="Abrieron la app entre el día 1 y el 7"
        />
        <Stat
          label="Vuelven después del día 30"
          value={retention.loading ? '…' : pctOf(sum('back_after', 31), base(31))}
          note={base(31) === 0 ? 'Todavía no hay cuentas con 31 días' : `De ${int(base(31))} cuentas`}
        />
      </div>

      <Section title="Vuelven, por semana en que crearon su cuenta">
        {retention.loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="muted">Todavía no hay cuentas.</p>
        ) : (
          <div className="table-wrap">
            <table className="table heat">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th className="num">Cuentas</th>
                  <th className="num">Activadas</th>
                  {WINDOWS.map((w) => (
                    <th key={w.key} className="num">
                      {w.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.week_start}>
                    <td>Desde el {shortDay(r.week_start)}</td>
                    <td className="num">{int(Number(r.accounts))}</td>
                    <Cell n={Number(r.activated)} of={Number(r.accounts)} ripe={ripe(r, 7)} />
                    {WINDOWS.map((w) => (
                      <Cell key={w.key} n={Number(r[w.key])} of={Number(r.accounts)} ripe={ripe(r, w.to ?? 31)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">
          % de las cuentas de esa semana que abrieron la app en esos días. «…» es una ventana que todavía no termina para
          esa semana.
        </p>
      </Section>

      <Section title="Qué usan cada semana">
        {weekly.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="table heat">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th className="num">Activas</th>
                  <th className="num">Prácticas</th>
                  <th className="num">Davraz</th>
                  <th className="num">Bitácora</th>
                  <th className="num">Meditar</th>
                  <th className="num">Comparar</th>
                </tr>
              </thead>
              <tbody>
                {[...(weekly.data ?? [])].reverse().map((w) => (
                  <tr key={w.week_start}>
                    <td>{shortDay(w.week_start)}</td>
                    <td className="num">{int(Number(w.active))}</td>
                    {(['practices', 'chat', 'journal', 'meditations', 'comparisons'] as const).map((k) => (
                      <Cell key={k} n={Number(w[k])} of={Number(w.active)} ripe />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">% de las personas con cuenta que abrieron la app esa semana.</p>
      </Section>
      <div className="row-between">
        <h2 className="h-section">Les hace sentido, por terapia</h2>
        <PeriodPicker value={therapyPeriod} onChange={setTherapyPeriod} />
      </div>
      <Section title="Desde que se recomienda hasta cómo califican sus prácticas">
        {therapies.error && <ErrorNote>{therapies.error}</ErrorNote>}
        {therapies.loading ? <Loading /> : <TherapyTable rows={therapies.data ?? []} />}
        <p className="note">
          «La guardaron» y «No me hace sentido» son % de las personas a las que se les recomendó. La nota es el promedio de
          1 a 5 de las prácticas que salen de esa terapia; con pocas calificaciones (n) es solo una pista. Las calificaciones
          se unen a su terapia desde el 22 de octubre (las anteriores, solo cuando el título era inequívoco).
        </p>
      </Section>

      <div className="row-between">
        <h2 className="h-section">Lo primero que hacen</h2>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>
      <Section title="En sus primeros 7 días">
        {first.loading ? <Loading /> : <FirstTable rows={first.data ?? []} />}
        <p className="note">Cuentas creadas en el rango: lo primero que hicieron en sus primeros 7 días.</p>
      </Section>
    </div>
  );
}

/** A share, shaded by its size; «…» while its window has not passed. */
function Cell({ n, of, ripe }: { n: number; of: number; ripe: boolean }) {
  if (!ripe) return <td className="num muted">…</td>;
  if (of === 0) return <td className="num muted">—</td>;
  const share = n / of;
  return (
    <td className="num" style={{ background: `rgb(201 168 118 / ${(0.06 + share * 0.5).toFixed(2)})` }} title={`${n} de ${of}`}>
      {Math.round(share * 100)}%
    </td>
  );
}

function FirstTable({ rows }: { rows: { action: string; people: number }[] }) {
  const total = rows.reduce((n, r) => n + Number(r.people), 0);
  if (total === 0) return <p className="muted">Nadie creó cuenta en este rango.</p>;
  return (
    <table className="table">
      <tbody>
        {[...rows]
          .sort((a, b) => Number(b.people) - Number(a.people))
          .map((r) => (
            <tr key={r.action}>
              <td>{FIRST[r.action] ?? r.action}</td>
              <td className="num">{int(Number(r.people))}</td>
              <td className="num muted">{Math.round((Number(r.people) / total) * 100)}%</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function TherapyTable({ rows }: { rows: ByModality[] }) {
  const shown = rows.filter((r) => Number(r.recommended) + Number(r.marked) + Number(r.saved) + Number(r.dismissed) > 0);
  if (shown.length === 0) return <p className="muted">Nada en este rango.</p>;
  const share = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Terapia</th>
            <th className="num">Recomendada a</th>
            <th className="num">La guardaron</th>
            <th className="num">«No me hace sentido»</th>
            <th className="num">Marcaron una práctica</th>
            <th className="num">Nota de sus prácticas</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const rec = Number(r.recommended);
            const dismissed = Number(r.dismissed);
            const ratings = Number(r.ratings);
            return (
              <tr key={r.slug}>
                <td>{r.name}</td>
                <td className="num">{int(rec)}</td>
                <td className="num">{share(Number(r.saved), rec)}</td>
                <td className="num">{share(dismissed, rec)}</td>
                <td className="num">{int(Number(r.marked))}</td>
                <td className="num">
                  {r.avg_rating === null ? (
                    <span className="muted">sin notas</span>
                  ) : (
                    <>
                      {String(r.avg_rating).replace('.', ',')} <span className="muted small">n {int(ratings)}</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
