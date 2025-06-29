from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Spool, Usage, User, Group
from datetime import datetime 
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

class UsageCreate(BaseModel):
    spool_id: int
    amount_used: float
    purpose: str
    project_id: int | None = None
    # user_id не принимаем от клиента, он берется из current_user

class UsageOut(BaseModel):
    id: int
    spool_id: int
    amount_used: float
    purpose: str
    timestamp: datetime
    project_id: int | None = None
    user_id: int | None = None
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

@router.post("/", response_model=UsageOut)
def add_usage(usage: UsageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    if is_admin:
        # Админ может делать трату на любую катушку и проект
        spool = db.query(Spool).filter(Spool.id == usage.spool_id).first()
        if not spool:
            raise HTTPException(status_code=404, detail="Катушка не найдена")
        if usage.amount_used > spool.weight_remaining:
            raise HTTPException(status_code=400, detail="Недостаточно пластика на катушке")
        spool.weight_remaining -= usage.amount_used
        usage_entry = Usage(
            spool_id=usage.spool_id,
            amount_used=usage.amount_used,
            purpose=usage.purpose,
            project_id=usage.project_id,
            group_id=spool.group_id,
            user_id=current_user.id
        )
    else:
        # Обычный пользователь — только катушки и проекты своей группы
        group_id = current_user.group_id
        spool = db.query(Spool).filter(Spool.id == usage.spool_id, Spool.group_id == group_id).first()
        if not spool:
            raise HTTPException(status_code=404, detail="Катушка не найдена или не принадлежит вашей группе")
        if usage.amount_used > spool.weight_remaining:
            raise HTTPException(status_code=400, detail="Недостаточно пластика на катушке")
        # Проверка проекта
        if usage.project_id is not None:
            from models import Project
            project = db.query(Project).filter(Project.id == usage.project_id, Project.group_id == group_id).first()
            if not project:
                raise HTTPException(status_code=400, detail="Проект не найден или не принадлежит вашей группе")
        spool.weight_remaining -= usage.amount_used
        usage_entry = Usage(
            spool_id=usage.spool_id,
            amount_used=usage.amount_used,
            purpose=usage.purpose,
            project_id=usage.project_id,
            group_id=group_id,
            user_id=current_user.id
        )
    db.add(usage_entry)
    db.commit()
    db.refresh(usage_entry)
    return usage_entry

@router.get("/", response_model=list[UsageOut])
def get_usages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    if is_admin:
        usages = db.query(Usage).all()
    else:
        usages = db.query(Usage).filter(Usage.group_id == current_user.group_id).all()
    # Фильтруем только те траты, у которых есть катушка и (если указан) проект
    valid_usages = []
    for u in usages:
        if not u.spool:
            continue
        if u.project_id is not None and not u.project:
            continue
        valid_usages.append(u)
    return valid_usages

@router.delete("/{usage_id}", response_model=dict)
def delete_usage(usage_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    usage = db.query(Usage).filter(Usage.id == usage_id).first()
    if not usage:
        raise HTTPException(status_code=404, detail="Трата не найдена")
    # Проверка прав: админ — всё, пользователь — только своей группы
    is_admin = current_user.role and current_user.role.name == "admin"
    if not is_admin and usage.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Нет доступа к удалению этой траты")
    # Возврат пластика
    spool = db.query(Spool).filter(Spool.id == usage.spool_id).first()
    if spool:
        spool.weight_remaining += usage.amount_used
        db.commit()
    db.delete(usage)
    db.commit()
    return {"ok": True}
