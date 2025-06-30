#!/bin/bash
# Скрипт запускает uvicorn и после успешного старта — init_db.py

# Запускаем uvicorn в фоне
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} &
UVICORN_PID=$!

# Ждём, пока uvicorn поднимется (можно заменить на healthcheck или curl, если есть /docs или /health)
sleep 5

# Запускаем инициализацию базы
python init_db.py

# Ожидаем завершения uvicorn
wait $UVICORN_PID
