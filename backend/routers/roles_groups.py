from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Role, Group, User
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter()

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
        if username is None:
            raise HTTPException(status_code=401, detail="Не удалось получить пользователя из токена")
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
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
def get_groups(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return db.query(Group).all()

@router.delete("/groups/{group_id}", response_model=dict)
def delete_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    # Блокируем всех пользователей этой группы
    users = db.query(User).filter(User.group_id == group_id).all()
    for user in users:
        user.is_active = 0
    db.commit()
    db.delete(group)
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
