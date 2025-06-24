import qrcode
import os

QR_FOLDER = "static/qr_codes"
os.makedirs(QR_FOLDER, exist_ok=True)

def generate_qr(data: str) -> str:
    filename = f"{data}.png"
    filepath = os.path.join(QR_FOLDER, filename)

    qr = qrcode.make(data)
    qr.save(filepath)

    return filepath
