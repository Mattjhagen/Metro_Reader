import React, { useRef } from 'react';
import { Book, AppSettings } from '../types';
import { Plus, Play, Pause, Headphones, FileText, CheckCircle2, ChevronRight, Sparkles, Volume2, Trash2, Bookmark as BookmarkIcon, Download } from 'lucide-react';
import { downloadCompleteAudiobookMp3 } from '../utils/audioExporter';

interface LibraryPivotProps {
  books: Book[];
  activeBook: Book | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectBook: (book: Book, startPlay?: boolean) => void;
  onOpenConvertBook: (book: Book) => void;
  onFileUpload: (file: File) => void | Promise<void>;
  onDeleteBook: (bookId: string) => void;
  settings: AppSettings;
  onNavigateToConvert: () => void;
  onNavigateToSettings: () => void;
}

export const LibraryPivot: React.FC<LibraryPivotProps> = ({
  books,
  activeBook,
  isPlaying,
  onTogglePlay,
  onSelectBook,
  onOpenConvertBook,
  onFileUpload,
  onDeleteBook,
  settings,
  onNavigateToConvert,
  onNavigateToSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalConvertedChapters = books.reduce(
    (sum, b) => sum + b.chapters.filter((ch) => ch.isConverted).length,
    0
  );

  const totalWords = books.reduce((sum, b) => sum + b.totalWords, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 pb-24 px-4 max-w-4xl mx-auto select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,.docx,.txt,.md,.markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* METRO LIVE TILES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {/* Wide Now Playing Live Tile */}
        <div
          onClick={() => {
            if (activeBook) {
              onSelectBook(activeBook);
            }
          }}
          className="col-span-2 p-4 text-white cursor-pointer relative overflow-hidden transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: settings.accentColor }}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-90 text-black">
              NOW PLAYING · {activeBook?.progressPercent ?? 0}%
            </span>
            <Headphones className="w-5 h-5 text-black opacity-90" />
          </div>

          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-light tracking-tight truncate leading-tight text-black">
              {activeBook ? activeBook.title : 'No Book Selected'}
            </h3>
            <p className="text-xs text-black/80 truncate mt-0.5">
              {activeBook
                ? `${activeBook.chapters[activeBook.currentChapterIndex]?.title || 'Chapter 1'}`
                : 'Tap to select an audiobook'}
            </p>
          </div>

          {/* Progress bar inside tile */}
          {activeBook && (
            <div className="w-full bg-black/20 h-1 mt-3 overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-300"
                style={{ width: `${activeBook.progressPercent ?? 0}%` }}
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-black">
            <span className="font-light tracking-wide">
              {activeBook?.author || 'Metro Reader'}
            </span>
            {activeBook && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay();
                }}
                className="w-8 h-8 rounded-full border border-black flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Upload Live Tile */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="col-span-1 p-4 bg-[#1f1f1f] hover:bg-[#282828] text-white cursor-pointer flex flex-col justify-between transition-all duration-150 active:scale-[0.98] border border-neutral-800"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
              ADD BOOK
            </span>
            <Plus className="w-4 h-4 text-neutral-300" />
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-light text-white leading-none">
              + File
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 leading-snug">
              EPUB, PDF, DOCX, TXT
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
            TAP TO BROWSE
          </div>
        </div>

        {/* VoiceStudio Voice Live Tile */}
        <div
          onClick={onNavigateToSettings}
          className="col-span-1 p-4 bg-[#181818] hover:bg-[#222222] text-white cursor-pointer flex flex-col justify-between transition-all duration-150 active:scale-[0.98] border border-neutral-800"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
              VOICE
            </span>
            <Volume2 className="w-4 h-4 text-neutral-300" />
          </div>

          <div className="my-2">
            <div className="text-xl sm:text-2xl font-light text-white truncate leading-none">
              {settings.selectedVoiceName}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              VoiceStudio local
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: settings.accentColor }}>
            CONFIGURE
          </div>
        </div>

        {/* Stats Tile */}
        <div
          onClick={onNavigateToConvert}
          className="col-span-2 p-4 bg-[#141414] text-white cursor-pointer flex items-center justify-between transition-all duration-150 active:scale-[0.98] border border-neutral-800"
        >
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
              AUDIO STATS
            </div>
            <div className="text-2xl font-light mt-1">
              {totalConvertedChapters} <span className="text-sm font-normal text-neutral-400">audio chapters ready</span>
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              {books.length} books in library · {totalWords.toLocaleString()} words parsed
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-neutral-400 mr-2" />
        </div>

        {/* Quick Convert Tile */}
        <div
          onClick={onNavigateToConvert}
          className="col-span-2 p-4 text-white cursor-pointer flex items-center justify-between transition-all duration-150 active:scale-[0.98] border border-neutral-800"
          style={{ backgroundColor: '#111111' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-10 shrink-0"
              style={{ backgroundColor: settings.accentColor }}
            />
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-neutral-300">
                AUDIOBOOK CONVERTER
              </div>
              <div className="text-sm text-neutral-400 font-light mt-0.5">
                Generate speech with VoiceStudio locally
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        </div>
      </div>

      {/* BOOKS LIST SECTION */}
      <div className="space-y-4 pt-4">
        <div className="flex items-baseline justify-between border-b border-neutral-800 pb-2">
          <h2 className="text-2xl font-light lowercase text-white tracking-tight">
            all books ({books.length})
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs uppercase font-bold tracking-wider hover:underline"
            style={{ color: settings.accentColor }}
          >
            + UPLOAD NEW
          </button>
        </div>

        <div className="space-y-3">
          {books.map((book) => {
            const isCurrentBook = activeBook?.id === book.id;
            const convertedChaptersCount = book.chapters.filter((ch) => ch.isConverted).length;
            const progress = book.progressPercent ?? 0;
            const bookmarkCount = book.bookmarks?.length || 0;

            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className={`p-4 bg-[#121212] hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                  isCurrentBook ? 'border-neutral-500' : 'border-neutral-900'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  {/* Book Cover */}
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-22 sm:w-18 sm:h-24 object-cover shrink-0 border border-neutral-800 shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-16 h-22 sm:w-18 sm:h-24 shrink-0 flex flex-col justify-between p-2 text-white border border-neutral-800"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 truncate text-black">
                        {book.format}
                      </span>
                      <FileText className="w-6 h-6 self-center text-black opacity-90" />
                      <span className="text-[9px] truncate font-light text-black">
                        {book.chapters.length} ch
                      </span>
                    </div>
                  )}

                  {/* Book Metadata & Progress */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {book.format.toUpperCase()}
                      </span>
                      {isCurrentBook && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 text-black"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          ACTIVE
                        </span>
                      )}
                      {bookmarkCount > 0 && (
                        <span className="text-[10px] text-cyan-400 flex items-center gap-0.5 font-semibold">
                          <BookmarkIcon className="w-3 h-3" />
                          {bookmarkCount}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-normal text-white truncate leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-light truncate">
                      by {book.author}
                    </p>

                    {/* Reading Progress Bar */}
                    <div className="space-y-1 pt-1 max-w-sm">
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>Chapter {book.currentChapterIndex + 1} of {book.chapters.length}</span>
                        <span className="font-mono text-cyan-400 font-medium">{progress}% read</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: settings.accentColor,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 pt-1">
                      <span>{book.totalWords.toLocaleString()} words</span>
                      <span>·</span>
                      <span className={convertedChaptersCount > 0 ? 'text-emerald-400' : 'text-neutral-500'}>
                        {convertedChaptersCount} / {book.chapters.length} audio ready
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap sm:flex-col lg:flex-row items-center gap-2 shrink-0">
                  {convertedChaptersCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadCompleteAudiobookMp3(book);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border border-emerald-700 text-emerald-400 hover:bg-emerald-950/40 flex items-center gap-1"
                      title="Download MP3"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>MP3</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenConvertBook(book);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-neutral-700 hover:border-white text-neutral-200 transition-colors"
                  >
                    Convert
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBook(book, true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-black transition-opacity font-bold"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    Play
                  </button>

                  {book.format !== 'sample' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${book.title}" from your library?`)) {
                          onDeleteBook(book.id);
                        }
                      }}
                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete book"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
