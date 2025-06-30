from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import base64
import json
import hmac
import hashlib
import os
from dotenv import load_dotenv
from .spools import get_current_user

router = APIRouter()

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")

class QRRequest(BaseModel):
    qr: str

@router.post("/decode_qr")
def decode_qr(data: QRRequest, current_user=Depends(get_current_user)):
    try:
        payload, signature = data.qr.split('.')
        # Проверка подписи (безопасно, если используется)
        expected_signature = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            raise HTTPException(status_code=400, detail="Некорректная подпись QR-кода")
        # Исправлено: urlsafe_b64decode требует padding
        padded = payload + '=' * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode()
        obj = json.loads(decoded)
        if 'id' not in obj:
            raise HTTPException(status_code=400, detail="В QR-коде нет id")
        return {"id": obj['id']}
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректный QR-код")
