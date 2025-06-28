from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import PlasticType, User
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

router = APIRouter()

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

class PlasticTypeCreate(BaseModel):
    name: str

class PlasticTypeOut(BaseModel):
    id: int
    name: str
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

@router.get("/types", response_model=list[PlasticTypeOut])
def get_types(db: Session = Depends(get_db)):
    return db.query(PlasticType).all()

@router.post("/types", response_model=PlasticTypeOut)
def add_type(ptype: PlasticTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(PlasticType).filter_by(name=ptype.name).first():
        raise HTTPException(status_code=400, detail="Такой тип уже существует")
    new_type = PlasticType(name=ptype.name, user_id=current_user.id)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type

@router.delete("/types/{type_id}", status_code=204)
def delete_type(type_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ptype = db.query(PlasticType).get(type_id)
    if not ptype:
        raise HTTPException(status_code=404, detail="Тип не найден")
    # Только владелец или админ может удалить пользовательский тип
    if ptype.user_id and ptype.user_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Нет доступа")
    db.delete(ptype)
    db.commit()
    return
