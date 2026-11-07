import React, { useState } from 'react';
import { Smartphone, Download, Check, X, FileCode, Play, Terminal } from 'lucide-react';
import { generateAndroidProjectZip } from '../utils/apkGenerator';
import { usePWAInstall } from '../hooks/usePWA';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({
  isOpen,
  onClose,
  accentColor,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setIsGeneratingZip(true);
    setDownloadSuccess(false);
    try {
      await generateAndroidProjectZip();
      setDownloadSuccess(true);
    } catch (err: any) {
      alert('Failed to generate Android project zip: ' + err.message);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#111111] border-2 border-neutral-700 text-white p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
          ANDROID APK & APP PACKAGING
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <Smartphone className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-light text-white">Metro Reader for Android</h3>
            <p className="text-xs text-neutral-400">
              Install via Native WebAPK or download the complete Android Studio APK project
            </p>
          </div>
        </div>

        {/* Method 1: WebAPK (Instant) */}
        <div className="p-4 bg-black border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              METHOD 1: NATIVE WEBAK (RECOMMENDED · ZERO BUILD NEEDED)
            </div>
            <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 border border-cyan-800 font-mono">
              INSTANT
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed font-light">
            Android automatically builds and installs a signed APK directly into your app drawer when you add this PWA to your home screen. It runs in full-screen standalone mode with background audio and lock screen widgets.
          </p>

          {isInstalled ? (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Metro Reader is already installed on this Android device!</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={async () => {
                const ok = await install();
                if (ok) onClose();
              }}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider text-black shadow-md transition-transform active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              Install WebAPK to Android Phone
            </button>
          ) : (
            <div className="text-xs text-neutral-400 bg-[#161616] p-2.5 border border-neutral-800 space-y-1">
              <div className="text-white font-medium">To install on Android:</div>
              <div>1. Open Chrome menu (three dots in top right)</div>
              <div>2. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></div>
            </div>
          )}
        </div>

        {/* Method 2: Android Studio APK Project */}
        <div className="p-4 bg-black border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              METHOD 2: ANDROID STUDIO & GRADLE APK PROJECT
            </div>
            <span className="text-[10px] bg-neutral-900 text-neutral-400 px-2 py-0.5 border border-neutral-800 font-mono">
              SOURCE
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed font-light">
            Download the ready-to-compile Android Studio project. It includes `AndroidManifest.xml`, Kotlin `MainActivity.kt` with audio foreground permissions, and `build.gradle` ready for `assembleDebug` / `assembleRelease`.
          </p>

          <button
            onClick={handleDownloadZip}
            disabled={isGeneratingZip}
            className="w-full py-3 text-xs font-bold uppercase tracking-wider text-white border border-neutral-600 hover:border-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>
              {isGeneratingZip
                ? 'Packaging Android Project...'
                : 'Download Android Studio Project (.zip)'}
            </span>
          </button>

          {downloadSuccess && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Project zip downloaded! Open in Android Studio to build APK.</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-800 text-neutral-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
