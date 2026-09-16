// ============================================
// Pomodoro Timer — Чистый JavaScript
// ============================================

// ---------- Хранилище (localStorage) ----------
const Storage = {
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  },
};

// ---------- Настройки по умолчанию ----------
const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

// ---------- Состояние приложения ----------
const state = {
  mode: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
  timeLeft: DEFAULT_SETTINGS.focus * 60,
  isRunning: false,
  completedPomodoros: 0,
  settings: { ...DEFAULT_SETTINGS },
  sessions: [],
  intervalId: null,
};

// ---------- Утилиты ----------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getToday() {
  return new Date().toDateString();
}

function getModeLabel(mode) {
  const labels = {
    focus: 'Фокусировка',
    shortBreak: 'Короткий перерыв',
    longBreak: 'Длительный перерыв',
  };
  return labels[mode] || mode;
}

function getModeEmoji(mode) {
  const emojis = { focus: '🎯', shortBreak: '☕', longBreak: '🌴' };
  return emojis[mode] || '⏱️';
}

function getModeGradient(mode) {
  const gradients = {
    focus: 'from-red-500 to-orange-500',
    shortBreak: 'from-green-400 to-emerald-500',
    longBreak: 'from-blue-400 to-indigo-500',
  };
  return gradients[mode] || gradients.focus;
}

function getModeBorder(mode) {
  const borders = {
    focus: 'border-red-500/30',
    shortBreak: 'border-green-500/30',
    longBreak: 'border-blue-500/30',
  };
  return borders[mode] || borders.focus;
}

function getModeRing(mode) {
  const rings = {
    focus: 'ring-red-500/30',
    shortBreak: 'ring-green-500/30',
    longBreak: 'ring-blue-500/30',
  };
  return rings[mode] || rings.focus;
}

// ---------- Звуковое уведомление ----------
function playNotification(mode) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = mode === 'focus' ? 800 : 600;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Звук не поддерживается
  }
}

// ---------- Загрузка данных ----------
function loadData() {
  // Проверяем, нужно ли сбросить дневной счётчик
  const lastDate = Storage.get('pomodoro-last-date', '');
  const today = getToday();
  if (lastDate !== today) {
    state.completedPomodoros = 0;
    Storage.set('pomodoro-last-date', today);
  } else {
    state.completedPomodoros = Storage.get('pomodoro-completed', 0);
  }

  state.settings = Storage.get('pomodoro-settings', { ...DEFAULT_SETTINGS });
  state.sessions = Storage.get('pomodoro-sessions', []);
  state.timeLeft = state.settings[state.mode] * 60;
}

// ---------- Сохранение данных ----------
function saveData() {
  Storage.set('pomodoro-settings', state.settings);
  Storage.set('pomodoro-sessions', state.sessions);
  Storage.set('pomodoro-completed', state.completedPomodoros);
  Storage.set('pomodoro-last-date', getToday());
}

// ---------- Логика таймера ----------
function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  state.intervalId = setInterval(() => {
    if (state.timeLeft > 0) {
      state.timeLeft--;
      renderTimer();
      updateTitle();
    } else {
      onTimerComplete();
    }
  }, 1000);
  renderControls();
}

function pauseTimer() {
  state.isRunning = false;
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  renderControls();
}

function resetTimer() {
  pauseTimer();
  state.timeLeft = state.settings[state.mode] * 60;
  renderTimer();
  updateTitle();
}

function switchMode(mode) {
  pauseTimer();
  state.mode = mode;
  state.timeLeft = state.settings[mode] * 60;
  renderAll();
}

function onTimerComplete() {
  pauseTimer();
  playNotification(state.mode);

  // Записываем сессию
  const session = {
    id: Date.now().toString(),
    mode: state.mode,
    duration: state.settings[state.mode],
    completedAt: new Date().toISOString(),
  };
  state.sessions.push(session);

  if (state.mode === 'focus') {
    state.completedPomodoros++;
  }

  saveData();

  // Автоматическое переключение режима
  if (state.mode === 'focus') {
    if (state.completedPomodoros % 4 === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }
  } else {
    switchMode('focus');
  }
}

// ---------- Обновление заголовка ----------
function updateTitle() {
  const timeStr = formatTime(state.timeLeft);
  const emoji = getModeEmoji(state.mode);
  document.title = `${emoji} ${timeStr} — Pomodoro`;
}

// ---------- Рендеринг ----------
let rootEl = null;

