import qrcode
import os
import json
import base64
import hmac
import hashlib
from dotenv import load_dotenv

QR_FOLDER = "static/qr_codes"
os.makedirs(QR_FOLDER, exist_ok=True)

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")

# data_dict: словарь с данными для QR
# Возвращает путь к PNG
def generate_qr(data_dict: dict) -> str:
    # Сериализация и base64
    json_data = json.dumps(data_dict, ensure_ascii=False, separators=(",", ":"))
    json_bytes = json_data.encode("utf-8")
    b64_data = base64.urlsafe_b64encode(json_bytes).decode("utf-8")
    # Подпись
    signature = hmac.new(SECRET_KEY.encode(), b64_data.encode(), hashlib.sha256).hexdigest()
    qr_payload = f"{b64_data}.{signature}"
    # Имя файла по id (или hash)
    filename = f"{data_dict.get('id', 'qr')}.png"
    filepath = os.path.join(QR_FOLDER, filename)
    qr = qrcode.make(qr_payload)
    qr.save(filepath)
    return f"/static/qr_codes/{filename}"
