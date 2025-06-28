import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, Autocomplete } from '@mui/material';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', group_id: '' });
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
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

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/projects/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null });
      fetchProjects();
    } catch {
      setError('Ошибка удаления проекта');
      setConfirmDialog({ open: false, id: null });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null });

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
              {(role === 'admin' || role === 'moderator') && <TableCell>Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.description}</TableCell>
                {(role === 'admin' || (role === 'moderator' && String(p.group_id) === String(localStorage.getItem('group_id')))) && (
                  <TableCell>
                    <Button color="error" size="small" onClick={() => handleDelete(p.id)}>
                      Удалить
                    </Button>
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
            <Autocomplete
              fullWidth
              options={groups.map(g => ({ label: g.name, id: g.id }))}
              value={
                form.group_id
                  ? (groups.find(g => g.id === form.group_id)?.name || form.group_id)
                  : ''
              }
              onInputChange={(e, newInput) => {
                setForm(f => ({ ...f, group_id: newInput }));
              }}
              onChange={(e, newValue) => {
                if (typeof newValue === 'object' && newValue && typeof newValue.id !== 'undefined') {
                  setForm(f => ({ ...f, group_id: newValue.id }));
                } else if (typeof newValue === 'string') {
                  setForm(f => ({ ...f, group_id: newValue }));
                } else {
                  setForm(f => ({ ...f, group_id: '' }));
                }
              }}
              renderInput={params => (
                <TextField {...params} label="Группа" margin="normal" fullWidth />
              )}
              sx={{ mb: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
      {/* Диалог подтверждения удаления проекта */}
      <Dialog open={confirmDialog.open} onClose={cancelDelete}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить проект #{confirmDialog.id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
