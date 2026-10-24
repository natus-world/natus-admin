import { useState } from 'react';
import { api } from '../api';
import { Def, Few, Funnel, HBars, Kpi, Delta, type FunnelBar } from '../charts';
import { dateTime, int } from '../format';
import { BIRTH_HOUR, ONBOARDING, SOURCE, deviceLabel, label } from '../labels';
import { ErrorNote, duration, useAsync, type Period } from '../ui';
import { Card, Head, prevOf, share, pctText, type ViewProps } from './views';

/** The onboarding as the panel draws it: the steps in order, the welcome offer before Caminos. */
export function useOnboarding(period: Period, compare: boolean) {
  const prev = prevOf(period);
  const now = useAsync(() => api.funnel(period.from, period.to), [period.from, period.to]);
  const before = useAsync(
    () => (compare ? api.funnel(prev.from, prev.to) : Promise.resolve([])),
    [prev.from, prev.to, compare],
  );
  const offer = useAsync(() => api.funnelDetail('paywall_seen', period.from, period.to), [period.from, period.to]);
  const offerBefore = useAsync(
    () => (compare ? api.funnelDetail('paywall_seen', prev.from, prev.to) : Promise.resolve([])),
    [prev.from, prev.to, compare],
  );
  const c = new Map((now.data ?? []).map((r) => [r.step, Number(r.people)]));
  const b = new Map((before.data ?? []).map((r) => [r.step, Number(r.people)]));
  const welcome = (rows: { detail: string; people: number }[] | undefined) =>
    Number((rows ?? []).find((r) => r.detail === 'welcome')?.people ?? 0);
  const steps: { key: string; label: string }[] = [];
  for (const s of ONBOARDING) {
    if (s.key === 'paths_seen') steps.push({ key: 'welcome_offer', label: 'Vio la oferta de Premium' });
    steps.push({ key: s.key, label: s.label });
  }
  const rows: (FunnelBar & { key: string })[] = steps.map((s) => ({
    key: s.key,
    label: s.label,
    people: s.key === 'welcome_offer' ? welcome(offer.data) : c.get(s.key) ?? 0,
    prev: compare ? (s.key === 'welcome_offer' ? welcome(offerBefore.data) : b.get(s.key) ?? 0) : null,
  }));
  return {
    rows,
    counts: c,
    before: b,
    loading: now.loading,
    error: now.error ?? offer.error,
  };
}

/** The step that lost the most people compared with its step before, against the period before when there is one. */
export function worstStep(rows: (FunnelBar & { key: string })[]) {
  // Where the most people left, counted in people: a small step losing half
  // of three people is not the problem of the day.
  let pick: { i: number; drop: number } | null = null;
  rows.forEach((r, i) => {
    const before = rows[i - 1];
    if (!i || !before || !before.people || r.people === null) return;
    const drop = before.people - r.people;
    if (drop > 0 && (!pick || drop > pick.drop)) pick = { i, drop };
  });
  if (!pick) return null;
  const { i } = pick as { i: number; drop: number };
  const r = rows[i]!;
  const before = rows[i - 1]!;
  return {
    from: before.label,
    to: r.label,
    lost: (before.people ?? 0) - (r.people ?? 0),
    of: before.people ?? 0,
    pct: share((before.people ?? 0) - (r.people ?? 0), before.people ?? 0),
    prevPct: before.prev && r.prev != null ? share(before.prev - r.prev, before.prev) : null,
  };
}

