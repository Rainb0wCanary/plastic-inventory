import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Box, Typography, Alert } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanDialog({ open, onClose, onResult }) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const qrRef = useRef();
  const html5QrCodeRef = useRef();
  const cameraStreamRef = useRef(null);

  // Остановка камеры
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current._isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    // Очищаем DOM div с камерой
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      // Принудительно закрываем все потоки камеры
      const video = qrRef.current.querySelector('video');
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    }
    // Явно останавливаем сохранённый MediaStream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };

  // Сканирование с камеры
  useEffect(() => {
    let isActive = true;
    let isMounted = true;
    if (!open || tab !== 0) {
      stopCamera();
      return;
    }
    stopCamera().then(() => {
      if (!isMounted) return;
      setError('');
      if (qrRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRef.current.id);
        html5QrCodeRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (!isMounted) return;
            setError('');
            onResult(decodedText);
            if (isActive && html5QrCodeRef.current) {
              html5QrCodeRef.current.stop().catch(() => {});
              html5QrCodeRef.current.clear().catch(() => {});
              html5QrCodeRef.current = null;
            }
            onClose();
          },
          (err) => {
            if (!isMounted) return;
            if (err && !err.toString().includes('NotFoundException')) setError('Ошибка камеры: ' + err);
          }
        ).then(() => {
          // Сохраняем MediaStream после старта
          const video = qrRef.current.querySelector('video');
          if (video && video.srcObject) {
            cameraStreamRef.current = video.srcObject;
          }
        });
      }
    });
    return () => {
      isActive = false;
      isMounted = false;
      stopCamera();
    };
    // Ключевой момент: зависимости только open и tab!
  }, [open, tab]);

  // Сканирование с фото
  const handleFileChange = async e => {
    setError('');
    setLoading(true);
    const file = e.target.files[0];
    if (!file) {
      setLoading(false);
      return;
    }
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      const result = await html5QrCode.scanFile(file, true);
      onResult(result);
      onClose();
    } catch (err) {
      setError('QR-код не найден на изображении');
    }
    setLoading(false);
  };

  // Корректное закрытие диалога и остановка сканера
  const handleClose = (...args) => {
    stopCamera().then(() => onClose(...args));
  };

  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') handleClose();
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
              <div id="qr-reader" ref={qrRef} style={{ width: 300, height: 300, margin: '0 auto' }} />
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
              <div id="qr-reader-file" style={{ display: 'none' }} />
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, fontWeight: 600, px: 4 }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}