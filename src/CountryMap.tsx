import { useEffect, useMemo, useState } from 'react';
import { geoArea, geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';
import worldUrl from 'world-atlas/countries-110m.json?url';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import { int } from './format';
import { countryName } from './segment';

/**
 * «Quiénes son» on a map (owner, 24 Oct 2026): each country with people is a
 * circle sized by its accounts (area, not radius), over the outline of the
 * Americas and Europe; touching one filters the panel. Loaded only on this
 * page, with the 1:110m Natural Earth outlines (world-atlas).
 */

const W = 960;
const H = 620;

type Point = { code: string; n: number; act: number };

let world: Promise<FeatureCollection> | null = null;
function loadWorld(): Promise<FeatureCollection> {
  world ??= fetch(worldUrl)
    .then((r) => r.json() as Promise<{ objects: Record<string, unknown> }>)
    .then((t) => feature(t as never, t.objects['countries'] as never) as unknown as FeatureCollection);
  return world;
}

/** The largest piece of a country, so France is not drawn off the coast of Guiana. */
function mainland(f: Feature<Geometry>): Feature<Polygon | MultiPolygon> {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return f as Feature<Polygon>;
  let best = g.coordinates[0]!;
  let area = -1;
  for (const poly of g.coordinates) {
    const a = geoArea({ type: 'Polygon', coordinates: poly });
    if (a > area) {
      area = a;
      best = poly;
    }
  }
  return { ...f, geometry: { type: 'Polygon', coordinates: best } };
}

export default function CountryMap({ points, selected, onPick }: { points: Point[]; selected: string[]; onPick: (code: string) => void }) {
  const [fc, setFc] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadWorld().then(setFc, () => setError(true));
  }, []);

  const view = useMemo(() => {
    if (!fc) return null;
    // The Americas and western Europe: where Natus's people are.
    const projection = geoEqualEarth().fitExtent(
      [
        [12, 12],
        [W - 12, H - 12],
      ],
      { type: 'MultiPoint', coordinates: [[-128, 56], [-128, -56], [32, 60], [32, -56]] },
    );
    const path = geoPath(projection);
    const byNumeric = new Map(fc.features.map((f) => [String(f.id), f]));
    const max = Math.max(1, ...points.map((p) => p.n));
    const dots: (Point & { x: number; y: number; r: number })[] = [];
    const away: Point[] = [];
    for (const p of points) {
      const num = countries.alpha2ToNumeric(p.code);
      const f = num ? byNumeric.get(num) : undefined;
      const c = f ? path.centroid(mainland(f)) : null;
      if (!c || !Number.isFinite(c[0]) || c[0] < 0 || c[0] > W || c[1] < 0 || c[1] > H) {
        away.push(p);
        continue;
      }
      dots.push({ ...p, x: c[0], y: c[1], r: 5 + 27 * Math.sqrt(p.n / max) });
    }
    // Each label goes right, left, above or below its circle: the first place
    // that touches no other circle and no label already placed.
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const circles: Box[] = dots.map((d) => ({ x0: d.x - d.r, y0: d.y - d.r, x1: d.x + d.r, y1: d.y + d.r }));
    const placed: Box[] = [];
    const labels = [...dots]
      .sort((a, b) => b.n - a.n)
      .map((d) => {
        const w = 9 * (d.code.length + 1 + String(d.n).length);
        const options = [
          { x: d.x + d.r + 5, y: d.y + 4, anchor: 'start' as const },
          { x: d.x - d.r - 5, y: d.y + 4, anchor: 'end' as const },
          { x: d.x, y: d.y - d.r - 6, anchor: 'middle' as const },
          { x: d.x, y: d.y + d.r + 15, anchor: 'middle' as const },
        ];
        const box = (o: (typeof options)[number]): Box => {
          const x0 = o.anchor === 'start' ? o.x : o.anchor === 'end' ? o.x - w : o.x - w / 2;
          return { x0, y0: o.y - 12, x1: x0 + w, y1: o.y + 3 };
        };
        const own = circles[dots.indexOf(d)];
        const pick =
          options.find((o) => {
            const b = box(o);
            return !placed.some((q) => hit(b, q)) && !circles.some((q) => q !== own && hit(b, q));
          }) ?? options[0]!;
        placed.push(box(pick));
        return { code: d.code, ...pick };
      });
    const withPeople = new Set(points.map((p) => countries.alpha2ToNumeric(p.code)));
    return {
      shapes: fc.features.map((f, i) => ({ id: f.id === undefined ? `x${i}` : String(f.id), d: path(f) ?? '', on: f.id !== undefined && withPeople.has(String(f.id)) })),
      dots: dots.sort((a, b) => b.n - a.n),
      labels: new Map(labels.map((l) => [l.code, l])),
      away,
    };
  }, [fc, points]);

  if (error) return <p className="muted small">No se pudo cargar el mapa.</p>;
  if (!view) return <div className="map-box" style={{ aspectRatio: `${W} / ${H}` }} />;
  return (
    <div className="stack-s">
      <svg className="map-box" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa de cuentas por país">
        <g aria-hidden="true">
          {view.shapes.map((s) => (
            <path key={s.id} d={s.d} className={s.on ? 'land on' : 'land'} />
          ))}
        </g>
        {view.dots.map((d) => (
          <g key={d.code}>
            <circle
              cx={d.x}
              cy={d.y}
              r={d.r}
              className={selected.includes(d.code) ? 'dot sel' : 'dot'}
              data-tip={`${countryName(d.code)}: ${int(d.n)} ${d.n === 1 ? 'cuenta' : 'cuentas'} · a ${int(d.act)} le sirvió en su primera semana`}
              role="button"
              tabIndex={0}
              aria-label={`${countryName(d.code)}, ${int(d.n)} cuentas. Filtrar por este país`}
              onClick={() => onPick(d.code)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(d.code)}
            />
          </g>
        ))}
        {view.dots.map((d) => (
          <g key={`l-${d.code}`}>
            <text
              x={view.labels.get(d.code)?.x}
              y={view.labels.get(d.code)?.y}
              textAnchor={view.labels.get(d.code)?.anchor}
              className="dot-lbl"
              aria-hidden="true"
            >
              {d.code} {int(d.n)}
            </text>
          </g>
        ))}
      </svg>
      {view.away.length > 0 && (
        <p className="small muted">
          Fuera del mapa:{' '}
          {view.away.map((p, i) => (
            <span key={p.code}>
              {i > 0 && ' · '}
              <button type="button" className="link small" onClick={() => onPick(p.code)}>
                {p.code} {countryName(p.code)} {int(p.n)}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
