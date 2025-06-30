FROM python:3.12-slim

WORKDIR /app

# Копируем requirements из папки backend
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь backend внутрь контейнера
COPY backend/. .

# Копируем entrypoint.sh из backend
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
