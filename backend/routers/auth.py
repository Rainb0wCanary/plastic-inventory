from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import User, Group, Role
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer  # добавлено
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
if not SECRET_KEY or not ALGORITHM or not ACCESS_TOKEN_EXPIRE_MINUTES:
    raise RuntimeError("SECRET_KEY, ALGORITHM и ACCESS_TOKEN_EXPIRE_MINUTES должны быть заданы в .env")

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserCreate(BaseModel):
    username: str
    password: str
    role_id: int
    group_id: int

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Не удалось получить пользователя из токена")
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")
    user = db.query(User).filter(User.username == username, User.is_active == 1).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден или заблокирован")
    # Проверка: если у пользователя есть группа и она заблокирована
    if user.group_id is not None:
        group = db.query(Group).filter(Group.id == user.group_id).first()
        if group and getattr(group, 'is_active', 1) == 0:
            raise HTTPException(status_code=403, detail="Ваша группа заблокирована. Обратитесь к администратору.")
    return user

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Админ может создавать любых пользователей, модератор — только пользователей с ролью 'user' и только в своей группе
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    group = db.query(Group).filter(Group.id == user.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    if current_user.role and current_user.role.name == "admin":
        pass  # админ может всё
    elif current_user.role and current_user.role.name == "moderator":
        # Модератор может создавать только пользователей с ролью 'user' и только в своей группе
        role_obj = db.query(Role).filter(Role.id == user.role_id).first()
        if not role_obj or role_obj.name != "user":
            raise HTTPException(status_code=403, detail="Модератор может создавать только пользователей с ролью 'user'")
        if user.group_id != current_user.group_id:
            raise HTTPException(status_code=403, detail="Модератор может создавать пользователей только в своей группе")
    else:
        raise HTTPException(status_code=403, detail="Нет прав на регистрацию пользователей")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password, role_id=role.id, group_id=group.id)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    access_token = create_access_token(data={"sub": db_user.username, "role": role.name})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == form_data.username, User.is_active == 1).first()
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверные имя пользователя или пароль или пользователь заблокирован")
    # Получаем роль пользователя
    role = db_user.role.name if db_user.role else "user"
    access_token = create_access_token(data={"sub": db_user.username, "role": role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    # Возвращаем профиль пользователя с ролью и группой
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": {"id": current_user.role.id, "name": current_user.role.name} if current_user.role else None,
        "group": {"id": current_user.group.id, "name": current_user.group.name} if current_user.group else None
    }
