import { useEffect, useState } from 'react';
import { Button, Typography, Box, Paper, Alert } from '@mui/material';

export default function TestConnection() {
  const [apiStatus, setApiStatus] = useState({ checked: false, success: false, error: null });
  const [apiUrl, setApiUrl] = useState('');
  
  useEffect(() => {
    // Получаем текущий API URL
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    setApiUrl(baseUrl);
  }, []);
  
  const checkApiConnection = async () => {
    try {
      // Используем fetch вместо axios для чистого тестирования
      const response = await fetch(`${apiUrl}/docs`);
      
      if (response.ok) {
        setApiStatus({ checked: true, success: true, error: null });
      } else {
        setApiStatus({ 
          checked: true, 
          success: false, 
          error: `Ошибка при соединении: ${response.status} ${response.statusText}` 
        });
      }
    } catch (error) {
      setApiStatus({ 
        checked: true, 
        success: false, 
        error: `Ошибка при соединении: ${error.message}` 
      });
    }
  };

  const resetLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Тест соединения с API
        </Typography>
        
        <Typography variant="body1" paragraph>
          Текущий API URL: <strong>{apiUrl}</strong>
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={checkApiConnection}
            sx={{ mr: 2 }}
          >
            Проверить соединение
          </Button>
          
          <Button 
            variant="outlined" 
            color="warning"
            onClick={resetLocalStorage}
          >
            Очистить localStorage
          </Button>
        </Box>
        
        {apiStatus.checked && (
          <Alert severity={apiStatus.success ? "success" : "error"}>
            {apiStatus.success 
              ? "Соединение с API успешно установлено!" 
              : `Ошибка соединения: ${apiStatus.error}`
            }
          </Alert>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Инструкции по локальной настройке
        </Typography>
        
        <Typography variant="body1" component="div">
          <ol>
            <li>Убедитесь, что запущен локальный бэкенд на <code>http://127.0.0.1:8000</code></li>
            <li>Проверьте, что в файле <code>.env</code> установлена переменная <code>VITE_API_URL=http://127.0.0.1:8000</code></li>
            <li>Очистите кэш браузера (Ctrl+Shift+Del)</li>
            <li>Перезапустите фронтенд (<code>npm run dev</code>)</li>
            <li>Используйте кнопку "Очистить localStorage" для сброса сохраненных данных</li>
          </ol>
        </Typography>
      </Paper>
    </Box>
  );
}
