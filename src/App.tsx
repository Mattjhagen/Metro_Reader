/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, AppSettings, MetroPivot, Bookmark } from './types';
import {
  loadBooks,
  saveBooks,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  saveBookProgress,
  addBookmarkToBook,
  removeBookmarkFromBook,
} from './utils/db';
import { parseBookFile } from './utils/documentParser';
import { downloadCompleteAudiobookMp3, downloadAudiobookZip } from './utils/audioExporter';
import { convertSingleChunk, fetchVoices, mergeWavBlobs, splitTextIntoChunks } from './utils/voiceStudioApi';
import { convertWithBuiltInVoice } from './utils/localTts';
import { MetroStatusBar } from './components/MetroStatusBar';
import { MetroPivotHeader } from './components/MetroPivotHeader';
import { MetroAppBar } from './components/MetroAppBar';
import { LibraryPivot } from './components/LibraryPivot';
import { ConverterPivot } from './components/ConverterPivot';
import { NowPlayingPivot } from './components/NowPlayingPivot';
import { SettingsPivot } from './components/SettingsPivot';
import { PWAInstallModal } from './components/PWAInstallModal';
import { GoogleDriveImportModal } from './components/GoogleDriveImportModal';
import { AndroidApkModal } from './components/AndroidApkModal';
import { MetroPanorama } from './components/MetroPanorama';

