import { useEffect, useState } from 'react';
import { api, type ContentKind } from '../api';
import { date, dateTime, int, usd } from '../format';
import { KINDS, ONBOARDING, MONEY, USE, PAYWALL_PLACE, PLAN, label } from '../labels';
import { ErrorNote, Loading, Section, Value, messageOf, useAsync } from '../ui';

const STEP_LABEL: Record<string, string> = Object.fromEntries(
  [...ONBOARDING, ...USE, ...MONEY, { key: 'app_opened', label: 'Abrió la app' }].map((s) => [s.key, s.label]),
);

export function People({ open, onOpen }: { open: string | null; onOpen: (id: string | null) => void }) {
  if (open) return <PersonView id={open} onBack={() => onOpen(null)} />;
  return <PeopleList onOpen={onOpen} />;
}

function PeopleList({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  const people = useAsync(() => api.people(search), [search]);

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
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>País</th>
                  <th>Plan</th>
                  <th>Cuenta desde</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {(people.data ?? []).map((p) => (
                  <tr key={p.user_id} onClick={() => onOpen(p.user_id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.user_id)}>
                    <td>{p.name ?? <span className="muted">Sin nombre</span>}</td>
                    <td>{p.email ?? '—'}</td>
                    <td>{p.country ?? '—'}</td>
                    <td>
                      <span className={`tag ${p.plan}`}>{label(PLAN, p.plan)}</span>
                    </td>
                    <td>{date(p.created_at)}</td>
                    <td>{date(p.last_opened)}</td>
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

type Record_ = Record<string, unknown>;
const get = (r: Record_ | undefined, ...path: string[]): unknown =>
  path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record_)[k] : undefined), r);
const str = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

function PersonView({ id, onBack }: { id: string; onBack: () => void }) {
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

          <Section title="Su recorrido">
            <ol className="timeline">
              {((p['steps'] as Record_[] | undefined) ?? []).map((s, i) => (
                <li key={i}>
                  <span className="muted">{dateTime(str(s['at']))}</span>{' '}
                  {STEP_LABEL[str(s['step'])] ?? str(s['step'])}
                  {s['detail'] ? <span className="muted"> · {label(PAYWALL_PLACE, str(s['detail']))}</span> : null}
                  {s['source'] ? <span className="muted"> · llegó desde {str(s['source'])} {str(s['campaign'])}</span> : null}
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
