import React, { useState } from 'react';
import { BookOpen, Zap, Play, Pause, Settings, MoreHorizontal, Download, Plus, Smartphone, RefreshCw, Cloud, Archive } from 'lucide-react';
import { MetroPivot } from '../types';

interface MetroAppBarProps {
  currentPivot: MetroPivot;
  onSelectPivot: (pivot: MetroPivot) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenUpload: () => void;
  onOpenGoogleDrive: () => void;
  onOpenInstall: () => void;
  onOpenAndroidApk: () => void;
  onDownloadFullMp3?: () => void;
  onDownloadZip?: () => void;
  onResetLibrary: () => void;
  accentColor: string;
}

export const MetroAppBar: React.FC<MetroAppBarProps> = ({
  currentPivot,
  onSelectPivot,
  isPlaying,
  onTogglePlay,
  onOpenUpload,
  onOpenGoogleDrive,
  onOpenInstall,
  onOpenAndroidApk,
  onDownloadFullMp3,
  onDownloadZip,
  onResetLibrary,
  accentColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-neutral-800 text-white select-none transition-all duration-300">
      {/* Expanded Menu Drawer */}
      {isExpanded && (
        <div className="bg-[#161616] px-6 py-4 border-b border-neutral-800 space-y-3 text-sm animate-in slide-in-from-bottom duration-200">
          <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
            METRO APPLICATION MENU
          </div>

          {/* Google Drive Import Option */}
          <button
            onClick={() => {
              onOpenGoogleDrive();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-cyan-400 transition-colors py-1 font-light text-base"
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>import books from Google Drive</span>
          </button>

          {/* Android APK */}
          <button
            onClick={() => {
              onOpenAndroidApk();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-emerald-400 transition-colors py-1 font-light text-base"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>install Android APK / WebAPK</span>
          </button>

          {/* Download Complete Audiobook (MP3) */}
          {onDownloadFullMp3 && (
            <button
              onClick={() => {
                onDownloadFullMp3();
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-3 text-left hover:text-emerald-400 transition-colors py-1 font-light text-base"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>download complete audiobook (single MP3)</span>
            </button>
          )}

          {/* Download Chapters Archive (ZIP) */}
          {onDownloadZip && (
            <button
              onClick={() => {
                onDownloadZip();
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-3 text-left hover:text-cyan-400 transition-colors py-1 font-light text-base"
            >
              <Archive className="w-4 h-4 text-cyan-400" />
              <span>download chapters archive (.zip)</span>
            </button>
          )}

          {/* Upload file from device */}
          <button
            onClick={() => {
              onOpenUpload();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-white transition-colors py-1 font-light text-base"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
            <span>upload local file (EPUB, PDF, DOCX, TXT)</span>
          </button>

          {/* Reset Library */}
          <button
            onClick={() => {
              onResetLibrary();
              setIsExpanded(false);
            }}
            className="w-full flex items-center gap-3 text-left hover:text-white transition-colors py-1 font-light text-base"
          >
            <RefreshCw className="w-4 h-4 text-neutral-400" />
            <span>reset sample books</span>
          </button>

          <div className="pt-2 text-xs text-neutral-500 font-mono">
            Metro Reader · ElevenLabs Neural TTS
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
              color: isPlaying ? '#000000' : '#ffffff',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
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
