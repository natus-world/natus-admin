import type { ReactNode } from 'react';
import { previousPeriod, type Period } from '../ui';
import type { Segment } from '../api';

/** What every page of the four questions receives from the bar on top. */
export type ViewProps = {
  period: Period;
  compare: boolean;
  onOpenPerson: (id: string) => void;
  go: (section: string) => void;
  /** The filter on top, and a way to change it (rows of «Quiénes son», the map). */
  segment?: Segment;
  onSegment?: (s: Segment) => void;
};

export const prevOf = (p: Period) => previousPeriod(p);

/** The page's head: a kicker, the conclusion as the title, and the answer in one or two lines. */
export function Head({ kick, em, title, answer }: { kick: string; em?: string; title: ReactNode; answer?: ReactNode }) {
  return (
    <div className="head">
      <span className="kick">
        {kick}
        {em && (
          <>
            {' · '}
            <em>{em}</em>
          </>
        )}
      </span>
      <h1>{title}</h1>
      {answer && <p className="answer">{answer}</p>}
    </div>
  );
}

export function Card({ title, sub, aside, children, className = '' }: {
  title?: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card v2 ${className}`}>
      {(title || aside) && (
        <div className="chead">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p className="sub">{sub}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A share as a whole percent; «—» without a base. Never above 100: in a range
 * of days a later step can count someone whose first step fell before it.
 */
export const share = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : null);
export const pctText = (n: number | null) => (n === null ? '—' : `${n}%`);

/** Monday of the week of a YYYY-MM-DD, as «14 oct». */
export function weekLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
}
