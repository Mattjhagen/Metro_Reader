import { generateDemoAudioBlob } from './elevenLabsApi';

declare global {
  interface Window {
    AndroidTts?: { synthesize: (text: string, requestId: string) => void };
    __metroTtsDone?: (requestId: string, audioBase64: string, error?: string) => void;
  }
}

const callbacks = new Map<string, { resolve: (blob: Blob) => void; reject: (error: Error) => void }>();
let callbackReady = false;

function ensureCallback() {
  if (callbackReady || typeof window === 'undefined') return;
  window.__metroTtsDone = (requestId, audioBase64, error) => {
    const callback = callbacks.get(requestId);
    if (!callback) return;
    callbacks.delete(requestId);
    if (error) {
      callback.reject(new Error(error));
      return;
    }
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    callback.resolve(new Blob([bytes], { type: 'audio/wav' }));
  };
  callbackReady = true;
}

export async function convertWithBuiltInVoice(text: string): Promise<Blob> {
  ensureCallback();

  if (typeof window !== 'undefined' && window.AndroidTts?.synthesize) {
    const requestId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<Blob>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (callbacks.delete(requestId)) reject(new Error('Built-in voice conversion timed out.'));
      }, 120000);
      callbacks.set(requestId, {
        resolve: (blob) => { window.clearTimeout(timeout); resolve(blob); },
        reject: (error) => { window.clearTimeout(timeout); reject(error); },
      });
      try {
        window.AndroidTts!.synthesize(text, requestId);
      } catch (error) {
        callbacks.delete(requestId);
        reject(error instanceof Error ? error : new Error('Built-in voice is unavailable.'));
      }
    });
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  return generateDemoAudioBlob(text, Math.max(15, Math.min(60, Math.round(text.length / 12))));
}
