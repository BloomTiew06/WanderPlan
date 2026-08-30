import type { Visit } from '../types';
import { projectToPercent } from '../domain/geo';

/**
 * Places-visited map.
 *
 * A real build renders these through the Maps SDK already in use for routes,
 * with country fill from a point-in-polygon check against a public GeoJSON
 * boundary set. This is the same data drawn onto a simple equirectangular
 * projection, which keeps the demo offline and dependency-free.
 */

/** Rough bounding boxes, enough to shade a visited country on a world view. */
const COUNTRY_BOXES: Record<string, { name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  MY: { name: 'Malaysia', minLat: 0.8, maxLat: 7.4, minLng: 99.6, maxLng: 119.3 },
  JP: { name: 'Japan', minLat: 30.9, maxLat: 45.5, minLng: 129.4, maxLng: 145.8 },
  TH: { name: 'Thailand', minLat: 5.6, maxLat: 20.5, minLng: 97.3, maxLng: 105.6 },
  SG: { name: 'Singapore', minLat: 1.2, maxLat: 1.5, minLng: 103.6, maxLng: 104.1 },
  ID: { name: 'Indonesia', minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 },
  VN: { name: 'Vietnam', minLat: 8.2, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 },
};

export function WorldMap({
  visits,
  onPick,
  selectedId,
}: {
  visits: Visit[];
  onPick?: (v: Visit) => void;
  selectedId?: string | null;
}) {
  const codes = [...new Set(visits.map((v) => v.countryCode))];

  // Frame the map on where you've actually been rather than showing an empty planet.
  const lats = visits.map((v) => v.lat);
  const lngs = visits.map((v) => v.lng);
  const pad = 14;
  const view = visits.length
    ? {
        minLat: Math.min(...lats) - pad,
        maxLat: Math.max(...lats) + pad,
        minLng: Math.min(...lngs) - pad,
        maxLng: Math.max(...lngs) + pad,
      }
    : { minLat: -20, maxLat: 40, minLng: 90, maxLng: 150 };

  const toXY = (lat: number, lng: number) => ({
    x: ((lng - view.minLng) / (view.maxLng - view.minLng)) * 100,
    y: ((view.maxLat - lat) / (view.maxLat - view.minLat)) * 100,
  });

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-sky/10 ring-1 ring-black/5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {/* Latitude and longitude guides, so the projection reads as a map. */}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 12.5} x2={100} y2={i * 12.5} stroke="#00000008" strokeWidth={0.3} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={i * 12.5} y1={0} x2={i * 12.5} y2={100} stroke="#00000008" strokeWidth={0.3} />
        ))}

        {codes.map((code) => {
          const box = COUNTRY_BOXES[code];
          if (!box) return null;
          const a = toXY(box.maxLat, box.minLng);
          const b = toXY(box.minLat, box.maxLng);
          return (
            <rect
              key={code}
              x={a.x}
              y={a.y}
              width={Math.max(0.5, b.x - a.x)}
              height={Math.max(0.5, b.y - a.y)}
              rx={1.5}
              fill="#2f6f70"
              opacity={0.14}
              stroke="#2f6f70"
              strokeOpacity={0.3}
              strokeWidth={0.3}
            />
          );
        })}
      </svg>

      {visits.map((v) => {
        const { x, y } = toXY(v.lat, v.lng);
        const active = selectedId === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onPick?.(v)}
            className="absolute -translate-x-1/2 -translate-y-full transition"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={v.placeName}
          >
            <span
              className={`block text-lg drop-shadow transition ${active ? 'scale-125' : 'hover:scale-110'}`}
            >
              📍
            </span>
          </button>
        );
      })}

      {visits.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm muted">
          Check in somewhere and it lands here.
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
        {codes.map((c) => (
          <span key={c} className="chip bg-white/85 text-[10px] ring-1 ring-black/5">
            {COUNTRY_BOXES[c]?.name ?? c}
          </span>
        ))}
      </div>
    </div>
  );
}

export { projectToPercent };
