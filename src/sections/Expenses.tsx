import { useState } from 'react';
import { api, type Expense } from '../api';
import { date, usd } from '../format';
import { ErrorNote, Loading, Section, Stat, messageOf, useAsync } from '../ui';

const FREQ: Record<Expense['frequency'], string> = { monthly: 'Mensual', yearly: 'Anual', usage: 'Por uso', once: 'Pago único' };
const STATUS: Record<Expense['status'], string> = { active: 'Activo', to_buy: 'Por contratar', canceled: 'Cancelado' };
const PAID: Record<Expense['paid_by'], string> = { personal: 'Personal', company: 'Empresa', free: 'No se paga' };
const ORDER: Expense['status'][] = ['active', 'to_buy', 'canceled'];

/** A fixed monthly figure: yearly divided by 12; usage and one-off are not fixed. */
function monthly(e: Expense): number {
  const a = Number(e.amount_usd ?? 0);
  if (e.frequency === 'monthly') return a;
  if (e.frequency === 'yearly') return a / 12;
  return 0;
}

type Draft = {
  service: string;
  purpose: string;
  plan: string;
  amount_usd: string;
  frequency: Expense['frequency'];
  status: Expense['status'];
  paid_by: Expense['paid_by'];
  since: string;
  notes: string;
};

const EMPTY: Draft = {
  service: '', purpose: '', plan: '', amount_usd: '', frequency: 'monthly',
  status: 'active', paid_by: 'personal', since: '', notes: '',
};

const toDraft = (e: Expense): Draft => ({
  service: e.service, purpose: e.purpose, plan: e.plan,
  amount_usd: e.amount_usd === null ? '' : String(e.amount_usd),
  frequency: e.frequency, status: e.status, paid_by: e.paid_by,
  since: e.since ?? '', notes: e.notes,
});

/**
 * What Natus pays for its technology (owner, 18 Oct 2026): one row per
 * service, so the finances can move to the company's account. The model
 * spend of the month comes from the overview, not typed by hand.
 */
