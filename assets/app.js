// ============================================================
// Pomodoro: таймер по timestamp + история по дням в localStorage
// Без зависимостей.
// ============================================================

const STORE_KEY = 'pomodoro.state.v3';
const MIN = 60000;
const KEEP_DAYS = 365;

const MODES = {
  focus:      { label: 'Фокусировка',        short: 'Фокус',   emoji: '🎯' },
  shortBreak: { label: 'Короткий перерыв',   short: 'Перерыв', emoji: '☕' },
  longBreak:  { label: 'Длительный перерыв', short: 'Отдых',   emoji: '🌴' },
};

const DEFAULTS = {
  focus: 25, shortBreak: 5, longBreak: 15,
  longEvery: 4, goal: 8, autoStart: false, sound: true,
};

// ---------- утилиты ----------
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const fmtClock = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};
const fmtDur = (min) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} м` : `${m} м`;
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftKey = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
const minutesOfDay = (ts, base) => (ts - base) / MIN;

const ruDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
const ruTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const ruWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

// ---------- состояние ----------
let settings = { ...DEFAULTS };
let days = {};                 // { '2026-11-13': { sessions: [...] } }
let selectedDay = dayKey();
let tickId = null;
let saveTimer = null;

let timer = {
  mode: 'focus',
  running: false,
  durationMs: DEFAULTS.focus * MIN,
  remainingMs: DEFAULTS.focus * MIN,
  endsAt: null,          // timestamp финиша (когда running)
  startedAt: null,       // первый старт сессии
  elapsedMs: 0,          // накопленное время в работе
  segmentStart: null,    // старт текущего отрезка
};

// ---------- хранилище ----------
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 3, settings, days,
      timer: {
        ...timer,
        remainingMs: remainingNow(),
        elapsedMs: elapsedNow(),
      },
    }));
  } catch (e) {
    console.warn('Не удалось сохранить состояние', e);
  }
}
const persistLazy = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
};

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { /* ignore */ }

  if (raw?.v === 3) {
    settings = { ...DEFAULTS, ...raw.settings };
    days = raw.days || {};
    if (raw.timer) timer = { ...timer, ...raw.timer };
  } else {
    migrateLegacy();
  }

  prune();

  // восстановление таймера после перезагрузки
  if (timer.running && timer.endsAt) {
    const left = timer.endsAt - Date.now();
    if (left > 0) {
      timer.remainingMs = left;
      timer.segmentStart = Date.now();
      // elapsed уже накоплен до перезагрузки — корректируем сегмент
      timer.elapsedMs = Math.max(0, timer.durationMs - left - 0);
      timer.segmentStart = Date.now() - 0;
      timer.elapsedMs = Math.max(0, timer.durationMs - left);
      timer.segmentStart = Date.now();
      timer.elapsedMs = 0; // считаем от durationMs - remaining, см. elapsedNow
    } else {
      finishSession(timer.endsAt, true);
      nextMode(false);
    }
  } else {
    timer.running = false;
    timer.remainingMs = clamp(timer.remainingMs ?? durationFor(timer.mode), 0, durationFor(timer.mode));
  }
}

// перенос данных старой версии (pomodoro-settings / pomodoro-sessions)
function migrateLegacy() {
  try {
    const s = JSON.parse(localStorage.getItem('pomodoro-settings') || 'null');
    if (s) settings = { ...DEFAULTS, ...s };
    const sessions = JSON.parse(localStorage.getItem('pomodoro-sessions') || '[]');
    sessions.forEach((it) => {
      const end = new Date(it.completedAt).getTime();
      const minutes = Number(it.duration) || 0;
      if (!end || !minutes) return;
      addSession({
        id: String(it.id || end),
        mode: it.mode in MODES ? it.mode : 'focus',
        start: end - minutes * MIN,
        end, minutes, planned: minutes, completed: true,
      });
    });
    timer.durationMs = timer.remainingMs = durationFor('focus');
  } catch { /* ignore */ }
}

function prune() {
  const limit = shiftKey(dayKey(), -KEEP_DAYS);
  Object.keys(days).forEach((k) => { if (k < limit) delete days[k]; });
}

function getDay(key = selectedDay) {
  return days[key] || { sessions: [] };
}

function addSession(s) {
  const key = dayKey(new Date(s.start));
  (days[key] ||= { sessions: [] }).sessions.push(s);
  days[key].sessions.sort((a, b) => a.start - b.start);
}

// ---------- расчёты времени ----------
const durationFor = (mode) => (settings[mode] || DEFAULTS[mode]) * MIN;
const remainingNow = () =>
  timer.running && timer.endsAt ? Math.max(0, timer.endsAt - Date.now()) : timer.remainingMs;
const elapsedNow = () => clamp(timer.durationMs - remainingNow(), 0, timer.durationMs);

// ---------- статистика ----------
function statsFor(key) {
  const list = getDay(key).sessions;
  const focus = list.filter((s) => s.mode === 'focus');
  return {
    pomodoros: focus.filter((s) => s.completed).length,
    focusMin: focus.reduce((a, s) => a + s.minutes, 0),
    breakMin: list.filter((s) => s.mode !== 'focus').reduce((a, s) => a + s.minutes, 0),
    count: list.length,
  };
}

function streak() {
  let n = 0;
  let k = dayKey();
  if (!statsFor(k).pomodoros) k = shiftKey(k, -1);
  while (statsFor(k).pomodoros > 0) { n++; k = shiftKey(k, -1); }
  return n;
}

// ---------- управление таймерером ----------
function start() {
  if (timer.running) return;
  const now = Date.now();
  if (!timer.startedAt) {
    timer.startedAt = now;
    timer.durationMs = durationFor(timer.mode);
    if (timer.remainingMs <= 0) timer.remainingMs = timer.durationMs;
  }
  timer.endsAt = now + timer.remainingMs;
  timer.running = true;
  tickId = setInterval(tick, 250);
  renderTimer();
  persist();
}

function pause() {
  if (!timer.running) return;
  timer.remainingMs = remainingNow();
  timer.running = false;
  timer.endsAt = null;
  clearInterval(tickId); tickId = null;
  renderTimer();
  persist();
}

const toggle = () => (timer.running ? pause() : start());

function reset() {
  dropPartial();
  hardReset(timer.mode);
}

function hardReset(mode) {
  clearInterval(tickId); tickId = null;
  timer = {
    mode,
    running: false,
    durationMs: durationFor(mode),
    remainingMs: durationFor(mode),
    endsAt: null, startedAt: null, elapsedMs: 0, segmentStart: null,
  };
  renderAll();
  persist();
}

// прерванная сессия: пишем в историю, если отработано ≥ 1 минуты
function dropPartial() {
  const worked = elapsedNow();
  if (timer.startedAt && worked >= MIN) {
    addSession({
      id: `${timer.startedAt}-${Math.random().toString(36).slice(2, 7)}`,
      mode: timer.mode,
      start: timer.startedAt,
      end: Date.now(),
      minutes: Math.round(worked / MIN),
      planned: Math.round(timer.durationMs / MIN),
      completed: false,
    });
    renderDaySections();
  }
}

function tick() {
  if (remainingNow() <= 0) {
    finishSession(timer.endsAt || Date.now(), true);
    nextMode(settings.autoStart);
    return;
  }
  renderTimer();
  if (selectedDay === dayKey()) renderNowMarker();
  persistLazy();
}

function finishSession(endTs, completed) {
  const start = timer.startedAt ?? endTs - timer.durationMs;
  addSession({
    id: `${start}-${Math.random().toString(36).slice(2, 7)}`,
    mode: timer.mode,
    start,
    end: endTs,
    minutes: Math.round((endTs - start) / MIN) || Math.round(timer.durationMs / MIN),
    planned: Math.round(timer.durationMs / MIN),
    completed,
  });
  if (settings.sound) beep(timer.mode);
  clearInterval(tickId); tickId = null;
  timer.running = false;
  renderDaySections();
  persist();
}

function nextMode(autoStart) {
  let next = 'focus';
  if (timer.mode === 'focus') {
    const done = statsFor(dayKey()).pomodoros;
    next = done > 0 && done % settings.longEvery === 0 ? 'longBreak' : 'shortBreak';
  }
  hardReset(next);
  if (autoStart) start();
}

function skip() {
  dropPartial();
  nextMode(false);
}

function switchMode(mode) {
  if (mode === timer.mode && !timer.startedAt) return;
  dropPartial();
  hardReset(mode);
}

// ---------- звук ----------
let audioCtx = null;
function beep(mode) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx ||= new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = mode === 'focus' ? 880 : 620;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch { /* без звука */ }
}

// ---------- рендер: таймер ----------
function renderTimer() {
  const left = remainingNow();
  const p = timer.durationMs ? 1 - left / timer.durationMs : 0;

  $('#time').value = fmtClock(left);
  $('#dial').style.setProperty('--p', p.toFixed(4));
  $('#mode-label').textContent = MODES[timer.mode].label;
  $('#app').dataset.mode = timer.mode;

  const done = statsFor(dayKey()).pomodoros;
  $('#cycle-info').textContent = timer.mode === 'focus'
    ? `Помодоро ${done % settings.longEvery + 1} из ${settings.longEvery}`
    : `Готово за день: ${done}`;

  $('#icon-play').hidden = timer.running;
  $('#icon-pause').hidden = !timer.running;
  $('#btn-toggle').ariaLabel = timer.running ? 'Пауза' : 'Старт';

  document.querySelectorAll('.modes__btn').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.mode === timer.mode)));

  document.title = `${MODES[timer.mode].emoji} ${fmtClock(left)} — Pomodoro`;
}

// ---------- рендер: день (метрики, линия, список) ----------
function renderDaySections() {
  renderStats();
  renderTimeline();
  renderSessions();
  renderWeek();
}

function renderStats() {
  const s = statsFor(selectedDay);
  const isToday = selectedDay === dayKey();
  $('#stats-date').textContent = isToday ? 'сегодня' : ruDay.format(keyToDate(selectedDay));
  $('#m-pomodoros').textContent = s.pomodoros;
  $('#m-focus').textContent = fmtDur(s.focusMin);
  $('#m-break').textContent = fmtDur(s.breakMin);
  $('#m-streak').textContent = streak();
  $('#goal-text').textContent = `${s.pomodoros} / ${settings.goal}`;
  $('#goal-fill').style.setProperty('--w', `${Math.min(100, (s.pomodoros / settings.goal) * 100)}%`);
  $('#day-picker').value = selectedDay;
  $('#day-next').disabled = selectedDay >= dayKey();
}

function buildHours() {
  const box = $('#tl-hours');
  box.innerHTML = '';
  for (let h = 0; h < 24; h += 3) {
    const span = document.createElement('span');
    span.textContent = `${pad(h)}:00`;
    box.appendChild(span);
  }
}

function renderTimeline() {
  const track = $('#tl-track');
  track.querySelectorAll('.tl__block').forEach((el) => el.remove());

  const base = keyToDate(selectedDay).getTime();
  const list = getDay(selectedDay).sessions;

  list.forEach((s) => {
    const from = clamp(minutesOfDay(s.start, base), 0, 1440);
    const to = clamp(minutesOfDay(s.end, base), from + 0.5, 1440);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tl__block';
    el.dataset.mode = s.mode;
    el.dataset.lane = s.mode === 'focus' ? 'focus' : 'break';
    el.dataset.partial = String(!s.completed);
    el.dataset.id = s.id;
    el.style.left = `${(from / 1440) * 100}%`;
    el.style.width = `${((to - from) / 1440) * 100}%`;
    el.title = `${MODES[s.mode].short} · ${ruTime.format(s.start)}–${ruTime.format(s.end)} · ${s.minutes} м${s.completed ? '' : ' (прервано)'}`;
    el.addEventListener('click', () => highlight(s.id));
    track.appendChild(el);
  });

  $('#tl-empty').hidden = list.length > 0;
  renderNowMarker();
}

function renderNowMarker() {
  const now = $('#tl-now');
  if (selectedDay !== dayKey()) { now.hidden = true; return; }
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  now.hidden = false;
  now.style.left = `${(mins / 1440) * 100}%`;
}

function highlight(id) {
  document.querySelectorAll('.ses, .tl__block').forEach((el) =>
    el.classList.toggle('is-active', el.dataset.id === id));
  document.querySelector(`.ses[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
}

