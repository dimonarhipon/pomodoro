import { TimerMode } from '../hooks/useTimer';

interface Session {
  id: string;
  mode: TimerMode;
  duration: number;
  completedAt: string;
}

interface StatisticsProps {
  sessions: Session[];
  completedPomodoros: number;
}

export default function Statistics({ sessions, completedPomodoros }: StatisticsProps) {
  const today = new Date().toDateString();
  
  const todaySessions = sessions.filter(
    (s) => new Date(s.completedAt).toDateString() === today
  );

  const todayFocusSessions = todaySessions.filter((s) => s.mode === 'focus');
  const totalFocusMinutes = todayFocusSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalBreakMinutes = todaySessions
    .filter((s) => s.mode !== 'focus')
    .reduce((acc, s) => acc + s.duration, 0);

  const hours = Math.floor(totalFocusMinutes / 60);
  const mins = totalFocusMinutes % 60;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Статистика за сегодня
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Pomodoros completed */}
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-red-400">{completedPomodoros}</div>
            <div className="text-xs text-gray-400 mt-1">Помодоро</div>
          </div>

          {/* Focus time */}
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-orange-400">
              {hours > 0 ? `${hours}ч` : ''}{mins > 0 ? `${mins}м` : ''}{hours === 0 && mins === 0 ? '0м' : ''}
            </div>
            <div className="text-xs text-gray-400 mt-1">Фокус</div>
          </div>

          {/* Break time */}
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{totalBreakMinutes}м</div>
            <div className="text-xs text-gray-400 mt-1">Отдых</div>
          </div>
        </div>

        {/* Progress bar */}
        {todayFocusSessions.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Прогресс дня</span>
              <span>{todayFocusSessions.length} / 8 помодоро</span>
            </div>
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (todayFocusSessions.length / 8) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {todayFocusSessions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-xs text-gray-400 mb-2">Последние сессии</div>
            <div className="flex gap-1.5 flex-wrap">
              {todayFocusSessions.slice(-8).map((session, index) => (
                <div
                  key={session.id || index}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center text-xs text-red-300"
                  title={`${session.duration} мин - ${new Date(session.completedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                >
                  🍅
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
