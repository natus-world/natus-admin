import type { ReactNode } from 'react';
import { api, type Macro as M } from '../api';
import { Def, Delta } from '../charts';
import { int, usd } from '../format';
import { ErrorNote, Loading, useAsync } from '../ui';
import { describe, isEmpty } from '../segment';
import { Card, Head, pctText, prevOf, share, type ViewProps } from './views';

/** What PayPal charges a month (owner, 15–16 Oct 2026, VAT included). */
const PRICE_USD = 10;

/**
 * «Macro datos» (owner, 25 Oct 2026, from the option he chose): one screen,
 * one table of the business's main numbers for the period, inside the segment
 * on top, each with the period before beside it when comparing. The numbers
 * «hoy» are not of a period and carry no change.
 */
export function Macro({ period, compare, segment }: ViewProps) {
  const now = useAsync(() => api.macro(period.from, period.to), [period.from, period.to]);
  const prev = prevOf(period);
  const before = useAsync(() => (compare ? api.macro(prev.from, prev.to) : Promise.resolve([] as M[])), [prev.from, prev.to, compare]);
  const m = now.data?.[0];
  const b = compare ? before.data?.[0] : undefined;

  const n = (v: number | undefined) => Number(v ?? 0);
  const sirvio = (x: M | undefined) => share(n(x?.activated_new), n(x?.accounts_new));
  const volvio = (x: M | undefined) => share(n(x?.returned), n(x?.accounts_before));
  const perActive = (x: M | undefined) => (n(x?.active) ? n(x?.ai_spend) / n(x?.active) : 0);

  return (
    <section className="page">
      <Head
        kick="Macro datos"
        em={isEmpty(segment) ? 'todo en un cuadro' : `solo cuentas que ${describe(segment ?? {})}`}
        title={m ? `${int(n(m.accounts_total))} cuentas, ${int(n(m.active))} abrieron la app en el periodo` : 'Macro datos'}
        answer={m ? <>Pagando hoy: <b>{int(n(m.paying_now))}</b> · ingreso mensual {usd(n(m.paying_now) * PRICE_USD)} · gasto en IA del periodo {usd(n(m.ai_spend))}.</> : undefined}
      />
      {now.error && <ErrorNote>{now.error}</ErrorNote>}
      {!m ? (
        now.loading && <Loading />
      ) : (
        <Card>
          <dl className="macro">
            <Cell label="Cuentas totales" def="Cuentas creadas hasta el final del periodo, sin el equipo ni el robot de pruebas." value={int(n(m.accounts_total))}>
              {b && <Delta now={n(m.accounts_total)} before={n(b.accounts_total)} />}
            </Cell>
            <Cell label="Activas en el periodo" def="Cuentas que abrieron la app al menos una vez en el periodo." value={int(n(m.active))}>
              {b && <Delta now={n(m.active)} before={n(b.active)} />}
            </Cell>

            <Cell label="Nuevas en el periodo" def="Cuentas creadas dentro del periodo." value={int(n(m.accounts_new))}>
              {b && <Delta now={n(m.accounts_new)} before={n(b.accounts_new)} />}
            </Cell>
            <Cell
              label="Les sirvió (1.ª semana)"
              def="De las cuentas nuevas del periodo, las que en sus primeros 7 días marcaron una práctica, le escribieron a Davraz o escribieron en su bitácora. Las de menos de una semana todavía pueden sumarse."
              value={pctText(sirvio(m))}
              sub={`${int(n(m.activated_new))} de ${int(n(m.accounts_new))}`}
            >
              {b && n(b.accounts_new) > 0 && <Delta now={sirvio(m) ?? 0} before={sirvio(b) ?? 0} points />}
            </Cell>

            <Cell
              label="Volvieron"
              def="De las cuentas que ya existían antes del periodo, las que abrieron la app en el periodo."
              value={pctText(volvio(m))}
              sub={`${int(n(m.returned))} de ${int(n(m.accounts_before))}`}
            >
              {b && n(b.accounts_before) > 0 && <Delta now={volvio(m) ?? 0} before={volvio(b) ?? 0} points />}
            </Cell>
            <Cell label="Empezaron el mes gratis" def="Personas que activaron el mes gratis de Premium en el periodo." value={int(n(m.trials))}>
              {b && <Delta now={n(m.trials)} before={n(b.trials)} />}
            </Cell>

            <Cell label="Pagando hoy" def="Premium con PayPal y al menos un cobro, activo hoy. No depende del periodo." value={int(n(m.paying_now))} today />
            <Cell
              label="Ingreso mensual"
              def={`Quienes pagan hoy por US$ ${PRICE_USD} al mes (lo que cobra PayPal, IVA incluido). No depende del periodo.`}
              value={usd(n(m.paying_now) * PRICE_USD)}
              today
            />

            <Cell label="En el mes gratis hoy" def="Premium con PayPal que todavía no tiene su primer cobro." value={int(n(m.trial_now))} today />
            <Cell label="Premium regalado hoy" def="Premium dado desde el panel. No cuenta como pago." value={int(n(m.gifted_now))} today />

            <Cell label="Gasto en IA del periodo" def="Lo que costaron las respuestas de la IA de estas personas en el periodo, con los precios del panel." value={usd(n(m.ai_spend))}>
              {b && <span className="delta flat">{usd(n(b.ai_spend))} antes</span>}
            </Cell>
            <Cell label="Costo IA por persona activa" def="Gasto en IA del periodo dividido por las cuentas activas en el periodo." value={n(m.active) ? usd(perActive(m)) : '—'} />
          </dl>
        </Card>
      )}
      <p className="small muted">«Hoy» es el estado de hoy; lo demás es del periodo elegido arriba. Todo respeta el segmento.</p>
    </section>
  );
}

function Cell({ label, def, value, sub, today = false, children }: {
  label: string;
  def: string;
  value: ReactNode;
  sub?: string;
  today?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="macro-cell">
      <dt>
        {label}
        {today && <span className="macro-today">hoy</span>}
        <Def text={def} />
      </dt>
      <dd>
        <span className="macro-num">{value}</span>
        {sub && <span className="macro-sub">{sub}</span>}
        {children && <span className="macro-delta">{children}</span>}
      </dd>
    </div>
  );
}
