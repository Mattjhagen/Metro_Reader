import React, { useState } from 'react';
import { AppSettings } from '../types';
import { fetchSubscriptionDetails } from '../utils/elevenLabsApi';
import { Key, Palette, HardDrive, Smartphone, Check, AlertCircle, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

interface SettingsPivotProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenInstallModal: () => void;
  onResetSampleBooks: () => void;
}

const WP_ACCENT_COLORS = [
  { name: 'Cyan (Lumia)', hex: '#1ba1e2' },
  { name: 'Magenta', hex: '#d80073' },
  { name: 'Mango', hex: '#f09609' },
  { name: 'Lime', hex: '#a4c400' },
  { name: 'Cobalt', hex: '#0050ef' },
  { name: 'Crimson', hex: '#e51400' },
  { name: 'Emerald', hex: '#008a00' },
  { name: 'Teal', hex: '#00aba9' },
  { name: 'Violet', hex: '#aa00ff' },
  { name: 'Amber', hex: '#e3a21a' },
];

export const SettingsPivot: React.FC<SettingsPivotProps> = ({
  settings,
  onUpdateSettings,
  onOpenInstallModal,
  onResetSampleBooks,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(settings.elevenLabsApiKey);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success: boolean;
    message: string;
    charsRemaining?: number;
    charLimit?: number;
    tier?: string;
  } | null>(null);

  const { isInstalled } = usePWAInstall();

  const handleSaveAndVerifyKey = async () => {
    const key = apiKeyInput.trim();
    setIsVerifying(true);
    setVerifyStatus(null);

    onUpdateSettings({ elevenLabsApiKey: key });

    if (!key) {
      setIsVerifying(false);
      setVerifyStatus({
        success: true,
        message: 'Key cleared. App will use demo synthesis.',
      });
      return;
    }

    try {
      const sub = await fetchSubscriptionDetails(key);
      if (sub) {
        setVerifyStatus({
          success: true,
          message: `API Key Verified! Tier: ${sub.tier}`,
          charsRemaining: sub.characterLimit - sub.characterCount,
          charLimit: sub.characterLimit,
          tier: sub.tier,
        });
      } else {
        setVerifyStatus({
          success: true,
          message: 'API Key saved.',
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        success: false,
        message: err.message || 'Verification failed. Please check key.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8 pb-28 px-4 max-w-3xl mx-auto select-none">
      {/* 1. ELEVENLABS API KEY SECTION */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          ELEVENLABS API KEY
        </div>

        <p className="text-xs text-neutral-400 font-light">
          Your key is stored locally in your device's secure browser sandbox. It is never sent to third-party servers.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk_... or xi-api-key"
            className="flex-1 bg-[#141414] border border-neutral-800 text-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-white"
          />
          <button
            onClick={handleSaveAndVerifyKey}
            disabled={isVerifying}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-50 shrink-0"
            style={{ backgroundColor: settings.accentColor }}
          >
            {isVerifying ? 'Verifying...' : 'Save & Verify'}
          </button>
        </div>

        {/* Verification result notification */}
        {verifyStatus && (
          <div
            className={`p-3 text-xs border flex items-center justify-between ${
              verifyStatus.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-red-950/40 border-red-800 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {verifyStatus.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{verifyStatus.message}</span>
            </div>
            {verifyStatus.charsRemaining !== undefined && (
              <span className="font-mono text-[11px] opacity-80">
                {verifyStatus.charsRemaining.toLocaleString()} / {verifyStatus.charLimit?.toLocaleString()} chars left
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. WINDOWS PHONE ACCENT COLOR SELECTOR */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          METRO ACCENT COLOR
        </div>
        <p className="text-xs text-neutral-400 font-light">
          Choose your authentic Windows Phone theme color.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {WP_ACCENT_COLORS.map((c) => {
            const isSelected = settings.accentColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                onClick={() => onUpdateSettings({ accentColor: c.hex })}
                className="p-3 text-left border transition-all duration-100 flex items-center justify-between group active:scale-95"
                style={{
                  backgroundColor: c.hex,
                  borderColor: isSelected ? '#ffffff' : 'transparent',
                }}
              >
                <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
                  {c.name}
                </span>
                {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PWA INSTALL & DEVICE SETUP */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          PROGRESSIVE WEB APP (IOS & ANDROID)
        </div>

        <div className="p-4 bg-[#141414] border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">
              {isInstalled ? 'App is Running in Standalone PWA Mode' : 'Install to Phone Home Screen'}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Enables offline audio playback, lock screen media controls, and fullscreen experience.
            </div>
          </div>
          <button
            onClick={onOpenInstallModal}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-neutral-200 transition-colors shrink-0 ml-3"
          >
            {isInstalled ? 'Install Guide' : 'Install App'}
          </button>
        </div>
      </div>

      {/* 4. STORAGE & CACHE MANAGEMENT */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 border-b border-neutral-800 pb-1">
          STORAGE & OFFLINE CACHE
        </div>

        <div className="p-4 bg-[#141414] border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Reset Initial Library</span>
            <button
              onClick={() => {
                if (confirm('Reset library to default classic books (The Time Machine, Sherlock Holmes)?')) {
                  onResetSampleBooks();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-neutral-700 hover:border-white text-neutral-200"
            >
              Reset Samples
            </button>
          </div>

          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span>IndexedDB KeyVal Storage</span>
            <span>Audio blobs cached offline</span>
          </div>
        </div>
      </div>

      {/* 5. ABOUT WINDOWS PHONE METRO */}
      <div className="p-4 bg-black border border-neutral-900 text-xs text-neutral-500 space-y-1">
        <div className="text-white font-semibold">AudioBookify · Windows Phone Metro Edition</div>
        <div>Built for iOS Safari and Android Chrome as an installable PWA. Powered by ElevenLabs Neural TTS.</div>
      </div>
    </div>
  );
};
