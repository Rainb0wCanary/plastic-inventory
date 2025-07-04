from database import SessionLocal
from models import Role, Group, User, Project, Spool, Usage, PlasticType, PlasticManufacturer
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from passlib.hash import bcrypt
from utils.qr_generator import generate_qr
import random

def hash_password(password: str) -> str:
    return bcrypt.hash(password)

def seed_data():
    db = SessionLocal()
    try:
        # Роли
        roles = {}
        for role_name in ["admin", "moderator", "user"]:
            role = db.query(Role).filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles[role_name] = role

        # Группы
        groups = {}
        for group_name in ["GroupA", "GroupB", "GroupC"]:
            group = db.query(Group).filter_by(name=group_name).first()
            if not group:
                group = Group(name=group_name, is_active=1)
                db.add(group)
                db.commit()
                db.refresh(group)
            groups[group_name] = group

        # Стандартные типы пластика
        standard_types = ["PLA", "ABS", "PETG"]
        for t in standard_types:
            if not db.query(PlasticType).filter_by(name=t).first():
                db.add(PlasticType(name=t))
        db.commit()

        # Производители пластика
        manufacturers_data = [
            {"name": "ESUN", "info": "Китайский производитель", "empty_spool_weight": 220.0},
            {"name": "REC", "info": "Российский производитель", "empty_spool_weight": 240.0},
            {"name": "Polymaker", "info": "Международный бренд", "empty_spool_weight": 200.0},
        ]
        manufacturers = {}
        for m in manufacturers_data:
            man = db.query(PlasticManufacturer).filter_by(name=m["name"]).first()
            if not man:
                man = PlasticManufacturer(**m)
                db.add(man)
                db.commit()
                db.refresh(man)
            manufacturers[m["name"]] = man

        # Пользователи (по одному для каждой роли)
        users = [
            {"username": "admin", "password": "adminpass", "role": roles["admin"], "group": groups["GroupA"]},
            {"username": "moderator", "password": "modpass", "role": roles["moderator"], "group": groups["GroupB"]},
            {"username": "user", "password": "userpass", "role": roles["user"], "group": groups["GroupC"]},
        ]
        # Добавим много обычных пользователей
        for i in range(1, 51):
            users.append({
                "username": f"user{i}",
                "password": f"pass{i}",
                "role": roles["user"],
                "group": groups["GroupA" if i % 3 == 1 else "GroupB" if i % 3 == 2 else "GroupC"]
            })
        for u in users:
            if not db.query(User).filter_by(username=u["username"]).first():
                user = User(
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role_id=u["role"].id,
                    group_id=u["group"].id
                )
                db.add(user)
        db.commit()

        # Проекты
        for i, group in enumerate(groups.values(), 1):
            for j in range(1, 11):
                project = Project(name=f"Project{i}_{j}", description=f"Test project {i}_{j}", group_id=group.id)
                db.add(project)
        db.commit()

        # Катушки (используем первый стандартный тип пластика и производителей)
        plastic_type = db.query(PlasticType).filter_by(name="PLA").first()
        man_list = list(manufacturers.values())
        for i, group in enumerate(groups.values(), 1):
            for j in range(1, 21):
                manufacturer = man_list[(j-1) % len(man_list)]
                spool = Spool(
                    plastic_type_id=plastic_type.id,
                    color=f"Color{i}_{j}",
                    weight_total=1000+j*10,
                    weight_remaining=900-j*5,
                    qr_code_path="",
                    group_id=group.id,
                    manufacturer_id=manufacturer.id
                )
                db.add(spool)
                db.commit()
                db.refresh(spool)
                # Генерация QR-кода после получения id
                qr_path = generate_qr({"id": spool.id})
                spool.qr_code_path = qr_path
                db.commit()

        # Usage
        spools = db.query(Spool).all()
        projects = db.query(Project).all()
        for i, (spool, project) in enumerate(zip(spools, projects), 1):
            group_users = db.query(User).filter_by(group_id=spool.group_id).all()
            for k in range(1, 6):
                user = random.choice(group_users) if group_users else None
                usage = Usage(
                    spool_id=spool.id,
                    amount_used=100+k,
                    purpose=f"Test usage {i}_{k}",
                    project_id=project.id,
                    group_id=spool.group_id,
                    user_id=user.id if user else None,
                    timestamp=datetime.utcnow()
                )
                db.add(usage)
        db.commit()
        print("Тестовые данные успешно добавлены!")
    except IntegrityError:
        db.rollback()
        print("Ошибка: возможно, данные уже существуют.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
