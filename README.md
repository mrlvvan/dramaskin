# Dramma

Интернет-магазин уходовой косметики: каталог, поиск, карточка товара, корзина, избранное, оформление заказа, личный кабинет и админка заказов.

## Стек

| Часть | Технологии |
|--------|------------|
| Фронтенд | React 19, TypeScript, Vite, Zustand |
| Бэкенд | Node.js, Express, Prisma, MySQL |
| Авторизация | JWT (access/refresh), вход по одноразовому коду (email через [Resend](https://resend.com)) |
| Прочее | Загрузка фото товаров (multipart), выгрузка заказа админом в `.txt` |

## Структура репозитория

- `/` — фронтенд (Vite + React)
- `backend/` — REST API, Prisma, миграции и сиды

## Требования

- **Node.js** 20+ (рекомендуется текущий LTS)
- **MySQL** 8 (или совместимая), по умолчанию в примере `localhost:3306`

## Быстрый старт

### Фронтенд

```bash
npm install
npm run dev
```

Адрес смотри в выводе терминала (часто `http://localhost:5173`). В `backend/.env` переменная `CLIENT_ORIGIN` должна совпадать с origin фронта (для CORS и ссылок в письмах).

### Бэкенд

```bash
cd backend
npm install
copy .env.example .env
```

Отредактируй `backend/.env`: `DATABASE_URL`, секреты JWT, при необходимости `RESEND_API_KEY` и `EMAIL_FROM` для реальной отправки кодов.

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

- **API:** `http://localhost:4000/api`
- Ошибка Prisma `P1001` — MySQL не запущен или неверный `DATABASE_URL`.

Детали по эндпоинтам, загрузке изображений и проксированию `/uploads` на проде — в [`backend/README.md`](backend/README.md).

## Скрипты

**Корень (фронт):**

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Режим разработки |
| `npm run build` | Сборка |
| `npm run preview` | Превью production-сборки |
| `npm run lint` | ESLint |

**`backend/`:**

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Сервер с nodemon |
| `npm run start` | Запуск без watch |
| `npm run prisma:generate` | Клиент Prisma |
| `npm run prisma:migrate` | Миграции |
| `npm run prisma:seed` | Демо-данные |
| `npm run prisma:studio` | Prisma Studio |

## Git и GitHub

1. `git init` в корне проекта (если ещё не сделано).
2. Убедись, что в индекс не попали `.env` и `node_modules` (они в `.gitignore`).
3. Создай пустой репозиторий на GitHub, затем:

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

Для HTTPS GitHub нужен **Personal Access Token** (или вход по **SSH**).

## Лицензия

Приватный проект — при публикации добавь файл лицензии по необходимости.
