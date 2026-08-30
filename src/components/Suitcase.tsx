import React from 'react';
import type { EarnedSticker } from '../types';
import { findSticker } from '../data/stickers';
import { careState, type CareState } from '../domain/stickers';

const FACES: Record<CareState, { eyes: string; mouth: string }> = {
  happy: { eyes: '^ ^', mouth: '‿' },
  neutral: { eyes: '• •', mouth: '—' },
  hungry: { eyes: '· ·', mouth: '︵' },
};

/**
 * The luggage mascot: a hardshell suitcase with a face and wheels, whose shell
 * fills up with stickers as you actually go places.
 */
export function Suitcase({
  stickers,
  care,
  size = 260,
  onStickerClick,
  onMove,
  name,
}: {
  stickers: EarnedSticker[];
  care: CareState;
  size?: number;
  onStickerClick?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  name?: string;
}) {
  const face = FACES[care];
  const w = size;
  const h = size * 1.22;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const id = e.dataTransfer.getData('sticker');
    if (!id || !onMove) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(0.86, Math.max(0.06, (e.clientX - rect.left) / rect.width));
    const y = Math.min(0.9, Math.max(0.12, (e.clientY - rect.top) / rect.height));
    onMove(id, x, y);
  };

  return (
    <div className="relative select-none" style={{ width: w, height: h }}>
      {/* Handle */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-t-2xl border-[6px] border-b-0 border-ink/70"
        style={{ width: w * 0.32, height: h * 0.09 }}
      />

      {/* Shell */}
      <div
        className="absolute inset-x-0 overflow-hidden rounded-[28px] bg-clay shadow-card ring-4 ring-ink/80"
        style={{ top: h * 0.08, height: h * 0.8 }}
        onDragOver={(e) => onMove && e.preventDefault()}
        onDrop={onDrop}
      >
        {/* Ridges, which is what makes it read as hardshell rather than a box */}
        <div className="absolute inset-0 flex justify-around opacity-25">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="h-full w-1.5 bg-ink/25" />
          ))}
        </div>

        {/* Face */}
        <div className="absolute inset-x-0 top-[16%] text-center">
          <div className="font-mono text-xl tracking-[0.35em] text-ink/80">{face.eyes}</div>
          <div className="-mt-1 font-mono text-2xl text-ink/70">{face.mouth}</div>
        </div>

        {/* Stickers */}
        {stickers.map((s) => {
          const def = findSticker(s.stickerId);
          if (!def) return null;
          return (
            <button
              key={s.stickerId}
              draggable={Boolean(onMove)}
              onDragStart={(e) => e.dataTransfer.setData('sticker', s.stickerId)}
              onClick={() => onStickerClick?.(s.stickerId)}
              title={def.displayName}
              className="pop absolute flex items-center justify-center rounded-full bg-white/95 shadow-md ring-2 ring-white transition hover:z-10 hover:scale-110"
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                width: w * 0.2,
                height: w * 0.2,
                transform: `rotate(${s.rotation}deg)`,
                fontSize: w * 0.11,
              }}
            >
              {def.icon}
            </button>
          );
        })}

        {/* Latches */}
        <div className="absolute inset-x-0 bottom-3 flex justify-around px-8">
          {[0, 1].map((i) => (
            <span key={i} className="h-2.5 w-8 rounded-sm bg-ink/60" />
          ))}
        </div>
      </div>

      {/* Wheels for feet */}
      <div className="absolute inset-x-0 flex justify-around px-6" style={{ top: h * 0.86 }}>
        {[0, 1].map((i) => (
          <span key={i} className="h-[14%] w-[16%] rounded-full bg-ink/80" style={{ height: h * 0.12 }} />
        ))}
      </div>

      {name && (
        <div className="absolute inset-x-0 bottom-0 text-center font-display text-sm text-ink/50">
          {name}
        </div>
      )}
    </div>
  );
}

export { careState };