function renderAll() {
  if (!rootEl) return;
  rootEl.innerHTML = '';

  // Фон
  const bgDecor1 = document.createElement('div');
  bgDecor1.className = 'absolute top-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2';
  rootEl.appendChild(bgDecor1);

  const bgDecor2 = document.createElement('div');
  bgDecor2.className = 'absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2';
  rootEl.appendChild(bgDecor2);

  // Контейнер
  const container = document.createElement('div');
  container.className = 'relative z-10 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4 py-8';

  // Заголовок
  const header = document.createElement('div');
  header.className = 'text-center mb-8';
  header.innerHTML = `
    <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
      <span class="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Pomodoro</span> Таймер
    </h1>
    <p class="text-gray-400 text-sm">Сфокусируйся. Работай. Отдыхай.</p>
  `;
  container.appendChild(header);

  // Секция таймера
  const timerSection = document.createElement('div');
  timerSection.className = 'flex flex-col items-center gap-8 mb-8';
  timerSection.id = 'timer-section';
  container.appendChild(timerSection);

  // Секция статистики
  const statsSection = document.createElement('div');
  statsSection.className = 'w-full mb-6';
  statsSection.id = 'stats-section';
  container.appendChild(statsSection);

  // Подвал
  const footer = document.createElement('div');
  footer.className = 'text-center text-xs text-gray-500 mt-4';
  footer.textContent = 'Каждые 4 помодоро — длительный перерыв';
  container.appendChild(footer);

  rootEl.appendChild(container);

  // Кнопка настроек
  const settingsBtn = createSettingsButton();
  rootEl.appendChild(settingsBtn);

  // Рендерим содержимое секций
  renderTimerModes(timerSection);
  renderTimerDisplay(timerSection);
  renderControls();
  renderStatistics();
  updateTitle();
}

function renderTimerModes(parent) {
  // Удаляем старую панель режимов, если есть
  const old = parent.querySelector('#mode-tabs');
  if (old) old.remove();

  const tabs = document.createElement('div');
  tabs.id = 'mode-tabs';
  tabs.className = 'flex gap-2 bg-white/10 backdrop-blur-sm rounded-full p-1.5';

  const modes = ['focus', 'shortBreak', 'longBreak'];
  modes.forEach((mode) => {
    const btn = document.createElement('button');
    const isActive = state.mode === mode;
    btn.className = `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      isActive
        ? `bg-gradient-to-r ${getModeGradient(mode)} text-white shadow-lg`
        : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`;
    btn.textContent = getModeLabel(mode);
    btn.addEventListener('click', () => switchMode(mode));
    tabs.appendChild(btn);
  });

  parent.insertBefore(tabs, parent.firstChild);
}

function renderTimerDisplay(parent) {
  const old = parent.querySelector('#timer-display');
  if (old) old.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'timer-display';
  wrapper.className = 'relative';

  const glow = document.createElement('div');
  glow.className = `absolute inset-0 bg-gradient-to-r ${getModeGradient(state.mode)} rounded-full blur-3xl opacity-20 scale-110 animate-pulse`;
  wrapper.appendChild(glow);

  const circle = document.createElement('div');
  circle.className = `relative w-72 h-72 md:w-80 md:h-80 rounded-full border-4 ${getModeBorder(state.mode)} ring-8 ${getModeRing(state.mode)} flex items-center justify-center bg-gray-900/50 backdrop-blur-sm`;

  const inner = document.createElement('div');
  inner.className = 'text-center';
  inner.innerHTML = `
    <div class="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider" id="timer-time">${formatTime(state.timeLeft)}</div>
    <div class="text-sm text-gray-400 mt-2 uppercase tracking-widest">${getModeLabel(state.mode)}</div>
  `;
  circle.appendChild(inner);
  wrapper.appendChild(circle);
  parent.appendChild(wrapper);
}

function renderTimer() {
  const timeEl = document.getElementById('timer-time');
  if (timeEl) {
    timeEl.textContent = formatTime(state.timeLeft);
  }
}

function renderControls() {
  const parent = document.getElementById('timer-section');
  if (!parent) return;

  const old = parent.querySelector('#controls');
  if (old) old.remove();

  const controls = document.createElement('div');
  controls.id = 'controls';
  controls.className = 'flex gap-4';

  // Кнопка сброса
  const resetBtn = document.createElement('button');
  resetBtn.className = 'w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-105';
  resetBtn.title = 'Сброс';
  resetBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;
  resetBtn.addEventListener('click', resetTimer);
  controls.appendChild(resetBtn);

  // Кнопка старт/пауза
  const playBtn = document.createElement('button');
  playBtn.className = `w-16 h-16 rounded-full bg-gradient-to-r ${getModeGradient(state.mode)} flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`;
  playBtn.title = state.isRunning ? 'Пауза' : 'Старт';

  if (state.isRunning) {
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6"/></svg>`;
  } else {
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  }
  playBtn.addEventListener('click', () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });
  controls.appendChild(playBtn);

  // Кнопка пропустить
  const skipBtn = document.createElement('button');
  skipBtn.className = 'w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-105';
  skipBtn.title = 'Пропустить';
  skipBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 5l7 7-7 7"/></svg>`;
  skipBtn.addEventListener('click', () => {
    if (state.mode === 'focus') {
      switchMode(state.completedPomodoros > 0 && state.completedPomodoros % 4 === 0 ? 'longBreak' : 'shortBreak');
    } else {
      switchMode('focus');
    }
  });
  controls.appendChild(skipBtn);

  parent.appendChild(controls);
}

