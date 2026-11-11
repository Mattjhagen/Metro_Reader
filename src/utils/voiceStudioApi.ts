import { VoiceSettings, VoiceStudioModel, VoiceStudioVoice } from '../types';

export const DEFAULT_VOICESTUDIO_URL = 'http://localhost:3900';
export const VOICESTUDIO_MODELS: VoiceStudioModel[] = [
  { model_id: 'tts-1', name: 'VoiceStudio standard', description: 'Local audiobook narration.' },
  { model_id: 'tts-1-hd', name: 'VoiceStudio HD', description: 'Local higher-quality narration when supported.' },
];

function endpoint(value?: string): string { return (value || DEFAULT_VOICESTUDIO_URL).replace(/\/$/, ''); }

export async function checkVoiceStudio(baseUrl?: string): Promise<void> {
  const res = await fetch(`${endpoint(baseUrl)}/health`);
  if (!res.ok) throw new Error(`VoiceStudio health check failed (HTTP ${res.status}).`);
}

export async function fetchVoices(baseUrl?: string): Promise<VoiceStudioVoice[]> {
  const res = await fetch(`${endpoint(baseUrl)}/v1/audio/voices`);
  if (!res.ok) throw new Error(`VoiceStudio could not list voices (HTTP ${res.status}).`);
  const data = await res.json();
  const voices = Array.isArray(data) ? data : data.voices || [];
  return voices.map((voice: any) => ({
    voice_id: voice.voice_id || voice.id,
    name: voice.name || voice.display_name || voice.voice_id || voice.id,
    category: voice.category || 'VoiceStudio',
    description: voice.description || 'Local VoiceStudio voice',
    labels: voice.labels || {},
  }));
}

export function splitTextIntoChunks(text: string, maxChars = 2200): string[] {
  if (!text.trim()) return [];
  if (text.length <= maxChars) return [text.trim()];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|\s*\n\s*|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;
    if (((current ? `${current} ` : '') + part).length <= maxChars) current += (current ? ' ' : '') + part;
    else {
      if (current) chunks.push(current);
      let remaining = part;
      while (remaining.length > maxChars) {
        const splitAt = remaining.lastIndexOf(' ', maxChars);
        const at = splitAt > 0 ? splitAt : maxChars;
        chunks.push(remaining.slice(0, at).trim());
        remaining = remaining.slice(at).trim();
      }
      current = remaining;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function convertSingleChunk(text: string, voiceId: string, modelId: string, _settings: VoiceSettings, baseUrl?: string): Promise<Blob> {
  const res = await fetch(`${endpoint(baseUrl)}/v1/audio/speech`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId || 'tts-1', voice: voiceId, input: text, response_format: 'wav' }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `VoiceStudio speech generation failed (HTTP ${res.status}).`);
  return res.blob();
}

export async function generateDemoAudioBlob(text: string, durationSeconds = 30): Promise<Blob> {
  const sampleRate = 44100, duration = Math.min(60, Math.max(15, durationSeconds)), numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2), view = new DataView(buffer);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, numSamples * 2, true);
  const seed = Math.max(120, Math.min(220, text.length + 130));
  for (let i = 0; i < numSamples; i++) { const t = i / sampleRate; const env = Math.max(0.05, Math.sin(2 * Math.PI * 3.2 * t) ** 2) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.3 * t)); const sample = Math.sin(2 * Math.PI * (seed + 20 * Math.sin(2 * Math.PI * 0.8 * t)) * t) * 0.35 * env; view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); }
  return new Blob([buffer], { type: 'audio/wav' });
}