const PIVOT_ORDER: MetroPivot[] = ['library', 'converter', 'nowplaying', 'settings'];

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [currentPivot, setCurrentPivot] = useState<MetroPivot>('library');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Audio Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // Modals & Notices
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isAndroidApkModalOpen, setIsAndroidApkModalOpen] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Tab Slide Navigation
  const handleNavigatePivot = useCallback((nextPivot: MetroPivot, direction?: 'left' | 'right') => {
    if (nextPivot === currentPivot) return;
    if (!direction) {
      const currentIdx = PIVOT_ORDER.indexOf(currentPivot);
      const nextIdx = PIVOT_ORDER.indexOf(nextPivot);
      direction = nextIdx > currentIdx ? 'right' : 'left';
    }
    setSlideDirection(direction);
    setCurrentPivot(nextPivot);
  }, [currentPivot]);

  const slideToNextTab = useCallback(() => {
    const currentIdx = PIVOT_ORDER.indexOf(currentPivot);
    const nextIdx = (currentIdx + 1) % PIVOT_ORDER.length;
    handleNavigatePivot(PIVOT_ORDER[nextIdx], 'right');
  }, [currentPivot, handleNavigatePivot]);

  const slideToPrevTab = useCallback(() => {
    const currentIdx = PIVOT_ORDER.indexOf(currentPivot);
    const prevIdx = (currentIdx - 1 + PIVOT_ORDER.length) % PIVOT_ORDER.length;
    handleNavigatePivot(PIVOT_ORDER[prevIdx], 'left');
  }, [currentPivot, handleNavigatePivot]);

  // Keyboard navigation for tab sliding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not navigate tabs if user is focused inside an input, textarea, or select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (isInstallModalOpen || isDriveModalOpen || isAndroidApkModalOpen) return;

      if (e.key === 'ArrowLeft') {
        slideToPrevTab();
      } else if (e.key === 'ArrowRight') {
        slideToNextTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideToNextTab, slideToPrevTab, isInstallModalOpen, isDriveModalOpen, isAndroidApkModalOpen]);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        const [savedBooks, savedSettings] = await Promise.all([
          loadBooks(),
          loadSettings(),
        ]);
        if (isMounted) {
          setBooks(savedBooks);
          setSettings(savedSettings);
          if (savedBooks.length > 0) {
            setActiveBookId(savedBooks[0].id);
            if (savedBooks[0].playbackPosition > 0) {
              setCurrentTime(savedBooks[0].playbackPosition);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data from IndexedDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateBooks = async (updatedBooks: Book[]) => {
    await saveBooks(updatedBooks);
    const persistedBooks = await loadBooks();
    setBooks(persistedBooks);
  };

  const handleUpdateSettings = async (newSettingsPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettingsPartial };
    setSettings(updated);
    await saveSettings(updated);
  };

  const activeBook: Book | null =
    books.find((b) => b.id === activeBookId) || books[0] || null;

  const currentChapter =
    activeBook?.chapters[activeBook.currentChapterIndex];

  // 2. Audio Element & MediaSession Synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentChapter?.audioUrl) {
      if (audio.src !== currentChapter.audioUrl) {
        audio.src = currentChapter.audioUrl;
        const initialPos = activeBook?.playbackPosition || 0;
        audio.currentTime = initialPos;
        setCurrentTime(initialPos);
      }
    } else if (currentChapter?.audioBlob) {
      const freshUrl = URL.createObjectURL(currentChapter.audioBlob);
      currentChapter.audioUrl = freshUrl;
      audio.src = freshUrl;
      const initialPos = activeBook?.playbackPosition || 0;
      audio.currentTime = initialPos;
      setCurrentTime(initialPos);
    } else {
      audio.src = '';
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [activeBookId, activeBook?.currentChapterIndex, currentChapter?.audioUrl, currentChapter?.audioBlob]);

  // Adjust playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed || 1.0;
    }
  }, [settings.playbackSpeed]);

  // MediaSession Lock-Screen Controls
  useEffect(() => {
    if ('mediaSession' in navigator && activeBook && currentChapter) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title,
        artist: activeBook.author,
        album: activeBook.title,
        artwork: activeBook.coverUrl
          ? [{ src: activeBook.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
      });

      navigator.mediaSession.setActionHandler('play', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => handleSkipSeconds(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => handleSkipSeconds(30));
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (activeBook.currentChapterIndex > 0) {
          handleSelectChapter(activeBook.currentChapterIndex - 1);
        }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (activeBook.currentChapterIndex < activeBook.chapters.length - 1) {
          handleSelectChapter(activeBook.currentChapterIndex + 1);
        }
      });
    }
  }, [activeBook, currentChapter]);

  // Periodic Progress Saving into IndexedDB
  const handleTrackTime = (time: number) => {
    setCurrentTime(time);
    if (activeBook && Math.abs(time - lastSavedTimeRef.current) > 3) {
      lastSavedTimeRef.current = time;
      saveBookProgress(activeBook.id, activeBook.currentChapterIndex, time);
    }
  };

  // Robust Audio Handlers (Instant audio synthesis & playback recovery)
  const handleTogglePlay = async (forcedChapterIndex?: number) => {
    // React passes a click event when this function is used directly as an
    // onClick callback. Only a numeric argument is a chapter request.
    const requestedChapterIndex = typeof forcedChapterIndex === 'number'
      ? forcedChapterIndex
      : undefined;
    const book = activeBook || books[0];
    if (!book || book.chapters.length === 0) {
      setUploadNotice('Please select or upload a book to play.');
      setTimeout(() => setUploadNotice(null), 3000);
      return;
    }

    const chapterIdx = requestedChapterIndex !== undefined
      ? requestedChapterIndex
      : book.currentChapterIndex;
    const ch = book.chapters[chapterIdx];
    if (!ch) return;

    const audio = audioRef.current;
    if (!audio) return;

    // If currently playing the current chapter, pause it
    if (isPlaying && (requestedChapterIndex === undefined || requestedChapterIndex === book.currentChapterIndex)) {
      audio.pause();
      setIsPlaying(false);
      saveBookProgress(book.id, book.currentChapterIndex, audio.currentTime);
      return;
    }

    // If chapter has no audio blob or url, synthesize it immediately!
    if (!ch.audioBlob && !ch.audioUrl) {
      setUploadNotice(`Synthesizing speech for "${ch.title}"...`);
      try {
        let newBlob: Blob;
        if (settings.useVoiceStudio) {
          newBlob = await convertSingleChunk(
            ch.text.slice(0, 1500),
            settings.selectedVoiceId,
            settings.selectedModelId,
            settings.voiceSettings,
            settings.voiceStudioBaseUrl
          );
        } else {
          newBlob = await convertWithBuiltInVoice(ch.text);
        }
        const freshUrl = URL.createObjectURL(newBlob);
        ch.audioBlob = newBlob;
        ch.audioUrl = freshUrl;
        ch.isConverted = true;
        ch.duration = 45;

        const updatedBooks = books.map((b) => (b.id === book.id ? { ...book, chapters: [...book.chapters] } : b));
        await handleUpdateBooks(updatedBooks);
        setUploadNotice(`Playing: ${ch.title}`);
        setTimeout(() => setUploadNotice(null), 2500);
      } catch {
        const fallbackBlob = await convertWithBuiltInVoice(ch.text);
        const freshUrl = URL.createObjectURL(fallbackBlob);
        ch.audioBlob = fallbackBlob;
        ch.audioUrl = freshUrl;
        ch.isConverted = true;
        ch.duration = 45;

        const updatedBooks = books.map((b) => (b.id === book.id ? { ...book, chapters: [...book.chapters] } : b));
        await handleUpdateBooks(updatedBooks);
        setUploadNotice(`Playing: ${ch.title} (preview mode)`);
        setTimeout(() => setUploadNotice(null), 2500);
      }
    } else if (!ch.audioUrl && ch.audioBlob) {
      ch.audioUrl = URL.createObjectURL(ch.audioBlob);
    }

    // Start playback
    try {
      if (audio.src !== ch.audioUrl) {
        audio.src = ch.audioUrl!;
        audio.currentTime = requestedChapterIndex !== undefined ? 0 : (book.playbackPosition || 0);
      }
      audio.playbackRate = settings.playbackSpeed || 1.0;
      await audio.play();
      setIsPlaying(true);
    } catch (playErr) {
      console.warn('Playback error, retrying with fresh blob URL:', playErr);
      if (ch.audioBlob) {
        try {
          ch.audioUrl = URL.createObjectURL(ch.audioBlob);
          audio.src = ch.audioUrl;
          await audio.play();
          setIsPlaying(true);
        } catch (e2) {
          console.error('Playback failed:', e2);
          setIsPlaying(false);
        }
      }
    }
  };

  const handleSeek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (activeBook) {
        saveBookProgress(activeBook.id, activeBook.currentChapterIndex, seconds);
      }
    }
  };

  const handleSkipSeconds = (seconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      if (activeBook) {
        saveBookProgress(activeBook.id, activeBook.currentChapterIndex, nextTime);
      }
    }
  };

  const handleSelectChapter = (chapterIndex: number) => {
    if (!activeBook) return;
    const updatedBook: Book = {
      ...activeBook,
      currentChapterIndex: chapterIndex,
      playbackPosition: 0,
      lastPlayedAt: Date.now(),
    };
    const updatedBooks = books.map((b) => (b.id === activeBook.id ? updatedBook : b));
    handleUpdateBooks(updatedBooks);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      handleTogglePlay(chapterIndex);
    }
  };

  const handleSelectBook = (book: Book, startPlay = false) => {
    setActiveBookId(book.id);
    if (startPlay) {
      handleNavigatePivot('nowplaying', 'right');
      setTimeout(() => {
        handleTogglePlay();
      }, 50);
    } else {
      handleNavigatePivot('nowplaying', 'right');
    }
  };

  // Bookmark Management
  const handleAddBookmark = async (chapterIndex: number, timestamp: number, note?: string) => {
    if (!activeBook) return;
    await addBookmarkToBook(activeBook.id, chapterIndex, timestamp, note);
    const updated = await loadBooks();
    setBooks(updated);
    setUploadNotice(`Saved bookmark at chapter ${chapterIndex + 1}!`);
    setTimeout(() => setUploadNotice(null), 2500);
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (!activeBook) return;
    await removeBookmarkFromBook(activeBook.id, bookmarkId);
    const updated = await loadBooks();
    setBooks(updated);
  };

  const autoConvertBook = async (book: Book, surroundingBooks: Book[]) => {
    if (!settings.useVoiceStudio) {
      setUploadNotice(`Added "${book.title}". Enable VoiceStudio to convert it.`);
      return;
    }

    try {
      setUploadNotice(`VoiceStudio: finding a local voice for "${book.title}"...`);
      const voices = await fetchVoices(settings.voiceStudioBaseUrl);
      const selectedVoice = voices.find((voice) => voice.voice_id === settings.selectedVoiceId) || voices[0];
      if (!selectedVoice) throw new Error('No VoiceStudio voices are available. Install a local TTS voice first.');

      let workingBook = { ...book, chapters: [...book.chapters] };
      for (let chapterIndex = 0; chapterIndex < workingBook.chapters.length; chapterIndex++) {
        const chapter = workingBook.chapters[chapterIndex];
        const chunks = splitTextIntoChunks(chapter.text);
        if (chunks.length === 0) continue;
        setUploadNotice(`VoiceStudio: converting chapter ${chapterIndex + 1}/${workingBook.chapters.length}...`);
        const audioParts: Blob[] = [];
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          setUploadNotice(`VoiceStudio: chapter ${chapterIndex + 1}/${workingBook.chapters.length} · ${chunkIndex + 1}/${chunks.length}`);
          audioParts.push(await convertSingleChunk(chunks[chunkIndex], selectedVoice.voice_id, settings.selectedModelId, settings.voiceSettings, settings.voiceStudioBaseUrl));
        }
        const audioBlob = await mergeWavBlobs(audioParts);
        const updatedChapter = { ...chapter, audioBlob, audioUrl: URL.createObjectURL(audioBlob), isConverted: true, conversionProgress: 100, duration: Math.max(10, Math.round((chapter.wordCount / 150) * 60)) };
        workingBook = { ...workingBook, chapters: workingBook.chapters.map((item, index) => index === chapterIndex ? updatedChapter : item) };
        const savedBook = { ...workingBook, isFullyConverted: workingBook.chapters.every((item) => item.isConverted) };
        await saveBooks([savedBook, ...surroundingBooks.filter((item) => item.id !== savedBook.id)]);
        setBooks(await loadBooks());
      }
      setUploadNotice(`Added and converted "${book.title}" with VoiceStudio.`);
      setTimeout(() => setUploadNotice(null), 3500);
    } catch (err: any) {
      setUploadNotice(`Added "${book.title}", but conversion stopped: ${err.message || 'VoiceStudio is unavailable.'}`);
      setTimeout(() => setUploadNotice(null), 7000);
    }
  };

  const handleJumpToBookmark = (chapterIndex: number, timestamp: number) => {
    if (!activeBook) return;
    if (activeBook.currentChapterIndex !== chapterIndex) {
      handleSelectChapter(chapterIndex);
    }
    setTimeout(() => {
      handleSeek(timestamp);
      if (audioRef.current && activeBook.chapters[chapterIndex]?.audioUrl) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 100);
  };

  // Upload book file (local or Google Drive)
  const handleFileUpload = async (file: File) => {
    if (isImporting) return;
    setIsImporting(true);
    setUploadNotice(`Parsing ${file.name}...`);
    try {
      const newBook = await parseBookFile(file);
      newBook.bookmarks = [];
      newBook.progressPercent = 0;
      // Read the latest IndexedDB value instead of merging with a possibly stale
      // render snapshot. This matters when an import follows a reset or another
      // async library update.
      const persistedBooks = await loadBooks();
      const updatedBooks = [newBook, ...persistedBooks.filter((book) => book.id !== newBook.id)];
      await saveBooks(updatedBooks);
      const savedBooks = await loadBooks();
      setBooks(savedBooks);
      setActiveBookId(newBook.id);
      handleNavigatePivot('library', 'left');
      await autoConvertBook(newBook, savedBooks.filter((book) => book.id !== newBook.id));
    } catch (err: any) {
      setUploadNotice(`Failed to parse book: ${err.message}`);
      setTimeout(() => setUploadNotice(null), 4000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    const updatedBooks = books.filter((b) => b.id !== bookId);
    await handleUpdateBooks(updatedBooks);
    if (activeBookId === bookId && updatedBooks.length > 0) {
      setActiveBookId(updatedBooks[0].id);
    }
  };

  const handleResetSampleBooks = async () => {
    localStorage.clear();
    const { loadBooks: reinitBooks } = await import('./utils/db');
    const reset = await reinitBooks();
    setBooks(reset);
    if (reset.length > 0) setActiveBookId(reset[0].id);
    setUploadNotice('Reset library to default classic audiobooks.');
    setTimeout(() => setUploadNotice(null), 2500);
  };

  const handleDownloadFullMp3 = async () => {
    if (!activeBook) return;
    await downloadCompleteAudiobookMp3(activeBook);
  };

  const handleDownloadZip = async () => {
    if (!activeBook) return;
    await downloadAudiobookZip(activeBook);
  };

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#00e5ff] selection:text-black overflow-x-hidden"
      style={
        {
          '--wp-accent': settings.accentColor,
        } as React.CSSProperties
      }
    >
      {/* Audio Element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            handleTrackTime(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          if (settings.autoPlayNextChapter && activeBook) {
            if (activeBook.currentChapterIndex < activeBook.chapters.length - 1) {
              handleSelectChapter(activeBook.currentChapterIndex + 1);
            } else {
              setIsPlaying(false);
            }
          } else {
            setIsPlaying(false);
          }
        }}
        onError={(e) => {
          console.warn('Audio playback error:', e);
          setIsPlaying(false);
        }}
      />

      {/* Hidden file input */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept=".epub,.pdf,.docx,.txt,.md,.markdown"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* 1. STATUS BAR */}
      <MetroStatusBar accentColor={settings.accentColor} />

      {/* Notification Toast */}
      {uploadNotice && (
        <div
          className="w-full text-black px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-between animate-in slide-in-from-top duration-200"
          style={{ backgroundColor: settings.accentColor }}
        >
          <span>{uploadNotice}</span>
          <button onClick={() => setUploadNotice(null)} className="text-black font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* 2–3. METRO PANORAMA HEADER + CONTENT */}
      <MetroPanorama
        className="flex-1"
        onNavigate={(direction) => direction === 'right' ? slideToNextTab() : slideToPrevTab()}
      >
        <MetroPivotHeader
          currentPivot={currentPivot}
          onSelectPivot={handleNavigatePivot}
          accentColor={settings.accentColor}
        />

        <div className="relative flex-1 w-full max-w-5xl mx-auto flex flex-col">
        <main
          className={`metro-pivot-content flex-1 w-full pt-2 select-none overflow-x-hidden ${
            slideDirection === 'right'
              ? 'metro-slide-right'
              : slideDirection === 'left'
              ? 'metro-slide-left'
              : ''
          }`}
        >
          <div key={currentPivot} className="metro-panorama-foreground metro-panorama-enter">
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div
                className="w-8 h-8 mx-auto animate-spin border-2 border-t-transparent"
                style={{ borderColor: settings.accentColor, borderTopColor: 'transparent' }}
              />
              <p className="text-xs uppercase tracking-widest text-neutral-400">
                Loading Metro Reader...
              </p>
            </div>
          ) : (
            <>
              {currentPivot === 'library' && (
                <LibraryPivot
                  books={books}
                  activeBook={activeBook}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onSelectBook={handleSelectBook}
                  onOpenConvertBook={(book) => {
                    setActiveBookId(book.id);
                    handleNavigatePivot('converter', 'right');
                  }}
                  onFileUpload={handleFileUpload}
                  onDeleteBook={handleDeleteBook}
                  settings={settings}
                  onNavigateToConvert={() => handleNavigatePivot('converter', 'right')}
                  onNavigateToSettings={() => handleNavigatePivot('settings', 'right')}
                />
              )}

              {currentPivot === 'converter' && (
                <ConverterPivot
                  books={books}
                  selectedBook={activeBook}
                  onSelectBook={(book) => setActiveBookId(book.id)}
                  onUpdateBook={(updated) => {
                    const updatedList = books.map((b) => (b.id === updated.id ? updated : b));
                    handleUpdateBooks(updatedList);
                  }}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onPlayChapter={(book, chapterIdx) => {
                    setActiveBookId(book.id);
                    handleSelectChapter(chapterIdx);
                    handleNavigatePivot('nowplaying', 'right');
                  }}
                />
              )}

              {currentPivot === 'nowplaying' && (
                <NowPlayingPivot
                  activeBook={activeBook}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onTogglePlay={handleTogglePlay}
                  onSeek={handleSeek}
                  onSkipSeconds={handleSkipSeconds}
                  onSelectChapter={handleSelectChapter}
                  onAddBookmark={handleAddBookmark}
                  onRemoveBookmark={handleRemoveBookmark}
                  onJumpToBookmark={handleJumpToBookmark}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onNavigateToConvert={() => handleNavigatePivot('converter', 'left')}
                />
              )}

              {currentPivot === 'settings' && (
                <SettingsPivot
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onOpenInstallModal={() => setIsInstallModalOpen(true)}
                  onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
                  onOpenAndroidApk={() => setIsAndroidApkModalOpen(true)}
                  onResetSampleBooks={handleResetSampleBooks}
                />
              )}
            </>
          )}
          </div>
        </main>
        </div>
      </MetroPanorama>

      {/* 4. METRO PERSISTENT APPLICATION BAR */}
      <MetroAppBar
        currentPivot={currentPivot}
        onSelectPivot={(pivot) => handleNavigatePivot(pivot)}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onOpenUpload={() => globalFileInputRef.current?.click()}
        onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onOpenAndroidApk={() => setIsAndroidApkModalOpen(true)}
        onDownloadFullMp3={
          activeBook?.chapters.some((ch) => ch.isConverted)
            ? handleDownloadFullMp3
            : undefined
        }
        onDownloadZip={
          activeBook?.chapters.some((ch) => ch.isConverted)
            ? handleDownloadZip
            : undefined
        }
        onResetLibrary={handleResetSampleBooks}
        accentColor={settings.accentColor}
      />

      {/* 5. MODALS */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        accentColor={settings.accentColor}
      />

      <GoogleDriveImportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onImportBookFile={handleFileUpload}
        accentColor={settings.accentColor}
      />

      <AndroidApkModal
        isOpen={isAndroidApkModalOpen}
        onClose={() => setIsAndroidApkModalOpen(false)}
        accentColor={settings.accentColor}
      />
    </div>
  );
}

