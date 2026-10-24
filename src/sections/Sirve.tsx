import { api } from '../api';
import { Few, Funnel, HBars, Heatmap, Kpi } from '../charts';
import { int } from '../format';
import { ErrorNote, useAsync } from '../ui';
import { Card, Head, share, pctText, type ViewProps } from './views';
import { addDays, dayIso } from '../format';

const FIRST: Record<string, string> = { chat: 'Davraz', practica: 'Una práctica', bitacora: 'La bitácora', nada: 'Todavía nada' };
/** «empieza por …»: the same, inside a sentence. */
const FIRST_IN: Record<string, string> = { Davraz: 'Davraz', 'Una práctica': 'una práctica', 'La bitácora': 'la bitácora' };

/** The tab keys the app records with `screen_viewed`. */
const SCREEN: Record<string, string> = {
  hoy: 'Hoy',
  carta: 'Carta',
  'carta-completa': 'Carta completa',
  caminos: 'Caminos',
  recorrido: 'Tu rutina',
  bitacora: 'Bitácora',
  chat: 'Chat',
  perfil: 'Perfil',
  meditaciones: 'Meditaciones',
  biblioteca: 'Biblioteca',
  comparacion: 'Comparar con un amigo',
  'comparacion-resultado': 'Resultado de una comparación',
  'comparacion-cartas': 'Las dos cartas',
};

/** Cohorts whose first week is already over: activation needs its seven days. */
export function settledCohorts<T extends { week_start: string; accounts: number }>(rows: T[]): T[] {
  const done = rows.filter((r) => r.week_start <= dayIso(13) && Number(r.accounts) > 0);
  return done.length ? done : rows.filter((r) => Number(r.accounts) > 0);
}

