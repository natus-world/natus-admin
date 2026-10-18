import { useState } from 'react';
import { api } from '../api';
import { dayIso, int } from '../format';
import { MONEY, ONBOARDING, PAYWALL_PLACE, USE, label, type Step } from '../labels';
import { ErrorNote, FunnelRows, Loading, Range, Section, useAsync } from '../ui';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 3650, label: 'Todo' },
];

export function Funnel() {
  const [days, setDays] = useState(30);
  const from = dayIso(days - 1);
  const to = dayIso(0);
  const funnel = useAsync(() => api.funnel(from, to), [from, to]);
  const places = useAsync(() => api.funnelDetail('paywall_seen', from, to), [from, to]);
  const counts = new Map((funnel.data ?? []).map((r) => [r.step, Number(r.people)]));
  const rows = (steps: Step[]) => steps.map((s) => ({ label: s.label, hint: s.hint, people: counts.get(s.key) ?? 0 }));

  return (
    <div className="stack">
      <div className="row-between">
        <p className="muted">
          Personas distintas que dieron cada paso en el rango. Una persona cuenta una vez por paso.
        </p>
        <Range value={days} onChange={setDays} options={RANGES} />
      </div>
      {funnel.error && <ErrorNote>{funnel.error}</ErrorNote>}
      <Section title="Onboarding: dónde se va la gente">
        {funnel.loading ? <Loading /> : <FunnelRows rows={rows(ONBOARDING)} />}
      </Section>
      <div className="grid-2">
        <Section title="Uso después del onboarding">
          {funnel.loading ? <Loading /> : <FunnelRows rows={rows(USE)} />}
          <p className="note">
            Pronto: si vuelven al día siguiente, a la semana y al mes, qué usan cada semana y cómo califican las prácticas.
          </p>
        </Section>
        <Section title="Pago">
          {funnel.loading ? <Loading /> : <FunnelRows rows={rows(MONEY)} />}
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
