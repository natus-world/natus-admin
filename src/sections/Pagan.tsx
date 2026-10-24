import { useState } from 'react';
import { api, type PremiumRow } from '../api';
import { Def, Few, Funnel, HBars, Kpi } from '../charts';
import { date, int, usd } from '../format';
import { PAYWALL_PLACE, PURPOSE, label } from '../labels';
import { ErrorNote, useAsync } from '../ui';
import { Card, Head, share, pctText, type ViewProps } from './views';

const FEATURE: Record<string, { name: string; free: string }> = {
  chat: { name: 'Preguntas a Davraz', free: '3 de regalo + 1 al mes' },
  meditation: { name: 'Meditación', free: '1 en total' },
  comparison: { name: 'Comparaciones', free: '2 al mes' },
};
const KIND: Record<PremiumRow['kind'], string> = { paying: 'Pagando', trial: 'Mes gratis', gifted: 'Regalado' };

export function Pagan({ period, onOpenPerson }: ViewProps) {
  const funnel = useAsync(() => api.funnel(period.from, period.to), [period.from, period.to]);
  const seen = useAsync(() => api.funnelDetail('paywall_seen', period.from, period.to), [period.from, period.to]);
  const startedAt = useAsync(() => api.funnelDetail('trial_started', period.from, period.to), [period.from, period.to]);
  const free = useAsync(() => api.freeUsage(), []);
  const premium = useAsync(() => api.premiumList(), []);
  const overview = useAsync(() => api.overview(), []);
  const spend = useAsync(() => api.spendRange(period.from, period.to), [period.from, period.to]);
  const [kind, setKind] = useState<'all' | PremiumRow['kind']>('all');

  const c = new Map((funnel.data ?? []).map((r) => [r.step, Number(r.people)]));
  const accounts = c.get('account_created') ?? 0;
  const sawPremium = c.get('paywall_seen') ?? 0;
  const tapped = c.get('trial_tapped') ?? 0;
  const approved = c.get('trial_approved') ?? 0;
  const trials = c.get('trial_started') ?? 0;
  const charges = c.get('first_charge') ?? 0;
  const list = premium.data ?? [];
  const by = (k: PremiumRow['kind']) => list.filter((p) => p.kind === k);
  const cost = (rows: PremiumRow[]) => rows.reduce((s, p) => s + Number(p.ai_month) + Number(p.fixed_share), 0);
  const ai = (rows: PremiumRow[]) => rows.reduce((s, p) => s + Number(p.ai_month), 0);
  const fixed = (rows: PremiumRow[]) => rows.reduce((s, p) => s + Number(p.fixed_share), 0);
  const shown = kind === 'all' ? list : by(kind);
  const gifts = by('gifted');
  const trialRows = by('trial').sort((a, b) => (a.until ?? '').localeCompare(b.until ?? ''));
  const soon = (iso: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 86_400_000 <= 7 : false);
  const remindDay = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 5 * 86_400_000).toISOString() : null);
  const dueReminders = trialRows.filter((t) => t.until && soon(remindDay(t.until))).length;

  const places = new Map<string, { seen: number; started: number }>();
  for (const r of seen.data ?? []) places.set(r.detail, { seen: Number(r.people), started: 0 });
  for (const r of startedAt.data ?? []) {
    const e = places.get(r.detail) ?? { seen: 0, started: 0 };
    e.started = Number(r.people);
    places.set(r.detail, e);
  }
  const placeRows = [...places.entries()].sort((a, b) => b[1].seen - a[1].seen);

  const spendBy = new Map<string, number>();
  for (const r of spend.data ?? []) spendBy.set(r.purpose, (spendBy.get(r.purpose) ?? 0) + Number(r.cost_usd));
  const spendRows = [...spendBy.entries()].sort((a, b) => b[1] - a[1]);
  const spendTotal = spendRows.reduce((s, [, v]) => s + v, 0);
  const o = overview.data;
  const chatFree = free.data?.find((r) => r.feature === 'chat');

  return (
    <section className="page">
      <Head
        kick="¿Pagan?"
        em="Premium y plata"
        title={`${pctText(share(trials, accounts))} de las cuentas empezó el mes gratis`}
        answer={
          <>
            <b>{int(trials)}</b> de {int(accounts)} cuentas del periodo. La referencia de apps de suscripción es cerca de 11%.
          </>
        }
      />
      {funnel.error && <ErrorNote>{funnel.error}</ErrorNote>}

      <div className="grid g4">
        <Card>
          <Kpi label="Cuenta → mes gratis" value={pctText(share(trials, accounts))} ctx={<><span>{int(trials)} de {int(accounts)}</span><span className="ref">referencia <b>~11%</b></span></>} />
        </Card>
        <Card>
          <Kpi
            label="Mes gratis → primer cobro"
            value={charges ? pctText(share(charges, trials)) : '—'}
            ctx={<><span>{charges ? `${int(charges)} cobros` : 'todavía sin cobros'}</span><span className="ref">referencia <b>35%</b></span></>}
          />
        </Card>
        <Card>
          <Kpi label="Pagando hoy" value={int(o?.premium_paying ?? 0)} ctx={<><span>{int(o?.premium_trial ?? 0)} en el mes gratis</span><span>{int(o?.premium_gifted ?? 0)} regalados (no cuentan)</span></>} />
        </Card>
        <Card>
          <Kpi
            label="Gasto en IA del mes"
            def="Este mes calendario (UTC, como el tope de Premium), con los precios del panel."
            value={usd(o?.ai_spend_month ?? 0)}
            ctx={o && o.active_7d ? `${usd(Number(o.ai_spend_month) / Number(o.active_7d))} por persona activa en 7 días` : undefined}
          />
        </Card>
      </div>

      <Card
        title={chatFree && chatFree.free_people ? `Lo gratis: ${int(chatFree.used_all)} ya usaron todas sus preguntas a Davraz` : 'Lo gratis'}
        sub="Cuentas gratis que hoy no tienen nada de eso por usar, y qué hicieron después de toparse con el límite"
      >
        {free.error && <ErrorNote>{free.error}</ErrorNote>}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Qué</th>
                <th>Lo gratis</th>
                <th className="r">
                  Lo usaron todo <Def text="Cuentas gratis a las que hoy no les queda nada de esto. Las preguntas que Davraz contestó con «Conversar en el Chat» no cuentan." />
                </th>
                <th className="r">Empezaron el mes gratis</th>
                <th className="r">Siguieron usando la app</th>
                <th className="r">No volvieron</th>
              </tr>
            </thead>
            <tbody>
              {(free.data ?? []).map((r) => {
                const n = Number(r.used_all);
                return (
                  <tr key={r.feature}>
                    <td>
                      {FEATURE[r.feature]?.name ?? r.feature} <Few n={n} />
                    </td>
                    <td className="muted">{FEATURE[r.feature]?.free}</td>
                    <td className="r">
                      <b className="w6">{int(n)}</b> <span className="muted">({pctText(share(n, Number(r.free_people)))})</span>
                    </td>
                    <td className="r">
                      {int(r.started_trial)} <span className="muted">({pctText(share(Number(r.started_trial), n))})</span>
                    </td>
                    <td className="r">
                      {int(r.kept_using)} <span className="muted">({pctText(share(Number(r.kept_using), n))})</span>
                    </td>
                    <td className="r">
                      {int(r.did_not_return)} <span className="muted">({pctText(share(Number(r.did_not_return), n))})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted">«Después» es desde la última vez que usaron eso hasta hoy.</p>
      </Card>

      <Card title="Del aviso al cobro" sub="Con la referencia de la industria al lado de cada paso">
        <Funnel
          rows={[
            { label: 'Vieron Premium', people: sawPremium },
            { label: 'Tocaron «Empezar mes gratis»', people: tapped || null, pending: 'desde el 24 oct' },
            { label: 'Volvieron de PayPal', people: approved || null, pending: 'desde el 24 oct' },
            { label: 'Empezaron el mes gratis', people: trials, reference: '~11% de las cuentas' },
            { label: 'Primer cobro', people: charges || null, pending: 'todavía no', reference: '35% de las pruebas' },
          ]}
        />
        <p className="small muted">
          Referencias: Adapty 2026 (cuenta → prueba, todas las categorías; prueba → pago en salud y bienestar). Son apps de todo el mundo: sirven
          para orientarse, no como meta exacta.
        </p>
      </Card>

      <div className="grid g2">
        <Card title="Dónde ven Premium" sub="Vieron · empezaron el mes gratis desde ahí">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Dónde</th>
                  <th className="r">Vieron</th>
                  <th className="r">Empezaron</th>
                </tr>
              </thead>
              <tbody>
                {placeRows.map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      {label(PAYWALL_PLACE, k)} <Few n={v.seen} />
                    </td>
                    <td className="r">{int(v.seen)}</td>
                    <td className="r">{int(v.started)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card
          title={dueReminders ? `Mes gratis en curso: ${dueReminders} ${dueReminders === 1 ? 'aviso' : 'avisos'} por mandar esta semana` : 'Mes gratis en curso'}
          sub="El aviso va 5 días antes del primer cobro (ley de México). Hoy se manda a mano."
        >
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Empezó</th>
                  <th>Primer cobro</th>
                  <th>Aviso</th>
                </tr>
              </thead>
              <tbody>
                {trialRows.map((t) => {
                  const rd = remindDay(t.until);
                  return (
                    <tr key={t.user_id} className="click" tabIndex={0} onClick={() => onOpenPerson(t.user_id)} onKeyDown={(e) => e.key === 'Enter' && onOpenPerson(t.user_id)}>
                      <td>{t.name ?? t.email ?? 'Sin nombre'}</td>
                      <td>{date(t.since)}</td>
                      <td>{date(t.until)}</td>
                      <td>{soon(rd) ? <span className="chip warn">● mandar el {date(rd)}</span> : <span className="muted">{date(rd)}</span>}</td>
                    </tr>
                  );
                })}
                {trialRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Nadie en el mes gratis ahora.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title={`Premium: ${int(list.length)} ${list.length === 1 ? 'persona' : 'personas'}${gifts.length ? `, y ${gifts.length === 1 ? 'el regalo cuesta' : `los ${gifts.length} regalos cuestan`} ${usd(cost(gifts))} este mes` : ''}`}
        sub="Todas las personas con Premium y lo que cuesta cada una este mes: IA, su parte de los gastos fijos y el total"
      >
        {premium.error && <ErrorNote>{premium.error}</ErrorNote>}
        <div className="grid g3 inner">
          <Kpi label="Pagando" value={int(by('paying').length)} ctx={`pagan ${usd(by('paying').reduce((s, p) => s + Number(p.paid_month), 0))} · cuestan ${usd(cost(by('paying')))}`} />
          <Kpi label="Mes gratis" value={int(by('trial').length)} ctx={`cuestan ${usd(cost(by('trial')))}`} />
          <Kpi label="Regalados" value={int(gifts.length)} ctx={`cuestan ${usd(cost(gifts))} (${usd(ai(gifts))} de IA + ${usd(fixed(gifts))} de fijos)`} />
        </div>
        <div className="bar-row">
          <div className="seg" role="group" aria-label="Tipo de Premium">
            {(['all', 'paying', 'trial', 'gifted'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {k === 'all' ? 'Todos' : k === 'gifted' ? 'Regalados' : KIND[k]}
              </button>
            ))}
          </div>
          <span className="small muted">Ordenado por gasto en IA, de mayor a menor</span>
        </div>
        <div className="tw">
          <table className="nowrap">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Tipo</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Regalado por</th>
                <th>
                  IA este mes <Def text="Lo que costó la IA que usó esta persona desde el 1 del mes (UTC), con los precios del panel. El tope de Premium es US$ 4 al mes por persona." />
                </th>
                <th className="r">
                  Fijos <Def text="Los gastos fijos del mes (mensuales y la doceava parte de los anuales, sin la IA) repartidos en partes iguales entre las personas que abrieron la app este mes." />
                </th>
                <th className="r">Total</th>
                <th className="r">Paga</th>
                <th className="r">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const total = Number(p.ai_month) + Number(p.fixed_share);
                const diff = Number(p.paid_month) - total;
                const near = Number(p.ai_month) >= 3.5;
                return (
                  <tr key={p.user_id} className="click" tabIndex={0} onClick={() => onOpenPerson(p.user_id)} onKeyDown={(e) => e.key === 'Enter' && onOpenPerson(p.user_id)}>
                    <td>
                      <b className="w5">{p.name ?? p.email ?? 'Sin nombre'}</b>
                    </td>
                    <td>{KIND[p.kind]}</td>
                    <td>{date(p.since)}</td>
                    <td>{p.until ? (p.kind === 'trial' ? `cobro ${date(p.until)}` : date(p.until)) : p.kind === 'gifted' ? 'sin fin' : '—'}</td>
                    <td className={p.granted_by_name ? '' : 'muted'}>{p.granted_by_name ?? '—'}</td>
                    <td>
                      <span className={`inbar${near ? ' warn' : ''}`} style={{ width: `${Math.min(80, (Number(p.ai_month) / 4) * 80)}px` }} />
                      {usd(p.ai_month)} {near && <span className="tag few">cerca del tope</span>}
                    </td>
                    <td className="r">{usd(p.fixed_share)}</td>
                    <td className="r">
                      <b className="w6">{usd(total)}</b>
                    </td>
                    <td className="r">{Number(p.paid_month) ? usd(p.paid_month) : '—'}</td>
                    <td className="r">
                      {diff >= 0 ? '+ ' : '− '}
                      {usd(Math.abs(diff))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          {shown.length} {shown.length === 1 ? 'persona' : 'personas'}: {usd(cost(shown))} en total ({usd(ai(shown))} de IA y {usd(fixed(shown))} de fijos).
        </p>
      </Card>

      <Card title="En qué se va el gasto de IA" sub={`${usd(spendTotal)} en el periodo`}>
        <HBars rows={spendRows.map(([k, v]) => ({ label: label(PURPOSE, k), value: v, text: usd(v) }))} />
      </Card>
    </section>
  );
}
