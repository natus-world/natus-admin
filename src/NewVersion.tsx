import { useEffect, useState } from 'react';

/**
 * «Hay una versión nueva del panel» (owner, 27 Oct 2026). The browser can keep
 * an old panel open, or cached, after a new one is published — and the
 * database functions behind it change with each publish. Every five minutes,
 * and whenever the tab comes back into view, the panel asks /version.json
 * which build is live; when it is not this one, a bar offers to reload. It
 * never reloads by itself, so a reply being written is not lost.
 */
export function NewVersion() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let live = true;
    const check = () => {
      fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<{ build?: string }>) : null))
        .then((v) => {
          if (live && v?.build && v.build !== __BUILD_ID__) setStale(true);
        })
        .catch(() => undefined);
    };
    check();
    const timer = window.setInterval(check, 5 * 60 * 1000);
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', check);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', check);
    };
  }, []);
  if (!stale) return null;
  return (
    <div className="new-version" role="status">
      <span>Hay una versión nueva del panel.</span>
      <button type="button" className="btn" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}
