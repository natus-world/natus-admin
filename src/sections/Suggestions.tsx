import { useState } from 'react';
import { api, type Broadcast, type Segment } from '../api';
import { dateTime, int } from '../format';
import { describe, isEmpty } from '../segment';
import { ErrorNote, Loading, Section, messageOf, useAsync } from '../ui';

/**
 * «Sugerencias» (18 Oct 2026; two tabs since 27 Oct 2026, owner): the
 * conversations with people who wrote, and the messages the team sends to
 * many at once. The person sees either as a dot on «Sugerir» and the message
 * signed «Equipo Natus»; each team message shows when they opened it.
 */
export function Suggestions({ onOpenPerson, segment }: { onOpenPerson: (id: string) => void; segment?: Segment }) {
  const [tab, setTab] = useState<'conv' | 'todos'>('conv');
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const inbox = useAsync(() => api.inbox(all), [all]);
  const sent = useAsync(() => api.broadcasts(), []);
  const conv = inbox.data ?? [];
  const unread = conv.reduce((n, r) => n + Number(r.unread), 0);

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Sugerencias">
        <button type="button" role="tab" aria-selected={tab === 'conv'} className={tab === 'conv' ? 'on' : ''} onClick={() => setTab('conv')}>
          Conversaciones ({int(conv.length)}){unread > 0 ? ` · ${int(unread)} sin leer` : ''}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'todos'} className={tab === 'todos' ? 'on' : ''} onClick={() => setTab('todos')}>
          Mensajes a todos ({int((sent.data ?? []).length)})
        </button>
      </div>

      {tab === 'conv' ? (
        <div className="split">
          <Section
            title={unread > 0 ? `${int(unread)} sin leer` : 'Conversaciones'}
            aside={
              <div className="seg" role="group" aria-label="Quiénes">
                <button type="button" className={all ? '' : 'on'} onClick={() => setAll(false)}>
                  Escribieron
                </button>
                <button type="button" className={all ? 'on' : ''} onClick={() => setAll(true)}>
                  Todos
                </button>
              </div>
            }
          >
            {inbox.error && <ErrorNote>{inbox.error}</ErrorNote>}
            {inbox.loading && !inbox.data ? (
              <Loading />
            ) : conv.length === 0 ? (
              <p className="muted">Nadie ha escrito todavía{isEmpty(segment) ? '' : ' en este segmento'}.</p>
            ) : (
              <ul className="inbox">
                {conv.map((r) => (
                  <li key={r.user_id}>
                    <button type="button" className={open === r.user_id ? 'on' : ''} onClick={() => setOpen(r.user_id)}>
                      <span className="inbox-top">
                        <b>{r.name ?? r.email ?? 'Sin cuenta'}</b>
                        <span className="muted small">{dateTime(r.last_at)}</span>
                      </span>
                      <span className="inbox-body muted">
                        {r.last_author === 'team' ? 'Tú: ' : ''}
                        {r.last_body}
                      </span>
                      <span className="inbox-tags">
                        {r.last_broadcast && <span className="tag">Mensaje a todos</span>}
                        {r.last_author === 'team' && (
                          <span className={`small ${r.last_seen_at ? 'ok' : 'muted'}`}>{r.last_seen_at ? '✓ visto' : 'no lo ha visto'}</span>
                        )}
                        {Number(r.unread) > 0 && <span className="tag gift">{int(Number(r.unread))} sin leer</span>}
                        {r.crisis && <span className="tag alert">Señal de crisis</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="small muted">
              {all
                ? 'Todas las personas a las que el equipo les ha escrito, también solo con un mensaje a todos.'
                : 'Solo quienes escribieron o a quienes respondiste. «Todos» suma a quienes solo recibieron un mensaje a todos.'}
            </p>
          </Section>
          {open ? (
            <Thread key={open} id={open} onSent={inbox.reload} onOpenPerson={onOpenPerson} />
          ) : (
            <Section title="Elige una conversación">
              <p className="muted">A la izquierda están las personas que escribieron, la más reciente arriba.</p>
            </Section>
          )}
        </div>
      ) : (
        <Everybody
          segment={segment}
          list={sent.data ?? []}
          loading={sent.loading && !sent.data}
          error={sent.error}
          onSent={sent.reload}
          onOpenConversation={(id, answered) => {
            if (!answered) setAll(true);
            setOpen(id);
            setTab('conv');
          }}
        />
      )}
    </div>
  );
}

function Thread({ id, onSent, onOpenPerson }: { id: string; onSent: () => void; onOpenPerson: (id: string) => void }) {
  const thread = useAsync(() => api.thread(id), [id]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.reply(id, text.trim());
      setText('');
      thread.reload();
      onSent();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Conversación"
      aside={
        <button type="button" className="link" onClick={() => onOpenPerson(id)}>
          Ver su ficha →
        </button>
      }
    >
      {thread.loading && !thread.data ? (
        <Loading />
      ) : (
        <div className="chat">
          {(thread.data ?? []).map((m) => (
            <div key={m.id} className={`msg ${m.author === 'team' ? 'them' : 'me'}`}>
              <p className="msg-meta muted">
                {m.author === 'team' ? 'Equipo Natus' : 'La persona'} · {dateTime(m.created_at)}
                {m.broadcast ? ' · mensaje a todos' : ''}
                {m.screen ? ` · en ${m.screen}` : ''}
                {m.crisis_flagged ? ' · ' : ''}
                {m.crisis_flagged && <span className="tag alert">Señal de crisis</span>}
              </p>
              <p className="pre">{m.body}</p>
              {m.author === 'team' && (
                <p className={`msg-seen small ${m.read_at ? 'ok' : 'muted'}`}>{m.read_at ? `✓ Lo vio el ${dateTime(m.read_at)}` : 'Todavía no lo abre'}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {thread.error && <ErrorNote>{thread.error}</ErrorNote>}
      <div className="reply">
        <textarea
          rows={3}
          value={text}
          placeholder="Responder. La persona ve un punto en «Sugerir» y lo lee ahí, dentro de la app."
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
        />
        <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => void send()}>
          Responder
        </button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
    </Section>
  );
}

function Everybody({ segment, list, loading, error, onSent, onOpenConversation }: {
  segment?: Segment;
  list: Broadcast[];
  loading: boolean;
  error: string | null;
  onSent: () => void;
  onOpenConversation: (id: string, answered: boolean) => void;
}) {
  return (
    <div className="stack">
      <Compose segment={segment} onSent={onSent} />
      <Section title="Enviados">
        {error && <ErrorNote>{error}</ErrorNote>}
        {loading ? (
          <Loading />
        ) : list.length === 0 ? (
          <p className="muted">Todavía no se ha mandado ningún mensaje a todos.</p>
        ) : (
          <ul className="bcast-list">
            {list.map((b) => (
              <BroadcastItem key={b.id} b={b} onOpenConversation={onOpenConversation} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Compose({ segment, onSent }: { segment?: Segment; onSent: () => void }) {
  const audience = useAsync(() => api.broadcastAudience(), []);
  const [text, setText] = useState('');
  const [step, setStep] = useState<'write' | 'confirm'>('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const n = Number(audience.data ?? 0);
  const who = isEmpty(segment) ? 'todas las cuentas' : `las cuentas que ${describe(segment ?? {})}`;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const sentTo = await api.broadcastSend(text.trim(), n);
      setDone(Number(sentTo));
      setText('');
      setStep('write');
      onSent();
    } catch (e) {
      setError(messageOf(e));
      audience.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Nuevo mensaje a todos">
      {done !== null && <p className="ok">✓ Enviado a {int(done)} personas. Lo verán con un punto en «Sugerir» la próxima vez que abran la app.</p>}
      {step === 'write' ? (
        <div className="stack-s">
          <textarea
            rows={5}
            value={text}
            placeholder={'Hola, te escribe el equipo de Natus.\n\n…'}
            onChange={(e) => {
              setText(e.target.value);
              setDone(null);
            }}
            maxLength={4000}
            aria-label="Mensaje"
          />
          <p className="small muted">
            Lo recibirán <b>{audience.loading ? '…' : int(n)}</b> {n === 1 ? 'persona' : 'personas'}: {who}, sin el equipo. Para elegir a
            quiénes, usa «Segmento» arriba.
          </p>
          <div className="row-start">
            <button type="button" className="btn" disabled={!text.trim() || n === 0 || audience.loading} onClick={() => setStep('confirm')}>
              Revisar antes de enviar
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-s">
          <p className="muted small">Así lo verán al tocar «Sugerir»:</p>
          <div className="bcast-preview">
            <p className="bcast-preview-who">Equipo Natus</p>
            <p className="pre">{text.trim()}</p>
          </div>
          <p>
            Va a <b>{int(n)}</b> {n === 1 ? 'persona' : 'personas'} ({who}). No se puede deshacer.
          </p>
          <div className="row-start">
            <button type="button" className="btn" disabled={busy} onClick={() => void send()}>
              {busy ? 'Enviando…' : `Enviar a ${int(n)} ${n === 1 ? 'persona' : 'personas'}`}
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => setStep('write')}>
              Volver a editar
            </button>
          </div>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </Section>
  );
}

function BroadcastItem({ b, onOpenConversation }: { b: Broadcast; onOpenConversation: (id: string, answered: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const recipients = Number(b.recipients);
  const seen = Number(b.seen);
  const pct = recipients ? Math.round((seen / recipients) * 100) : 0;
  return (
    <li className="bcast">
      <div className="bcast-head">
        <span className="muted small">
          {dateTime(b.created_at)}
          {b.author_name ? ` · ${b.author_name}` : ''}
          {!isEmpty(b.segment) ? ` · a cuentas que ${describe(b.segment)}` : ''}
        </span>
        {b.personalized && <span className="tag">Un texto por persona</span>}
      </div>
      <p className={`pre bcast-body${full ? '' : ' clamp'}`}>{b.body}</p>
      {b.body.length > 160 && (
        <button type="button" className="link small" onClick={() => setFull(!full)}>
          {full ? 'Ver menos' : 'Ver el texto completo'}
        </button>
      )}
      <div className="bcast-stats">
        <span>
          Llegó a <b>{int(recipients)}</b>
        </span>
        <span>
          Lo vieron <b>{int(seen)}</b> <span className="muted">({pct}%)</span>
        </span>
        <span>
          Respondieron <b>{int(Number(b.answered))}</b>
        </span>
        <span className="bcast-bar" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </span>
        <button type="button" className="link small" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Cerrar' : 'Ver quiénes'}
        </button>
      </div>
      {open && <Recipients id={b.id} onOpenConversation={onOpenConversation} />}
    </li>
  );
}

function Recipients({ id, onOpenConversation }: { id: string; onOpenConversation: (id: string, answered: boolean) => void }) {
  const list = useAsync(() => api.broadcastRecipients(id), [id]);
  if (list.error) return <ErrorNote>{list.error}</ErrorNote>;
  if (!list.data) return <Loading />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Lo vio</th>
            <th>Respondió</th>
          </tr>
        </thead>
        <tbody>
          {list.data.map((r) => (
            <tr key={r.user_id}>
              <td>
                <button type="button" className="link" onClick={() => onOpenConversation(r.user_id, r.answered)}>
                  {r.name ?? 'Sin nombre'}
                </button>
                <br />
                <span className="muted small">{r.email ?? '—'}</span>
              </td>
              <td>{r.read_at ? dateTime(r.read_at) : <span className="muted">todavía no</span>}</td>
              <td>
                {r.answered ? (
                  <button type="button" className="link small" onClick={() => onOpenConversation(r.user_id, true)}>
                    Sí, ver la conversación →
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
