# Pomodoro Timer

Таймер фокусировки Pomodoro на чистом JavaScript с русским интерфейсом.

## 🚀 Алгоритм деплоя на GitHub Pages

### Структура проекта

```
pomodoro/
├── index.html              ← HTML с относительными путями ./assets/...
├── assets/
│   ├── app.js              ← Собранный JavaScript (чистый JS, без фреймворков)
│   └── style.css           ← Собранные стили (Tailwind CSS)
├── src/                    ← Исходный код (для разработки)
│   ├── main.js
│   ├── app.js
│   └── index.css
├── package.json
└── vite.config.js
```

### Шаг 1: Сборка проекта

```bash
npm run build
```

Vite собирает проект в папку `dist/`:
```
dist/
├── index.html
└── assets/
    ├── index-XXXXX.js
    └── index-XXXXX.css
```

### Шаг 2: Копирование в корень репозитория

Скопировать содержимое `dist/` в корень репозитория:

```bash
# Копируем собранный index.html
cp dist/index.html ./index.html

# Копируем собранные ассеты
mkdir -p assets
cp dist/assets/*.js ./assets/app.js
cp dist/assets/*.css ./assets/style.css
```

### Шаг 3: Проверка путей

Убедиться, что в `index.html` пути **относительные**:
```html
<!-- ✅ ПРАВИЛЬНО (относительные пути) -->
<link rel="stylesheet" href="./assets/style.css">
<script type="module" src="./assets/app.js"></script>

<!-- ❌ НЕПРАВИЛЬНО (абсолютные пути) -->
<link rel="stylesheet" href="/assets/style.css">
<script type="module" src="/src/main.js"></script>
```

### Шаг 4: Настройка GitHub Pages

1. Перейти в **Settings → Pages** репозитория
2. **Source:** выбрать **Deploy from a branch**
3. **Branch:** `main`, папка **/ (root)**
4. Нажать **Save**

### Шаг 5: Пуш и ожидание

```bash
git add .
git commit -m "deploy: update built files"
git push
```

Сайт будет доступен по адресу: `https://<username>.github.io/<repo-name>/`

---

## ⚠️ Частые ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| 404 на `/src/main.js` | HTML ссылается на исходники, которых нет на Pages | Использовать собранные файлы из `assets/` |
| 404 на `/assets/...` | Абсолютный путь `/` указывает на корень домена | Использовать относительный путь `./assets/...` |
| Белый экран | JS не загрузился | Проверить пути в `index.html`, убедиться что файлы существуют |
| Нет стилей | CSS не загрузился | Проверить `<link>` тег, путь `./assets/style.css` |

## 🔑 Ключевые правила

1. **`vite.config.js`** должен содержать `base: './'` для относительных путей
2. **GitHub Pages** обслуживает статические файлы — нужна предсоборка
3. **Пути всегда относительные** (`./assets/...`, а не `/assets/...`)
4. **Собранные файлы** должны быть в корне репозитория или в папке `docs/`
5. **Source в Pages**: Deploy from a branch → main → / (root)

## 📝 Альтернативный вариант: папка docs/

Вместо копирования в корень можно настроить Vite:

```js
// vite.config.js
export default defineConfig({
  base: './',
  outDir: 'docs',  // Собираем сразу в docs/
});
```

Тогда в GitHub Pages: Branch `main`, папка `/docs`.

## 🛠 Разработка

```bash
npm install
npm run dev      # Локальный сервер на http://localhost:3000
npm run build    # Сборка в dist/
```

## Функциональность

- 🎯 Режим фокусировки (25 мин по умолчанию)
- ☕ Короткий перерыв (5 мин)
- 🌴 Длительный перерыв (15 мин, каждые 4 помодоро)
- ▶️ Старт / ⏸ Пауза / 🔄 Сброс / ⏭ Пропуск
- ⚙️ Настраиваемая длительность всех режимов
- 📊 Статистика за сегодня (помодоро, время фокуса, время отдыха)
- 💾 Сохранение данных в localStorage
- 🔔 Звуковое уведомление при завершении сессии