export function Llegan({ period, compare, onOpenPerson }: ViewProps) {
  const prev = prevOf(period);
  const ob = useOnboarding(period, compare);
  const [step, setStep] = useState<number | null>(null);
  const bySource = useAsync(() => api.funnelBySource(period.from, period.to), [period.from, period.to]);
  const devices = useAsync(() => api.funnelDetail('onboarding_started', period.from, period.to), [period.from, period.to]);
  const birth = useAsync(() => api.funnelDetail('birth_data_done', period.from, period.to), [period.from, period.to]);
  const city = useAsync(() => api.birthCity(period.from, period.to), [period.from, period.to]);
  const toAccount = useAsync(
    () => api.stepTimes(['onboarding_started', 'account_created'], period.from, period.to),
    [period.from, period.to],
  );
  const times = useAsync(
    () => api.stepTimes(['onboarding_started', 'soul_map_seen', 'account_created', 'paths_seen'], period.from, period.to),
    [period.from, period.to],
  );
  const friends = useAsync(() => api.friends(period.from, period.to), [period.from, period.to]);
  const friendsBefore = useAsync(
    () => (compare ? api.friends(prev.from, prev.to) : Promise.resolve(null)),
    [prev.from, prev.to, compare],
  );
  const inviters = useAsync(() => api.topInviters(period.from, period.to), [period.from, period.to]);

  const started = ob.counts.get('onboarding_started') ?? 0;
  const accounts = ob.counts.get('account_created') ?? 0;
  const paths = ob.counts.get('paths_seen') ?? 0;
  const startedB = ob.before.get('onboarding_started');
  const accountsB = ob.before.get('account_created');
  const pathsB = ob.before.get('paths_seen');
  const worst = worstStep(ob.rows);
  const toAcc = toAccount.data?.find((r) => r.step === 'account_created');

  // Per source: started, made an account, reached Caminos.
  const src = new Map<string, { started: number; accounts: number; paths: number }>();
  for (const r of bySource.data ?? []) {
    const k = r.source ?? '';
    const e = src.get(k) ?? { started: 0, accounts: 0, paths: 0 };
    if (r.step === 'onboarding_started') e.started = Number(r.people);
    if (r.step === 'account_created') e.accounts = Number(r.people);
    if (r.step === 'soul_map_seen') e.paths = Number(r.people);
    src.set(k, e);
  }
  const sources = [...src.entries()].filter(([, v]) => v.started > 0).sort((a, b) => b[1].started - a[1].started);
  const bestSource = sources.filter(([, v]) => v.started >= 30).sort((a, b) => b[1].accounts / b[1].started - a[1].accounts / a[1].started)[0];

  const deviceRows = (devices.data ?? []).map((d) => ({ label: deviceLabel(d.detail), value: Number(d.people) })).sort((a, b) => b.value - a.value);
  const deviceTotal = deviceRows.reduce((s, r) => s + r.value, 0);
  const birthRows = (birth.data ?? []).map((d) => ({ label: label(BIRTH_HOUR, d.detail), value: Number(d.people) })).sort((a, b) => b.value - a.value);
  const birthTotal = birthRows.reduce((s, r) => s + r.value, 0);

  const f = friends.data;
  const fb = friendsBefore.data;
  const per100 = f && f.accounts > 0 ? (f.new_by_invite / f.accounts) * 100 : null;

  const picked = step !== null ? ob.rows[step] : null;
  const pickedBefore = step !== null ? ob.rows[step - 1] : null;

  return (
    <section className="page">
      <Head
        kick="¿Llegan?"
        em="adquisición e ingreso"
        title={worst && worst.lost > 0 ? `Llegan ${int(started)}, y se va más gente en «${worst.to}»` : `Llegan ${int(started)} personas`}
        answer={
          <>
            De <b>{int(started)}</b> que empezaron, <b>{int(accounts)}</b> crearon su cuenta ({pctText(share(accounts, started))}) y{' '}
            <b>{int(paths)}</b> llegaron a sus Caminos ({pctText(share(paths, started))}).
          </>
        }
      />
      {ob.error && <ErrorNote>{ob.error}</ErrorNote>}

      <div className="grid g4">
        <Card>
          <Kpi label="Empezaron el ingreso" value={int(started)} ctx={compare && <Delta now={started} before={startedB} />} />
        </Card>
        <Card>
          <Kpi
            label="Crearon su cuenta"
            def="Guardaron su mapa con Google o con el código del correo."
            value={pctText(share(accounts, started))}
            ctx={
              <>
                <span>
                  {int(accounts)} de {int(started)}
                </span>
                {compare && startedB ? <Delta now={share(accounts, started) ?? 0} before={share(accountsB ?? 0, startedB)} points /> : null}
              </>
            }
          />
        </Card>
        <Card>
          <Kpi
            label="Llegaron a sus Caminos"
            value={pctText(share(paths, started))}
            ctx={
              <>
                <span>
                  {int(paths)} de {int(started)}
                </span>
                {compare && startedB ? <Delta now={share(paths, started) ?? 0} before={share(pathsB ?? 0, startedB)} points /> : null}
              </>
            }
          />
        </Card>
        <Card>
          <Kpi
            label="Tiempo hasta crear la cuenta"
            def="Mediana: la mitad tarda menos y la mitad más. Desde «Empezar» hasta guardar el mapa."
            value={toAcc ? duration(Number(toAcc.median_seconds)) : '—'}
            ctx={toAcc ? `${int(Number(toAcc.people))} personas` : 'sin datos en el periodo'}
          />
        </Card>
      </div>

      <Card
        title={worst && worst.lost > 0 ? `Ingreso paso a paso: la caída más grande está en «${worst.to}»` : 'Ingreso paso a paso'}
        sub={`Toca un paso para ver cuántos se fueron ahí y cuánto tardan.${compare ? ' El contorno punteado es el periodo anterior, a la misma escala.' : ''}`}
      >
        <Funnel rows={ob.rows} compare={compare} onPick={setStep} />
      </Card>

      {picked && pickedBefore && (
        <Card
          title={`${pickedBefore.label} → ${picked.label}`}
          aside={
            <button type="button" className="btn ghost" onClick={() => setStep(null)}>
              Cerrar
            </button>
          }
        >
          <StepDetail
            period={period}
            from={stepKey(ob.rows, step! - 1)}
            to={stepKey(ob.rows, step!)}
            before={pickedBefore.people ?? 0}
            after={picked.people ?? 0}
            prevBefore={pickedBefore.prev ?? null}
            prevAfter={picked.prev ?? null}
          />
        </Card>
      )}

      <div className="grid g2">
        <Card
          title={bestSource ? `De dónde llegan: ${label(SOURCE, bestSource[0])} convierte mejor` : 'De dónde llegan'}
          sub="Ordenado por cuántos empezaron"
        >
          {bySource.error && <ErrorNote>{bySource.error}</ErrorNote>}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Origen</th>
                  <th className="r">Empezaron</th>
                  <th className="r">Vieron su mapa</th>
                  <th className="r">Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      {label(SOURCE, k)} <Few n={v.started} />
                    </td>
                    <td className="r">
                      <span className="inbar" style={{ width: `${(v.started / (sources[0]?.[1].started || 1)) * 60}px` }} />
                      {int(v.started)}
                    </td>
                    <td className="r">{pctText(share(v.paths, v.started))}</td>
                    <td className="r">{pctText(share(v.accounts, v.started))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">«Pocos datos»: menos de 30 personas, el porcentaje todavía puede cambiar mucho.</p>
        </Card>
        <Card title="Desde qué lo abren" sub="El primer paso de cada persona">
          <HBars rows={deviceRows.map((r) => ({ ...r, text: pctText(share(r.value, deviceTotal)), tip: `${r.label}: ${int(r.value)}` }))} />
          <div className="chead" style={{ marginTop: 6 }}>
            <div>
              <h2>Cómo dan su nacimiento</h2>
            </div>
          </div>
          <HBars rows={birthRows.map((r) => ({ ...r, text: pctText(share(r.value, birthTotal)), tip: `${r.label}: ${int(r.value)}` }))} />
        </Card>
      </div>

      <Card
        title={
          per100 !== null
            ? `Invitaciones: cada 100 cuentas traen ${per100.toFixed(1).replace('.', ',')} personas nuevas`
            : 'Invitaciones'
        }
        sub="Personas que llegaron a Natus por el link de un amigo para comparar sus cartas"
        aside={<span className="tag new">«Llegaron nuevas» es una estimación por fechas</span>}
      >
        {friends.error && <ErrorNote>{friends.error}</ErrorNote>}
        {f && (
          <div className="grid g4 inner">
            <Kpi label="Compartieron su link" value={int(f.shared)} ctx={compare && fb && <Delta now={f.shared} before={fb.shared} />} />
            <Kpi label="Les aceptaron una invitación" value={int(f.accepted)} ctx={`${int(f.befriended)} amistades nuevas`} />
            <Kpi
              label="Llegaron nuevas por una invitación"
              def="Personas que empezaron Natus menos de un día antes de aceptar la invitación de un amigo. Es una estimación hasta que el link marque su origen."
              value={int(f.new_by_invite)}
              ctx={compare && fb && <Delta now={f.new_by_invite} before={fb.new_by_invite} />}
            />
            <Kpi
              label="Por cada 100 cuentas"
              def="Personas nuevas que llegaron por invitación ÷ cuentas creadas en el periodo × 100."
              value={per100 === null ? '—' : per100.toFixed(1).replace('.', ',')}
              ctx="nuevas por invitación"
            />
          </div>
        )}
        <div className="chead">
          <div>
            <h2>Quiénes más invitan</h2>
            <p className="sub">Toca una persona para abrir su ficha y ver a quién invitó</p>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th className="r">Días que compartió su link</th>
                <th className="r">Le aceptaron</th>
                <th className="r">Llegaron nuevas</th>
                <th className="r">Comparaciones</th>
                <th>Última</th>
              </tr>
            </thead>
            <tbody>
              {(inviters.data ?? []).map((r) => (
                <tr key={r.user_id} className="click" tabIndex={0} onClick={() => onOpenPerson(r.user_id)} onKeyDown={(e) => e.key === 'Enter' && onOpenPerson(r.user_id)}>
                  <td>
                    <b className="w5">{r.name ?? 'Sin nombre'}</b>
                  </td>
                  <td className="r">{int(r.shared)}</td>
                  <td className="r">{int(r.accepted)}</td>
                  <td className="r">{int(r.new_people)}</td>
                  <td className="r">{int(r.comparisons)}</td>
                  <td>{dateTime(r.last_at)}</td>
                </tr>
              ))}
              {inviters.data && inviters.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nadie aceptó una invitación en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card
          title={
            city.data && Number(city.data.did_not_continue) > 0
              ? `${int(city.data.did_not_continue)} ${Number(city.data.did_not_continue) === 1 ? 'persona no encontró su ciudad y no siguió' : 'personas no encontraron su ciudad y no siguieron'}`
              : 'Nadie dejó el ingreso por no encontrar su ciudad'
          }
          sub={city.data ? `${int(city.data.empty_search)} buscaron una ciudad sin resultado; el resto siguió escribiendo y la encontró` : undefined}
        />
        <Card title="Tiempo entre pasos" sub="Mediana">
          <HBars
            rows={[...(times.data ?? [])]
              .sort((a, b) => ['soul_map_seen', 'account_created', 'paths_seen'].indexOf(a.step) - ['soul_map_seen', 'account_created', 'paths_seen'].indexOf(b.step))
              .map((t) => ({
              label: { soul_map_seen: 'Empezar → mapa', account_created: 'Mapa → cuenta', paths_seen: 'Cuenta → Caminos' }[t.step] ?? t.step,
              value: Number(t.median_seconds),
              text: duration(Number(t.median_seconds)),
              tip: `${int(Number(t.people))} personas`,
            }))}
          />
        </Card>
      </div>
      <p className="small muted foot-note">
        <Def text="Personas con cuenta y sesiones sin cuenta que empezaron el ingreso. Se deja fuera al equipo y al robot de pruebas." /> Cuenta
        personas, no visitas.
      </p>
    </section>
  );
}

function stepKey(rows: { key: string }[], i: number) {
  return rows[i]?.key ?? '';
}

/** One step of the onboarding: how many went on, how many left, and how long it takes. */
function StepDetail({ period, from, to, before, after, prevBefore, prevAfter }: {
  period: Period;
  from: string;
  to: string;
  before: number;
  after: number;
  prevBefore: number | null;
  prevAfter: number | null;
}) {
  const measurable = from !== 'welcome_offer' && to !== 'welcome_offer';
  const t = useAsync(
    () => (measurable ? api.stepTimes([from, to], period.from, period.to) : Promise.resolve([])),
    [from, to, period.from, period.to],
  );
  const secs = t.data?.find((r) => r.step === to);
  return (
    <div className="grid g3 inner">
      <Kpi label="Siguieron" value={pctText(share(after, before))} ctx={`${int(after)} de ${int(before)}`} />
      <Kpi
        label="Se fueron aquí"
        value={int(Math.max(0, before - after))}
        ctx={prevBefore !== null && prevAfter !== null ? `antes ${int(Math.max(0, prevBefore - prevAfter))}` : undefined}
      />
      <Kpi
        label="Tardan en este paso"
        def="Mediana del tiempo entre el paso anterior y este, de quienes hicieron los dos."
        value={secs ? duration(Number(secs.median_seconds)) : '—'}
        ctx={measurable ? undefined : 'la oferta no guarda su hora por separado'}
      />
    </div>
  );
}
