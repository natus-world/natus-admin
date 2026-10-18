import { useState } from 'react';
import { api } from '../api';
import { dateTime, int } from '../format';
import { SURFACE, label } from '../labels';
import { ErrorNote, Loading, Range, Section, useAsync } from '../ui';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 3650, label: 'Todo' },
];

const CATEGORY: Record<string, string> = {
  ideacion: 'Ideación suicida',
  autolesion: 'Autolesión',
  abuso: 'Abuso',
  psicosis: 'Psicosis',
  panico: 'Pánico',
  indirecto: 'Señal indirecta',
};

/**
 * Each crisis alert (owner, 18 Oct 2026): who, when, where it fired, what was
 * matched and the excerpt. Opening this list is logged.
 */
export function Alerts({ onOpenPerson }: { onOpenPerson: (id: string) => void }) {
  const [days, setDays] = useState(7);
  const list = useAsync(() => api.crisisList(days), [days]);
  const rows = list.data ?? [];

  return (
    <div className="stack">
      <div className="row-between">
        <p className="muted">
          Lo que hizo saltar el detector, la más reciente arriba. Natus no avisa a nadie en tiempo real: esto es para
          revisar.
        </p>
        <Range value={days} onChange={setDays} options={RANGES} />
      </div>
      {list.error && <ErrorNote>{list.error}</ErrorNote>}
      <Section title={list.data ? rows.length === 1 ? "1 alerta" : `${int(rows.length)} alertas` : 'Alertas'}>
        {list.loading && !list.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="muted">Sin alertas en este rango.</p>
        ) : (
          <div className="items">
            {rows.map((a) => (
              <article key={a.id} className="item alert-item">
                <header className="alert-head">
                  <div>
                    <b>{a.name ?? 'Sin nombre'}</b>
                    <span className="muted"> · {a.email ?? 'sin cuenta'}</span>
                  </div>
                  <span className="muted small">{dateTime(a.at)}</span>
                </header>
                <p className="alert-tags">
                  <span className={`tag ${a.severity === 'high' ? 'alert' : ''}`}>
                    {a.severity === 'high' ? 'Alta' : 'Baja'}
                  </span>
                  <span className="tag">{CATEGORY[a.category] ?? a.category}</span>
                  <span className="tag">{label(SURFACE, a.surface)}</span>
                  {a.from_clinical && <span className="tag">Por sus respuestas de cuidado</span>}
                  {a.not_their_case && <span className="tag gift">Dijo «no es mi caso»</span>}
                </p>
                {a.excerpt && <blockquote className="excerpt pre">{a.excerpt}</blockquote>}
                {a.matched.length > 0 && (
                  <p className="muted small">Palabras detectadas: {a.matched.join(', ')}</p>
                )}
                {a.has_account ? (
                  <button type="button" className="link" onClick={() => onOpenPerson(a.user_id)}>
                    Ver su ficha completa →
                  </button>
                ) : (
                  <p className="muted small">No creó cuenta: no tiene ficha.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
