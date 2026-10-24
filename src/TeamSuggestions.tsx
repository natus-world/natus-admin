import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type TeamSuggestion } from './api';
import { dateTime } from './format';
import { messageOf } from './ui';

/**
 * «Sugerir un cambio» (owner, 23 Oct 2026): the team's suggestions about the
 * panel, kept in the database (`admin_suggestions`) so none is lost, each
 * with the section it was written from. Every admin reads them all.
 */
export function TeamSuggestions({ section, sections, onGo }: {
  section: string;
  sections: { key: string; label: string }[];
  onGo: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<TeamSuggestion[] | null>(null);
  const [text, setText] = useState('');
  const [about, setAbout] = useState(section);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const labels = new Map([['general', 'Todo el panel'], ...sections.map((s) => [s.key, s.label] as [string, string])]);

  const load = useCallback(() => {
    api
      .teamSuggestions()
      .then(setList)
      .catch((e: unknown) => setStatus({ text: messageOf(e), error: true }));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [open, load]);
  useEffect(() => {
    if (!text.trim()) setAbout(section);
  }, [section]);
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, list?.length]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body) {
      setStatus({ text: 'Escribe algo antes de enviar.', error: true });
      return;
    }
    setBusy(true);
    setStatus({ text: 'Enviando…' });
    try {
      await api.addTeamSuggestion(about, body);
      setText('');
      setStatus({ text: 'Guardada. Gracias.' });
      load();
    } catch (e) {
      setStatus({ text: `No se guardó: ${messageOf(e)}. Tu texto sigue aquí; vuelve a enviar.`, error: true });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (armed !== id) {
      setArmed(id);
      return;
    }
    setArmed(null);
    try {
      await api.deleteTeamSuggestion(id);
      load();
    } catch (e) {
      setStatus({ text: messageOf(e), error: true });
    }
  };

  return (
    <>
      {!open && (
        <button type="button" className="sug-fab" onClick={() => setOpen(true)} aria-expanded={false}>
          <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 3h12v8H6l-4 3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Sugerir un cambio {list && list.length > 0 && <span className="n">{list.length}</span>}
        </button>
      )}
      {open && (
        <aside className="sug-panel" role="dialog" aria-labelledby="sug-title">
          <div className="sug-head">
            <div>
              <span className="kick">Panel de admin</span>
              <h2 id="sug-title">Sugerencias</h2>
            </div>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </div>
          <div className="sug-body" ref={listRef}>
            <p className="sug-intro">
              Escribe lo que cambiarías del panel. Queda guardado con la sección donde estabas, y lo leen todos los que administran Natus.
            </p>
            {list === null ? (
              <p className="sug-empty">Cargando las sugerencias…</p>
            ) : list.length === 0 ? (
              <p className="sug-empty">Todavía no hay sugerencias. Escribe la primera abajo.</p>
            ) : (
              list.map((s) => (
                <article key={s.id} className={`sm${s.mine ? ' mine' : ''}`}>
                  <div className="sm-h">
                    <b>{s.mine ? 'Tú' : s.author_name ?? 'Alguien del equipo'}</b>
                    <button
                      type="button"
                      className="sm-sec"
                      disabled={!labels.has(s.section) || s.section === 'general'}
                      onClick={() => {
                        onGo(s.section);
                        if (window.innerWidth <= 560) setOpen(false);
                      }}
                    >
                      {labels.get(s.section) ?? 'Todo el panel'}
                    </button>
                    <span>{dateTime(s.created_at)}</span>
                    {s.mine && (
                      <button type="button" className="sm-del" onClick={() => void remove(s.id)}>
                        {armed === s.id ? '¿Borrar? Toca otra vez' : 'Borrar'}
                      </button>
                    )}
                  </div>
                  <p className="sm-t">{s.body}</p>
                </article>
              ))
            )}
          </div>
          <form
            className="sug-foot"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label>
              Sobre
              <select value={about} onChange={(e) => setAbout(e.target.value)}>
                <option value="general">Todo el panel</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Por ejemplo: en ¿Pagan? me gustaría ver primero cuánto entra este mes"
              aria-label="Tu sugerencia"
            />
            <div className="sug-row">
              <span className={`st${status?.error ? ' err' : ''}`}>{status?.text}</span>
              <button type="submit" className="btn" disabled={busy}>
                Enviar
              </button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
