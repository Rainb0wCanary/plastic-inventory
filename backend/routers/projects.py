from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Project, User, Group
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("SECRET_KEY и ALGORITHM должны быть заданы в .env")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    group_id: int | None = None  # Только для админа

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    group_id: int | None = None
    class Config:
        from_attributes = True

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Не удалось получить пользователя из токена")
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    # Проверка: если у пользователя есть группа и она заблокирована
    if user.group_id is not None:
        group = db.query(Group).filter(Group.id == user.group_id).first()
        if group and getattr(group, 'is_active', 1) == 0:
            raise HTTPException(status_code=403, detail="Ваша группа заблокирована. Обратитесь к администратору.")
    return user

@router.post("/", response_model=ProjectOut)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = current_user.role and current_user.role.name == "admin"
    # --- Проверка группы ---
    if is_admin and project.group_id:
        group_id = project.group_id
        # Исправлено: используем импортированный Group
        group = db.query(Group).filter_by(id=group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Группа не найдена")
    else:
        group_id = current_user.group_id

    if db.query(Project).filter(Project.name == project.name, Project.group_id == group_id).first():
        raise HTTPException(status_code=400, detail="Проект с таким именем уже существует в этой группе")
    db_project = Project(name=project.name, description=project.description, group_id=group_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/", response_model=list[ProjectOut])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    if is_admin:
        return db.query(Project).all()
    return db.query(Project).filter(Project.group_id == current_user.group_id).all()

@router.delete("/{project_id}", status_code=200)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.role or (current_user.role.name not in ["admin", "moderator"]):
        raise HTTPException(status_code=403, detail="Нет прав на удаление проекта")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    if current_user.role.name == "moderator" and project.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Модератор может удалять только проекты своей группы")
    db.delete(project)
    db.commit()
    return {"ok": True}
