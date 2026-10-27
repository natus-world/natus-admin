import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api } from './api';
import { ErrorNote, Loading, messageOf, PeriodPicker, presetPeriod, previousPeriod, useAsync, type Period } from './ui';
import { People } from './sections/People';
import { Pulso } from './sections/Pulso';
import { Llegan } from './sections/Llegan';
import { Sirve } from './sections/Sirve';
import { Vuelven } from './sections/Vuelven';
import { Pagan } from './sections/Pagan';
import { TipLayer } from './charts';
import { TeamSuggestions } from './TeamSuggestions';
import { date, int } from './format';
import type { ViewProps } from './sections/views';
import { Suggestions } from './sections/Suggestions';
import { Gift } from './sections/Gift';
import { Alerts } from './sections/Alerts';
import { Expenses } from './sections/Expenses';
import { Errors } from './sections/Errors';
import { Quienes } from './sections/Quienes';
import { Macro } from './sections/Macro';
import { SegmentBar, describe, isEmpty } from './segment';
import type { Segment } from './api';

/**
 * The sections of the panel, ordered by four questions (owner, 23 Oct 2026,
 * from the approved mockup «Panel Natus como la app»): the Pulso first, then
 * ¿Llegan? ¿Les sirve? ¿Vuelven? ¿Pagan?, each person, what needs care, and
 * the settings. Adding one is one entry here and its file in `sections/`.
 */
type Route = { section: string; id: string | null };
type Nav = { open: (r: Route) => void };
type Ctx = { route: Route; nav: Nav; view: ViewProps };

