from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from user_database import UserBase

class Role(UserBase):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    users = relationship("User", back_populates="role")

class Group(UserBase):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    users = relationship("User", back_populates="group")

class User(UserBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    role = relationship("Role", back_populates="users")
    group = relationship("Group", back_populates="users")
