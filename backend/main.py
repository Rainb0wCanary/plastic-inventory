from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import spools, usage, auth, projects, roles_groups, plastic_types
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

Base.metadata.create_all(bind=engine)

from routers.roles_groups import ensure_default_roles
ensure_default_roles()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
app.include_router(roles_groups.router, prefix="")  # только этот вариант
app.include_router(plastic_types.router, prefix="/plastic_types")
