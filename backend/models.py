from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    users = relationship("User", back_populates="role")


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    is_active = Column(Integer, default=1)  # 1 - активна, 0 - заблокирована
    users = relationship("User", back_populates="group")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    is_active = Column(Integer, default=1)  # 1 - активен, 0 - заблокирован
    role = relationship("Role", back_populates="users")
    group = relationship("Group", back_populates="users")
    plastic_types = relationship("PlasticType", back_populates="user")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  
    description = Column(String, nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Привязка к группе
    group = relationship("Group")
    usages = relationship("Usage", back_populates="project")


class Spool(Base):
    __tablename__ = "spools"

    id = Column(Integer, primary_key=True, index=True)
    plastic_type_id = Column(Integer, ForeignKey("plastic_types.id"))
    color = Column(String)
    weight_total = Column(Float)
    weight_remaining = Column(Float)
    qr_code_path = Column(String)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Привязка к группе
    manufacturer_id = Column(Integer, ForeignKey("plastic_manufacturers.id"), nullable=True)  # Привязка к производителю

    plastic_type = relationship("PlasticType", back_populates="spools")
    usages = relationship("Usage", back_populates="spool")
    manufacturer = relationship("PlasticManufacturer", back_populates="spools")


class Usage(Base):
    __tablename__ = "usages"

    id = Column(Integer, primary_key=True, index=True)
    spool_id = Column(Integer, ForeignKey("spools.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Привязка к группе
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Пользователь, совершивший трату
    amount_used = Column(Float)
    purpose = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    spool = relationship("Spool", back_populates="usages")
    project = relationship("Project", back_populates="usages")
    group = relationship("Group")
    user = relationship("User")


class PlasticType(Base):
    __tablename__ = "plastic_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null для стандартных, user_id для пользовательских
    user = relationship("User", back_populates="plastic_types")
    spools = relationship("Spool", back_populates="plastic_type")


class PlasticManufacturer(Base):
    __tablename__ = "plastic_manufacturers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    info = Column(String, nullable=True)  # Доп. информация о производителе
    empty_spool_weight = Column(Float, nullable=False)  # Вес пустой катушки (граммы)
    spools = relationship("Spool", back_populates="manufacturer")
