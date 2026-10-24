import { useEffect, useState } from 'react';
import { api, type ContentKind, type PersonSummary, type PersonRow, type Friendship } from '../api';
import { Def } from '../charts';
import { date, dateTime, int, usd } from '../format';
import { BIRTH_HOUR, KINDS, ONBOARDING, MONEY, SOURCE, USE, PAYWALL_PLACE, PLAN, deviceLabel, label } from '../labels';
import { ErrorNote, Loading, Section, Value, messageOf, useAsync } from '../ui';

const STEP_LABEL: Record<string, string> = Object.fromEntries(
  [
    ...ONBOARDING,
    ...USE,
    ...MONEY,
    { key: 'app_opened', label: 'Abrió la app' },
    { key: 'birth_city_not_found', label: 'Escribió una ciudad que no apareció' },
  ].map((s) => [s.key, s.label]),
);

export function People({ open, onOpen }: { open: string | null; onOpen: (id: string | null) => void }) {
  if (open) return <PersonView key={open} id={open} onBack={() => onOpen(null)} onOpenPerson={(x) => onOpen(x)} />;
  return <PeopleList onOpen={onOpen} />;
}

function PeopleList({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  const people = useAsync(() => api.peopleList(search), [search]);

  return (
    <div className="stack">
      <input
        className="search"
        type="search"
        placeholder="Buscar por nombre o correo"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar por nombre o correo"
      />
      {people.error && <ErrorNote>{people.error}</ErrorNote>}
      <Section title={people.data ? `${int(people.data.length)} personas` : 'Personas'}>
        {people.loading && !people.data ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Se sumó</th>
                  <th>Origen</th>
                  <th>Desde</th>
                  <th>Plan</th>
                  <th>
                    Lo gratis <Def text="Si ya usó todo lo gratis de algo: las preguntas a Davraz, la meditación o las comparaciones del mes." />
                  </th>
                  <th className="r">Invitó</th>
                  <th>Última vez</th>
                  <th>Activada</th>
                </tr>
              </thead>
              <tbody>
                {(people.data ?? []).map((p) => (
                  <tr key={p.user_id} onClick={() => onOpen(p.user_id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.user_id)}>
                    <td>
                      <b className="w5">{p.name ?? 'Sin nombre'}</b>
                      <br />
                      <span className="muted small">{p.email ?? '—'}</span>
                    </td>
                    <td>{dateTime(p.joined_at)}</td>
                    <td>{label(SOURCE, p.source ?? '')}</td>
                    <td>{p.device ? deviceLabel(p.device) : <span className="muted">—</span>}</td>
                    <td>
                      <span className={`tag ${p.plan}`}>{label(PLAN, p.plan)}</span>
                    </td>
                    <td>
                      <FreeCell p={p} />
                    </td>
                    <td className="r">{p.invited ? int(p.invited) : <span className="muted">—</span>}</td>
                    <td>{date(p.last_opened)}</td>
                    <td>{p.activated ? <span className="ok">✓ sí</span> : <span className="muted">no</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

/** Which free things a person has used up; «sin tope» for Premium. */
function FreeCell({ p }: { p: PersonRow }) {
  if (p.plan !== 'free') return <span className="muted">sin tope</span>;
  const used = [
    p.chat_left === 0 ? 'Davraz' : null,
    p.meditation_left === 0 ? 'meditación' : null,
    p.comparison_left === 0 ? 'comparar' : null,
  ].filter(Boolean);
  const tip = `Le quedan: ${p.chat_left ?? '—'} preguntas · ${p.meditation_left ?? '—'} meditaciones · ${p.comparison_left ?? '—'} comparaciones este mes`;
  return used.length ? (
    <span className="chip warn" data-tip={tip}>
      ● {used.join(' y ')} usado
    </span>
  ) : (
    <span className="muted" data-tip={tip}>
      queda
    </span>
  );
}

type Record_ = Record<string, unknown>;
const get = (r: Record_ | undefined, ...path: string[]): unknown =>
  path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record_)[k] : undefined), r);
const str = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

function PersonView({ id, onBack, onOpenPerson }: { id: string; onBack: () => void; onOpenPerson: (id: string) => void }) {
  const person = useAsync(() => api.person(id), [id]);
  const [kind, setKind] = useState<ContentKind>('chat');
  const p = person.data;

  return (
    <div className="stack">
      <button type="button" className="link" onClick={onBack}>
        ← Personas
      </button>
      {person.error && <ErrorNote>{person.error}</ErrorNote>}
      {!p ? (
        person.loading && <Loading />
      ) : (
        <>
          <header className="person-head">
            <h1>{str(p['name']) || 'Sin nombre'}</h1>
            <p className="muted">
              {str(p['email'])} · cuenta desde {date(str(p['created_at']))} · entró por última vez {dateTime(str(p['last_sign_in']))}
            </p>
          </header>

          <div className="grid-2">
            <Section title="Quién es">
              <dl className="facts">
                <dt>Nacimiento</dt>
                <dd>
                  {date(str(get(p, 'birth', 'date')))} {str(get(p, 'birth', 'time')).slice(0, 5)}
                  {' · '}
                  {str(get(p, 'birth', 'city'))} {str(get(p, 'birth', 'country'))}
                </dd>
                <dt>Vive en</dt>
                <dd>{str(p['country']) || '—'}</dd>
                <dt>Cómo quiere que le hablen</dt>
                <dd>{str(p['gender']) || '—'}</dd>
                <dt>Lo que le trae</dt>
                <dd><Value value={p['need_text']} /></dd>
                <dt>Temas</dt>
                <dd><Value value={p['need_topics']} /></dd>
                <dt>Apertura</dt>
                <dd><Value value={p['openness']} /></dd>
                <dt>Preguntas de cuidado</dt>
                <dd>
                  <Clinical value={p['clinical'] as Record_ | undefined} />
                </dd>
                <dt>Memoria</dt>
                <dd>{p['memory_consent'] ? `Aceptó el ${date(str(p['memory_consent']))}` : 'Sin consentimiento'}</dd>
              </dl>
            </Section>

            <div className="stack">
              <Section title="Plan">
                <PlanBox id={id} email={str(p['email'])} plan={str(p['plan'])} subscription={p['subscription'] as Record_ | null} onChange={person.reload} />
              </Section>
              <Section title="Uso">
                <dl className="facts">
                  <dt>Preguntas a Davraz</dt>
                  <dd>{int(Number(get(p, 'counts', 'messages') ?? 0))}</dd>
                  <dt>Entradas de bitácora</dt>
                  <dd>{int(Number(get(p, 'counts', 'journal') ?? 0))}</dd>
                  <dt>Prácticas marcadas</dt>
                  <dd>{int(Number(get(p, 'counts', 'checkins') ?? 0))}</dd>
                  <dt>Prácticas activas en su rutina</dt>
                  <dd>{int(Number(get(p, 'counts', 'practices') ?? 0))}</dd>
                  <dt>Cosas en su memoria</dt>
                  <dd>{int(Number(get(p, 'counts', 'memory') ?? 0))}</dd>
                  <dt>Amistades</dt>
                  <dd>{int(Number(get(p, 'counts', 'friends') ?? 0))}</dd>
                  <dt>Alertas de crisis</dt>
                  <dd>{int(Number(get(p, 'counts', 'crisis_alerts') ?? 0))}</dd>
                  <dt>Le queda</dt>
                  <dd>
                    {quota(get(p, 'quota', 'chat'))} preguntas · {quota(get(p, 'quota', 'meditation'))} meditaciones ·{' '}
                    {quota(get(p, 'quota', 'comparison'))} comparaciones
                  </dd>
                  <dt>Gasto en IA</dt>
                  <dd>
                    {usd(Number(get(p, 'ai', 'cost_usd') ?? 0))} en total · {usd(Number(get(p, 'ai', 'cost_month_usd') ?? 0))} este mes ·{' '}
                    {int(Number(get(p, 'ai', 'calls') ?? 0))} respuestas
                  </dd>
                </dl>
              </Section>
            </div>
          </div>

          <Friends id={id} name={str(p['name']) || 'Esta persona'} onOpenPerson={onOpenPerson} />

          <Adapt id={id} />

          <Section title="Su recorrido">
            <ol className="timeline">
              {((p['steps'] as Record_[] | undefined) ?? []).map((s, i) => (
                <li key={i}>
                  <span className="muted">{dateTime(str(s['at']))}</span>{' '}
                  {STEP_LABEL[str(s['step'])] ?? str(s['step'])}
                  {s['detail'] ? <span className="muted"> · {stepDetail(str(s['step']), str(s['detail']))}</span> : null}
                  {s['source'] ? (
                    <span className="muted">
                      {' '}
                      · llegó desde {label(SOURCE, str(s['source']))} {str(s['campaign'])}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>

          <Section
            title="Lo que escribió y recibió"
            aside={<p className="muted small">Cada vez que abres una pestaña queda registrado.</p>}
          >
            <div className="tabs" role="tablist">
              {KINDS.map((k) => (
                <button key={k.key} type="button" role="tab" aria-selected={kind === k.key} className={kind === k.key ? 'on' : ''} onClick={() => setKind(k.key)}>
                  {k.label}
                </button>
              ))}
            </div>
            <Content id={id} kind={kind} />
          </Section>
        </>
      )}
    </div>
  );
}

function quota(v: unknown) {
  return v === null || v === undefined ? 'sin límite' : int(Number(v));
}

const IDEATION: Record<string, string> = {
  no: 'No',
  fugaces_sin_plan: 'Pensamientos fugaces, sin plan',
  frecuentes: 'Frecuentes',
  plan_o_intencion: 'Con plan o intención',
};

function Clinical({ value }: { value: Record_ | undefined }) {
  if (!value) return <span className="muted">—</span>;
  const yesNo = (v: unknown) => (v === true ? 'sí' : v === false ? 'no' : '—');
  return (
    <span>
      Ideación en 6 meses: {IDEATION[str(value['ideation_6m'])] ?? (str(value['ideation_6m']) || '—')} · En tratamiento:{' '}
      {yesNo(value['in_treatment'])} · Medicación psiquiátrica: {yesNo(value['psychiatric_medication'])}
      {value['notes'] ? (
        <>
          <br />
          Notas: <span className="pre">{str(value['notes'])}</span>
        </>
      ) : null}
    </span>
  );
}

const MONTHS = [
  { value: '1', label: '1 mes' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '', label: 'Sin término' },
];

function PlanBox({ id, email, plan, subscription, onChange }: {
  id: string;
  email: string;
  plan: string;
  subscription: Record_ | null;
  onChange: () => void;
}) {
  const [months, setMonths] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ends = subscription ? str(subscription['ends_at']) : '';

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-s">
      <p>
        <span className={`tag ${plan}`}>{label(PLAN, plan)}</span>
        {plan !== 'free' && <span className="muted"> {ends ? `hasta el ${date(ends)}` : 'sin fecha de término'}</span>}
      </p>
      {plan === 'gift' && (
        <button type="button" className="btn ghost" disabled={busy} onClick={() => void act(() => api.revokePremium(id))}>
          Quitar Premium regalado
        </button>
      )}
      {plan !== 'premium' && email && (
        <div className="inline-form">
          <select value={months} onChange={(e) => setMonths(e.target.value)} aria-label="Por cuánto tiempo">
            {MONTHS.map((m) => (
              <option key={m.label} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn" disabled={busy} onClick={() => void act(() => api.grantPremium(email, months ? Number(months) : null))}>
            {plan === 'gift' ? 'Cambiar el regalo' : 'Regalar Premium'}
          </button>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

function Content({ id, kind }: { id: string; kind: ContentKind }) {
  const content = useAsync(() => api.content(id, kind), [id, kind]);
  if (content.loading) return <Loading />;
  if (content.error) return <ErrorNote>{content.error}</ErrorNote>;
  const rows = content.data ?? [];
  if (rows.length === 0) return <p className="muted">Nada todavía.</p>;

  if (kind === 'chat') {
    return (
      <div className="chat">
        {[...rows].reverse().map((m, i) => (
          <div key={i} className={`msg ${str(m['role']) === 'user' ? 'me' : 'them'}`}>
            <p className="msg-meta muted">
              {str(m['role']) === 'user' ? 'La persona' : 'Davraz'} · {dateTime(str(m['at']))}
            </p>
            <p className="pre">{str(m['text'])}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="items">
      {rows.map((r, i) => (
        <article key={i} className="item">
          <dl className="facts">
            {Object.entries(r).map(([k, v]) => (
              <div key={k} className="fact">
                <dt>{k}</dt>
                <dd>
                  <Value value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

function stepDetail(step: string, detail: string): string {
  if (step === 'onboarding_started') return deviceLabel(detail);
  if (step === 'birth_data_done') return label(BIRTH_HOUR, detail);
  return label(PAYWALL_PLACE, detail);
}

const prettySlug = (slug: string) => {
  const t = slug.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** What Davraz could adapt to, in one look (owner, 22 Oct 2026). Opening it is logged. */
function Adapt({ id }: { id: string }) {
  const summary = useAsync(() => api.personSummary(id), [id]);
  const a: PersonSummary | undefined = summary.data;
  return (
    <Section title="Para que Davraz se adapte">
      {summary.error && <ErrorNote>{summary.error}</ErrorNote>}
      {!a ? (
        summary.loading && <Loading />
      ) : (
        <dl className="facts">
          <dt>Lo que le trae</dt>
          <dd>
            {a.need ? <span className="pre">{a.need}</span> : <span className="muted">—</span>}
            {a.topics && a.topics.length > 0 && <span className="muted"> · {a.topics.map(prettySlug).join(', ')}</span>}
          </dd>
          <dt>Abierta a</dt>
          <dd>{a.openness && a.openness.length > 0 ? a.openness.map(prettySlug).join(', ') : <span className="muted">—</span>}</dd>
          <dt>Le funciona</dt>
          <dd>
            {a.works.length > 0 ? (
              a.works.map((w) => `${w.title} (${String(w.avg).replace('.', ',')} de 5, ${w.times} ${w.times === 1 ? 'vez' : 'veces'})`).join(' · ')
            ) : (
              <span className="muted">
                {a.marked > 0 ? `Marcó ${int(a.marked)} prácticas; ninguna con 4 o 5 todavía` : 'Todavía no califica prácticas'}
              </span>
            )}
          </dd>
          <dt>No le funciona</dt>
          <dd>
            {[
              ...a.low_rated.map((w) => `${w.title} (${String(w.avg).replace('.', ',')} de 5)`),
              ...a.dismissed.map((d) => `${prettySlug(d.slug)}: «No me hace sentido» (${date(d.at)})`),
            ].join(' · ') || <span className="muted">—</span>}
          </dd>
          <dt>Guardó</dt>
          <dd>{a.saved.length > 0 ? a.saved.map(prettySlug).join(', ') : <span className="muted">—</span>}</dd>
          <dt>Rutina</dt>
          <dd>
            {a.proposals.total > 0
              ? `Aceptó ${a.proposals.accepted} de ${a.proposals.total} propuestas de cambio`
              : <span className="muted">Sin propuestas de cambio respondidas</span>}
          </dd>
          <dt>Lo que Natus sabe</dt>
          <dd>
            {a.memory_count > 0 ? (
              <>
                {int(a.memory_count)} recuerdos · {a.memory.slice(0, 4).map((m) => `«${m.content}»`).join(' · ')}
              </>
            ) : (
              <span className="muted">Nada todavía (la memoria necesita Premium y su permiso)</span>
            )}
          </dd>
          <dt>Cómo usa el chat</dt>
          <dd>
            {int(a.chat_month)} {a.chat_month === 1 ? 'mensaje' : 'mensajes'} este mes
            {a.chat_hour !== null && ` · escribe más a las ${String(a.chat_hour).padStart(2, '0')}:00`}
          </dd>
          <dt>Activada</dt>
          <dd>{a.first_value_at ? `Sí, desde el ${date(a.first_value_at)}` : <span className="muted">Todavía no</span>}</dd>
        </dl>
      )}
    </Section>
  );
}

/** Friends and comparisons (owner, 23 Oct 2026): whom this person invited, and each friendship. Logged. */
function Friends({ id, name, onOpenPerson }: { id: string; name: string; onOpenPerson: (id: string) => void }) {
  const friends = useAsync(() => api.personFriends(id), [id]);
  const [open, setOpen] = useState<string | null>(null);
  const list = friends.data ?? [];
  const invited = list.filter((f) => f.invited_by_them);
  const arrived = invited.filter((f) => f.friend_arrived_by_invite).length;
  return (
    <Section title="Amigos y comparaciones">
      {friends.error && <ErrorNote>{friends.error}</ErrorNote>}
      {friends.loading && !friends.data ? (
        <Loading />
      ) : list.length === 0 ? (
        <p className="muted">Todavía sin amigos en Natus.</p>
      ) : (
        <div className="stack-s">
          <p>
            {invited.length === 0
              ? 'No ha invitado a nadie que aceptara.'
              : `Invitó a ${int(invited.length)} ${invited.length === 1 ? 'persona que aceptó' : 'personas que aceptaron'}${
                  arrived ? (arrived === 1 ? ', y 1 llegó nueva a Natus por su invitación' : `, y ${int(arrived)} llegaron nuevas a Natus por su invitación`) : ''
                }.`}{' '}
            Tiene {int(list.length)} {list.length === 1 ? 'amistad' : 'amistades'} en total.
          </p>
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Amigo</th>
                  <th>Quién invitó</th>
                  <th>Desde</th>
                  <th className="r">Comparaciones</th>
                  <th>Llegó por su invitación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.friendship_id} tabIndex={0} onClick={() => setOpen(f.friendship_id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(f.friendship_id)}>
                    <td>{f.friend_name ?? 'Sin nombre'}</td>
                    <td>{f.invited_by_them ? name : f.friend_name ?? 'Su amigo'}</td>
                    <td>{date(f.since)}</td>
                    <td className="r">{int(f.comparisons)}</td>
                    <td>{f.invited_by_them ? (f.friend_arrived_by_invite ? 'sí (estimado)' : <span className="muted">no, ya tenía cuenta</span>) : <span className="muted">—</span>}</td>
                    <td>
                      {f.status === 'removed' ? (
                        <span className="muted">
                          terminada{f.ended_at ? ` el ${date(f.ended_at)}` : ''}
                          {f.ended_by_them ? ` por ${name}` : ''}
                        </span>
                      ) : (
                        'activa'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Toca un amigo para ver qué pasó entre los dos. Queda registrado para las dos personas.</p>
          {open && <FriendshipView id={open} onClose={() => setOpen(null)} onOpenPerson={onOpenPerson} />}
        </div>
      )}
    </Section>
  );
}

const ASPECT_FLOW: Record<string, string> = { fluye: 'fluye', pide_trabajo: 'pide trabajo' };

/** One friendship: who invited, who accepted, its comparisons. The text only while it lasts (owner, 23 Oct 2026). */
function FriendshipView({ id, onClose, onOpenPerson }: { id: string; onClose: () => void; onOpenPerson: (id: string) => void }) {
  const fs = useAsync(() => api.friendship(id), [id]);
  const [read, setRead] = useState<string | null>(null);
  const f: Friendship | null | undefined = fs.data;
  const nameOf = (uid: string) => (f && uid === f.requester.id ? f.requester.name : f?.addressee.name) ?? 'Sin nombre';
  return (
    <div className="friendship">
      <div className="row-between">
        <h3 className="h-section">{f ? `${f.requester.name ?? 'Sin nombre'} y ${f.addressee.name ?? 'Sin nombre'}` : 'Amistad'}</h3>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
      {fs.error && <ErrorNote>{fs.error}</ErrorNote>}
      {!f ? (
        fs.loading && <Loading />
      ) : (
        <div className="stack-s">
          <dl className="facts">
            <dt>Invitó</dt>
            <dd>{f.requester.name ?? 'Sin nombre'}</dd>
            <dt>Aceptó</dt>
            <dd>
              {f.addressee.name ?? 'Sin nombre'}
              {f.addressee.arrived_by_invite && <span className="muted"> · llegó nuevo a Natus por la invitación (estimado)</span>}
            </dd>
            <dt>Amigos desde</dt>
            <dd>{dateTime(f.since)}</dd>
            <dt>Estado</dt>
            <dd>
              {f.status === 'removed'
                ? `Terminada${f.ended_at ? ` el ${dateTime(f.ended_at)}` : ''}${f.ended_by ? ` por ${nameOf(f.ended_by)}` : ''}`
                : 'Activa'}
            </dd>
          </dl>
          <h3 className="h-sub">Sus comparaciones</h3>
          {f.comparisons.length === 0 ? (
            <p className="muted">Todavía no se comparan.</p>
          ) : (
            <ol className="timeline">
              {f.comparisons.map((c) => (
                <li key={c.id}>
                  <span className="muted">{dateTime(c.created_at)}</span> · la pidió {nameOf(c.asked_by)} · {int(c.aspects)} aspectos{' '}
                  {f.readable && c.result ? (
                    <button type="button" className="link small" onClick={() => setRead(read === c.id ? null : c.id)}>
                      {read === c.id ? 'Cerrar' : 'Leer la comparación'}
                    </button>
                  ) : null}
                  {read === c.id && c.result && <ComparisonText result={c.result} />}
                </li>
              ))}
            </ol>
          )}
          <p className="muted small">
            {f.readable
              ? 'Leer el texto queda registrado, como el chat.'
              : 'Se desconectaron: queda que la amistad existió, pero el texto de sus comparaciones ya no se puede leer, tampoco aquí.'}{' '}
            Cuándo abrió cada uno el link y la comparación, y su conversación con Davraz sobre ella, todavía no se registran.
          </p>
          <div className="row-start">
            <button type="button" className="btn ghost" onClick={() => onOpenPerson(f.requester.id)}>
              Ficha de {f.requester.name ?? 'quien invitó'}
            </button>
            <button type="button" className="btn ghost" onClick={() => onOpenPerson(f.addressee.id)}>
              Ficha de {f.addressee.name ?? 'quien aceptó'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonText({ result }: { result: Record<string, unknown> }) {
  const list = (k: string) => (Array.isArray(result[k]) ? (result[k] as unknown[]).map(str) : []);
  const aspects = (get(result, 'astro_dialogue', 'aspects') as Record_[] | undefined) ?? [];
  const parts: [string, string[]][] = [
    ['Lo bueno', list('lo_bueno')],
    ['Tener en cuenta', list('tener_en_cuenta')],
    ['Qué trabajar', list('que_trabajar')],
    ['Disfrutar juntos', list('disfrutar_juntos')],
  ];
  return (
    <div className="comparison-text">
      <p className="pre">{str(result['headline'])}</p>
      {parts.map(([t, items]) =>
        items.length ? (
          <div key={t}>
            <p className="h-sub">{t}</p>
            <ul>
              {items.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {aspects.length > 0 && (
        <div>
          <p className="h-sub">Aspectos</p>
          <ul>
            {aspects.map((a, i) => (
              <li key={i}>
                {str(a['a_body'])} {str(a['type'])} {str(a['b_body'])}
                {a['flow'] ? <span className="muted"> · {ASPECT_FLOW[str(a['flow'])] ?? str(a['flow'])}</span> : null}: {str(a['reading'])}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
