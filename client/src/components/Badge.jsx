import { useState } from 'react';

export default function Badge({ badge, earned }) {
  const safeBadge = {
    id: badge?.id || 'badge',
    name: badge?.name || 'Badge',
    emoji: badge?.emoji || '🏅',
    description: badge?.description || 'Milestone achievement.',
  };
  const isEarned = Boolean(earned);
  const [loadFailed, setLoadFailed] = useState(false);
  const imageSrc = `/badges/${safeBadge.id}.svg`;

  return (
    <div className="group relative flex w-24 flex-col items-center space-y-2 text-center">
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border text-3xl transition ${
          isEarned
            ? 'border-yellow-300 bg-amber-50 shadow-[0_10px_24px_rgba(251,191,36,0.25)]'
            : 'border-slate-300 bg-slate-100 text-slate-400 grayscale'
        }`}
      >
        {isEarned && !loadFailed ? (
          <img
            src={imageSrc}
            alt={safeBadge.name}
            className="h-14 w-14 object-contain"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <span>{isEarned ? safeBadge.emoji : '🔒'}</span>
        )}
      </div>

      <p className={`text-xs font-semibold ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>{safeBadge.name}</p>

      <span className="pointer-events-none absolute bottom-16 left-1/2 z-10 hidden w-40 -translate-x-1/2 rounded-md border border-slate-200 bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
        {safeBadge.description}
      </span>

      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{isEarned ? 'Earned' : 'Locked'}</span>
    </div>
  );
}
