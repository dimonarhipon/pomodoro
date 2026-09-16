import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  mode: TimerMode;
  completedPomodoros: number;
}

export function useTimer(settings: TimerSettings) {
  const [state, setState] = useState<TimerState>({
    timeLeft: settings.focus * 60,
    isRunning: false,
    mode: 'focus',
    completedPomodoros: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef<((mode: TimerMode) => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState(prev => ({
      ...prev,
      timeLeft: settings[prev.mode] * 60,
      isRunning: false,
    }));
  }, [clearTimer, settings]);

  const switchMode = useCallback((mode: TimerMode) => {
    clearTimer();
    setState(prev => ({
      ...prev,
      mode,
      timeLeft: settings[mode] * 60,
      isRunning: false,
    }));
  }, [clearTimer, settings]);

  const setOnComplete = useCallback((callback: (mode: TimerMode) => void) => {
    onCompleteRef.current = callback;
  }, []);

  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            clearTimer();
            const newCompleted = prev.mode === 'focus' 
              ? prev.completedPomodoros + 1 
              : prev.completedPomodoros;
            
            if (onCompleteRef.current) {
              onCompleteRef.current(prev.mode);
            }

            return {
              ...prev,
              timeLeft: 0,
              isRunning: false,
              completedPomodoros: newCompleted,
            };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }

    return () => {
      clearTimer();
    };
  }, [state.isRunning, clearTimer]);

  // Update time when settings change and timer is not running
  useEffect(() => {
    if (!state.isRunning) {
      setState(prev => ({
        ...prev,
        timeLeft: settings[prev.mode] * 60,
      }));
    }
  }, [settings, state.isRunning]);

  return {
    ...state,
    start,
    pause,
    reset,
    switchMode,
    setOnComplete,
  };
}
