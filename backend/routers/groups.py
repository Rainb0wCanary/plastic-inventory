from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from user_database import UserSessionLocal
from user_models import User, Group, UserRole
from typing import Optional
from fastapi import Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = "supersecretkey"  # должен совпадать с auth.py
ALGORITHM = "HS256"

def get_user_db():
    db = UserSessionLocal()
    try:
        yield db
    finally:
        db.close()

class GroupCreate(BaseModel):
    name: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.user
    group_id: Optional[int] = None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_user_db)) -> User:
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
    return user

@router.post("/groups/", response_model=dict)
def create_group(group: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_user_db)):
    # Проверка: только admin может создавать группы
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Только главный администратор может создавать группы")
    if db.query(Group).filter(Group.name == group.name).first():
        raise HTTPException(status_code=400, detail="Группа уже существует")
    db_group = Group(name=group.name)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return {"id": db_group.id, "name": db_group.name}

@router.post("/users/", response_model=dict)
def create_user(user: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_user_db)):
    # Только admin может создавать модераторов и пользователей для любых групп
    # Модератор может создавать только пользователей для своей группы
    if user.role == UserRole.admin and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Только главный администратор может создавать других админов")
    if user.role == UserRole.moderator and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Только главный администратор может создавать модераторов")
    if current_user.role == UserRole.moderator:
        if user.group_id != current_user.group_id:
            raise HTTPException(status_code=403, detail="Модератор может создавать пользователей только для своей группы")
        if user.role != UserRole.user:
            raise HTTPException(status_code=403, detail="Модератор может создавать только обычных пользователей")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    # Здесь должен быть хеш пароля (упрощённо)
    db_user = User(username=user.username, hashed_password=user.password, role=user.role, group_id=user.group_id)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "username": db_user.username, "role": db_user.role.value, "group_id": db_user.group_id}
