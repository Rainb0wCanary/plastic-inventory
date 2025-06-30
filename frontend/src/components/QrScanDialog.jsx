import React, { useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Box, Typography, Alert } from '@mui/material';
import { QrReader } from 'react-qr-reader';
import jsQR from 'jsqr';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

export default function QrScanDialog({ open, onClose, onResult }) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  // Обработка результата с камеры
  const handleScan = data => {
    if (data) {
      setError('');
      onResult(data);
      onClose();
    }
  };
  const handleError = err => {
    setError('Ошибка камеры: ' + err.message);
  };

  // Обработка загрузки файла
  const handleFileChange = async e => {
    setError('');
    setLoading(true);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, img.width, img.height);
        if (code) {
          setError('');
          onResult(code.data);
          onClose();
        } else {
          setError('QR-код не найден на изображении');
        }
        setLoading(false);
      };
      img.onerror = () => {
        setError('Ошибка загрузки изображения');
        setLoading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') onClose();
      }} 
      maxWidth="xs" 
      fullWidth 
      PaperProps={{
        sx: { borderRadius: 3, p: 1, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: 22 }}>
        <CameraAltIcon color="success" sx={{ fontSize: 28 }} />
        Сканировать QR-код
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2 }}>
          <Tab icon={<CameraAltIcon />} label="Камера" sx={{ fontWeight: 600, minWidth: 120 }} />
          <Tab icon={<PhotoCameraIcon />} label="Фото" sx={{ fontWeight: 600, minWidth: 120 }} />
        </Tabs>
        <Box mt={1} mb={2} display="flex" flexDirection="column" alignItems="center">
          {tab === 0 && (
            <Box width="100%" display="flex" flexDirection="column" alignItems="center">
              <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 2, width: '100%', maxWidth: 320, mb: 1 }}>
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={(result, error) => {
                    if (result?.text) {
                      setError('');
                      onResult(result.text);
                      onClose();
                    } else if (error && error.name !== 'NotFoundException') {
                      setError('Ошибка камеры: ' + error.message);
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary" mt={1}>
                Наведите камеру на QR-код
              </Typography>
            </Box>
          )}
          {tab === 1 && (
            <Box width="100%" display="flex" flexDirection="column" alignItems="center">
              <Button
                variant="contained"
                color="success"
                component="label"
                fullWidth
                sx={{ fontWeight: 600, fontSize: 16, py: 1.5, borderRadius: 2, boxShadow: 2, mb: 1 }}
                disabled={loading}
                startIcon={<PhotoCameraIcon />}
              >
                Загрузить фото QR-кода
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </Button>
              {loading && <Typography mt={1}>Распознавание...</Typography>}
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, fontWeight: 600, px: 4 }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
