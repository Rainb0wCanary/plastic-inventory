from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Spool, User, PlasticType, Group
from pydantic import BaseModel
from utils.qr_generator import generate_qr
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
from fastapi.responses import FileResponse

router = APIRouter()

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("SECRET_KEY и ALGORITHM должны быть заданы в .env")

# 📥 Зависимость подключения к БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🧾 Pydantic-схемы
class SpoolCreate(BaseModel):
    plastic_type_id: int
    color: str
    weight_total: float
    weight_remaining: float | None = None
    group_id: int | None = None  # Для админа

class SpoolOut(BaseModel):
    id: int
    plastic_type_id: int
    color: str
    weight_total: float
    weight_remaining: float
    qr_code_path: str
    group_id: int | None = None
    class Config:
        from_attributes = True

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

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

# ➕ POST /spools
@router.post("/", response_model=SpoolOut)
def create_spool(spool: SpoolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    if is_admin and spool.group_id:
        group_id = spool.group_id
    else:
        group_id = current_user.group_id
    weight_remaining = spool.weight_remaining if spool.weight_remaining is not None else spool.weight_total
    # Проверка существования типа пластика
    plastic_type = db.query(PlasticType).get(spool.plastic_type_id)
    if not plastic_type:
        raise HTTPException(status_code=400, detail="Тип пластика не найден")
    new_spool = Spool(
        plastic_type_id=spool.plastic_type_id,
        color=spool.color,
        weight_total=spool.weight_total,
        weight_remaining=weight_remaining,
        group_id=group_id
    )
    db.add(new_spool)
    db.commit()
    db.refresh(new_spool)
    # Формируем полезную нагрузку для QR-кода
    qr_data = {
        "id": new_spool.id,
        "plastic_type": plastic_type.name if plastic_type else str(new_spool.plastic_type_id),
        "color": new_spool.color,
        "group": None,
        "created_at": str(new_spool.id)  # Можно заменить на дату, если есть поле
    }
    if new_spool.group_id:
        group = db.query(Group).get(new_spool.group_id)
        qr_data["group"] = group.name if group else str(new_spool.group_id)
    qr_path = generate_qr(qr_data)
    new_spool.qr_code_path = qr_path
    db.commit()
    return new_spool

# 📄 GET /spools
@router.get("/", response_model=list[SpoolOut])
def get_spools(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    if is_admin:
        return db.query(Spool).all()
    else:
        return db.query(Spool).filter(Spool.group_id == current_user.group_id).all()

@router.get("/{spool_id}/download_qr")
def download_qr(spool_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spool = db.query(Spool).get(spool_id)
    if not spool or not spool.qr_code_path:
        raise HTTPException(status_code=404, detail="QR not found")
    is_admin = current_user.role and current_user.role.name == "admin"
    if not is_admin and spool.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому QR-коду")
    file_path = spool.qr_code_path.lstrip("/")
    return FileResponse(
        file_path,
        media_type="image/png",
        filename=f"qr_spool_{spool_id}.png",
        headers={"Content-Disposition": f"attachment; filename=qr_spool_{spool_id}.png"}
    )

# ➖ DELETE /spools/{spool_id}
@router.delete("/{spool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_spool(spool_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spool = db.query(Spool).get(spool_id)
    if not spool:
        raise HTTPException(status_code=404, detail="Катушка не найдена")
    is_admin = current_user.role and current_user.role.name == "admin"
    if not is_admin and spool.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Нет доступа к удалению этой катушки")
    # Удаляем QR-код с диска
    if spool.qr_code_path:
        file_path = spool.qr_code_path.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
    db.delete(spool)
    db.commit()
    return

# Получить все типы пластика (для фронта)
@router.get("/types", response_model=list[dict])
def get_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(PlasticType).all()
    return [{"id": t.id, "name": t.name} for t in types]

# Добавить тип пластика (для фронта)
@router.post("/types", response_model=dict)
def add_type(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Имя обязательно")
    if db.query(PlasticType).filter_by(name=name).first():
        raise HTTPException(status_code=400, detail="Такой тип уже существует")
    new_type = PlasticType(name=name, user_id=current_user.id)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return {"id": new_type.id, "name": new_type.name}

# Получить информацию о катушке по id
@router.get("/{spool_id}")
def get_spool(spool_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spool = db.query(Spool).filter(Spool.id == spool_id).first()
    if not spool:
        raise HTTPException(status_code=404, detail="Катушка не найдена")
    # Получаем объекты типа пластика и группы
    plastic_type = db.query(PlasticType).filter(PlasticType.id == spool.plastic_type_id).first()
    group = db.query(Group).filter(Group.id == spool.group_id).first() if spool.group_id else None
    # Формируем расширенный ответ
    return {
        "id": spool.id,
        "plastic_type_id": spool.plastic_type_id,
        "color": spool.color,
        "weight_total": spool.weight_total,
        "weight_remaining": spool.weight_remaining,
        "qr_code_path": spool.qr_code_path,
        "group_id": spool.group_id,
        "plastic_type": {"id": plastic_type.id, "name": plastic_type.name} if plastic_type else None,
        "group": {"id": group.id, "name": group.name} if group else None
    }
