import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const res = await api.post('/auth/login', params);
      localStorage.setItem('token', res.data.access_token);
      // Получаем роль пользователя
      const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      localStorage.setItem('role', payload.role || 'user');
      if (onLogin) onLogin();
      navigate('/spools', { replace: true });
    } catch (err) {
      setError('Ошибка авторизации');
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={8}>
      <Typography variant="h5" mb={2}>Вход</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Войти
        </Button>
      </form>
    </Box>
  );
}