export function Sirve({ period, onOpenPerson }: ViewProps) {
  void onOpenPerson;
  const retention = useAsync(() => api.retention(12), []);
  const first = useAsync(() => api.firstAction(period.from, period.to), [period.from, period.to]);
  const days = useAsync(() => api.openDays(period.from, period.to), [period.from, period.to]);
  const weekly = useAsync(() => api.weeklyUse(2), []);
  const friends = useAsync(() => api.friends(period.from, period.to), [period.from, period.to]);
  const free = useAsync(() => api.freeUsage(), []);
  const therapies = useAsync(() => api.byModality(period.from, period.to), [period.from, period.to]);
  const heat = useAsync(() => api.heatmap(period.from, period.to), [period.from, period.to]);
  const ratings = useAsync(() => api.ratings(period.from, period.to), [period.from, period.to]);
  const screens = useAsync(() => api.screens(period.from, period.to), [period.from, period.to]);

  const cohorts = settledCohorts(retention.data ?? []);
  const accounts = cohorts.reduce((s, r) => s + Number(r.accounts), 0);
  const activated = cohorts.reduce((s, r) => s + Number(r.activated), 0);
  const firstRows = (first.data ?? [])
    .filter((r) => r.action !== 'nada')
    .map((r) => ({ label: FIRST[r.action] ?? r.action, value: Number(r.people) }))
    .sort((a, b) => b.value - a.value);
  const dayRows = (days.data ?? []).map((r) => ({ label: r.bucket === '1' ? '1 día' : r.bucket === '2-3' ? '2 o 3 días' : '4 o más', value: Number(r.people) }));
  const dayTotal = dayRows.reduce((s, r) => s + r.value, 0);
  const lastWeek = weekly.data?.[0];
  const weekScreens = useAsync(
    () => (lastWeek ? api.screens(lastWeek.week_start, addDays(lastWeek.week_start, 6)) : Promise.resolve([])),
    [lastWeek?.week_start],
  );
  const readChart = Number(weekScreens.data?.find((r) => r.screen === 'carta')?.people ?? 0);
  const doRows = lastWeek
    ? [
        { label: 'Le escribieron a Davraz', value: Number(lastWeek.chat) },
        { label: 'Marcaron una práctica', value: Number(lastWeek.practices) },
        { label: 'Escribieron en la bitácora', value: Number(lastWeek.journal) },
        { label: 'Escucharon una meditación', value: Number(lastWeek.meditations) },
        { label: 'Se compararon con alguien', value: Number(lastWeek.comparisons) },
        { label: 'Abrieron su carta', value: readChart },
      ].sort((a, b) => b.value - a.value)
    : [];
  const activeLast = Number(lastWeek?.active ?? 0);
  const screenRows = (screens.data ?? [])
    .map((r) => ({ label: SCREEN[r.screen] ?? r.screen, value: Number(r.people) }))
    .sort((a, b) => b.value - a.value);
  const f = friends.data;
  const compFree = free.data?.find((r) => r.feature === 'comparison');
  const ratingTotal = (ratings.data ?? []).reduce((s, r) => s + Number(r.n), 0);
  const ratingHigh = (ratings.data ?? []).filter((r) => r.rating >= 4).reduce((s, r) => s + Number(r.n), 0);
  const topFirst = firstRows[0];
  const topDo = doRows[0];

  return (
    <section className="page">
      <Head
        kick="¿Les sirve?"
        em="activación y uso"
        title={
          accounts
            ? `A ${pctText(share(activated, accounts))} le sirve en su primera semana${topFirst ? `, y casi siempre empieza por ${FIRST_IN[topFirst.label] ?? topFirst.label}` : ''}`
            : 'Todavía no hay cuentas con una semana cumplida'
        }
        answer={
          <>
            <b>{int(activated)}</b> de {int(accounts)} cuentas hicieron algo más que leer en sus primeros 7 días.
          </>
        }
      />
      {retention.error && <ErrorNote>{retention.error}</ErrorNote>}

      <div className="grid g3">
        <Card>
          <Kpi
            label="Activadas"
            def="Cuentas que en sus primeros 7 días marcaron una práctica, le escribieron a Davraz o escribieron en su bitácora (definición del 22 oct). Solo cuentas con su primera semana cumplida."
            value={pctText(share(activated, accounts))}
            ctx={`${int(activated)} de ${int(accounts)}`}
          />
        </Card>
        <Card>
          <span className="lbl-top">Su primera acción</span>
          <HBars rows={firstRows} />
        </Card>
        <Card>
          <span className="lbl-top">Cuántos días la abrieron en el periodo</span>
          <HBars rows={dayRows.map((r) => ({ ...r, text: pctText(share(r.value, dayTotal)) }))} />
          <p className="small muted">Sin rachas: cuenta días, no días seguidos.</p>
        </Card>
      </div>

      <Card
        title={topDo && topDo.value > 0 ? `Qué hacen: lo más común es que ${topDo.label.toLowerCase()}` : 'Qué hacen'}
        sub={`De ${int(activeLast)} personas con cuenta que abrieron la app la última semana`}
      >
        <HBars rows={doRows.map((r) => ({ ...r, text: pctText(share(r.value, activeLast)), tip: `${int(r.value)} personas` }))} max={Math.max(1, activeLast)} />
      </Card>

      <Card
        title={screenRows[0] ? `Qué pantallas abren: la que más, ${screenRows[0].label}` : 'Qué pantallas abren'}
        sub="Personas con cuenta que abrieron cada pantalla en el periodo, una vez por día. Se registra desde el 24 oct."
      >
        {screens.error && <ErrorNote>{screens.error}</ErrorNote>}
        {screenRows.length ? (
          <HBars rows={screenRows.map((r) => ({ ...r, text: int(r.value), tip: `${int(r.value)} personas` }))} />
        ) : (
          <p className="small muted">Todavía no hay datos en este periodo.</p>
        )}
      </Card>

      <Card
        title={f ? `Amigos y comparaciones: ${int(f.compared)} ${Number(f.compared) === 1 ? 'amistad se comparó' : 'amistades se compararon'} en el periodo` : 'Amigos y comparaciones'}
        sub="Del link compartido a la comparación. Una amistad de antes también puede compararse en el periodo."
      >
        {friends.error && <ErrorNote>{friends.error}</ErrorNote>}
        {f && (
          <>
            <Funnel
              rows={[
                { label: 'Compartieron su link', people: Number(f.shared), tip: 'Personas' },
                {
                  label: 'Abrieron un link de invitación',
                  people: Number(f.opened_invite) || null,
                  pending: 'desde el 24 oct',
                  tip: 'Personas, con o sin cuenta, que abrieron el link de alguien',
                },
                { label: 'Amistades nuevas', people: Number(f.befriended), tip: `${int(f.accepted)} personas invitaron y alguien aceptó` },
                { label: 'Amistades que se compararon', people: Number(f.compared), tip: 'Amistades con al menos una comparación en el periodo' },
                {
                  label: 'Conversaron con Davraz sobre ella',
                  people: Number(f.talked) || null,
                  pending: 'desde el 24 oct',
                  tip: 'Amistades sobre las que alguien le escribió a Davraz desde la comparación',
                },
              ]}
            />
            <div className="grid g3 inner">
              <Kpi label="Comparaciones hechas" value={int(f.comparisons)} ctx={f.compared ? `${(Number(f.comparisons) / Number(f.compared)).toFixed(1).replace('.', ',')} por amistad` : undefined} />
              <Kpi label="Amistades activas" value={int(f.active_friendships)} ctx={`${int(f.ended)} terminaron en el periodo`} />
              <Kpi
                label="Gratis que ya usaron sus comparaciones"
                value={int(compFree?.used_all ?? 0)}
                ctx="ver «Lo gratis» en ¿Pagan?"
              />
            </div>
          </>
        )}
      </Card>

      <Card title="Terapias: recomendada, guardada, practicada" sub="Y cómo evalúan sus prácticas (1 a 5)">
        {therapies.error && <ErrorNote>{therapies.error}</ErrorNote>}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Terapia</th>
                <th className="r">Recomendada</th>
                <th className="r">Guardada</th>
                <th className="r">«No me hace sentido»</th>
                <th className="r">La practicaron</th>
                <th className="r">Nota</th>
              </tr>
            </thead>
            <tbody>
              {(therapies.data ?? [])
                .filter((t) => Number(t.recommended) > 0)
                .map((t) => (
                  <tr key={t.slug}>
                    <td>{t.name}</td>
                    <td className="r">{int(t.recommended)}</td>
                    <td className="r">{pctText(share(Number(t.saved), Number(t.recommended)))}</td>
                    <td className="r">{pctText(share(Number(t.dismissed), Number(t.recommended)))}</td>
                    <td className="r">{int(t.marked)}</td>
                    <td className="r">
                      {t.avg_rating === null ? '—' : String(t.avg_rating).replace('.', ',')} <span className="muted">({int(t.ratings)})</span> <Few n={Number(t.ratings)} />
                    </td>
                  </tr>
                ))}
              {therapies.data && therapies.data.every((t) => Number(t.recommended) === 0) && (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin terapias recomendadas en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g21">
        <Card title="Cuándo la usan" sub="Mensajes a Davraz, bitácora y la primera apertura del día, por hora y día, hora de Chile">
          <Heatmap cells={(heat.data ?? []).map((c) => ({ dow: Number(c.dow), hour: Number(c.hour), actions: Number(c.actions) }))} />
        </Card>
        <Card title="Cómo evalúan sus prácticas" sub={`${int(ratingTotal)} notas en el periodo`}>
          <HBars rows={(ratings.data ?? []).map((r) => ({ label: String(r.rating), value: Number(r.n), text: pctText(share(Number(r.n), ratingTotal)) }))} />
          {ratingTotal > 0 && <p className="small muted">{pctText(share(ratingHigh, ratingTotal))} de las notas son 4 o 5.</p>}
        </Card>
      </div>
    </section>
  );
}
