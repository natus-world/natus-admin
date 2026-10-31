import { useState } from 'react';
import { api } from '../api';
import { ErrorNote, Section, messageOf } from '../ui';

const MONTHS = [
  { value: '1', label: '1 mes' },
  { value: '2', label: '2 meses' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '', label: 'Sin término' },
];

/** Premium given by hand: for the people who review the app, or as a gift. */
export function Gift({ onOpenPerson }: { onOpenPerson: (id: string) => void }) {
  const [email, setEmail] = useState('');
  const [months, setMonths] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; email: string } | null>(null);

  const give = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const id = await api.grantPremium(email.trim(), months ? Number(months) : null);
      setDone({ id, email: email.trim() });
      setEmail('');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack narrow">
      <Section title="Regalar Premium">
        <p className="muted">
          Escribe el correo con que la persona entró a Natus con Google. No se le cobra nada, en su perfil ve «Te lo
          regalamos» y no cuenta como pagada en tus números. Se le puede quitar desde su ficha.
        </p>
        <form
          className="stack-s"
          onSubmit={(e) => {
            e.preventDefault();
            void give();
          }}
        >
          <input type="email" required placeholder="correo@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo" />
          <div className="inline-form">
            <select value={months} onChange={(e) => setMonths(e.target.value)} aria-label="Por cuánto tiempo">
              {MONTHS.map((m) => (
                <option key={m.label} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn" disabled={busy || !email.trim()}>
              Regalar Premium
            </button>
          </div>
        </form>
        {error && <ErrorNote>{error}</ErrorNote>}
        {done && (
          <p className="ok">
            Listo: {done.email} tiene Premium.{' '}
            <button type="button" className="link" onClick={() => onOpenPerson(done.id)}>
              Ver su ficha →
            </button>
          </p>
        )}
      </Section>
    </div>
  );
}
