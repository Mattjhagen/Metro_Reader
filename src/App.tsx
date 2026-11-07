/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [currentPivot, setCurrentPivot] = useState<MetroPivot>('library');
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

  const globalFileInputRef = useRef<HTMLInputElement>(null);

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
          // Check if ELEVENLABS_API_KEY is available in environment
          const envKey = (typeof process !== 'undefined' && process.env?.ELEVENLABS_API_KEY) || '';
          if (envKey && !savedSettings.elevenLabsApiKey) {
            savedSettings.elevenLabsApiKey = envKey;
            await saveSettings(savedSettings);
          }

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
    setBooks(updatedBooks);
    await saveBooks(updatedBooks);
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
    } else {
      audio.src = '';
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [activeBookId, activeBook?.currentChapterIndex, currentChapter?.audioUrl]);

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
    // Throttle progress persistence to every 3 seconds to preserve performance
    if (activeBook && Math.abs(time - lastSavedTimeRef.current) > 3) {
      lastSavedTimeRef.current = time;
      saveBookProgress(activeBook.id, activeBook.currentChapterIndex, time);
    }
  };

  // Audio Handlers
  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentChapter?.audioUrl) {
      setCurrentPivot('converter');
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (activeBook) {
        saveBookProgress(activeBook.id, activeBook.currentChapterIndex, audio.currentTime);
      }
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked or failed:', err);
          setIsPlaying(false);
        });
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
      if (updatedBook.chapters[chapterIndex]?.audioUrl) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleSelectBook = (book: Book, startPlay = false) => {
    setActiveBookId(book.id);
    if (startPlay) {
      setCurrentPivot('nowplaying');
      setTimeout(() => {
        if (book.chapters[book.currentChapterIndex]?.audioUrl && audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          setCurrentPivot('converter');
        }
      }, 50);
    } else {
      setCurrentPivot('nowplaying');
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
    setUploadNotice(`Parsing ${file.name}...`);
    try {
      const newBook = await parseBookFile(file);
      newBook.bookmarks = [];
      newBook.progressPercent = 0;
      const updatedBooks = [newBook, ...books];
      await handleUpdateBooks(updatedBooks);
      setActiveBookId(newBook.id);
      setUploadNotice(`Added "${newBook.title}" with ${newBook.chapters.length} chapters.`);
      setTimeout(() => {
        setUploadNotice(null);
        setCurrentPivot('converter');
      }, 1200);
    } catch (err: any) {
      setUploadNotice(`Failed to parse book: ${err.message}`);
      setTimeout(() => setUploadNotice(null), 4000);
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
      className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#00e5ff] selection:text-black"
      style={
        {
          '--wp-accent': settings.accentColor,
        } as React.CSSProperties
      }
    >
      {/* Audio Element */}
      <audio
        ref={audioRef}
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

      {/* 2. METRO PIVOT HEADER */}
      <MetroPivotHeader
        currentPivot={currentPivot}
        onSelectPivot={(pivot) => setCurrentPivot(pivot)}
        accentColor={settings.accentColor}
      />

      {/* 3. MAIN PIVOT CONTENT AREA */}
      <main className="flex-1 w-full max-w-5xl mx-auto pt-2">
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
                  setCurrentPivot('converter');
                }}
                onFileUpload={handleFileUpload}
                onDeleteBook={handleDeleteBook}
                settings={settings}
                onNavigateToConvert={() => setCurrentPivot('converter')}
                onNavigateToSettings={() => setCurrentPivot('settings')}
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
                  setCurrentPivot('nowplaying');
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
                onNavigateToConvert={() => setCurrentPivot('converter')}
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
      </main>

      {/* 4. METRO PERSISTENT APPLICATION BAR */}
      <MetroAppBar
        currentPivot={currentPivot}
        onSelectPivot={(pivot) => setCurrentPivot(pivot)}
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
