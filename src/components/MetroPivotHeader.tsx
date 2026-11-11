import React, { useRef } from 'react';
import { MetroPivot } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Order pivots so the active one is first, followed cyclically by remaining pivots
  const orderedPivots: { id: MetroPivot; title: string; isActive: boolean; index: number }[] = [];
  for (let i = 0; i < PIVOTS.length; i++) {
    const idx = (currentIndex + i) % PIVOTS.length;
    orderedPivots.push({
      id: PIVOTS[idx].id,
      title: PIVOTS[idx].title,
      isActive: i === 0,
      index: idx,
    });
  }

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

        {/* Tab Pagination Indicators & Quick Nav */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1" title={`Tab ${currentIndex + 1} of ${PIVOTS.length}`}>
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

          {/* Quick previous/next chevron buttons for easy desktop sliding */}
          <div className="flex items-center border border-neutral-800 bg-[#141414]">
            <button
              onClick={handlePrevTab}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none"
              title="Slide to previous tab"
              aria-label="Previous tab"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3 bg-neutral-800" />
            <button
              onClick={handleNextTab}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none"
              title="Slide to next tab"
              aria-label="Next tab"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Pivot Headers with characteristic Metro bleed */}
      <div className="flex items-baseline gap-6 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
        {orderedPivots.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              if (!p.isActive) {
                onSelectPivot(p.id, p.index > currentIndex ? 'right' : 'left');
              }
            }}
            className={`transition-all duration-200 tracking-tight text-left focus:outline-none cursor-pointer ${
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

