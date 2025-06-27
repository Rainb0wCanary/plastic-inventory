from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Spool, User
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
    return user

# ➕ POST /spools
@router.post("/", response_model=SpoolOut)
def create_spool(spool: SpoolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role and current_user.role.name == "admin"
    # Только админ может явно указать group_id, остальные — только свою группу
    if is_admin and spool.group_id:
        group_id = spool.group_id
    else:
        group_id = current_user.group_id
    # Остаток по умолчанию равен общему весу, если не указан явно
    weight_remaining = spool.weight_remaining if spool.weight_remaining is not None else spool.weight_total
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

    # QR-код с ID катушки
    qr_path = generate_qr(str(new_spool.id))
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
def download_qr(spool_id: int, db: Session = Depends(get_db)):
    spool = db.query(Spool).get(spool_id)
    if not spool or not spool.qr_code_path:
        raise HTTPException(status_code=404, detail="QR not found")
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
