# 🧩 Plastic Inventory

**Система учета расхода пластика для 3D-печати с управлением проектами, QR-кодами и множеством других функций.**

![Версия](https://img.shields.io/badge/версия-1.0.0-brightgreen.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.13-009688.svg)
![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)
![Docker](https://img.shields.io/badge/Docker-поддерживается-2496ed.svg)

Полное руководство по установке, настройке и запуску проекта (frontend + backend). Поддерживается локальный запуск и запуск через Docker. Также приведены рекомендации по деплою на сервер (хостинг).

---

## 📑 Содержание
- [О проекте](#о-проекте)
- [Технологии](#технологии)
- [Функциональность системы](#функциональность-системы)
- [Структура проекта](#структура-проекта)
- [Установка и запуск](#установка-и-запуск)
  - [Локальная установка](#локальная-установка)
  - [Запуск в Docker](#запуск-в-docker)
- [Настройка переменных окружения](#настройка-переменных-окружения)
- [Деплой на сервер](#деплой-на-сервер)
- [Полезные команды](#полезные-команды)
- [Настройка и отладка](#настройка-и-отладка)
- [Часто задаваемые вопросы](#часто-задаваемые-вопросы)
- [Команда разработчиков](#команда-разработчиков)

---

## 🎯 О проекте

**Plastic Inventory** — это полноценная система для учета и управления пластиком для 3D-печати. Система разработана для оптимизации рабочих процессов и контроля расхода материалов при 3D-печати.

### Основные возможности:

- **Учет катушек пластика** — регистрация, отслеживание количества и характеристик.
- **Генерация и сканирование QR-кодов** — быстрый доступ к информации о катушке.
- **Проектное управление** — привязка расходов материалов к конкретным проектам.
- **Управление группами и ролями** — разграничение доступа для пользователей.
- **Отчеты о расходе** — контроль использования пластика.
- **Поддержка различных типов пластика и производителей** — учет всех видов материалов.

Система имеет модульную архитектуру, разделяющую бэкенд (FastAPI) и фронтенд (React), что облегчает разработку и поддержку.

---

## Технологии

| Категория            | Технология            | Описание                                                                 |
|----------------------|-----------------------|-------------------------------------------------------------------------|
| **Backend**          | Python               | Основной язык программирования для серверной части.                    |
|                      | FastAPI              | Фреймворк для создания REST API.                                       |
|                      | SQLite               | Легковесная реляционная база данных (`plastic.db`).                    |
|                      | Docker               | Контейнеризация серверной части.                                       |
|                      | SQLAlchemy           | ORM для работы с базой данных.                                         |
|                      | Pydantic             | Валидация данных и работа с моделями.                                  |
|                      | bcrypt               | Хэширование паролей.                                                   |
|                      | JWT                  | Аутентификация и авторизация пользователей.                            |
|                      | QR-коды              | Генерация и обработка QR-кодов.                                        |
| **Frontend**         | React                | Фреймворк для создания пользовательского интерфейса.                   |
|                      | Vite                 | Инструмент для сборки и разработки фронтенда.                          |
|                      | Axios                | HTTP-клиент для выполнения запросов к API.                             |
|                      | CSS                  | Стилизация компонентов.                                                |
|                      | JavaScript (ES6+)    | Основной язык программирования для фронтенда.                          |
|                      | ESLint               | Инструмент для проверки качества кода.                                 |
|                      | Vercel               | Конфигурация для деплоя фронтенда.                                     |
| **DevOps**           | Docker               | Контейнеризация фронтенда и бэкенда.                                   |
|                      | Nginx                | Веб-сервер для раздачи фронтенда.                                      |
|                      | Docker Compose       | Управление многоконтейнерной инфраструктурой.                          |
| **Прочее**           | Git                  | Система контроля версий.                                               |
|                      | Python Requirements  | Список зависимостей для Python (`requirements.txt`).                   |
|                      | Static Files         | Хранение статических файлов, таких как QR-коды (`static/qr_codes/`).   |

---

## Структура проекта
```
plastic-inventory/
├── backend/         # Серверная часть (FastAPI, REST API, база данных, миграции)
│   ├── routers/     # Маршруты API (авторизация, проекты, группы, типы пластика и др.)
│   ├── static/      # Статические файлы (QR-коды)
│   ├── utils/       # Вспомогательные скрипты (генерация QR и др.)
│   ├── plastic.db   # Файл базы данных SQLite (создается автоматически)
│   └── ...
├── frontend/        # Клиентская часть (React + Vite)
│   ├── src/         # Исходный код приложения
│   └── ...
├── docker-compose.yml # Docker Compose для запуска всего стека
├── Dockerfile         # Dockerfile для сборки образа
└── README.md
```

---

## 🚀 Установка и запуск

Существует несколько способов запуска проекта: локально и через Docker.

### Локальная установка

#### Требования
- Python 3.10+
- Node.js 18+ (рекомендуется 22.x)
- npm 10+
- Git

#### Backend
1. Клонируйте репозиторий:
   ```sh
   git clone https://github.com/yourusername/plastic-inventory.git
   cd plastic-inventory
   ```

2. Перейдите в папку backend:
   ```sh
   cd backend
   ```

3. Создайте и активируйте виртуальное окружение:

   **Windows**:
   ```sh
   python -m venv venv
   .\venv\Scripts\activate
   ```
   
   **Linux/MacOS**:
   ```sh
   python -m venv venv
   source venv/bin/activate
   ```

4. Установите зависимости:
   ```sh
   pip install -r requirements.txt
   ```

5. Создайте файл `.env` с необходимыми настройками (пример ниже):
   ```
   SECRET_KEY=your_secret_key_here
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

6. Запустите сервер:
   ```sh
   uvicorn main:app --reload
   ```
   
   Сервер будет доступен по адресу http://127.0.0.1:8000
   
   Документация API будет доступна по адресу http://127.0.0.1:8000/docs

#### Frontend
1. Перейдите в папку frontend:
   ```sh
   cd frontend
   ```

2. Установите зависимости:
   ```sh
   npm install
   ```

3. Создайте файл `.env` с настройками API (опционально):
   ```
   VITE_API_URL=http://127.0.0.1:8000
   ```

4. Запустите проект в режиме разработки:
   ```sh
   npm run dev
   ```
   
   Откройте браузер и перейдите по адресу, который появится в терминале (обычно http://localhost:5173)

---

### Запуск в Docker

#### Требования
- Docker
- Docker Compose

#### Шаги по запуску

1. Клонируйте репозиторий:
   ```sh
   git clone https://github.com/yourusername/plastic-inventory.git
   cd plastic-inventory
   ```

2. Создайте файл `.env` в корне проекта:
   ```
   SECRET_KEY=your_secret_key_here
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ALLOWED_ORIGINS=http://localhost:8080
   ```

3. Соберите и запустите контейнеры:
   ```sh
   docker-compose up --build
   ```
   
   После успешной сборки:
   - Backend будет доступен на http://localhost:8000
   - Frontend — на http://localhost:8080
   - API документация — http://localhost:8000/docs

4. Для остановки контейнеров:
   ```sh
   docker-compose down
   ```

5. Для запуска в фоновом режиме:
   ```sh
   docker-compose up -d
   ```

6. Для просмотра логов:
   ```sh
   docker-compose logs -f
   ```

---

## ⚙️ Настройка переменных окружения

### Backend (.env)
| Переменная | Описание | Значение по умолчанию |
|------------|----------|------------------------|
| `SECRET_KEY` | Секретный ключ для JWT токенов | *Случайно сгенерированная строка* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни токена в минутах | `30` |
| `ALLOWED_ORIGINS` | Список разрешенных источников для CORS (через запятую) | `https://plastic-inventory.vercel.app` |

Пример `.env` файла:
```
SECRET_KEY=your_super_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com
```

### Frontend (.env или переменные окружения)
| Переменная | Описание | Значение по умолчанию |
|------------|----------|------------------------|
| `VITE_API_URL` | URL адрес API бэкенда | `/api` |

Для локальной разработки создайте файл `.env`:
```
VITE_API_URL=http://localhost:8000
```

Для Docker-контейнеров переменные окружения передаются через docker-compose.yml.

---

## 🌍 Деплой на сервер

### Способы деплоя
1. Традиционный хостинг (VPS/выделенный сервер)
2. Docker-контейнеры
3. Бесплатные хостинги (Vercel для фронтенда, Render/Railway для бэкенда)

### Backend (Традиционный способ)
1. Загрузите содержимое папки `backend` на сервер:
   ```sh
   scp -r ./backend user@your-server:/path/to/app
   ```

2. Установите Python 3.10+ и зависимости:
   ```sh
   ssh user@your-server
   cd /path/to/app
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Создайте файл `.env` с продакшн-значениями:
   ```
   SECRET_KEY=your_production_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ALLOWED_ORIGINS=https://your-production-domain.com
   ```

4. Настройте systemd-сервис для запуска через Gunicorn:

   Создайте файл `/etc/systemd/system/plastic-inventory.service`:
   ```
   [Unit]
   Description=Plastic Inventory FastAPI Application
   After=network.target

   [Service]
   User=your-user
   Group=your-user
   WorkingDirectory=/path/to/app
   ExecStart=/path/to/app/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

5. Включите и запустите сервис:
   ```sh
   sudo systemctl enable plastic-inventory
   sudo systemctl start plastic-inventory
   ```

6. Настройте Nginx как прокси:
   ```nginx
   server {
       listen 80;
       server_name api.your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /static {
           alias /path/to/app/static;
       }
   }
   ```

### Frontend (Традиционный способ)
1. На вашей локальной машине соберите проект:
   ```sh
   cd frontend
   npm install
   VITE_API_URL=https://api.your-domain.com npm run build
   ```

2. Загрузите собранные файлы на сервер:
   ```sh
   scp -r ./dist/* user@your-server:/var/www/plastic-inventory
   ```

3. Настройте Nginx для раздачи статических файлов:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/plastic-inventory;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. Обновите настройки SSL (рекомендуется использовать Certbot для Let's Encrypt).

### Деплой с Docker на сервер
1. Загрузите весь проект на сервер:
   ```sh
   scp -r ./* user@your-server:/path/to/app
   ```

2. SSH на сервер и настройте окружение:
   ```sh
   ssh user@your-server
   cd /path/to/app
   ```

3. Создайте `.env` файл с продакшн настройками.

4. Запустите Docker Compose:
   ```sh
   docker-compose up -d --build
   ```

5. Настройте Nginx для проксирования запросов, если необходимо.

---

## 🔧 Функциональность системы

### Управление катушками пластика
- Регистрация новых катушек с указанием веса, цвета, типа пластика и производителя
- Генерация уникальных QR-кодов для быстрой идентификации катушек
- Отслеживание остатка пластика на катушке
- Фильтрация и поиск катушек по различным параметрам

### Управление проектами
- Создание проектов с описанием и спецификациями
- Привязка катушек пластика к проектам
- Расчет расхода материалов на проект

### Учет использования
- Регистрация использования пластика с привязкой к проекту
- Отчеты по расходу материалов
- История использования по каждой катушке

### Система пользователей и групп
- Различные уровни доступа (администратор, пользователь и др.)
- Группировка пользователей для совместной работы
- Контроль доступа к материалам и проектам

### QR-коды
- Автоматическая генерация QR-кодов для катушек
- Сканирование QR-кодов для получения информации
- Быстрый доступ к параметрам пластика и истории использования

### Технические особенности
- REST API с документацией (Swagger UI)
- JWT-аутентификация для безопасности
- Оптимизированная работа с базой данных через ORM
- Адаптивный пользовательский интерфейс

---

## Дополнительная информация

### Особенности проекта
- **Модульная структура**: Проект разделен на модули для упрощения разработки и поддержки.
- **Генерация QR-кодов**: Используется библиотека `qrcode` для создания QR-кодов, которые хранятся в папке `static/qr_codes`.
- **Безопасность**: Реализована аутентификация с использованием JWT и хэширование паролей через `bcrypt`.
- **Контейнеризация**: Полная поддержка Docker для быстрого развертывания.

### Полезные команды
#### Backend
- Активация виртуального окружения (Windows):
  ```sh
  .\venv\Scripts\activate
  ```
- Установка новой зависимости:
  ```sh
  pip install <package>
  pip freeze > requirements.txt
  ```
- Запуск сервера:
  ```sh
  uvicorn main:app --reload
  ```

#### Frontend
- Установка новой зависимости:
  ```sh
  npm install <package>
  ```
- Сборка проекта:
  ```sh
  npm run build
  ```
- Запуск в режиме разработки:
  ```sh
  npm run dev
  ```

#### Docker
- Сборка и запуск контейнеров:
  ```sh
  docker-compose up --build
  ```
- Остановка контейнеров:
  ```sh
  docker-compose down
  ```

### Часто задаваемые вопросы (FAQ)
1. **Что делать, если сервер не запускается?**
   - Проверьте, что установлены все зависимости (`pip install -r requirements.txt`).
   - Убедитесь, что файл `.env` настроен корректно.

2. **Как изменить базовый URL для API?**
   - В файле `frontend/src/api/axios.js` измените значение переменной `API_URL`.

3. **Как добавить новую таблицу в базу данных?**
   - Добавьте модель в `models.py` и выполните миграции (если используются).

4. **Как изменить порт для backend?**
   - Укажите порт при запуске сервера:
     ```sh
     uvicorn main:app --host 0.0.0.0 --port 8080
     ```

## 🛠️ Полезные команды

### Backend

#### Работа с виртуальным окружением:
```sh
# Активация (Windows)
.\venv\Scripts\activate

# Активация (Linux/MacOS)
source venv/bin/activate

# Деактивация
deactivate
```

#### Управление зависимостями:
```sh
# Установка одного пакета
pip install <package-name>

# Обновление файла requirements.txt
pip freeze > requirements.txt

# Установка всех зависимостей
pip install -r requirements.txt
```

#### Запуск сервера:
```sh
# Запуск в режиме разработки
uvicorn main:app --reload

# Запуск с указанием хоста и порта
uvicorn main:app --host 0.0.0.0 --port 8080

# Запуск через Gunicorn (для продакшн)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Frontend

#### Управление пакетами:
```sh
# Установка пакета
npm install <package-name>

# Установка dev-зависимости
npm install -D <package-name>

# Обновление всех пакетов
npm update
```

#### Сборка и запуск:
```sh
# Запуск в режиме разработки
npm run dev

# Сборка для продакшн
npm run build

# Предварительный просмотр собранного проекта
npm run preview
```

### Docker

```sh
# Сборка и запуск
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d

# Остановка контейнеров
docker-compose down

# Просмотр логов
docker-compose logs -f

# Проверка статуса контейнеров
docker-compose ps
```

---

## 🔍 Настройка и отладка

### Доступ к API документации
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Отладка бэкенда
1. Проверьте логи сервера при запуске.
2. Используйте эндпоинт `/docs` для тестирования API напрямую.
3. Для отладки используйте встроенный дебаггер IDE или `pdb`.

### Отладка фронтенда
1. Используйте React DevTools для проверки компонентов.
2. Проверьте консоль браузера на наличие ошибок.
3. Для отслеживания сетевых запросов используйте вкладку Network в DevTools.

### Проблемы с CORS
Если возникают проблемы с CORS, убедитесь, что:
1. В `.env` файле указаны корректные `ALLOWED_ORIGINS`.
2. Frontend обращается к API по правильному URL.
3. В заголовках запросов правильно передается токен авторизации.

### SSL настройка
Для безопасного соединения на продакшне:
1. Получите SSL-сертификат (Let's Encrypt).
2. Настройте Nginx для использования HTTPS.
3. Обновите `ALLOWED_ORIGINS` на HTTPS URL.

---

## ❓ Часто задаваемые вопросы

### Общие вопросы
1. **Что делать, если сервер не запускается?**
   - Проверьте, что установлены все зависимости (`pip install -r requirements.txt`).
   - Убедитесь, что файл `.env` настроен корректно.
   - Проверьте, не занят ли порт 8000 другим приложением.

2. **Как изменить базовый URL для API?**
   - В файле `frontend/src/api/axios.js` измените значение переменной `API_URL`.
   - Альтернативно, создайте `.env.local` файл с переменной `VITE_API_URL`.

3. **Как добавить новую таблицу в базу данных?**
   - Добавьте модель в `models.py`.
   - Импортируйте и зарегистрируйте модель в `main.py`.
   - Создайте новый роутер в папке `routers/` для работы с моделью.

4. **Как генерируются QR-коды?**
   - QR-коды создаются при помощи библиотеки `qrcode` в `utils/qr_generator.py`.
   - Физически хранятся в папке `static/qr_codes/`.
   - Доступны по URL `/static/qr_codes/{id}.png`.

### Вопросы безопасности
1. **Как работает аутентификация?**
   - Используется JWT (JSON Web Tokens) для аутентификации.
   - Токены генерируются на стороне сервера и проверяются middleware.
   - Пароли хэшируются с использованием `bcrypt`.

2. **Как реализовано разделение прав?**
   - Через систему ролей и групп в `routers/roles_groups.py`.
   - Проверка прав осуществляется через зависимости FastAPI.

### Вопросы производительности
1. **Как оптимизировать скорость работы?**
   - Используйте асинхронные запросы в FastAPI.
   - Добавьте кэширование для частых запросов.
   - Оптимизируйте запросы к базе данных.

2. **Как масштабировать приложение?**
   - Используйте более мощную БД (PostgreSQL вместо SQLite).
   - Настройте балансировку нагрузки через Nginx.
   - Разверните несколько экземпляров бэкенда.

---

## 👥 Команда разработчиков

Проект разработан командой **"SJ team"**:

- **Главный разработчик**: RainbowCanary 
- **Фронтенд-разработчик**: SJ team
- **Бэкенд-разработчик**: SJ team
- **Дизайнер**: SJ team

### Связь с нами

- Telegram: [@RainbowCanary](https://t.me/RainbowCanary)
- Discord: rainbowcanary
- Email: rainbowcanaryyt@gmail.com
- GitHub: [github.com/RainbowCanary](https://github.com/RainbowCanary)
- Helper Telegram: @Kwetttyxx 
### Лицензия

Проект распространяется под лицензией MIT. Подробности в файле LICENSE.


