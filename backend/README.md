# Dramma Backend

Express + Prisma + MySQL backend for the cosmetics store.

## Quick start

1. Copy environment:
   - `cp .env.example .env` (or create `.env` manually on Windows).
2. Install dependencies:
   - `npm install`
   - For real auth emails, add `RESEND_API_KEY` and valid `EMAIL_FROM` in `.env`.
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migration:
   - `npm run prisma:migrate -- --name init`
5. Seed demo data:
   - `npm run prisma:seed`
6. Start server:
   - `npm run dev`

Server base URL: `http://localhost:4000/api`

Статика загруженных фото: `GET http://localhost:4000/uploads/products/<имя-файла>` (папка `uploads/products` создаётся при старте).

If migration/seed fails with `P1001`, MySQL is not running on `localhost:3306`.

## Загрузка фото товара (админ)

- `POST /api/admin/upload-product-image` — тело `multipart/form-data`, поле **`image`**, только изображения, до **8 МБ**. Ответ: `{ "url": "/uploads/products/....jpg" }`.
- Требуется JWT с ролью **ADMIN** (как у остальных `/admin/*`).
- На проде, если фронт на другом домене чем API, в БД хранится путь `/uploads/...`; фронт подставляет хост API (см. `resolveProductImageUrl` во фронте).
- **Nginx:** проксируй не только `/api`, но и **`/uploads`** на тот же Node-процесс (или отдавай эту папку как `alias` с диска), иначе картинки с API не откроются по URL.

## Current API

- `POST /auth/request-code`
- `POST /auth/verify-code`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `GET /categories`
- `GET /products`
- `GET /products/search?q=...`
- `GET /products/:id`
- `GET /favorites`
- `POST /favorites`
- `DELETE /favorites/:productId`
- `GET /cart`
- `POST /cart`
- `PATCH /cart/:productId`
- `DELETE /cart/:productId`
- `GET /orders/me`
- `POST /orders`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`
- `GET /admin/orders/:id/txt`
- `POST /admin/upload-product-image` (multipart, поле `image`)
