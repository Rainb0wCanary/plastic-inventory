from database import SessionLocal
from models import Role, Group, User, Project, Spool, Usage
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from passlib.hash import bcrypt
from utils.qr_generator import generate_qr

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
                group = Group(name=group_name)
                db.add(group)
                db.commit()
                db.refresh(group)
            groups[group_name] = group

        # Пользователи (по одному для каждой роли)
        users = [
            {"username": "admin", "password": "adminpass", "role": roles["admin"], "group": groups["GroupA"]},
            {"username": "moderator", "password": "modpass", "role": roles["moderator"], "group": groups["GroupB"]},
            {"username": "user", "password": "userpass", "role": roles["user"], "group": groups["GroupC"]},
        ]
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
            project = Project(name=f"Project{i}", description=f"Test project {i}", group_id=group.id)
            db.add(project)
        db.commit()

        # Катушки
        for i, group in enumerate(groups.values(), 1):
            spool = Spool(type="PLA", color=f"Color{i}", weight_total=1000, weight_remaining=900, qr_code_path="", group_id=group.id)
            db.add(spool)
            db.commit()
            db.refresh(spool)
            # Генерация QR-кода после получения id
            qr_path = generate_qr(str(spool.id))
            spool.qr_code_path = qr_path
            db.commit()

        # Usage
        spools = db.query(Spool).all()
        projects = db.query(Project).all()
        for i, (spool, project) in enumerate(zip(spools, projects), 1):
            usage = Usage(spool_id=spool.id, amount_used=100, purpose=f"Test usage {i}", project_id=project.id, group_id=spool.group_id, timestamp=datetime.utcnow())
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
