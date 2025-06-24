from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

USER_DATABASE_URL = "sqlite:///./users.db"  # БД для пользователей

user_engine = create_engine(
    USER_DATABASE_URL, connect_args={"check_same_thread": False}
)
UserSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=user_engine)

UserBase = declarative_base()