function renderSessions() {
  const ul = $('#sessions');
  ul.innerHTML = '';
  const list = [...getDay(selectedDay).sessions].reverse();

  list.forEach((s) => {
    const li = document.createElement('li');
    li.className = 'ses';
    li.dataset.id = s.id;
    li.innerHTML = `
      <i class="dot dot--${s.completed ? s.mode : 'partial'}"></i>
      <span class="ses__time">${ruTime.format(s.start)} – ${ruTime.format(s.end)}</span>
      <span class="ses__mode">${MODES[s.mode].short}</span>
      <span class="ses__dur">${s.minutes} м</span>
      <span class="ses__flag">${s.completed ? '' : 'прервано'}</span>
      <button class="ses__del" type="button" aria-label="Удалить запись">×</button>`;
    li.querySelector('.ses__del').addEventListener('click', () => removeSession(s.id));
    li.addEventListener('mouseenter', () => highlight(s.id));
    ul.appendChild(li);
  });
}

function removeSession(id) {
  const day = days[selectedDay];
  if (!day) return;
  day.sessions = day.sessions.filter((s) => s.id !== id);
  if (!day.sessions.length) delete days[selectedDay];
  renderDaySections();
  renderTimer();
  persist();
}

// ---------- рендер: неделя ----------
function renderWeek() {
  const grid = $('#week-grid');
  grid.innerHTML = '';

  const d = keyToDate(selectedDay);
  const offset = (d.getDay() + 6) % 7;      // понедельник — первый
  const monday = shiftKey(selectedDay, -offset);
  const keys = Array.from({ length: 7 }, (_, i) => shiftKey(monday, i));
  const values = keys.map((k) => statsFor(k).focusMin);
  const max = Math.max(60, ...values);
  const today = dayKey();

  keys.forEach((k, i) => {
    const date = keyToDate(k);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    btn.setAttribute('aria-current', String(k === selectedDay));
    btn.disabled = k > today;
    btn.title = `${ruDay.format(date)} · ${fmtDur(values[i])}`;
    btn.innerHTML = `
      <span class="day__bar"><i style="--h:${Math.round((values[i] / max) * 100)}%"></i></span>
      <span class="day__name">${ruWeekday.format(date)}</span>
      <span class="day__num">${date.getDate()}</span>`;
    btn.addEventListener('click', () => selectDay(k));
    grid.appendChild(btn);
  });

  $('#week-total').textContent = `${fmtDur(values.reduce((a, b) => a + b, 0))} фокуса`;
}

