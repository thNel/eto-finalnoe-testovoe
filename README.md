# Управление кампаниями Keitaro

Веб-приложение для создания кампаний и редактирования офферов в их потоках.

[Описание](docs/description.md) · [Архитектура](docs/architecture.md) · [API](docs/api.md) · [Эксплуатация](docs/operations.md) · [Проверка](docs/verification.md)

## Локальный запуск

Понадобятся Python 3.12 или новее и Node.js 22.12 или новее.

### Бэкенд

Из корня репозитория в PowerShell:

```powershell
cd backend
py -m venv .venv
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Укажите `KEITARO_API_KEY` в `backend/.env`. Адрес Keitaro, домен, группа и источник описаны в [настройках окружения](docs/operations.md#окружение-бэкенда).

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

На Linux и macOS используйте `python3` для создания окружения, `cp -n .env.example .env` для копирования и `.venv/bin/python` для остальных команд.

Swagger FastAPI доступен на [127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### Фронтенд

Из корня репозитория во втором терминале:

```sh
cd frontend
npm ci
npm run dev
```

Откройте [127.0.0.1:5173](http://127.0.0.1:5173/). Если PowerShell блокирует `npm.ps1`, используйте `npm.cmd`. Сценарии создания и редактирования описаны в [проверке проекта](docs/verification.md).

Для просмотра с телефона подключите его к той же Wi-Fi сети и откройте адрес `Network`, который Vite выводит при запуске.