export function Expenses() {
  const list = useAsync(() => api.expenses(), []);
  const overview = useAsync(() => api.overview(), []);
  const [filter, setFilter] = useState<'all' | Expense['status']>('all');
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sure, setSure] = useState(false);

  const rows = list.data ?? [];
  const active = rows.filter((e) => e.status === 'active');
  const toBuy = rows.filter((e) => e.status === 'to_buy');
  const ai = Number(overview.data?.ai_spend_month ?? 0);
  const shown = rows
    .filter((e) => filter === 'all' || e.status === filter)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.service.localeCompare(b.service));

  const save = async () => {
    if (!editing || !editing.draft.service.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveExpense(editing.id, { ...editing.draft });
      setEditing(null);
      list.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    if (!sure) {
      setSure(true);
      return;
    }
    setBusy(true);
    try {
      await api.deleteExpense(editing.id);
      setEditing(null);
      list.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
      setSure(false);
    }
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setEditing((cur) => (cur ? { ...cur, draft: { ...cur.draft, [k]: v } } : cur));

  return (
    <div className="stack">
      <p className="muted">
        Cada servicio que hace funcionar Natus: qué plan tiene, cuánto cuesta y quién lo paga. Sirve para pasar todo a la
        cuenta de la empresa.
      </p>
      {list.error && <ErrorNote>{list.error}</ErrorNote>}
      <div className="stats">
        <Stat label="Fijo mensual hoy" value={usd(active.reduce((s, e) => s + monthly(e), 0))} note="Servicios activos" />
        <Stat
          label="Fijo al contratar lo pendiente"
          value={usd([...active, ...toBuy].reduce((s, e) => s + monthly(e), 0))}
          note={toBuy.length ? `Activos + ${toBuy.length} por contratar` : 'Nada por contratar'}
        />
        <Stat label="IA este mes" value={overview.data ? usd(ai) : '…'} note="Anthropic, del Resumen" />
        <Stat
          label="Pagado a título personal"
          value={usd(active.filter((e) => e.paid_by === 'personal').reduce((s, e) => s + monthly(e), 0))}
          note="Al mes, más la IA, por pasar a la empresa"
        />
      </div>

      <div className="row-between">
        <div className="seg" role="radiogroup">
          {(['all', 'active', 'to_buy', 'canceled'] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : STATUS[f] + (f === 'canceled' ? 's' : f === 'active' ? 's' : '')}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => { setEditing({ id: null, draft: EMPTY }); setSure(false); setError(null); }}>
          Agregar gasto
        </button>
      </div>

      {editing && (
        <Section title={editing.id ? 'Editar gasto' : 'Agregar gasto'}>
          <form
            className="stack-s"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="form-grid">
              <label>Servicio<input required value={editing.draft.service} onChange={(e) => set('service', e.target.value)} placeholder="Supabase" /></label>
              <label>Para qué sirve<input value={editing.draft.purpose} onChange={(e) => set('purpose', e.target.value)} /></label>
              <label>Plan<input value={editing.draft.plan} onChange={(e) => set('plan', e.target.value)} placeholder="Pro" /></label>
              <label>Monto (US$)<input type="number" step="0.01" min="0" value={editing.draft.amount_usd} onChange={(e) => set('amount_usd', e.target.value)} /></label>
              <label>Frecuencia
                <select value={editing.draft.frequency} onChange={(e) => set('frequency', e.target.value as Draft['frequency'])}>
                  {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Estado
                <select value={editing.draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Quién lo paga
                <select value={editing.draft.paid_by} onChange={(e) => set('paid_by', e.target.value as Draft['paid_by'])}>
                  {Object.entries(PAID).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Desde<input type="date" value={editing.draft.since} onChange={(e) => set('since', e.target.value)} /></label>
            </div>
            <label>Notas<textarea rows={3} value={editing.draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Con qué tarjeta, cuándo renueva, por qué se eligió" /></label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="form-actions">
              {editing.id && (
                <button type="button" className="btn ghost danger" disabled={busy} onClick={() => void remove()}>
                  {sure ? '¿Borrar de verdad?' : 'Borrar'}
                </button>
              )}
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className="btn" disabled={busy || !editing.draft.service.trim()}>Guardar</button>
            </div>
          </form>
        </Section>
      )}

      <Section title="Servicios">
        {list.loading && !list.data ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Servicio</th><th>Plan</th><th>Estado</th><th className="num">Monto</th><th>Frecuencia</th><th>Paga</th><th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} tabIndex={0}
                    onClick={() => { setEditing({ id: e.id, draft: toDraft(e) }); setSure(false); setError(null); }}
                    onKeyDown={(k) => { if (k.key === 'Enter') { setEditing({ id: e.id, draft: toDraft(e) }); setSure(false); } }}>
                    <td>{e.service}<span className="sub">{e.purpose}</span></td>
                    <td>{e.plan || '—'}{e.since && <span className="sub">Desde {date(e.since)}</span>}</td>
                    <td><span className={`tag st-${e.status}`}>{STATUS[e.status]}</span></td>
                    <td className="num">
                      {e.service.startsWith('Anthropic') && e.amount_usd === null ? usd(ai) : e.amount_usd === null ? 'Por definir' : usd(Number(e.amount_usd))}
                      {e.frequency === 'yearly' && e.amount_usd !== null && <span className="sub">{usd(monthly(e))} al mes</span>}
                      {e.service.startsWith('Anthropic') && e.amount_usd === null && <span className="sub">este mes</span>}
                    </td>
                    <td>{FREQ[e.frequency]}</td>
                    <td>{PAID[e.paid_by]}</td>
                    <td className="notes">{e.notes}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={7} className="muted">Nada con ese estado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <p className="note">
        Montos en dólares, como cobran los servicios. Un gasto anual se cuenta dividido en 12. «Por uso» no entra en el fijo
        mensual.
      </p>
    </div>
  );
}