function renderStatistics() {
  const section = document.getElementById('stats-section');
  if (!section) return;

  const today = getToday();
  const todaySessions = state.sessions.filter(
    (s) => new Date(s.completedAt).toDateString() === today
  );
  const todayFocus = todaySessions.filter((s) => s.mode === 'focus');
  const totalFocusMin = todayFocus.reduce((a, s) => a + s.duration, 0);
  const totalBreakMin = todaySessions.filter((s) => s.mode !== 'focus').reduce((a, s) => a + s.duration, 0);

  const hours = Math.floor(totalFocusMin / 60);
  const mins = totalFocusMin % 60;
  const focusDisplay = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;

  let html = `
    <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        Статистика за сегодня
      </h3>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center p-3 bg-white/5 rounded-xl">
          <div class="text-2xl font-bold text-red-400">${state.completedPomodoros}</div>
          <div class="text-xs text-gray-400 mt-1">Помодоро</div>
        </div>
        <div class="text-center p-3 bg-white/5 rounded-xl">
          <div class="text-2xl font-bold text-orange-400">${totalFocusMin > 0 ? focusDisplay : '0м'}</div>
          <div class="text-xs text-gray-400 mt-1">Фокус</div>
        </div>
        <div class="text-center p-3 bg-white/5 rounded-xl">
          <div class="text-2xl font-bold text-green-400">${totalBreakMin}м</div>
          <div class="text-xs text-gray-400 mt-1">Отдых</div>
        </div>
      </div>`;

  // Прогресс-бар
  if (todayFocus.length > 0) {
    const progress = Math.min(100, (todayFocus.length / 8) * 100);
    html += `
      <div class="mt-4">
        <div class="flex justify-between text-xs text-gray-400 mb-2">
          <span>Прогресс дня</span>
          <span>${todayFocus.length} / 8 помодоро</span>
        </div>
        <div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
        </div>
      </div>`;
  }

  // Последние сессии
  if (todayFocus.length > 0) {
    html += `
      <div class="mt-4 pt-4 border-t border-white/5">
        <div class="text-xs text-gray-400 mb-2">Последние сессии</div>
        <div class="flex gap-1.5 flex-wrap">`;
    todayFocus.slice(-8).forEach((session) => {
      const time = new Date(session.completedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      html += `<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center text-xs text-red-300" title="${session.duration} мин — ${time}">🍅</div>`;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  section.innerHTML = html;
}

// ---------- Настройки ----------
function createSettingsButton() {
  const btn = document.createElement('button');
  btn.className = 'fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg z-50';
  btn.title = 'Настройки';
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
  btn.addEventListener('click', openSettings);
  return btn;
}

function openSettings() {
  // Оверлей
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  overlay.id = 'settings-overlay';

  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-black/60 backdrop-blur-sm';
  backdrop.addEventListener('click', closeSettings);
  overlay.appendChild(backdrop);

  // Модальное окно
  const modal = document.createElement('div');
  modal.className = 'relative bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl';

  const modes = [
    { key: 'focus', label: 'Фокусировка', icon: '🎯' },
    { key: 'shortBreak', label: 'Короткий перерыв', icon: '☕' },
    { key: 'longBreak', label: 'Длительный перерыв', icon: '🌴' },
  ];

  let modalHTML = `
    <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
      Настройки
    </h2>
    <div class="space-y-4">
  `;

  modes.forEach((m) => {
    modalHTML += `
      <div class="flex items-center justify-between gap-4">
        <label class="text-gray-300 flex items-center gap-2">
          <span>${m.icon}</span>
          <span class="text-sm">${m.label}</span>
        </label>
        <div class="flex items-center gap-2">
          <input type="number" min="1" max="120" value="${state.settings[m.key]}" data-mode="${m.key}" class="settings-input w-20 px-3 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-white/20"/>
          <span class="text-gray-400 text-sm">мин</span>
        </div>
      </div>
    `;
  });

  modalHTML += `
    </div>
    <div class="flex gap-3 mt-8">
      <button id="settings-cancel" class="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all">Отмена</button>
      <button id="settings-save" class="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium hover:shadow-lg transition-all">Сохранить</button>
    </div>
  `;

  modal.innerHTML = modalHTML;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Обработчики
  document.getElementById('settings-cancel').addEventListener('click', closeSettings);
  document.getElementById('settings-save').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.settings-input');
    inputs.forEach((input) => {
      const mode = input.dataset.mode;
      let val = parseInt(input.value) || 1;
      val = Math.max(1, Math.min(120, val));
      state.settings[mode] = val;
    });
    saveData();
    closeSettings();
    // Перезапускаем таймер с новыми настройками
    if (!state.isRunning) {
      state.timeLeft = state.settings[state.mode] * 60;
    }
    renderTimer();
    updateTitle();
  });
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.remove();
}

// ---------- Инициализация ----------
export const App = {
  init(root) {
    rootEl = root;
    rootEl.className = 'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden';

    loadData();
    renderAll();
  },
};
