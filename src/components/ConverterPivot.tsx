import React, { useState, useEffect, useRef } from 'react';
import { Book, Chapter, AppSettings, ElevenLabsVoice } from '../types';
import { ELEVENLABS_MODELS, fetchVoices, splitTextIntoChunks, convertSingleChunk, generateDemoAudioBlob } from '../utils/elevenLabsApi';
import { Play, Pause, Zap, CheckCircle2, AlertTriangle, Sliders, Volume2, Download, RefreshCw, Key } from 'lucide-react';

interface ConverterPivotProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onUpdateBook: (updatedBook: Book) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onPlayChapter: (book: Book, chapterIndex: number) => void;
}

export const ConverterPivot: React.FC<ConverterPivotProps> = ({
  books,
  selectedBook,
  onSelectBook,
  onUpdateBook,
  settings,
  onUpdateSettings,
  onPlayChapter,
}) => {
  const currentBook = selectedBook || books[0] || null;
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicePreviewAudio, setVoicePreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreviewVoiceId, setPlayingPreviewVoiceId] = useState<string | null>(null);

  // Conversion States
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
    percent: number;
    currentSentence: string;
    chapterTitle: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Keep chapter index in bounds
  useEffect(() => {
    if (currentBook && selectedChapterIndex >= currentBook.chapters.length) {
      setSelectedChapterIndex(0);
    }
  }, [currentBook, selectedChapterIndex]);

  // Load voices when component mounts or apiKey changes
  useEffect(() => {
    let isMounted = true;
    const loadVoiceList = async () => {
      setIsLoadingVoices(true);
      try {
        const vList = await fetchVoices(settings.elevenLabsApiKey);
        if (isMounted) {
          setVoices(vList);
        }
      } catch (err: any) {
        if (isMounted) {
          // Keep preset voices
          const { PRESET_VOICES } = await import('../utils/elevenLabsApi');
          setVoices(PRESET_VOICES);
        }
      } finally {
        if (isMounted) setIsLoadingVoices(false);
      }
    };

    loadVoiceList();
    return () => {
      isMounted = false;
      if (voicePreviewAudio) {
        voicePreviewAudio.pause();
      }
    };
  }, [settings.elevenLabsApiKey]);

  const activeChapter: Chapter | undefined = currentBook?.chapters[selectedChapterIndex];

  // Calculate text chunks for active chapter
  const activeChunks = activeChapter ? splitTextIntoChunks(activeChapter.text) : [];
  const estimatedDurationMinutes = activeChapter
    ? (activeChapter.wordCount / 150).toFixed(1)
    : '0';

  // Toggle voice preview
  const handleToggleVoicePreview = (voice: ElevenLabsVoice) => {
    if (playingPreviewVoiceId === voice.voice_id && voicePreviewAudio) {
      voicePreviewAudio.pause();
      setPlayingPreviewVoiceId(null);
      return;
    }

    if (voicePreviewAudio) {
      voicePreviewAudio.pause();
    }

    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingPreviewVoiceId(null);
      audio.onerror = () => setPlayingPreviewVoiceId(null);
      audio.play().catch(() => setPlayingPreviewVoiceId(null));
      setVoicePreviewAudio(audio);
      setPlayingPreviewVoiceId(voice.voice_id);
    }
  };

  // Convert Single Chapter
  const handleConvertChapter = async (targetChapterIndex: number) => {
    if (!currentBook) return;
    const chapter = currentBook.chapters[targetChapterIndex];
    if (!chapter) return;

    abortControllerRef.current = false;
    setIsConverting(true);
    setErrorMessage(null);
    setConversionSuccess(null);

    const chunks = splitTextIntoChunks(chapter.text);
    if (chunks.length === 0) {
      setErrorMessage('No text found in this chapter.');
      setIsConverting(false);
      return;
    }

    const audioBlobs: Blob[] = [];

    try {
      const hasApiKey = settings.elevenLabsApiKey.trim().length > 0;

      for (let i = 0; i < chunks.length; i++) {
        if (abortControllerRef.current) {
          throw new Error('Conversion cancelled by user.');
        }

        const chunkText = chunks[i];
        const percent = Math.round(((i + 1) / chunks.length) * 100);

        setConvertProgress({
          currentChunk: i + 1,
          totalChunks: chunks.length,
          percent,
          currentSentence:
            chunkText.length > 90 ? chunkText.substring(0, 90) + '...' : chunkText,
          chapterTitle: chapter.title,
        });

        let chunkBlob: Blob;
        if (hasApiKey) {
          chunkBlob = await convertSingleChunk(
            chunkText,
            settings.selectedVoiceId,
            settings.selectedModelId,
            settings.voiceSettings,
            settings.elevenLabsApiKey
          );
        } else {
          // Offline/Demo synthesis
          await new Promise((r) => setTimeout(r, 600)); // realistic pacing
          chunkBlob = await generateDemoAudioBlob(chunkText);
        }

        audioBlobs.push(chunkBlob);
      }

      // Merge all chunks into a single audio blob
      const combinedBlob = new Blob(audioBlobs, {
        type: hasApiKey ? 'audio/mpeg' : 'audio/wav',
      });
      const audioUrl = URL.createObjectURL(combinedBlob);

      // Estimate duration from words
      const durationSeconds = Math.max(10, Math.round((chapter.wordCount / 150) * 60));

      const updatedChapters = [...currentBook.chapters];
      updatedChapters[targetChapterIndex] = {
        ...chapter,
        isConverted: true,
        audioBlob: combinedBlob,
        audioUrl,
        duration: durationSeconds,
      };

      const isFullyConverted = updatedChapters.every((c) => c.isConverted);

      const updatedBook: Book = {
        ...currentBook,
        chapters: updatedChapters,
        isFullyConverted,
      };

      onUpdateBook(updatedBook);
      setConversionSuccess(
        `"${chapter.title}" converted successfully! Audio is ready for offline playback.`
      );
    } catch (err: any) {
      if (err.message !== 'Conversion cancelled by user.') {
        setErrorMessage(err.message || 'Failed to generate audio from ElevenLabs.');
      }
    } finally {
      setIsConverting(false);
      setConvertProgress(null);
    }
  };

  const handleCancelConversion = () => {
    abortControllerRef.current = true;
    setIsConverting(false);
    setConvertProgress(null);
  };

  return (
    <div className="space-y-8 pb-28 px-4 max-w-4xl mx-auto select-none">
      {/* 1. API KEY NOTICE / STATUS */}
      {!settings.elevenLabsApiKey.trim() && (
        <div className="p-4 bg-[#181818] border-l-4 border-amber-500 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold tracking-wide uppercase">
                ElevenLabs API Key Not Set
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Conversions currently run in offline demo synthesizer mode. Add your ElevenLabs key in Settings to unlock ultra-realistic neural voices!
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({})}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400 shrink-0"
          >
            Go to Settings
          </button>
        </div>
      )}

      {/* 2. BOOK & CHAPTER SELECTOR */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          01. SELECT BOOK & CHAPTER
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Book Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase font-semibold">
              Target Book
            </label>
            <select
              value={currentBook?.id || ''}
              onChange={(e) => {
                const b = books.find((x) => x.id === e.target.value);
                if (b) {
                  onSelectBook(b);
                  setSelectedChapterIndex(0);
                }
              }}
              className="w-full bg-[#141414] border border-neutral-800 text-white p-3 text-sm focus:outline-none focus:border-white"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.chapters.length} ch, {b.totalWords.toLocaleString()} w)
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase font-semibold">
              Chapter to Convert
            </label>
            <select
              value={selectedChapterIndex}
              onChange={(e) => setSelectedChapterIndex(Number(e.target.value))}
              className="w-full bg-[#141414] border border-neutral-800 text-white p-3 text-sm focus:outline-none focus:border-white"
            >
              {currentBook?.chapters.map((ch, idx) => (
                <option key={ch.id} value={idx}>
                  {idx + 1}. {ch.title} {ch.isConverted ? '✓ (Audio Ready)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. VOICE & MODEL CONFIGURATION */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          02. ELEVENLABS VOICE & MODEL
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Voice Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-400 uppercase font-semibold">
                Voice Actor
              </label>
              {isLoadingVoices && (
                <span className="text-[10px] text-neutral-500 animate-pulse">
                  loading voices...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={settings.selectedVoiceId}
                onChange={(e) => {
                  const v = voices.find((x) => x.voice_id === e.target.value);
                  onUpdateSettings({
                    selectedVoiceId: e.target.value,
                    selectedVoiceName: v?.name || 'Selected Voice',
                  });
                }}
                className="flex-1 bg-[#141414] border border-neutral-800 text-white p-3 text-sm focus:outline-none focus:border-white truncate"
              >
                {voices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name} ({v.labels?.accent || v.category || 'Voice'})
                  </option>
                ))}
              </select>

              {/* Voice Preview Button */}
              {(() => {
                const currentVoiceObj = voices.find(
                  (v) => v.voice_id === settings.selectedVoiceId
                );
                return currentVoiceObj?.preview_url ? (
                  <button
                    onClick={() => handleToggleVoicePreview(currentVoiceObj)}
                    className="p-3 bg-[#1e1e1e] hover:bg-[#282828] text-white border border-neutral-700 transition-colors shrink-0"
                    title="Play voice preview sample"
                  >
                    {playingPreviewVoiceId === currentVoiceObj.voice_id ? (
                      <Pause className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase font-semibold">
              ElevenLabs Model
            </label>
            <select
              value={settings.selectedModelId}
              onChange={(e) => onUpdateSettings({ selectedModelId: e.target.value })}
              className="w-full bg-[#141414] border border-neutral-800 text-white p-3 text-sm focus:outline-none focus:border-white"
            >
              {ELEVENLABS_MODELS.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.name} - {m.description.substring(0, 40)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voice Parameters Sliders */}
        <div className="p-4 bg-[#121212] border border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Stability ({Math.round(settings.voiceSettings.stability * 100)}%)</span>
              <span className="text-neutral-500">More variable & expressive vs consistent</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.voiceSettings.stability}
              onChange={(e) =>
                onUpdateSettings({
                  voiceSettings: {
                    ...settings.voiceSettings,
                    stability: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-[#1ba1e2]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Clarity / Similarity ({Math.round(settings.voiceSettings.similarity_boost * 100)}%)</span>
              <span className="text-neutral-500">High fidelity to original speaker</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={settings.voiceSettings.similarity_boost}
              onChange={(e) =>
                onUpdateSettings({
                  voiceSettings: {
                    ...settings.voiceSettings,
                    similarity_boost: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-[#1ba1e2]"
            />
          </div>
        </div>
      </div>

      {/* 4. CHAPTER METRICS & CHUNK PLAN */}
      {activeChapter && (
        <div className="p-5 bg-[#141414] border border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                CURRENT TARGET
              </span>
              <h3 className="text-xl font-light text-white truncate">{activeChapter.title}</h3>
            </div>

            {activeChapter.isConverted ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Audio Converted
                </span>
                <button
                  onClick={() => onPlayChapter(currentBook!, selectedChapterIndex)}
                  className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-black bg-white hover:bg-neutral-200"
                >
                  Listen Now
                </button>
              </div>
            ) : (
              <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                Needs Conversion
              </span>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-black border border-neutral-900">
              <div className="text-[10px] uppercase font-bold text-neutral-500">Characters</div>
              <div className="text-lg font-light text-white mt-0.5">
                {activeChapter.charCount.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 bg-black border border-neutral-900">
              <div className="text-[10px] uppercase font-bold text-neutral-500">Words</div>
              <div className="text-lg font-light text-white mt-0.5">
                {activeChapter.wordCount.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 bg-black border border-neutral-900">
              <div className="text-[10px] uppercase font-bold text-neutral-500">Est. Duration</div>
              <div className="text-lg font-light text-white mt-0.5">
                ~{estimatedDurationMinutes} mins
              </div>
            </div>
            <div className="p-2.5 bg-black border border-neutral-900">
              <div className="text-[10px] uppercase font-bold text-neutral-500">API Chunks</div>
              <div className="text-lg font-light text-white mt-0.5">
                {activeChunks.length} parts
              </div>
            </div>
          </div>

          {/* Live Progress Indicator */}
          {isConverting && convertProgress && (
            <div className="p-4 bg-black border border-neutral-800 space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-medium">
                  Synthesizing chunk {convertProgress.currentChunk} of {convertProgress.totalChunks}...
                </span>
                <span className="font-mono text-sm" style={{ color: settings.accentColor }}>
                  {convertProgress.percent}%
                </span>
              </div>

              {/* Metro Progress Bar */}
              <div className="w-full bg-neutral-900 h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${convertProgress.percent}%`,
                    backgroundColor: settings.accentColor,
                  }}
                />
              </div>

              <div className="text-xs text-neutral-400 italic truncate font-light">
                "{convertProgress.currentSentence}"
              </div>

              <button
                onClick={handleCancelConversion}
                className="text-xs text-red-400 uppercase font-bold tracking-wider hover:underline pt-1"
              >
                Cancel Conversion
              </button>
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {conversionSuccess && (
            <div className="p-4 bg-emerald-950/40 border-2 border-emerald-700 text-emerald-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-medium text-sm">{conversionSuccess}</span>
                </div>
                <button
                  onClick={() => onPlayChapter(currentBook!, selectedChapterIndex)}
                  className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider shrink-0"
                >
                  Play Chapter
                </button>
              </div>

              {/* Direct Download Options */}
              <div className="pt-2 border-t border-emerald-900/60 flex flex-wrap items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-bold">
                  DOWNLOAD AUDIOBOOK:
                </span>
                <button
                  onClick={async () => {
                    const { downloadCompleteAudiobookMp3 } = await import('../utils/audioExporter');
                    downloadCompleteAudiobookMp3(currentBook!);
                  }}
                  className="px-2.5 py-1 bg-neutral-900 border border-emerald-600 text-emerald-300 hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Single MP3</span>
                </button>
                <button
                  onClick={async () => {
                    const { downloadAudiobookZip } = await import('../utils/audioExporter');
                    downloadAudiobookZip(currentBook!);
                  }}
                  className="px-2.5 py-1 bg-neutral-900 border border-emerald-600 text-cyan-300 hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Chapters ZIP</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => handleConvertChapter(selectedChapterIndex)}
            disabled={isConverting}
            className="w-full py-4 text-white font-semibold text-sm sm:text-base uppercase tracking-wider transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: settings.accentColor }}
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>
              {isConverting
                ? 'Converting Audiobook...'
                : activeChapter.isConverted
                ? 'Re-Convert Chapter with ElevenLabs'
                : 'Turn into Audiobook (ElevenLabs)'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
