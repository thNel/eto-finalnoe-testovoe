# Управление кампаниями Keitaro

Веб-приложение для создания кампаний и редактирования офферов в их потоках.

[Описание проекта](docs/description.md)

## Локальный запуск

Понадобятся Python 3.12 или новее и Node.js 22.12 или новее.

### Бэкенд

Из корня репозитория в PowerShell:

```powershell
cd backend
py -m venv .venv
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

На Linux и macOS используйте `python3` для создания окружения, `cp -n .env.example .env` для копирования и `.venv/bin/python` для остальных команд.

FastAPI доступен на `http://127.0.0.1:8000`, Swagger — по пути `/docs`. SQLite создаётся в `backend/data/`. После обновления проекта примените миграции командой `alembic upgrade head` из виртуального окружения в каталоге `backend/`.

Для подключения к Keitaro укажите `KEITARO_BASE_URL` и `KEITARO_API_KEY` в `backend/.env`. По умолчанию создаваемые кампании используют группу и источник `FORTESTS`. Если у ключа доступно несколько активных доменов, укажите нужное имя хоста в `KEITARO_DOMAIN`. Названия группы и источника можно задать через `KEITARO_CAMPAIGN_GROUP` и `KEITARO_TRAFFIC_SOURCE`.

### Фронтенд

Из корня репозитория во втором терминале:

```sh
cd frontend
npm ci
npm run dev
```

Откройте `http://127.0.0.1:5173`. Vite проксирует `/api` в FastAPI. Чтобы проверить создание, нажмите «Новая кампания», введите название и GEO, выберите оффер из результатов поиска и отправьте форму. После активации появятся ссылка кампании и ссылка на её настройки в Keitaro.
