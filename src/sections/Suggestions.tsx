import { useState } from 'react';
import { api } from '../api';
import { dateTime, int } from '../format';
import { ErrorNote, Loading, Section, messageOf, useAsync } from '../ui';

/**
 * The suggestions people leave from the app (18 Oct 2026). One line per
 * person; opening it shows the conversation, marks it read, and lets the
 * team answer — the answer appears in the person's own sheet in the app.
 */
export function Suggestions({ onOpenPerson }: { onOpenPerson: (id: string) => void }) {
  const inbox = useAsync(() => api.inbox(), []);
  const [open, setOpen] = useState<string | null>(null);
  const unread = (inbox.data ?? []).reduce((n, r) => n + Number(r.unread), 0);

  return (
    <div className="split">
      <Section title={unread > 0 ? `${int(unread)} sin leer` : 'Conversaciones'}>
        {inbox.error && <ErrorNote>{inbox.error}</ErrorNote>}
        {inbox.loading && !inbox.data ? (
          <Loading />
        ) : (inbox.data ?? []).length === 0 ? (
          <p className="muted">Todavía nadie ha dejado una sugerencia.</p>
        ) : (
          <ul className="inbox">
            {(inbox.data ?? []).map((r) => (
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
                    {Number(r.unread) > 0 && <span className="tag gift">{int(Number(r.unread))} sin leer</span>}
                    {r.crisis && <span className="tag alert">Señal de crisis</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {open ? (
        <Thread key={open} id={open} onSent={inbox.reload} onOpenPerson={onOpenPerson} />
      ) : (
        <Section title="Elige una conversación">
          <p className="muted">A la izquierda están las personas que escribieron, la más reciente arriba.</p>
        </Section>
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
                {m.screen ? ` · en ${m.screen}` : ''}
                {m.crisis_flagged ? ' · ' : ''}
                {m.crisis_flagged && <span className="tag alert">Señal de crisis</span>}
              </p>
              <p className="pre">{m.body}</p>
            </div>
          ))}
        </div>
      )}
      {thread.error && <ErrorNote>{thread.error}</ErrorNote>}
      <div className="reply">
        <textarea
          rows={3}
          value={text}
          placeholder="Responder. La persona lo ve en Sugerencias, dentro de la app."
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
