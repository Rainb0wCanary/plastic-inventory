import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, MenuItem, Select, InputLabel, FormControl } from '@mui/material';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', group_id: '' });
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const role = localStorage.getItem('role');

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      setProjects(res.data);
    } catch {
      setError('Ошибка загрузки проектов');
    }
  };

  // Для админа подгружаем группы
  useEffect(() => {
    if (role === 'admin') {
      api.get('/groups/')
        .then(res => setGroups(res.data))
        .catch(() => setGroups([]));
    }
  }, [role]);

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    setError('');
    try {
      const payload = { name: form.name, description: form.description };
      if (role === 'admin' && form.group_id) {
        payload.group_id = Number(form.group_id);
      }
      await api.post('/projects/', payload);
      setOpen(false);
      setForm({ name: '', description: '', group_id: '' });
      fetchProjects();
    } catch {
      setError('Ошибка создания проекта');
    }
  };

  return (
    <Box>
      <Typography variant="h5" mb={2}>Проекты</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Добавить проект</Button>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              {role === 'admin' && <TableCell>Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.description}</TableCell>
                {role === 'admin' && (
                  <TableCell>
                    <Button color="error" size="small" onClick={async () => {
                      try {
                        await api.delete(`/projects/${p.id}`);
                        fetchProjects();
                      } catch {
                        setError('Ошибка удаления проекта');
                      }
                    }}>Удалить</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Добавить проект</DialogTitle>
        <DialogContent>
          <TextField label="Название" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth margin="normal" />
          <TextField label="Описание" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth margin="normal" />
          {role === 'admin' && (
            <FormControl fullWidth margin="normal">
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                value={form.group_id}
                label="Группа"
                onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
              >
                {groups.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
