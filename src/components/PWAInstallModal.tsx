import React from 'react';
import { Smartphone, Share, PlusSquare, Check, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  accentColor,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-md bg-[#121212] border-2 border-neutral-700 text-white p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
          INSTALL TO HOME SCREEN
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-light text-white">AudioBookify Metro</h3>
            <p className="text-xs text-neutral-400">
              Install the Progressive Web App on iOS & Android
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>App is already running as an installed standalone PWA!</span>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 bg-black p-4 border border-neutral-800 text-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Instructions for iPhone & iPad (Safari):
            </div>
            <ol className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">1.</span>
                <span>
                  Tap the <strong className="text-white">Share</strong> icon (square with arrow up) at the bottom or top of Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">2.</span>
                <span>
                  Scroll down the share sheet and tap <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">3.</span>
                <span>
                  Tap <strong className="text-white">Add</strong> in the top right. AudioBookify will appear on your phone home screen!
                </span>
              </li>
            </ol>
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <p className="text-xs text-neutral-300">
              Click below to prompt your browser to install AudioBookify directly to your home screen or app drawer.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              Install App Now
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-neutral-300 bg-black p-4 border border-neutral-800">
            <p className="font-medium text-white">
              To install in Chrome or Android:
            </p>
            <p>
              Tap the browser menu (three dots in top right) and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
            </p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-700 hover:border-white text-neutral-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