/** `question`: the period and the comparison on top. `segment`: the filter on top (owner, 24 Oct 2026). `own`: draws its own page head. */
const SECTIONS: { key: string; label: string; group: string; question?: boolean; segment?: boolean; own?: boolean; render: (c: Ctx) => ReactNode }[] = [
  { key: 'pulso', segment: true, label: 'Pulso', group: '', question: true, render: (c) => <Pulso {...c.view} /> },
  { key: 'macro', segment: true, label: 'Macro datos', group: '', question: true, render: (c) => <Macro {...c.view} /> },
  { key: 'llegan', segment: true, label: '¿Llegan?', group: 'Las cuatro preguntas', question: true, render: (c) => <Llegan {...c.view} /> },
  { key: 'sirve', segment: true, label: '¿Les sirve?', group: 'Las cuatro preguntas', question: true, render: (c) => <Sirve {...c.view} /> },
  { key: 'vuelven', segment: true, label: '¿Vuelven?', group: 'Las cuatro preguntas', question: true, render: (c) => <Vuelven {...c.view} /> },
  { key: 'pagan', segment: true, label: '¿Pagan?', group: 'Las cuatro preguntas', question: true, render: (c) => <Pagan {...c.view} /> },
  { key: 'quienes', label: 'Quiénes son', group: 'Cada persona', segment: true, own: true, render: (c) => <Quienes {...c.view} /> },
  {
    key: 'personas',
    label: 'Personas',
    group: 'Cada persona',
    segment: true,
    render: ({ route, nav }) => <People open={route.id} onOpen={(id) => nav.open({ section: 'personas', id })} />,
  },
  {
    key: 'alertas',
    label: 'Alertas de crisis',
    group: 'Cuidado',
    render: ({ nav }) => <Alerts onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
  {
    key: 'errores',
    label: 'Errores',
    group: 'Cuidado',
    render: ({ nav }) => <Errors onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
  {
    key: 'sugerencias',
    label: 'Sugerencias',
    group: 'Cuidado',
    segment: true,
    render: ({ nav, view }) => <Suggestions segment={view.segment} onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
  { key: 'gastos', label: 'Gastos fijos', group: 'Ajustes', render: () => <Expenses /> },
  {
    key: 'premium',
    label: 'Regalar Premium',
    group: 'Ajustes',
    render: ({ nav }) => <Gift onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
];

/** The sections before 23 Oct 2026, so an old bookmark still lands somewhere sensible. */
const OLD: Record<string, string> = { resumen: 'pulso', embudo: 'llegan', uso: 'sirve' };

function readHash(): Route {
  const [raw = 'pulso', id = null] = window.location.hash.replace(/^#\/?/, '').split('/');
  const section = OLD[raw] ?? raw;
  return { section: SECTIONS.some((s) => s.key === section) ? section : 'pulso', id: id || null };
}

function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => (window.location.hash = r.id ? `${r.section}/${r.id}` : r.section)];
}

type Access = { state: 'checking' } | { state: 'in'; role: string } | { state: 'refused'; message: string };

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>({ state: 'checking' });
  const [route, go] = useRoute();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    setAccess({ state: 'checking' });
    api
      .whoami()
      .then((me) => setAccess(me ? { state: 'in', role: me.role } : { state: 'refused', message: messageOf(new Error('not_admin')) }))
      .catch((e: unknown) => setAccess({ state: 'refused', message: messageOf(e) }));
  }, [userId]);

  if (session === undefined) return <Shell><Loading /></Shell>;
  if (!session) return <SignIn />;
  if (access.state === 'checking') return <Shell><Loading /></Shell>;
  if (access.state === 'refused') {
    return (
      <Shell>
        <div className="signin">
          <h1>Natus · Admin</h1>
          <ErrorNote>{access.message}</ErrorNote>
          <p className="muted">Entraste como {session.user.email}.</p>
          <button type="button" className="btn ghost" onClick={() => void supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </Shell>
    );
  }

  return <Panel email={session.user.email ?? ''} route={route} go={go} />;
}

function Panel({ email, route, go }: { email: string; route: Route; go: (r: Route) => void }) {
  const [period, setPeriod] = useState<Period>(() => presetPeriod('7'));
  const [compare, setCompare] = useState(true);
  const [segment, setSegment] = useState<Segment>({});
  const [version, setVersion] = useState(0);
  const [segError, setSegError] = useState<string | null>(null);
  useEffect(() => {
    api.segmentGet().then(
      (s) => {
        setSegment(s ?? {});
        if (!isEmpty(s)) setVersion((v) => v + 1);
      },
      () => undefined,
    );
  }, []);
  const changeSegment = (next: Segment) => {
    setSegError(null);
    api.segmentSet(next).then(
      (s) => {
        setSegment(s ?? {});
        setVersion((v) => v + 1);
      },
      (e: unknown) => setSegError(messageOf(e)),
    );
  };
  const pending = useAsync(() => api.pending(), [route.section]);
  const current = SECTIONS.find((s) => s.key === route.section) ?? SECTIONS[0]!;
  const prev = previousPeriod(period);
  const p = pending.data;
  const counts = {
    alertas: Number(p?.crisis_7d ?? 0),
    errores: Number(p?.app_errors_7d ?? 0),
    sugerencias: Number(p?.unread_suggestions ?? 0),
  };
  const view: ViewProps = {
    period,
    compare,
    onOpenPerson: (id) => go({ section: 'personas', id }),
    go: (section) => go({ section, id: null }),
    segment,
    onSegment: changeSegment,
  };
  const groups = [...new Set(SECTIONS.map((s) => s.group))];
  return (
    <div className="app v2">
      <div className="foto" aria-hidden="true" />
      <div className="velo" aria-hidden="true" />
      <TipLayer />
      <TeamSuggestions
        section={current.key}
        sections={SECTIONS.map((s) => ({ key: s.key, label: s.label }))}
        onGo={(key) => go({ section: key, id: null })}
      />
      <aside className="side">
        <p className="brand">
          Natus <em>admin</em>
          <small>Panel interno</small>
        </p>
        <nav>
          {groups.map((g) => (
            <div key={g || 'top'} className="nav-group">
              {g && <p className="grp">{g}</p>}
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <a key={s.key} href={`#${s.key}`} className={s.key === current.key ? 'on' : ''} aria-current={s.key === current.key ? 'page' : undefined}>
                  {s.label}
                  {(counts as Record<string, number>)[s.key] ? (
                    <span className={`cnt${s.key === 'alertas' ? '' : ' w'}`}>{int((counts as Record<string, number>)[s.key])}</span>
                  ) : null}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <p className="muted small">{email}</p>
          <button type="button" className="link small" onClick={() => void supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="bar">
          <div className="bar-row">
            {current.question && (
              <>
                <PeriodPicker value={period} onChange={setPeriod} />
                <select className="sel" value={compare ? 'si' : 'no'} onChange={(e) => setCompare(e.target.value === 'si')} aria-label="Comparar">
                  <option value="si">Comparar con el periodo anterior</option>
                  <option value="no">Sin comparar</option>
                </select>
              </>
            )}
            <div className="urgent">
              {counts.alertas > 0 && (
                <a className="chip crit" href="#alertas">
                  ▲ {int(counts.alertas)} {counts.alertas === 1 ? 'alerta de crisis' : 'alertas de crisis'} en 7 días
                </a>
              )}
              {counts.errores > 0 && (
                <a className="chip warn" href="#errores">
                  ● {int(counts.errores)} {counts.errores === 1 ? 'error' : 'errores'} en 7 días
                </a>
              )}
              {counts.sugerencias > 0 && (
                <a className="chip warn" href="#sugerencias">
                  ✉ {int(counts.sugerencias)} {counts.sugerencias === 1 ? 'sugerencia sin responder' : 'sugerencias sin responder'}
                </a>
              )}
            </div>
          </div>
          {current.segment && <SegmentBar segment={segment} onChange={changeSegment} version={version} />}
          {segError && <ErrorNote>{segError}</ErrorNote>}
          {current.question && (
            <p className="scope">
              Estás viendo <b>{range(period.from, period.to)}</b>
              {compare && (
                <>
                  {' '}
                  contra <b>{range(prev.from, prev.to)}</b>
                </>
              )}{' '}
              · hora de Chile · sin el equipo ni el robot de pruebas
              {!isEmpty(segment) && (
                <>
                  {' '}
                  · <b>solo cuentas que {describe(segment)}</b>
                </>
              )}
            </p>
          )}
        </div>
        <div key={version} className="page-slot">
          {current.question || current.own ? (
            current.render({ route, nav: { open: go }, view })
          ) : (
            <section className="page">
              <div className="head">
                <span className="kick">{current.group}</span>
                <h1>{current.label}</h1>
              </div>
              {current.render({ route, nav: { open: go }, view })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function range(from: string, to: string) {
  return from === to ? date(from) : `${date(from)} – ${date(to)}`;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="shell">{children}</div>;
}

function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setError(error.message);
  };
  return (
    <Shell>
      <div className="signin">
        <h1>
          Natus <em>admin</em>
        </h1>
        <p className="muted">Solo para el equipo. Entra con la cuenta de Google que usas en Natus.</p>
        <button type="button" className="btn" onClick={() => void google()}>
          Entrar con Google
        </button>
        {error && <ErrorNote>{error}</ErrorNote>}
        {import.meta.env.DEV && <DevSignIn />}
      </div>
    </Shell>
  );
}

/** Local stack only: Google does not reach a local Supabase. */
function DevSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack-s dev"
      onSubmit={(e) => {
        e.preventDefault();
        void supabase.auth.signInWithPassword({ email, password }).then(({ error }) => error && setError(error.message));
      }}
    >
      <p className="muted small">Solo en desarrollo</p>
      <input type="email" placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" className="btn ghost">Entrar</button>
      {error && <ErrorNote>{error}</ErrorNote>}
    </form>
  );
}
