FROM python:3.12-slim

WORKDIR /app


COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/. .
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]