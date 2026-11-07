import React from 'react';
import { MetroPivot } from '../types';

interface MetroPivotHeaderProps {
  currentPivot: MetroPivot;
  onSelectPivot: (pivot: MetroPivot) => void;
  accentColor: string;
}

const PIVOTS: { id: MetroPivot; title: string; kicker: string }[] = [
  { id: 'library', title: 'library', kicker: 'METRO READER' },
  { id: 'converter', title: 'convert', kicker: 'ELEVENLABS TTS' },
  { id: 'nowplaying', title: 'now playing', kicker: 'AUDIO PLAYER' },
  { id: 'settings', title: 'settings', kicker: 'PREFERENCES' },
];

export const MetroPivotHeader: React.FC<MetroPivotHeaderProps> = ({
  currentPivot,
  onSelectPivot,
  accentColor,
}) => {
  const currentIndex = PIVOTS.findIndex((p) => p.id === currentPivot);
  const currentKicker = PIVOTS[currentIndex]?.kicker || 'AUDIOBOOKIFY';

  // Order pivots so the active one is first, followed cyclically by remaining pivots
  const orderedPivots: { id: MetroPivot; title: string; isActive: boolean }[] = [];
  for (let i = 0; i < PIVOTS.length; i++) {
    const idx = (currentIndex + i) % PIVOTS.length;
    orderedPivots.push({
      id: PIVOTS[idx].id,
      title: PIVOTS[idx].title,
      isActive: i === 0,
    });
  }

  return (
    <div className="pt-3 pb-2 px-4 select-none overflow-hidden bg-black">
      {/* Category Kicker (Small Uppercase) */}
      <div className="text-[12px] uppercase font-bold tracking-[0.18em] text-neutral-400 mb-1 flex items-center gap-2">
        <span>{currentKicker}</span>
        <span
          className="inline-block w-2 h-2"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Horizontal Pivot Headers with characteristic Metro bleed */}
      <div className="flex items-baseline gap-6 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
        {orderedPivots.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPivot(p.id)}
            className={`transition-colors duration-200 tracking-tight text-left focus:outline-none ${
              p.isActive
                ? 'text-4xl sm:text-5xl font-light text-white'
                : 'text-2xl sm:text-3xl font-light text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
    </div>
  );
};
