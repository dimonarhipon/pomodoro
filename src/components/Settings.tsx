import { useState } from 'react';
import { TimerMode } from '../hooks/useTimer';

interface SettingsProps {
  settings: Record<TimerMode, number>;
  onSettingsChange: (settings: Record<TimerMode, number>) => void;
}

const modeLabels: Record<TimerMode, string> = {
  focus: 'Фокусировка',
  shortBreak: 'Короткий перерыв',
  longBreak: 'Длительный перерыв',
};

const modeIcons: Record<TimerMode, string> = {
  focus: '🎯',
  shortBreak: '☕',
  longBreak: '🌴',
};

export default function Settings({ settings, onSettingsChange }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(tempSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setIsOpen(false);
  };

  const handleChange = (mode: TimerMode, value: string) => {
    const numValue = parseInt(value) || 1;
    setTempSettings(prev => ({
      ...prev,
      [mode]: Math.max(1, Math.min(120, numValue)),
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg z-50"
        title="Настройки"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel}></div>
      <div className="relative bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Настройки
        </h2>

        <div className="space-y-4">
          {(Object.keys(modeLabels) as TimerMode[]).map((mode) => (
            <div key={mode} className="flex items-center justify-between gap-4">
              <label className="text-gray-300 flex items-center gap-2">
                <span>{modeIcons[mode]}</span>
                <span className="text-sm">{modeLabels[mode]}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={tempSettings[mode]}
                  onChange={(e) => handleChange(mode, e.target.value)}
                  className="w-20 px-3 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <span className="text-gray-400 text-sm">мин</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium hover:shadow-lg transition-all"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