function selectDay(key) {
  selectedDay = key > dayKey() ? dayKey() : key;
  renderDaySections();
}

function renderAll() {
  renderTimer();
  renderDaySections();
}

// ---------- настройки ----------
function openSettings() {
  const dlg = $('#settings');
  const form = $('#settings-form');
  Object.entries(settings).forEach(([k, v]) => {
    const input = form.elements[k];
    if (!input) return;
    if (input.type === 'checkbox') input.checked = Boolean(v);
    else input.value = v;
  });
  dlg.showModal();
}

function saveSettings(e) {
  if (e.submitter?.value !== 'save') return;
  const form = $('#settings-form');
  const num = (name, min, max, fallback) =>
    clamp(parseInt(form.elements[name].value, 10) || fallback, min, max);

  settings = {
    focus: num('focus', 1, 180, DEFAULTS.focus),
    shortBreak: num('shortBreak', 1, 60, DEFAULTS.shortBreak),
    longBreak: num('longBreak', 1, 90, DEFAULTS.longBreak),
    longEvery: num('longEvery', 2, 12, DEFAULTS.longEvery),
    goal: num('goal', 1, 24, DEFAULTS.goal),
    autoStart: form.elements.autoStart.checked,
    sound: form.elements.sound.checked,
  };

  if (!timer.running) {
    timer.durationMs = durationFor(timer.mode);
    if (!timer.startedAt) timer.remainingMs = timer.durationMs;
  }
  renderAll();
  persist();
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ v: 3, settings, days }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pomodoro-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function wipe() {
  if (!confirm('Удалить всю историю и настройки? Действие необратимо.')) return;
  days = {};
  settings = { ...DEFAULTS };
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  $('#settings').close();
  hardReset('focus');
}

