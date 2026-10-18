const tz = 'America/Santiago';

export const int = (n: number | null | undefined) => new Intl.NumberFormat('es-CL').format(n ?? 0);
export const usd = (n: number | null | undefined) =>
  `US$ ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;
export const pct = (n: number) => `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(n)}%`;

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('es-CL', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/** YYYY-MM-DD in Santiago, `daysAgo` days back. */
export function dayIso(daysAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}
