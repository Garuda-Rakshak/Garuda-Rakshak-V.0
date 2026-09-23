import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { AlertCircle, X, VolumeX } from 'lucide-react';

export function MasterWarningBanner() {
  const { masterAlarm, silenceAlarm } = useDigitalTwinStore();

  if (!masterAlarm.active) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg z-50 animate-pulse">
      <div className="flex items-center gap-2.5 max-w-4xl">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-white" />
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold">
          <span className="bg-red-800 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
            MAJOR ERROR
          </span>
          <span>{masterAlarm.message || 'Critical failure detected.'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={silenceAlarm}
          className="flex items-center gap-1 px-3 py-1 bg-white text-red-700 hover:bg-red-100 rounded text-xs font-bold transition-colors"
        >
          <VolumeX className="w-3.5 h-3.5" />
          Silence Alarm
        </button>
        <button
          onClick={silenceAlarm}
          className="p-1 hover:bg-red-700 rounded text-white transition-colors"
          title="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
