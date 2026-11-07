import React, { useState } from 'react';
import { BookOpen, Zap, Play, Pause, Settings, MoreHorizontal, Download, Plus, Smartphone, RefreshCw, Volume2 } from 'lucide-react';
import { MetroPivot } from '../types';

interface MetroAppBarProps {
  currentPivot: MetroPivot;
  onSelectPivot: (pivot: MetroPivot) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenUpload: () => void;
  onOpenInstall: () => void;
  onDownloadCurrentAudio?: () => void;
  onResetLibrary: () => void;
  accentColor: string;
}

export const MetroAppBar: React.FC<MetroAppBarProps> = ({
  currentPivot,
  onSelectPivot,
  isPlaying,
  onTogglePlay,
  onOpenUpload,
  onOpenInstall,
  onDownloadCurrentAudio,
  onResetLibrary,
  accentColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-neutral-800 text-white select-none transition-all duration-300">
      {/* Expanded Menu Drawer */}
      {isExpanded && (
        <div className="bg-[#181818] px-6 py-4 border-b border-neutral-800 space-y-3.5 text-sm animate-in slide-in-from-bottom duration-200">
          <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
            APPLICATION MENU
          </div>
          <button
            onClick={() => {
              onOpenInstall();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-[#1ba1e2] transition-colors py-1 font-light text-base"
          >
            <Smartphone className="w-4 h-4 text-neutral-400" />
            <span>install app to home screen</span>
          </button>

          {onDownloadCurrentAudio && (
            <button
              onClick={() => {
                onDownloadCurrentAudio();
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-3 text-left hover:text-[#1ba1e2] transition-colors py-1 font-light text-base"
            >
              <Download className="w-4 h-4 text-neutral-400" />
              <span>download current chapter mp3</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenUpload();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-[#1ba1e2] transition-colors py-1 font-light text-base"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
            <span>upload new book file (pdf, epub, docx, txt)</span>
          </button>

          <button
            onClick={() => {
              onResetLibrary();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-[#1ba1e2] transition-colors py-1 font-light text-base"
          >
            <RefreshCw className="w-4 h-4 text-neutral-400" />
            <span>reset sample books</span>
          </button>

          <div className="pt-2 text-xs text-neutral-500 font-mono">
            AudioBookify Metro Edition · ElevenLabs TTS PWA
          </div>
        </div>
      )}

      {/* Main AppBar Icons Row */}
      <div className="h-16 max-w-4xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Library Button */}
          <button
            onClick={() => onSelectPivot('library')}
            className={`metro-circle-btn ${
              currentPivot === 'library'
                ? 'bg-white text-black border-white'
                : 'text-white'
            }`}
            title="Library"
            aria-label="Library"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          {/* Quick Upload / Convert Button */}
          <button
            onClick={() => onSelectPivot('converter')}
            className={`metro-circle-btn ${
              currentPivot === 'converter'
                ? 'bg-white text-black border-white'
                : 'text-white'
            }`}
            title="Convert"
            aria-label="Convert"
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="metro-circle-btn relative group"
            style={{
              borderColor: isPlaying ? accentColor : '#ffffff',
              backgroundColor: isPlaying ? accentColor : 'transparent',
              color: isPlaying ? '#ffffff' : '#ffffff',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => onSelectPivot('settings')}
            className={`metro-circle-btn ${
              currentPivot === 'settings'
                ? 'bg-white text-black border-white'
                : 'text-white'
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Windows Phone Ellipsis Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-neutral-400 hover:text-white transition-colors"
          title="More options"
          aria-label="More options"
        >
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
