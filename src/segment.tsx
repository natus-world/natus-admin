import { useEffect, useRef, useState } from 'react';
import { api, type Segment, type WhoRow } from './api';
import { int } from './format';
import { useAsync } from './ui';

/**
 * The filter on top of the panel (owner, 24 Oct 2026, from the approved
 * mockup «Panel Natus · segmentos»): country where they live or were born,
 * age band and how they asked to be addressed. It is kept per admin on the
 * server, so it stays across pages and reloads, and every number of the panel
 * follows it. The app does not ask for sex: «cómo le hablan» is what each
 * person chose for how Natus addresses them.
 */

export const AGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;
export const GENDERS = ['femenino', 'masculino', 'neutro'] as const;
export const GENDER_LABEL: Record<string, string> = { femenino: 'Femenino', masculino: 'Masculino', neutro: 'Neutro' };
export const ageLabel = (a: string) => a.replace('-', '–');

const NAMES = new Intl.DisplayNames(['es'], { type: 'region' });
/** «MX» → «México». */
export function countryName(code: string): string {
  if (!code) return 'Sin dato';
  if (code === 'XX') return 'Otro país';
  try {
    return NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}

export const placeLabel = (p: Segment['place']) => (p === 'nacio' ? 'nació en' : 'vive en');

/** The segment in words, for the line under the bar and the pages' kickers. */
export function describe(s: Segment): string {
  const parts: string[] = [];
  if (s.countries?.length) {
    const names = s.countries.length <= 2 ? s.countries.map(countryName).join(' y ') : `${s.countries.length} países`;
    parts.push(`${s.place === 'nacio' ? 'nacieron en' : 'viven en'} ${names}`);
  }
  if (s.age) parts.push(`de ${ageLabel(s.age)} años`);
  if (s.gender) parts.push(`le hablan en ${s.gender}`);
  return parts.join(' · ');
}

export const isEmpty = (s: Segment | undefined) => !s || (!s.countries?.length && !s.age && !s.gender);

type Menu = 'pais' | 'edad' | 'genero' | null;

export function SegmentBar({ segment, onChange, version }: { segment: Segment; onChange: (s: Segment) => void; version: number }) {
  const [open, setOpen] = useState<Menu>(null);
  const [place, setPlace] = useState<'vive' | 'nacio'>(segment.place ?? 'vive');
  const ref = useRef<HTMLDivElement>(null);
  const all = useAsync(() => api.who(true), []);
  const count = useAsync(() => api.segmentCount(), [version]);
  const rows = all.data ?? [];
  const of = (d: WhoRow['dimension']) => rows.filter((r) => r.dimension === d && r.value);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const set = (patch: Partial<Segment>, drop: (keyof Segment)[] = []) => {
    const next: Segment = { ...segment, ...patch };
    for (const k of drop) delete next[k];
    setOpen(null);
    onChange(next);
  };
  const c = count.data?.[0];

  return (
    <div className="sgm" ref={ref}>
      <span className="sgm-lbl">Segmento</span>
      {segment.countries?.length ? (
        <button type="button" className="sgm-chip on" onClick={() => set({}, ['countries', 'place'])} aria-label="Quitar el filtro de país">
          País ({placeLabel(segment.place)}): {segment.countries.length <= 3 ? segment.countries.join(', ') : `${segment.countries.length} países`}
          <span aria-hidden="true"> ✕</span>
        </button>
      ) : (
        <button type="button" className="sgm-chip" aria-expanded={open === 'pais'} onClick={() => setOpen(open === 'pais' ? null : 'pais')}>
          + País
        </button>
      )}
      {segment.age ? (
        <button type="button" className="sgm-chip on" onClick={() => set({}, ['age'])} aria-label="Quitar el filtro de edad">
          Edad: {ageLabel(segment.age)}
          <span aria-hidden="true"> ✕</span>
        </button>
      ) : (
        <button type="button" className="sgm-chip" aria-expanded={open === 'edad'} onClick={() => setOpen(open === 'edad' ? null : 'edad')}>
          + Edad
        </button>
      )}
      {segment.gender ? (
        <button type="button" className="sgm-chip on" onClick={() => set({}, ['gender'])} aria-label="Quitar el filtro de cómo le hablan">
          Le hablan: {GENDER_LABEL[segment.gender] ?? segment.gender}
          <span aria-hidden="true"> ✕</span>
        </button>
      ) : (
        <button type="button" className="sgm-chip" aria-expanded={open === 'genero'} onClick={() => setOpen(open === 'genero' ? null : 'genero')}>
          + Cómo le hablan
        </button>
      )}
      {c && !isEmpty(segment) && (
        <span className="sgm-count">
          Mostrando <b>{int(c.in_segment)} de {int(c.total)}</b> cuentas
        </span>
      )}

      {open && (
        <div className="sgm-menu" role="dialog" aria-label="Elegir segmento">
          {open === 'pais' && (
            <>
              <div className="seg" role="group" aria-label="Qué país">
                <button type="button" className={place === 'vive' ? 'on' : ''} onClick={() => setPlace('vive')}>
                  Vive en
                </button>
                <button type="button" className={place === 'nacio' ? 'on' : ''} onClick={() => setPlace('nacio')}>
                  Nació en
                </button>
              </div>
              <div className="sgm-list">
                {of(place).map((r) => (
                  <button key={r.value} type="button" onClick={() => set({ place, countries: [r.value] })}>
                    <span>
                      {r.value} · {countryName(r.value)}
                    </span>
                    <span className="muted">{int(r.accounts)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {open === 'edad' && (
            <div className="sgm-list">
              {AGES.map((a) => (
                <button key={a} type="button" onClick={() => set({ age: a })}>
                  <span>{ageLabel(a)}</span>
                  <span className="muted">{int(of('edad').find((r) => r.value === a)?.accounts ?? 0)}</span>
                </button>
              ))}
            </div>
          )}
          {open === 'genero' && (
            <div className="sgm-list">
              {GENDERS.map((g) => (
                <button key={g} type="button" onClick={() => set({ gender: g })}>
                  <span>{GENDER_LABEL[g]}</span>
                  <span className="muted">{int(of('genero').find((r) => r.value === g)?.accounts ?? 0)}</span>
                </button>
              ))}
              <p className="small muted">La app no pregunta el sexo: es lo que cada persona eligió en «Cómo quieres que te hablemos».</p>
            </div>
          )}
          {all.error && <p className="small muted">{all.error}</p>}
        </div>
      )}
    </div>
  );
}
