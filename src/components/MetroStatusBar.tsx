import React, { useEffect, useState } from 'react';
import { Wifi, Signal, Battery } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWA';

interface MetroStatusBarProps {
  accentColor: string;
}

export const MetroStatusBar: React.FC<MetroStatusBarProps> = ({ accentColor }) => {
  const isOnline = useOnlineStatus();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      // Windows Phone 12hr format e.g. "12:38" or 24hr format
      const formatted = `${hours}:${minutes}`;
      setTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex items-center justify-between px-4 pt-1 pb-1 text-xs select-none tracking-wider text-neutral-400 font-normal border-b border-neutral-900 bg-black">
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-normal text-white text-[11px]">WINDOWS PHONE</span>
        <div className="flex items-center gap-1.5 opacity-80">
          <Signal className="w-3 h-3 text-neutral-300" />
          <Wifi className={`w-3 h-3 ${isOnline ? 'text-neutral-300' : 'text-red-500'}`} />
          {!isOnline && (
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-tight">
              offline
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[13px] text-white font-light tracking-wide">{timeStr}</span>
        <Battery className="w-3.5 h-3.5 text-neutral-300" />
      </div>
    </div>
  );
};
