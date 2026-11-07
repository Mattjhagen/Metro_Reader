import React, { useState } from 'react';
import { Book, Chapter, AppSettings, Bookmark } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Clock,
  Download,
  BookOpen,
  Volume2,
  Bookmark as BookmarkIcon,
  Trash2,
  Archive,
  FileAudio,
  Check,
} from 'lucide-react';
import { downloadCompleteAudiobookMp3, downloadAudiobookZip } from '../utils/audioExporter';

interface NowPlayingPivotProps {
  activeBook: Book | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkipSeconds: (seconds: number) => void;
  onSelectChapter: (chapterIndex: number) => void;
  onAddBookmark: (chapterIndex: number, timestamp: number, note?: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onJumpToBookmark: (chapterIndex: number, timestamp: number) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onNavigateToConvert: () => void;
}

export const NowPlayingPivot: React.FC<NowPlayingPivotProps> = ({
  activeBook,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onSkipSeconds,
  onSelectChapter,
  onAddBookmark,
  onRemoveBookmark,
  onJumpToBookmark,
  settings,
  onUpdateSettings,
  onNavigateToConvert,
}) => {
  const [showReader, setShowReader] = useState<boolean>(false);
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState<boolean>(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const [isPackagingZip, setIsPackagingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [isAddingBookmark, setIsAddingBookmark] = useState<boolean>(false);
  const [bookmarkNote, setBookmarkNote] = useState<string>('');

  const currentChapter: Chapter | undefined =
    activeBook?.chapters[activeBook.currentChapterIndex];

  const hasAnyConvertedAudio = activeBook?.chapters.some((ch) => ch.isConverted);
  const totalConvertedCount =
    activeBook?.chapters.filter((ch) => ch.isConverted).length || 0;

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const handleDownloadFullMp3 = async () => {
    if (!activeBook) return;
    try {
      await downloadCompleteAudiobookMp3(activeBook);
    } catch (err: any) {
      alert(err.message || 'Failed to download complete audiobook.');
    }
  };

  const handleDownloadZip = async () => {
    if (!activeBook) return;
    setIsPackagingZip(true);
    setZipProgress(10);
    try {
      await downloadAudiobookZip(activeBook, (p) => setZipProgress(p));
    } catch (err: any) {
      alert(err.message || 'Failed to package audiobook ZIP.');
    } finally {
      setIsPackagingZip(false);
      setZipProgress(0);
    }
  };

  const handleCreateBookmark = () => {
    if (!activeBook) return;
    onAddBookmark(
      activeBook.currentChapterIndex,
      currentTime,
      bookmarkNote || `Bookmark at ${formatTime(currentTime)}`
    );
    setBookmarkNote('');
    setIsAddingBookmark(false);
  };

  if (!activeBook) {
    return (
      <div className="py-20 px-4 text-center space-y-4 max-w-md mx-auto select-none">
        <BookOpen className="w-12 h-12 text-neutral-600 mx-auto" />
        <h3 className="text-3xl font-light text-white">no audiobook selected</h3>
        <p className="text-sm text-neutral-400">
          Pick a title from your library or convert a book to begin listening.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 px-4 max-w-3xl mx-auto select-none">
      {/* TOP CONTROLS: Read along, Bookmarks, Downloads, Sleep Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-2">
        <div className="flex items-center gap-2">
          {/* Read Along Toggle */}
          <button
            onClick={() => setShowReader(!showReader)}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1.5 transition-colors border ${
              showReader
                ? 'bg-white text-black border-white'
                : 'text-neutral-400 border-neutral-800 hover:border-neutral-600'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showReader ? 'Hide Text' : 'Read Along'}</span>
          </button>

          {/* Add Bookmark Button */}
          <button
            onClick={() => setIsAddingBookmark(!isAddingBookmark)}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1.5 transition-colors border ${
              isAddingBookmark
                ? 'bg-white text-black border-white'
                : 'text-neutral-400 border-neutral-800 hover:border-neutral-600'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>+ Bookmark</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Center Trigger Button */}
          {hasAnyConvertedAudio && (
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 transition-colors border ${
                showDownloadMenu
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ({totalConvertedCount} ch)</span>
            </button>
          )}

          {/* Sleep Timer */}
          <button
            onClick={() => setShowSleepTimerMenu(!showSleepTimerMenu)}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1.5 border ${
              settings.sleepTimerMinutes
                ? 'border-[#00e5ff] text-[#00e5ff]'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{settings.sleepTimerMinutes ? `${settings.sleepTimerMinutes}m` : 'Timer'}</span>
          </button>
        </div>
      </div>

      {/* DOWNLOAD AUDIOBOOK OPTIONS PANEL (Visible once generated) */}
      {showDownloadMenu && hasAnyConvertedAudio && (
        <div className="p-4 bg-[#141414] border-2 border-emerald-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>DOWNLOAD AUDIOBOOK: "{activeBook.title}"</span>
            </div>
            <button
              onClick={() => setShowDownloadMenu(false)}
              className="text-neutral-400 hover:text-white text-xs font-semibold"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-neutral-300 font-light">
            Choose your preferred format for offline listening or archiving:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Option 1: Single Complete MP3 */}
            <button
              onClick={handleDownloadFullMp3}
              className="p-3 bg-[#1e1e1e] hover:bg-[#282828] border border-neutral-700 text-left transition-colors flex items-start gap-3 group"
            >
              <FileAudio className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-emerald-400 transition-colors">
                  Single Complete MP3
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  All {totalConvertedCount} converted chapters merged into one seamless audio file.
                </div>
              </div>
            </button>

            {/* Option 2: ZIP Archive */}
            <button
              onClick={handleDownloadZip}
              disabled={isPackagingZip}
              className="p-3 bg-[#1e1e1e] hover:bg-[#282828] border border-neutral-700 text-left transition-colors flex items-start gap-3 group disabled:opacity-50"
            >
              <Archive className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                  {isPackagingZip
                    ? `Packaging ZIP (${zipProgress}%)...`
                    : 'Chapters ZIP Archive'}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Zip file with individual track numbered chapter MP3s + tracklist README.
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ADD BOOKMARK INPUT DRAWER */}
      {isAddingBookmark && (
        <div className="p-4 bg-[#141414] border border-neutral-800 space-y-2 animate-in fade-in duration-150">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            ADD BOOKMARK AT {formatTime(currentTime)}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="Bookmark note / quote (optional)..."
              className="flex-1 bg-black border border-neutral-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
            />
            <button
              onClick={handleCreateBookmark}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shrink-0"
              style={{ backgroundColor: settings.accentColor }}
            >
              Save Bookmark
            </button>
            <button
              onClick={() => setIsAddingBookmark(false)}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-800 text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sleep Timer Menu */}
      {showSleepTimerMenu && (
        <div className="p-4 bg-[#141414] border border-neutral-800 space-y-2 animate-in fade-in duration-150">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            SLEEP TIMER
          </div>
          <div className="flex flex-wrap gap-2">
            {[null, 15, 30, 45, 60].map((mins) => (
              <button
                key={mins === null ? 'off' : mins}
                onClick={() => {
                  onUpdateSettings({ sleepTimerMinutes: mins });
                  setShowSleepTimerMenu(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border ${
                  settings.sleepTimerMinutes === mins
                    ? 'bg-white text-black border-white'
                    : 'text-neutral-300 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {mins === null ? 'Off' : `${mins} Minutes`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Synchronized Reader Transcript Section */}
      {showReader && currentChapter && (
        <div className="p-6 bg-[#0c0c0c] border border-neutral-800 max-h-96 overflow-y-auto space-y-4 text-neutral-300 leading-relaxed font-light text-base selection:bg-neutral-800">
          <div className="text-xs uppercase font-bold tracking-widest text-neutral-500 border-b border-neutral-800 pb-1">
            {currentChapter.title} · Text Transcript
          </div>
          <div className="whitespace-pre-wrap">{currentChapter.text}</div>
        </div>
      )}

      {/* PLAYER HERO SECTION */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
        {/* Book Cover */}
        <div className="relative group shrink-0">
          {activeBook.coverUrl ? (
            <img
              src={activeBook.coverUrl}
              alt={activeBook.title}
              referrerPolicy="no-referrer"
              className="w-44 h-60 sm:w-52 sm:h-72 object-cover border-2 border-neutral-800 shadow-2xl"
            />
          ) : (
            <div
              className="w-44 h-60 sm:w-52 sm:h-72 flex flex-col justify-between p-4 text-white border-2 border-neutral-800"
              style={{ backgroundColor: settings.accentColor }}
            >
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {activeBook.format}
              </span>
              <BookOpen className="w-16 h-16 self-center opacity-90" />
              <span className="text-xs font-light truncate">{activeBook.author}</span>
            </div>
          )}

          {isPlaying && (
            <div
              className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-md flex items-center gap-1 font-mono"
              style={{ backgroundColor: settings.accentColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              PLAYING
            </div>
          )}
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              CHAPTER {activeBook.currentChapterIndex + 1} OF {activeBook.chapters.length}
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {activeBook.progressPercent || 0}% READ
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight lowercase leading-tight">
            {currentChapter?.title || 'Untitled Chapter'}
          </h2>

          <p className="text-lg text-neutral-400 font-normal">
            {activeBook.title}
          </p>
          <p className="text-sm text-neutral-500 font-light">
            by {activeBook.author}
          </p>

          {/* Voice actor tag */}
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" style={{ color: settings.accentColor }} />
              Voice: {settings.selectedVoiceName}
            </span>
            <span>·</span>
            <span>{currentChapter?.wordCount.toLocaleString()} words</span>
          </div>

          {!currentChapter?.isConverted && (
            <div className="pt-2">
              <div className="p-3 bg-[#181818] border border-amber-900/60 text-amber-200 text-xs flex items-center justify-between gap-2">
                <span>Audio not generated for this chapter yet.</span>
                <button
                  onClick={onNavigateToConvert}
                  className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400"
                >
                  Convert Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SCRUBBER & TIMELINE */}
      <div className="space-y-2 pt-2">
        <div className="relative py-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-800 cursor-pointer"
            style={{ accentColor: settings.accentColor }}
          />
        </div>

        {/* Metro Digital Time Readout */}
        <div className="flex items-baseline justify-between text-white font-light tracking-wide">
          <span className="text-2xl sm:text-3xl font-mono tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-sm text-neutral-500 font-mono tabular-nums">
            / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* PRIMARY TRANSPORT CONTROLS */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
        {/* Previous Chapter */}
        <button
          onClick={() => {
            if (activeBook.currentChapterIndex > 0) {
              onSelectChapter(activeBook.currentChapterIndex - 1);
            }
          }}
          disabled={activeBook.currentChapterIndex === 0}
          className="metro-circle-btn disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous Chapter"
          aria-label="Previous Chapter"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        {/* Jump -15s */}
        <button
          onClick={() => onSkipSeconds(-15)}
          className="metro-circle-btn text-xs font-bold"
          title="Rewind 15 seconds"
          aria-label="Rewind 15 seconds"
        >
          <span className="flex items-center">
            <RotateCcw className="w-4 h-4 mr-0.5" />
            15
          </span>
        </button>

        {/* Main Play / Pause Button */}
        <button
          onClick={onTogglePlay}
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-white flex items-center justify-center text-black transition-transform active:scale-95 shadow-xl"
          style={{
            backgroundColor: settings.accentColor,
            borderColor: settings.accentColor,
          }}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-black" />
          ) : (
            <Play className="w-8 h-8 fill-black ml-1" />
          )}
        </button>

        {/* Jump +30s */}
        <button
          onClick={() => onSkipSeconds(30)}
          className="metro-circle-btn text-xs font-bold"
          title="Fast-forward 30 seconds"
          aria-label="Fast-forward 30 seconds"
        >
          <span className="flex items-center">
            30
            <RotateCw className="w-4 h-4 ml-0.5" />
          </span>
        </button>

        {/* Next Chapter */}
        <button
          onClick={() => {
            if (activeBook.currentChapterIndex < activeBook.chapters.length - 1) {
              onSelectChapter(activeBook.currentChapterIndex + 1);
            }
          }}
          disabled={activeBook.currentChapterIndex === activeBook.chapters.length - 1}
          className="metro-circle-btn disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next Chapter"
          aria-label="Next Chapter"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Speed Selector Pill Bar */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mr-1">
          SPEED:
        </span>
        {speedOptions.map((speed) => (
          <button
            key={speed}
            onClick={() => onUpdateSettings({ playbackSpeed: speed })}
            className={`px-2.5 py-1 text-xs font-mono font-medium transition-colors border ${
              settings.playbackSpeed === speed
                ? 'bg-white text-black border-white'
                : 'text-neutral-400 border-neutral-800 hover:border-neutral-600'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* BOOKMARKS SECTION */}
      {activeBook.bookmarks && activeBook.bookmarks.length > 0 && (
        <div className="pt-4 space-y-2 border-t border-neutral-900">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-400 pb-1">
            <span className="flex items-center gap-1.5">
              <BookmarkIcon className="w-3.5 h-3.5" style={{ color: settings.accentColor }} />
              SAVED BOOKMARKS ({activeBook.bookmarks.length})
            </span>
            <span className="text-neutral-500">TAP TO JUMP</span>
          </div>

          <div className="divide-y divide-neutral-900 max-h-48 overflow-y-auto no-scrollbar">
            {activeBook.bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onJumpToBookmark(bm.chapterIndex, bm.timestamp)}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-[#141414] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-800 shrink-0">
                    {formatTime(bm.timestamp)}
                  </span>
                  <div className="truncate">
                    <div className="text-sm text-white truncate font-normal">
                      {bm.note || bm.chapterTitle}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {bm.chapterTitle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(bm.id);
                  }}
                  className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors shrink-0"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAPTER DRAWER */}
      <div className="pt-4 space-y-2 border-t border-neutral-900">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-400 pb-1">
          <span>CHAPTERS ({activeBook.chapters.length})</span>
          <span className="text-neutral-500">TAP TO JUMP</span>
        </div>

        <div className="divide-y divide-neutral-900 max-h-60 overflow-y-auto no-scrollbar">
          {activeBook.chapters.map((ch, idx) => {
            const isCurrent = idx === activeBook.currentChapterIndex;
            return (
              <div
                key={ch.id}
                onClick={() => onSelectChapter(idx)}
                className={`py-3 px-2 flex items-center justify-between cursor-pointer transition-colors ${
                  isCurrent ? 'bg-[#181818]' : 'hover:bg-[#121212]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2 h-2 shrink-0"
                    style={{
                      backgroundColor: isCurrent ? settings.accentColor : '#333333',
                    }}
                  />
                  <div className="truncate">
                    <span className="text-sm text-white font-normal truncate">
                      {idx + 1}. {ch.title}
                    </span>
                    <span className="text-xs text-neutral-500 ml-2">
                      ({ch.wordCount.toLocaleString()} w)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ch.isConverted ? (
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 text-black"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      AUDIO
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-neutral-600 uppercase">
                      text only
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
