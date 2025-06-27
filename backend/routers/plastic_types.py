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

# Зависимость подключения к БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

class PlasticTypeOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class PlasticTypeCreate(BaseModel):
    name: str

@router.get("/all", response_model=list[PlasticTypeOut])
def get_all_plastic_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PlasticType).all()

@router.post("/add", response_model=PlasticTypeOut)
def add_plastic_type(plastic: PlasticTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.query(PlasticType).filter(PlasticType.name == plastic.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Такой тип уже существует")
    new_type = PlasticType(name=plastic.name, user_id=current_user.id)
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type
