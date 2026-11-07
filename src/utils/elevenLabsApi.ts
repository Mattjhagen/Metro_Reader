import { ElevenLabsModel, ElevenLabsVoice, VoiceSettings } from '../types';

export const ELEVENLABS_MODELS: ElevenLabsModel[] = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    description: 'Rich, expressive, 29 languages. Recommended for premium audiobooks.',
    token_cost_multiplier: 1.0,
  },
  {
    model_id: 'eleven_turbo_v2_5',
    name: 'Turbo v2.5',
    description: 'High speed, natural prosody, 50% cheaper credits.',
    token_cost_multiplier: 0.5,
  },
  {
    model_id: 'eleven_flash_v2_5',
    name: 'Flash v2.5',
    description: 'Ultra fast response, ideal for long format testing.',
    token_cost_multiplier: 0.5,
  },
  {
    model_id: 'eleven_monolingual_v1',
    name: 'Monolingual v1',
    description: 'Classic English voice synthesis.',
    token_cost_multiplier: 1.0,
  },
];

export const PRESET_VOICES: ElevenLabsVoice[] = [
  {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    category: 'premade',
    description: 'Calm, narrative, young American female.',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'narration' },
  },
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'premade',
    description: 'Deep, conversational, American male.',
    labels: { accent: 'american', gender: 'male', age: 'middle-aged', use_case: 'narration' },
  },
  {
    voice_id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    category: 'premade',
    description: 'Warm, storytelling, classic audiobook male.',
    labels: { accent: 'american', gender: 'male', age: 'young', use_case: 'audiobook' },
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'premade',
    description: 'Expressive, delicate, British/American female.',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'audiobook' },
  },
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    category: 'premade',
    description: 'Warm British gentleman, evocative classic narrator.',
    labels: { accent: 'british', gender: 'male', age: 'mature', use_case: 'classic narration' },
  },
  {
    voice_id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    category: 'premade',
    description: 'Crisp, articulate, authoritative British male.',
    labels: { accent: 'british', gender: 'male', age: 'middle-aged', use_case: 'narration' },
  },
  {
    voice_id: 'piTKgcLEGmPE4e6mEKli',
    name: 'Nicole',
    category: 'premade',
    description: 'Whispery, intimate, literature & mystery reader.',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'audiobook' },
  },
];

export async function fetchVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  if (!apiKey.trim()) {
    return PRESET_VOICES;
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey.trim(),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail?.message ||
        `Failed to fetch voices from ElevenLabs (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  return (data.voices || []).map((v: any) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category || 'custom',
    description: v.description || v.labels?.description || 'Custom voice',
    preview_url: v.preview_url,
    labels: v.labels || {},
  }));
}

export async function fetchSubscriptionDetails(apiKey: string): Promise<{
  characterCount: number;
  characterLimit: number;
  tier: string;
} | null> {
  if (!apiKey.trim()) return null;

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey.trim(),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      characterCount: data.character_count ?? 0,
      characterLimit: data.character_limit ?? 10000,
      tier: data.tier || 'starter',
    };
  } catch {
    return null;
  }
}

/**
 * Splits text into natural sentence-level chunks <= maxChars
 */
export function splitTextIntoChunks(text: string, maxChars = 2200): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChars) return [text.trim()];

  // Split by sentences (matching punctuation followed by space or newline)
  const sentenceRegex = /[^.!?\n]+[.!?\n]+|\s*\n\s*|[^.!?\n]+$/g;
  const sentences = text.match(sentenceRegex) || [text];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).length <= maxChars) {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    } else {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }

      // If a single sentence exceeds maxChars, hard break at punctuation or space
      if (trimmed.length > maxChars) {
        let remaining = trimmed;
        while (remaining.length > maxChars) {
          let splitAt = remaining.lastIndexOf(' ', maxChars);
          if (splitAt === -1) splitAt = maxChars;
          chunks.push(remaining.substring(0, splitAt).trim());
          remaining = remaining.substring(splitAt).trim();
        }
        currentChunk = remaining;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Converts a text chunk to speech using ElevenLabs API
 */
export async function convertSingleChunk(
  text: string,
  voiceId: string,
  modelId: string,
  settings: VoiceSettings,
  apiKey: string
): Promise<Blob> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey.trim(),
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style ?? 0,
        use_speaker_boost: settings.use_speaker_boost ?? true,
      },
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message =
      errorJson.detail?.message ||
      `ElevenLabs API error: HTTP ${res.status} (${res.statusText})`;
    throw new Error(message);
  }

  return await res.blob();
}

/**
 * Synthesizes a demo offline audio wave when testing without API key
 */
export async function generateDemoAudioBlob(text: string): Promise<Blob> {
  // Generate a clean Web Audio chime / tone melody or spoken audio using browser speech synthesis
  return new Promise((resolve) => {
    // Generate an MP3-compatible wav audio blob in memory for testing
    const sampleRate = 44100;
    const duration = Math.min(12, Math.max(3, Math.round(text.length / 30)));
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // Write WAV Header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Warm ambient narrator chord tone
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const baseFreq = 220; // A3
      const env = Math.exp(-t / 3) * Math.min(1, t * 10);
      const sample =
        (Math.sin(2 * Math.PI * baseFreq * t) * 0.4 +
          Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.3 +
          Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.2) *
        env;
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }

    resolve(new Blob([buffer], { type: 'audio/wav' }));
  });
}
