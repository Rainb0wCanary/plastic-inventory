import React, { useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Box, Typography, Alert } from '@mui/material';
import QrReader from 'react-qr-reader';
import jsQR from 'jsqr';

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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Сканировать QR-код</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label="Камера" />
          <Tab label="Фото" />
        </Tabs>
        <Box mt={2}>
          {tab === 0 && (
            <>
              <QrReader
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%' }}
              />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Наведите камеру на QR-код
              </Typography>
            </>
          )}
          {tab === 1 && (
            <>
              <Button
                variant="contained"
                component="label"
                fullWidth
                disabled={loading}
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
            </>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
