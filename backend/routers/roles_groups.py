from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from database import SessionLocal
from models import Role, Group, User
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("SECRET_KEY и ALGORITHM должны быть заданы в .env")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Проверка пользователя и роль админа ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Не удалось получить пользователя из токена")
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")
    # ВАЖНО: подгружаем роль пользователя сразу!
    user = db.query(User).options(joinedload(User.role)).filter(User.username == username, User.is_active == 1).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден или заблокирован")
    if not user.role:
        raise HTTPException(status_code=403, detail="У пользователя не назначена роль")
    return user

def admin_required(current_user: User = Depends(get_current_user)):
    if not (current_user.role and current_user.role.name == "admin"):
        raise HTTPException(status_code=403, detail="Только админ имеет доступ к этому ресурсу")
    return current_user

# --- CRUD для ролей ---
class RoleCreate(BaseModel):
    name: str

class RoleOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


@router.get("/roles/", response_model=list[RoleOut])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return db.query(Role).all()

# --- CRUD для групп ---
class GroupCreate(BaseModel):
    name: str

class GroupOut(BaseModel):
    id: int
    name: str
    is_active: int
    class Config:
        from_attributes = True

@router.post("/groups/", response_model=GroupOut)
def create_group(group: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    if db.query(Group).filter(Group.name == group.name).first():
        raise HTTPException(status_code=400, detail="Группа уже существует")
    db_group = Group(name=group.name)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups/", response_model=list[GroupOut])
def get_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role and current_user.role.name == "admin":
        return db.query(Group).all()
    # Для не-админа — все активные группы
    groups = db.query(Group).filter(Group.is_active == 1).all()
    # Если активных групп нет, но у пользователя есть своя группа — вернуть её
    if not groups and current_user.group_id:
        group = db.query(Group).filter(Group.id == current_user.group_id).first()
        if group:
            groups = [group]
    return [GroupOut(id=g.id, name=g.name, is_active=g.is_active) for g in groups]

@router.delete("/groups/{group_id}", response_model=dict)
def delete_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    db.delete(group)
    db.commit()
    return {"ok": True}

@router.put("/groups/{group_id}/block", response_model=dict)
def block_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    # Проверка: есть ли в группе админ
    admins = db.query(User).join(Role).filter(User.group_id == group_id, Role.name == "admin").all()
    if admins:
        raise HTTPException(status_code=403, detail="Нельзя блокировать группу, где есть админ")
    group.is_active = 0
    db.commit()
    return {"ok": True}

@router.put("/groups/{group_id}/unblock", response_model=dict)
def unblock_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    group.is_active = 1
    db.commit()
    return {"ok": True}

# --- CRUD для пользователей ---
class UserCreate(BaseModel):
    username: str
    password: str
    role_id: int
    group_id: int | None

class UserOut(BaseModel):
    id: int
    username: str
    role: RoleOut | None
    group: GroupOut | None
    is_active: int
    class Config:
        from_attributes = True

@router.get("/users/", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role and current_user.role.name == "admin":
        users = db.query(User).options(joinedload(User.role), joinedload(User.group)).all()
    elif current_user.role and current_user.role.name == "moderator":
        users = db.query(User).options(joinedload(User.role), joinedload(User.group)).filter(User.group_id == current_user.group_id).all()
    else:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return users

@router.post("/users/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Проверка роли
    if current_user.role.name == "admin":
        pass  # админ может всё
    elif current_user.role.name == "moderator":
        # Модератор может создавать только пользователей своей группы и только с ролью user
        user_role = db.query(Role).filter(Role.id == user.role_id).first()
        if not user_role or user_role.name != "user":
            raise HTTPException(status_code=403, detail="Модератор может создавать только пользователей с ролью 'user'")
        if user.group_id != current_user.group_id:
            raise HTTPException(status_code=403, detail="Модератор может создавать пользователей только своей группы")
    else:
        raise HTTPException(status_code=403, detail="Нет доступа")
    # Проверка уникальности
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    # Хеширование пароля
    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role_id=user.role_id,
        group_id=user.group_id,
        is_active=1
    )
    db.add(db_user)
    db.commit()
    # Подгружаем роль и группу для корректного возврата
    db.refresh(db_user)
    db_user = db.query(User).options(joinedload(User.role), joinedload(User.group)).filter(User.id == db_user.id).first()
    return db_user

@router.delete("/users/{user_id}", response_model=dict)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if current_user.role.name == "admin":
        pass
    elif current_user.role.name == "moderator":
        if user.group_id != current_user.group_id or (user.role and user.role.name != "user"):
            raise HTTPException(status_code=403, detail="Нет доступа к удалению этого пользователя")
    else:
        raise HTTPException(status_code=403, detail="Нет доступа")
    db.delete(user)
    db.commit()
    return {"ok": True}

@router.put("/users/{user_id}/block", response_model=dict)
def block_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if current_user.role.name == "admin":
        pass
    elif current_user.role.name == "moderator":
        if user.group_id != current_user.group_id or (user.role and user.role.name != "user"):
            raise HTTPException(status_code=403, detail="Нет доступа к блокировке этого пользователя")
    else:
        raise HTTPException(status_code=403, detail="Нет доступа")
    user.is_active = 0
    db.commit()
    return {"ok": True}

@router.put("/users/{user_id}/unblock", response_model=dict)
def unblock_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if current_user.role.name == "admin":
        pass
    elif current_user.role.name == "moderator":
        if user.group_id != current_user.group_id or (user.role and user.role.name != "user"):
            raise HTTPException(status_code=403, detail="Нет доступа к разблокировке этого пользователя")
    else:
        raise HTTPException(status_code=403, detail="Нет доступа")
    user.is_active = 1
    db.commit()
    return {"ok": True}

# --- Автоматическое создание стандартных ролей ---
def ensure_default_roles():
    db = SessionLocal()
    try:
        for role_name in ["admin", "moderator", "user"]:
            if not db.query(Role).filter(Role.name == role_name).first():
                db.add(Role(name=role_name))
        db.commit()
    finally:
        db.close()
