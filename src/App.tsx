import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api } from './api';
import { ErrorNote, Loading, messageOf } from './ui';
import { Overview } from './sections/Overview';
import { Funnel } from './sections/Funnel';
import { People } from './sections/People';
import { Suggestions } from './sections/Suggestions';
import { Gift } from './sections/Gift';

/**
 * The sections of the panel. Adding one is one entry here and its file in
 * `sections/`, reading one `admin_*` function through `api.ts`.
 */
type Route = { section: string; id: string | null };
type Nav = { open: (r: Route) => void };

const SECTIONS: { key: string; label: string; render: (route: Route, nav: Nav) => ReactNode }[] = [
  { key: 'resumen', label: 'Resumen', render: () => <Overview /> },
  { key: 'embudo', label: 'Embudos', render: () => <Funnel /> },
  {
    key: 'personas',
    label: 'Personas',
    render: (route, nav) => <People open={route.id} onOpen={(id) => nav.open({ section: 'personas', id })} />,
  },
  {
    key: 'sugerencias',
    label: 'Sugerencias',
    render: (_, nav) => <Suggestions onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
  {
    key: 'premium',
    label: 'Regalar Premium',
    render: (_, nav) => <Gift onOpenPerson={(id) => nav.open({ section: 'personas', id })} />,
  },
];

function readHash(): Route {
  const [section = 'resumen', id = null] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { section: SECTIONS.some((s) => s.key === section) ? section : 'resumen', id: id || null };
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

  const current = SECTIONS.find((s) => s.key === route.section) ?? SECTIONS[0]!;
  return (
    <div className="app">
      <aside className="side">
        <p className="brand">
          Natus <em>admin</em>
        </p>
        <nav>
          {SECTIONS.map((s) => (
            <a key={s.key} href={`#${s.key}`} className={s.key === current.key ? 'on' : ''}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <p className="muted small">{session.user.email}</p>
          <button type="button" className="link small" onClick={() => void supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </aside>
      <main className="main">
        <h1 className="page-title">{current.label}</h1>
        {current.render(route, { open: go })}
      </main>
    </div>
  );
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
