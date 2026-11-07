export interface Chapter {
  id: string;
  title: string;
  text: string;
  wordCount: number;
  charCount: number;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  isConverted: boolean;
  conversionProgress?: number; // 0 to 100
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  timestamp: number; // in seconds
  note?: string;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'pdf' | 'docx' | 'txt' | 'md' | 'sample';
  coverUrl?: string;
  fileSize?: number;
  totalWords: number;
  totalChars: number;
  chapters: Chapter[];
  createdAt: number;
  lastPlayedAt?: number;
  currentChapterIndex: number;
  playbackPosition: number; // in seconds
  isFullyConverted: boolean;
  bookmarks: Bookmark[];
  progressPercent?: number; // 0 to 100
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  token_cost_multiplier?: number;
}

export interface VoiceSettings {
  stability: number; // 0 to 1
  similarity_boost: number; // 0 to 1
  style?: number; // 0 to 1
  use_speaker_boost?: boolean;
}

export interface AppSettings {
  elevenLabsApiKey: string;
  useElevenLabs: boolean;
  selectedVoiceId: string;
  selectedVoiceName: string;
  selectedModelId: string;
  voiceSettings: VoiceSettings;
  accentColor: string; // hex code
  playbackSpeed: number;
  autoPlayNextChapter: boolean;
  sleepTimerMinutes: number | null; // null or minutes
}

export type MetroPivot = 'library' | 'converter' | 'nowplaying' | 'settings';
