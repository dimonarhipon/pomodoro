import { useCallback, useEffect } from 'react';
import { useTimer, TimerMode } from './hooks/useTimer';
import { useLocalStorage } from './hooks/useLocalStorage';
import Timer from './components/Timer';
import Settings from './components/Settings';
import Statistics from './components/Statistics';

interface Session {
  id: string;
  mode: TimerMode;
  duration: number;
  completedAt: string;
}

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

const defaultSettings: TimerSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

export default function App() {
  const [settings, setSettings] = useLocalStorage<TimerSettings>('pomodoro-settings', defaultSettings);
  const [sessions, setSessions] = useLocalStorage<Session[]>('pomodoro-sessions', []);
  const [completedPomodoros, setCompletedPomodoros] = useLocalStorage<number>('pomodoro-completed', 0);

  const timer = useTimer(settings);

  // Reset daily counter at midnight
  useEffect(() => {
    const lastDate = localStorage.getItem('pomodoro-last-date');
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
      setCompletedPomodoros(0);
      localStorage.setItem('pomodoro-last-date', today);
    }
  }, [setCompletedPomodoros]);

  const handleSessionComplete = useCallback((mode: TimerMode) => {
    const session: Session = {
      id: Date.now().toString(),
      mode,
      duration: settings[mode],
      completedAt: new Date().toISOString(),
    };
    setSessions((prev) => [...prev, session]);
    
    if (mode === 'focus') {
      setCompletedPomodoros((prev) => prev + 1);
    }

    // Play notification sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = mode === 'focus' ? 800 : 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Audio not supported
    }

    // Auto-switch to next mode
    if (mode === 'focus') {
      const newCount = completedPomodoros + 1;
      if (newCount % 4 === 0) {
        timer.switchMode('longBreak');
      } else {
        timer.switchMode('shortBreak');
      }
    } else {
      timer.switchMode('focus');
    }
  }, [settings, setSessions, setCompletedPomodoros, completedPomodoros, timer]);

  useEffect(() => {
    timer.setOnComplete(handleSessionComplete);
  }, [handleSessionComplete, timer.setOnComplete]);

  // Update document title with timer
  useEffect(() => {
    const minutes = Math.floor(timer.timeLeft / 60);
    const seconds = timer.timeLeft % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const modeStr = timer.mode === 'focus' ? '🎯' : timer.mode === 'shortBreak' ? '☕' : '🌴';
    document.title = `${modeStr} ${timeStr} — Pomodoro`;
  }, [timer.timeLeft, timer.mode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Pomodoro
          </span>{' '}
          Timer
        </h1>
        <p className="text-gray-400 text-sm">Сфокусируйся. Работай. Отдыхай.</p>
      </div>

      {/* Timer */}
      <div className="mb-8">
        <Timer
          timeLeft={timer.timeLeft}
          isRunning={timer.isRunning}
          mode={timer.mode}
          onStart={timer.start}
          onPause={timer.pause}
          onReset={timer.reset}
          onSwitchMode={timer.switchMode}
        />
      </div>

      {/* Statistics */}
      <Statistics sessions={sessions} completedPomodoros={completedPomodoros} />

      {/* Settings */}
      <Settings settings={settings} onSettingsChange={setSettings} />

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>Каждые 4 помодоро — длительный перерыв</p>
      </div>
    </div>
  );
}