// ---------- события ----------
function bind() {
  $('#btn-toggle').addEventListener('click', toggle);
  $('#btn-reset').addEventListener('click', reset);
  $('#btn-skip').addEventListener('click', skip);
  $('#mode-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.modes__btn');
    if (btn) switchMode(btn.dataset.mode);
  });

  $('#btn-settings').addEventListener('click', openSettings);
  $('#settings-form').addEventListener('submit', saveSettings);
  $('#btn-export').addEventListener('click', exportJson);
  $('#btn-wipe').addEventListener('click', wipe);

  $('#day-prev').addEventListener('click', () => selectDay(shiftKey(selectedDay, -1)));
  $('#day-next').addEventListener('click', () => selectDay(shiftKey(selectedDay, 1)));
  $('#day-today').addEventListener('click', () => selectDay(dayKey()));
  $('#day-picker').addEventListener('change', (e) => e.target.value && selectDay(e.target.value));
  $('#day-clear').addEventListener('click', () => {
    if (!getDay(selectedDay).sessions.length) return;
    if (!confirm('Удалить все записи за выбранный день?')) return;
    delete days[selectedDay];
    renderDaySections(); renderTimer(); persist();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || $('#settings').open) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (k === 'r' || k === 'к') reset();
    else if (k === 's' || k === 'ы') skip();
    else if (k === 't' || k === 'е') selectDay(dayKey());
  });

  // возврат из фонового таба — пересчёт по реальному времени
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { persist(); return; }
    if (timer.running && remainingNow() <= 0) {
      finishSession(timer.endsAt, true);
      nextMode(settings.autoStart);
    } else {
      renderTimer();
      if (selectedDay === dayKey()) renderNowMarker();
    }
  });
  window.addEventListener('pagehide', persist);

  // смена суток: обнуляем «сегодня» в интерфейсе
  setInterval(() => {
    if ($('#day-picker').value && selectedDay !== dayKey()) return;
    renderNowMarker();
  }, 30000);
}

// ---------- экспорт ----------
export const App = {
  init() {
    load();
    buildHours();
    bind();
    renderAll();
    if (timer.running) tickId = setInterval(tick, 250);
  },
};