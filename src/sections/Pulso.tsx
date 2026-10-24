import { api } from '../api';
import { Delta, GrowthChart, Hours, Kpi, Spark } from '../charts';
import { dayIso, int } from '../format';
import { ErrorNote, useAsync } from '../ui';
import { useOnboarding, worstStep } from './Llegan';
import { settledCohorts } from './Sirve';
import { Card, Head, share, pctText, weekLabel, type ViewProps } from './views';

/** The first page: where the problem is today, active people this week, the four questions, the weeks. */
export function Pulso({ period, compare, go }: ViewProps) {
  const ob = useOnboarding(period, compare);
  const growth = useAsync(() => api.growth(8), []);
  const retention = useAsync(() => api.retention(8), []);
  const today = dayIso(0);
  const hourly = useAsync(() => api.hourly(today), [today]);

  const g = growth.data ?? [];
  const active = (r: (typeof g)[number] | undefined) => (r ? Number(r.kept) + Number(r.new_people) + Number(r.returned) : 0);
  const now = g[g.length - 1];
  const before = g[g.length - 2];
  const worst = worstStep(ob.rows);

  const started = ob.counts.get('onboarding_started') ?? 0;
  const accounts = ob.counts.get('account_created') ?? 0;
  const trials = ob.counts.get('trial_started') ?? 0;
  const ret = retention.data ?? [];
  const actShare = (r: (typeof ret)[number]) => share(Number(r.activated), Number(r.accounts)) ?? 0;
  const recent = settledCohorts(ret);
  const actNow = recent.length ? actShare(recent[recent.length - 1]!) : null;
  const actBefore = recent.length > 1 ? actShare(recent[recent.length - 2]!) : null;
  const keptShare = (i: number) => {
    const prevActive = active(g[i - 1]);
    return prevActive ? Math.round((Number(g[i]!.kept) / prevActive) * 100) : 0;
  };
  const keptNow = g.length > 1 ? keptShare(g.length - 1) : null;
  const keptBefore = g.length > 2 ? keptShare(g.length - 2) : null;
  const ratio = now && Number(now.lost) > 0 ? (Number(now.new_people) + Number(now.returned)) / Number(now.lost) : null;

  const hours = Array.from({ length: 24 }, (_, h) => Number(hourly.data?.find((r) => Number(r.hour) === h)?.started ?? 0));
  const nowHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago', hour: '2-digit', hour12: false })) % 24;
  const peak = hours.reduce((best, v, h) => (v > hours[best]! ? h : best), 0);

  const questions = [
    {
      k: 'llegan',
      q: '¿Llegan?',
      lbl: 'Crearon su cuenta',
      num: int(accounts),
      d: compare ? <Delta now={accounts} before={ob.before.get('account_created')} /> : null,
      say: started ? `${pctText(share(accounts, started))} de quienes empiezan guardan su mapa.` : 'Nadie empezó en este periodo.',
      sp: g.map((r) => Number(r.new_people)),
    },
    {
      k: 'sirve',
      q: '¿Les sirve?',
      lbl: 'Activadas en su 1.ª semana',
      num: pctText(actNow),
      d: actNow !== null ? <Delta now={actNow} before={actBefore} points /> : null,
      say: 'Marcaron una práctica, le escribieron a Davraz o escribieron en su bitácora.',
      sp: recent.map(actShare),
    },
    {
      k: 'vuelven',
      q: '¿Vuelven?',
      lbl: 'Siguen de una semana a otra',
      num: pctText(keptNow),
      d: keptNow !== null ? <Delta now={keptNow} before={keptBefore} points /> : null,
      say: ratio !== null ? `Por cada persona que se va, llegan o vuelven ${ratio.toFixed(1).replace('.', ',')}.` : 'Esta semana nadie se fue.',
      sp: g.slice(1).map((_, i) => keptShare(i + 1)),
    },
    {
      k: 'pagan',
      q: '¿Pagan?',
      lbl: 'Cuenta → mes gratis',
      num: pctText(share(trials, accounts)),
      d: <span className="ref">ref. ~11%</span>,
      say: `${int(trials)} ${trials === 1 ? 'empezó' : 'empezaron'} el mes gratis en el periodo.`,
      sp: [] as number[],
    },
  ];

  return (
    <section className="page">
      <Head
        kick="Pulso"
        em="lo primero que ves al entrar"
        title={
          worst && worst.lost > 0
            ? `${int(active(now))} personas usaron Natus esta semana, y se pierden más en «${worst.to}»`
            : `${int(active(now))} personas usaron Natus esta semana`
        }
        answer={
          before ? (
            <>
              La semana anterior fueron <b>{int(active(before))}</b>.
              {ratio !== null && (
                <>
                  {' '}
                  Por cada persona que se fue llegaron o volvieron <b>{ratio.toFixed(1).replace('.', ',')}</b>.
                </>
              )}
            </>
          ) : undefined
        }
      />
      {(growth.error || ob.error) && <ErrorNote>{growth.error ?? ob.error}</ErrorNote>}

      {worst && worst.lost > 0 && (
        <div className="problem" role="status">
          <svg className="ico big" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 6v4M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div>
            <p className="t">Dónde se pierde más gente en este periodo</p>
            <p>
              Entre «{worst.from}» y «{worst.to}»: {int(worst.lost)} de {int(worst.of)} no siguieron ({pctText(worst.pct)}).
              {worst.prevPct !== null && ` En el periodo anterior eran ${worst.prevPct}%.`}
            </p>
          </div>
          <button type="button" className="btn ghost go" onClick={() => go('llegan')}>
            Ver el paso
          </button>
        </div>
      )}

      <Card>
        <div className="star">
          <Kpi
            big
            label="Personas activas esta semana"
            def="Personas con cuenta que abrieron la app al menos una vez en la semana (lunes a domingo, hora de Chile). Cuenta personas, no visitas."
            value={int(active(now))}
            ctx={<Delta now={active(now)} before={before ? active(before) : null} />}
          />
          <div className="grid g4 inner">
            <Kpi label={<><i className="sw" style={{ background: 'var(--s1)' }} /> Siguen</>} value={int(now?.kept ?? 0)} ctx="venían de la semana anterior" />
            <Kpi label={<><i className="sw" style={{ background: 'var(--s2)' }} /> Nuevas</>} value={int(now?.new_people ?? 0)} ctx="crearon su cuenta esta semana" />
            <Kpi label={<><i className="sw" style={{ background: 'var(--s3)' }} /> Volvieron</>} value={int(now?.returned ?? 0)} ctx="tras una pausa" />
            <Kpi label={<><i className="sw hatch" /> Se fueron</>} value={int(now?.lost ?? 0)} ctx="vinieron la semana pasada y esta no" />
          </div>
        </div>
      </Card>

      <div className="grid g4">
        {questions.map((q) => (
          <button key={q.k} type="button" className="card v2 qcard" onClick={() => go(q.k)}>
            <span className="qq">{q.q}</span>
            <Kpi label={q.lbl} value={q.num} ctx={q.d} />
            <span className="foot">
              <span className="say">{q.say}</span>
              <Spark values={q.sp} />
            </span>
          </button>
        ))}
      </div>

      <div className="grid g21">
        <Card
          title="Activas por semana"
          sub="Arriba de la línea, quienes usaron la app. Abajo, quienes la usaron la semana anterior y esta no."
        >
          <GrowthChart
            rows={g.map((r) => ({ kept: Number(r.kept), new_people: Number(r.new_people), returned: Number(r.returned), lost: Number(r.lost) }))}
            labels={g.map((r) => weekLabel(r.week_start))}
          />
        </Card>
        <Card title="Hoy, hora a hora" sub="Personas que empezaron el ingreso, hora de Chile">
          <Hours values={hours} now={nowHour} />
          <p className="small muted">
            {hours[peak] ? `El máximo del día fue a las ${String(peak).padStart(2, '0')}:00, con ${int(hours[peak])}.` : 'Nadie empezó todavía hoy.'}{' '}
            Punteado: horas que aún no pasan.
          </p>
        </Card>
      </div>
    </section>
  );
}
