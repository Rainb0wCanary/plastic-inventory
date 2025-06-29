import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Box, Typography, Paper, Alert } from '@mui/material';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setProfile(res.data))
      .catch(() => setError('Ошибка загрузки профиля или нет прав'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return null;

  return (
    <Box sx={{ maxWidth: 1200, width: '100%', p: 2, display: 'flex', justifyContent: 'center', mx: 'auto' }}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" mb={2} align="center" sx={{ fontWeight: 600 }}>
          Профиль
        </Typography>
        <Paper sx={{ p: 2, width: '100%' }}>
          <Typography>Имя: {profile.username}</Typography>
          <Typography>Роль: {profile.role && profile.role.name}</Typography>
          <Typography>Группа: {profile.group && profile.group.name}</Typography>
        </Paper>
      </Box>
    </Box>
  );
}
