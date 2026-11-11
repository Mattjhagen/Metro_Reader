import React, { useEffect, useRef } from 'react';
import { MetroPivot } from '../types';

interface MetroPivotHeaderProps {
  currentPivot: MetroPivot;
  onSelectPivot: (pivot: MetroPivot, direction?: 'left' | 'right') => void;
  accentColor: string;
}

export const PIVOTS: { id: MetroPivot; title: string; kicker: string }[] = [
  { id: 'library', title: 'library', kicker: 'METRO READER' },
  { id: 'converter', title: 'convert', kicker: 'VOICESTUDIO TTS' },
  { id: 'nowplaying', title: 'now playing', kicker: 'AUDIO PLAYER' },
  { id: 'settings', title: 'settings', kicker: 'PREFERENCES' },
];

export const MetroPivotHeader: React.FC<MetroPivotHeaderProps> = ({
  currentPivot,
  onSelectPivot,
  accentColor,
}) => {
  const currentIndex = PIVOTS.findIndex((p) => p.id === currentPivot);
  const currentKicker = PIVOTS[currentIndex]?.kicker || 'METRO READER';
  const touchStartXRef = useRef<number>(0);
  const activePivotRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activePivotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentPivot]);

  const handlePrevTab = () => {
    const prevIdx = (currentIndex - 1 + PIVOTS.length) % PIVOTS.length;
    onSelectPivot(PIVOTS[prevIdx].id, 'left');
  };

  const handleNextTab = () => {
    const nextIdx = (currentIndex + 1) % PIVOTS.length;
    onSelectPivot(PIVOTS[nextIdx].id, 'right');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -35) {
      handleNextTab();
    } else if (diff > 35) {
      handlePrevTab();
    }
  };

  return (
    <div
      className="pt-3 pb-2 px-4 select-none overflow-hidden bg-black border-b border-neutral-900/60"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Category Kicker & Tab Indicators */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[12px] uppercase font-bold tracking-[0.18em] text-neutral-400 flex items-center gap-2">
          <span>{currentKicker}</span>
          <span
            className="inline-block w-2 h-2 transition-colors duration-300"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* Tab pagination; the heading strip below is the navigation surface. */}
        <div className="flex items-center gap-1.5" title={`Pivot ${currentIndex + 1} of ${PIVOTS.length}`}>
            {PIVOTS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => onSelectPivot(p.id, idx > currentIndex ? 'right' : 'left')}
                className="transition-all duration-300 cursor-pointer focus:outline-none"
                style={{
                  width: idx === currentIndex ? '16px' : '6px',
                  height: '4px',
                  backgroundColor: idx === currentIndex ? accentColor : '#333333',
                }}
                title={p.title}
                aria-label={p.title}
              />
            ))}
        </div>
      </div>

      {/* Windows Phone-style panorama strip: adjacent pivots intentionally bleed into view. */}
      <div className="metro-pivot-strip flex items-baseline gap-8 overflow-x-auto no-scrollbar whitespace-nowrap py-1 -mx-4 px-4">
        {PIVOTS.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => {
              if (p.id !== currentPivot) {
                onSelectPivot(p.id, idx > currentIndex ? 'right' : 'left');
              }
            }}
            ref={p.id === currentPivot ? activePivotRef : undefined}
            aria-current={p.id === currentPivot ? 'page' : undefined}
            className={`metro-pivot-heading shrink-0 transition-all duration-500 tracking-tight text-left focus:outline-none cursor-pointer ${
              p.id === currentPivot
                ? 'text-4xl sm:text-5xl font-light text-white'
                : 'text-2xl sm:text-3xl font-light text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-600">swipe to explore</div>
    </div>
  );
};

