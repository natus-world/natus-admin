import { lazy, Suspense, useState } from 'react';
import { api, type Segment, type WhoRow } from '../api';
import { Few } from '../charts';
import { int } from '../format';
import { ErrorNote, Loading, useAsync } from '../ui';
import { AGES, GENDER_LABEL, GENDERS, ageLabel, countryName, describe, isEmpty } from '../segment';
import { Card, Head, pctText, share, type ViewProps } from './views';

const CountryMap = lazy(() => import('../CountryMap'));

/** Countries shown one by one; the rest go in one row that filters by all of them. */
const TOP = 5;

/**
 * «Quiénes son» (owner, 24 Oct 2026, from the approved mockup): where people
 * live or were born, their age and how they asked to be addressed, each group
 * with how many found value in their first week and started the free month.
 * Inside the segment chosen on top; touching a row or a country filters the
 * whole panel.
 */
export function Quienes({ segment, onSegment }: ViewProps) {
  const who = useAsync(() => api.who(), []);
  const [place, setPlace] = useState<'vive' | 'nacio'>(segment?.place ?? 'vive');
  const rows = who.data ?? [];
  const of = (d: WhoRow['dimension']) => rows.filter((r) => r.dimension === d);
  const countriesAll = of(place).filter((r) => r.value).sort((a, b) => Number(b.accounts) - Number(a.accounts));
  const total = of('genero').reduce((s, r) => s + Number(r.accounts), 0);
  const top = countriesAll[0];
  const ageRows = AGES.map((a) => of('edad').find((r) => r.value === a)).filter((r): r is WhoRow => !!r);
  const topAge = [...ageRows].sort((a, b) => Number(b.accounts) - Number(a.accounts))[0];
  const pick = (patch: Segment) => onSegment?.({ ...(segment ?? {}), ...patch });

  const tenths = top && total ? Math.round((Number(top.accounts) / total) * 10) : 0;
  const title =
    top && total
      ? `${tenths >= 1 ? `${tenths} de cada 10` : pctText(share(Number(top.accounts), total))} ${place === 'vive' ? 'viven' : 'nacieron'} en ${countryName(top.value)}${topAge ? `, y el grupo más grande ${topAge.value === '55+' ? 'tiene 55 años o más' : `tiene entre ${topAge.value.replace('-', ' y ')} años`}` : ''}`
      : 'Todavía no hay cuentas';

  const shown = countriesAll.slice(0, TOP);
  const rest = countriesAll.slice(TOP);
  const restRow: WhoRow | null = rest.length
    ? {
        dimension: place,
        value: '',
        accounts: rest.reduce((s, r) => s + Number(r.accounts), 0),
        activated: rest.reduce((s, r) => s + Number(r.activated), 0),
        trial: rest.reduce((s, r) => s + Number(r.trial), 0),
        active_7d: rest.reduce((s, r) => s + Number(r.active_7d), 0),
      }
    : null;
  const maxCountry = Math.max(1, ...countriesAll.map((r) => Number(r.accounts)), Number(restRow?.accounts ?? 0));

  return (
    <section className="page">
      <Head
        kick="Quiénes son"
        em={isEmpty(segment) ? `${int(total)} cuentas` : `${int(total)} cuentas que ${describe(segment ?? {})}`}
        title={title}
        answer="Cada grupo con cuántos hay, a cuántos les sirvió en su primera semana y cuántos empezaron el mes gratis. Tocar una fila o un país pone ese filtro en todo el panel."
      />
      {who.error && <ErrorNote>{who.error}</ErrorNote>}
      {who.loading && !who.data && <Loading />}

      <Card
        title="País"
        aside={
          <div className="seg" role="group" aria-label="Qué país">
            <button type="button" className={place === 'vive' ? 'on' : ''} onClick={() => setPlace('vive')}>
              Vive en
            </button>
            <button type="button" className={place === 'nacio' ? 'on' : ''} onClick={() => setPlace('nacio')}>
              Nació en
            </button>
          </div>
        }
      >
        <Suspense fallback={<Loading />}>
          <CountryMap
            points={countriesAll.map((r) => ({ code: r.value, n: Number(r.accounts), act: Number(r.activated) }))}
            selected={segment?.place === place ? segment.countries ?? [] : []}
            onPick={(code) => pick({ place, countries: [code] })}
          />
        </Suspense>
        <GroupTable
          label="País"
          rows={[
            ...shown.map((r) => ({ key: r.value, name: `${r.value} · ${countryName(r.value)}`, row: r, onPick: () => pick({ place, countries: [r.value] }) })),
            ...(restRow
              ? [{ key: 'otros', name: `Otros ${rest.length} ${rest.length === 1 ? 'país' : 'países'}`, row: restRow, onPick: () => pick({ place, countries: rest.map((r) => r.value) }) }]
              : []),
          ]}
          max={maxCountry}
        />
        {of(place).some((r) => !r.value) && (
          <p className="small muted">Sin dato de país: {int(Number(of(place).find((r) => !r.value)?.accounts ?? 0))} cuentas.</p>
        )}
      </Card>

      <div className="grid g2">
        <Card title="Edad">
          <GroupTable
            label="Edad"
            rows={ageRows.map((r) => ({ key: r.value, name: ageLabel(r.value), row: r, onPick: () => pick({ age: r.value }) }))}
            max={Math.max(1, ...ageRows.map((r) => Number(r.accounts)))}
            compact
          />
        </Card>
        <Card title="Cómo le hablan">
          <GroupTable
            label="Cómo le hablan"
            rows={GENDERS.map((g) => of('genero').find((r) => r.value === g))
              .filter((r): r is WhoRow => !!r)
              .map((r) => ({ key: r.value, name: GENDER_LABEL[r.value] ?? r.value, row: r, onPick: () => pick({ gender: r.value }) }))}
            max={Math.max(1, ...of('genero').map((r) => Number(r.accounts)))}
            compact
          />
          <p className="small muted">La app no pregunta el sexo: es lo que cada persona eligió en «Cómo quieres que te hablemos».</p>
        </Card>
      </div>

      <p className="small muted">
        Les sirvió: en sus primeros 7 días marcó una práctica, le escribió a Davraz o escribió en su bitácora (definición del 22 oct). Las cuentas con
        menos de una semana todavía pueden sumarse. Bajo 30 cuentas, «pocos datos». Solo cuentas, sin el equipo ni el robot de pruebas.
      </p>
    </section>
  );
}

function GroupTable({ label, rows, max, compact = false }: {
  label: string;
  rows: { key: string; name: string; row: WhoRow; onPick: () => void }[];
  max: number;
  compact?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="table clickable who">
        <thead>
          <tr>
            <th>{label}</th>
            <th className="who-bar-h">Cuentas</th>
            <th className="num">N.º</th>
            <th className="num">Les sirvió</th>
            {!compact && <th className="num">Mes gratis</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, name, row, onPick }) => {
            const n = Number(row.accounts);
            return (
              <tr key={key} onClick={onPick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPick()} title="Filtrar todo el panel por este grupo">
                <td>{name}</td>
                <td className="who-bar">
                  <span className="tr">
                    <i style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                </td>
                <td className="num">{int(n)}</td>
                <td className="num">
                  {int(row.activated)} de {int(n)} <Few n={n} />
                </td>
                {!compact && (
                  <td className="num">
                    {int(row.trial)} de {int(n)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
