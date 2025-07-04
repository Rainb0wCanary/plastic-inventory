from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import PlasticManufacturer, User
from pydantic import BaseModel
from routers.spools import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ManufacturerCreate(BaseModel):
    name: str
    info: str | None = None
    empty_spool_weight: float

class ManufacturerOut(BaseModel):
    id: int
    name: str
    info: str | None = None
    empty_spool_weight: float
    class Config:
        from_attributes = True

@router.post("/", response_model=ManufacturerOut)
def create_manufacturer(manufacturer: ManufacturerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(PlasticManufacturer).filter_by(name=manufacturer.name).first():
        raise HTTPException(status_code=400, detail="Производитель с таким именем уже существует")
    new_man = PlasticManufacturer(**manufacturer.dict())
    db.add(new_man)
    db.commit()
    db.refresh(new_man)
    return new_man

@router.get("/", response_model=list[ManufacturerOut])
def get_manufacturers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PlasticManufacturer).all()

@router.get("/{manufacturer_id}", response_model=ManufacturerOut)
def get_manufacturer(manufacturer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    man = db.query(PlasticManufacturer).get(manufacturer_id)
    if not man:
        raise HTTPException(status_code=404, detail="Производитель не найден")
    return man

@router.delete("/{manufacturer_id}", status_code=204)
def delete_manufacturer(manufacturer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    man = db.query(PlasticManufacturer).get(manufacturer_id)
    if not man:
        raise HTTPException(status_code=404, detail="Производитель не найден")
    db.delete(man)
    db.commit()
    return None
