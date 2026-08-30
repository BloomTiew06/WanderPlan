import React, { useState } from 'react';
import type { Activity, Member, Trip } from '../types';
import { Avatar, Chip, money } from './ui';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../domain/budget';
import { translateText } from '../services/translate';

export function ActivityCard({
  activity,
  trip,
  index,
  dayIndex,
  visited,
  photoCount,
  onSwap,
  onRemove,
  onCheckIn,
  onPhotos,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
}: {
  activity: Activity;
  trip: Trip;
  index: number;
  dayIndex: number;
  visited: boolean;
  photoCount: number;
  onSwap: () => void;
  onRemove: () => void;
  onCheckIn: () => void;
  onPhotos: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [translated, setTranslated] = useState<{ name: string; address: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  const mustDoOwner: Member | undefined = activity.mustDoFor
    ? trip.members.find((m) => m.id === activity.mustDoFor)
    : undefined;

  const translate = async () => {
    setTranslating(true);
    const [name, address] = await Promise.all([
      translateText(activity.name, trip.localLanguage),
      translateText(activity.address, trip.localLanguage),
    ]);
    setTranslated({ name, address });
    setTranslating(false);
  };

  return (
    <div
      draggable={!activity.locked}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-day={dayIndex}
      data-index={index}
      className={`card overflow-hidden transition ${dragging ? 'opacity-40' : ''} ${visited ? 'ring-1 ring-moss/40' : ''}`}
    >
      <div className="flex items-stretch">
        <div
          className="w-1.5 shrink-0"
          style={{ background: CATEGORY_COLORS[activity.category] }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 p-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl" aria-hidden>
              {activity.icon}
            </span>
            <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold">{activity.name}</span>
                {activity.locked && <Chip tone="info">🔒 {activity.source === 'imported' ? 'Imported' : 'Locked'}</Chip>}
                {activity.source === 'social' && <Chip tone="bad">📱 {activity.socialRef?.platform}</Chip>}
                {visited && <Chip tone="good">✓ Checked in</Chip>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted">
                <span className="font-medium tabular-nums text-ink/70">{activity.start}</span>
                <span>{formatDuration(activity.durationMin)}</span>
                {activity.cost > 0 && <span>{money(activity.cost, trip.currency)}</span>}
                <span className="capitalize">{CATEGORY_LABELS[activity.category]}</span>
                {photoCount > 0 && <span>📷 {photoCount}</span>}
              </div>
              {mustDoOwner && (
                <div className="mt-2">
                  <span className="chip bg-clay/12 text-clay">
                    <Avatar name={mustDoOwner.name} color={mustDoOwner.avatarColor} size={16} />
                    {mustDoOwner.name}'s must-do
                  </span>
                </div>
              )}
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="btn-quiet -mr-1 -mt-1 px-2 text-xs"
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              {open ? '▴' : '▾'}
            </button>
          </div>

          {open && (
            <div className="rise mt-3 border-t border-black/5 pt-3">
              <p className="text-sm">{activity.description}</p>
              <p className="mt-2 text-xs muted">📍 {activity.address}</p>

              {translated && (
                <div className="mt-2 rounded-lg bg-sand px-3 py-2 text-sm">
                  <div className="font-semibold">{translated.name}</div>
                  <div className="text-xs muted">{translated.address}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-ink/35">
                    Show this to a driver
                  </div>
                </div>
              )}

              {activity.socialRef && (
                <blockquote className="mt-2 border-l-2 border-clay/40 pl-3 text-xs italic muted">
                  “{activity.socialRef.caption}” — {activity.socialRef.platform}
                </blockquote>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button className="btn-ghost text-xs" onClick={translate} disabled={translating}>
                  🌐 {translating ? 'Translating…' : 'Translate'}
                </button>
                <button className="btn-ghost text-xs" onClick={onPhotos}>
                  📷 Photos {photoCount > 0 && `(${photoCount})`}
                </button>
                {!visited && (
                  <button className="btn-ghost text-xs" onClick={onCheckIn}>
                    📍 I'm here
                  </button>
                )}
                {!activity.locked && (
                  <>
                    <button className="btn-ghost text-xs" onClick={onSwap}>
                      🔄 Swap
                    </button>
                    <button className="btn-quiet text-xs" onClick={onRemove}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
