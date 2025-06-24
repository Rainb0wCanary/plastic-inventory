from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Spool, User
from pydantic import BaseModel
from utils.qr_generator import generate_qr
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

router = APIRouter()

# 📥 Зависимость подключения к БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🧾 Pydantic-схемы
class SpoolCreate(BaseModel):
    type: str
    color: str
    weight_total: float
    group_id: int | None = None  # Для админа

class SpoolOut(BaseModel):
    id: int
    type: str
    color: str
    weight_total: float
    weight_remaining: float
    qr_code_path: str
    class Config:
        from_attributes = True

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"

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
    new_spool = Spool(
        type=spool.type,
        color=spool.color,
        weight_total=spool.weight_total,
        weight_remaining=spool.weight_total,
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
