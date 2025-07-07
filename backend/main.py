from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import spools, usage, auth, projects, roles_groups, plastic_types, decode_qr, plastic_manufacturers
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv  # <--- добавлено
from fastapi.openapi.utils import get_openapi

load_dotenv()  # <--- добавлено

app = FastAPI()

Base.metadata.create_all(bind=engine)

from routers.roles_groups import ensure_default_roles, get_groups
ensure_default_roles()

# --- CORS настройка ---
# Можно задать переменную окружения ALLOWED_ORIGINS через .env или панель хостинга
# Например: ALLOWED_ORIGINS=https://plastic-inventory.vercel.app,https://другой-домен
allowed_origins = os.getenv("ALLOWED_ORIGINS")
if allowed_origins:
    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
else:
    # По умолчанию только фронтенд-домен
    origins = ["https://plastic-inventory.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(spools.router, prefix="/spools")
app.include_router(usage.router, prefix="/usage")
app.include_router(auth.router, prefix="/auth")
app.include_router(projects.router, prefix="/projects")
app.include_router(roles_groups.router, prefix="/roles_groups")
app.include_router(plastic_types.router, prefix="/plastic_types")
app.include_router(decode_qr.router, prefix="/spools")
app.include_router(plastic_manufacturers.router, prefix="/manufacturers")

# Прокси-роут для /groups/ (чтобы фронт работал без изменений)
from fastapi import Depends
@app.get("/groups/", response_model=list[roles_groups.GroupOut])
def proxy_groups(db: roles_groups.Session = Depends(roles_groups.get_db), current_user: roles_groups.User = Depends(roles_groups.get_current_user)):
    return get_groups(db, current_user)

# Кастомизация OpenAPI
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Plastic Inventory API",
        version="1.0.0",
        description="API для управления инвентарем пластика. Команда SJ team: Telegram: @RainbowCanary, Discord: rainbowcanary, Email: rainbowcanaryyt@gmail.com",
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
