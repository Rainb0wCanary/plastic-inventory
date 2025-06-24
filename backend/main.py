from fastapi import FastAPI
from database import Base, engine
from routers import spools, usage, auth, projects, roles_groups 

app = FastAPI()

Base.metadata.create_all(bind=engine)

from routers.roles_groups import ensure_default_roles
ensure_default_roles()

app.include_router(spools.router, prefix="/spools")
app.include_router(usage.router, prefix="/usage")
app.include_router(auth.router, prefix="/auth")
app.include_router(projects.router, prefix="/projects")
app.include_router(roles_groups.router)
