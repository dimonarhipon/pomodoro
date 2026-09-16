import { TimerMode } from '../hooks/useTimer';

interface TimerProps {
  timeLeft: number;
  isRunning: boolean;
  mode: TimerMode;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSwitchMode: (mode: TimerMode) => void;
}

const modeLabels: Record<TimerMode, string> = {
  focus: 'Фокусировка',
  shortBreak: 'Короткий перерыв',
  longBreak: 'Длительный перерыв',
};

const modeColors: Record<TimerMode, string> = {
  focus: 'from-red-500 to-orange-500',
  shortBreak: 'from-green-400 to-emerald-500',
  longBreak: 'from-blue-400 to-indigo-500',
};

const modeRingColors: Record<TimerMode, string> = {
  focus: 'ring-red-500/30',
  shortBreak: 'ring-green-500/30',
  longBreak: 'ring-blue-500/30',
};

export default function Timer({
  timeLeft,
  isRunning,
  mode,
  onStart,
  onPause,
  onReset,
  onSwitchMode,
}: TimerProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const modes: TimerMode[] = ['focus', 'shortBreak', 'longBreak'];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Mode tabs */}
      <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-full p-1.5">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => onSwitchMode(m)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              mode === m
                ? `bg-gradient-to-r ${modeColors[m]} text-white shadow-lg`
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="relative">
        <div className={`absolute inset-0 bg-gradient-to-r ${modeColors[mode]} rounded-full blur-3xl opacity-20 scale-110 animate-pulse`}></div>
        <div className={`relative w-72 h-72 md:w-80 md:h-80 rounded-full border-4 ${mode === 'focus' ? 'border-red-500/30' : mode === 'shortBreak' ? 'border-green-500/30' : 'border-blue-500/30'} ring-8 ${modeRingColors[mode]} flex items-center justify-center bg-gray-900/50 backdrop-blur-sm`}>
          <div className="text-center">
            <div className="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider">
              {displayTime}
            </div>
            <div className="text-sm text-gray-400 mt-2 uppercase tracking-widest">
              {modeLabels[mode]}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
          title="Сброс"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={isRunning ? onPause : onStart}
          className={`w-16 h-16 rounded-full bg-gradient-to-r ${modeColors[mode]} flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
          title={isRunning ? 'Пауза' : 'Старт'}
        >
          {isRunning ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => onSwitchMode(mode === 'focus' ? 'shortBreak' : 'focus')}
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
          title="Пропустить"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
