import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { fetchPlasticTypes } from '../api/plasticTypes';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, Autocomplete } from '@mui/material';

export default function Usage() {
  const [usages, setUsages] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ spool_id: '', amount_used: '', purpose: '', project_id: '' });
  const [error, setError] = useState('');
  const [spools, setSpools] = useState([]);
  const [projects, setProjects] = useState([]);
  const [plasticTypes, setPlasticTypes] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

  const fetchUsages = async () => {
    try {
      const res = await api.get('/usage/');
      setUsages(res.data);
    } catch {
      setError('Ошибка загрузки трат');
    }
  };

  useEffect(() => {
    fetchUsages();
    api.get('/spools/')
      .then(res => setSpools(res.data))
      .catch(() => setSpools([]));
    api.get('/projects/')
      .then(res => setProjects(res.data))
      .catch(() => setProjects([]));
    fetchPlasticTypes().then(setPlasticTypes).catch(() => setPlasticTypes([]));
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/usage/', form);
      setOpen(false);
      setForm({ spool_id: '', amount_used: '', purpose: '', project_id: '' });
      fetchUsages();
    } catch {
      setError('Ошибка создания траты');
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/usage/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null });
      fetchUsages();
    } catch {
      setError('Ошибка удаления траты');
      setConfirmDialog({ open: false, id: null });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null });

  return (
    <Box>
      <Typography variant="h5" mb={2}>Траты</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Добавить трату</Button>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Катушка</TableCell>
              <TableCell>Проект</TableCell>
              <TableCell>Кол-во (г)</TableCell>
              <TableCell>Цель</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usages.map(u => {
              const spool = spools.find(s => s.id === u.spool_id);
              const plasticType = plasticTypes.find(t => t.id === (spool ? spool.plastic_type_id : null));
              const project = projects.find(p => p.id === u.project_id);
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{spool && plasticType ? `${plasticType.name} ${spool.color}` : u.spool_id}</TableCell>
                  <TableCell>{project ? project.name : (u.project_id || '—')}</TableCell>
                  <TableCell>{u.amount_used}</TableCell>
                  <TableCell>{u.purpose}</TableCell>
                  <TableCell>{new Date(u.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button color="error" size="small" onClick={() => handleDelete(u.id)}>
                      Удалить
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Добавить трату</DialogTitle>
        <DialogContent>
          <Autocomplete
            fullWidth
            options={spools.map(s => {
              const plasticType = plasticTypes.find(t => t.id === s.plastic_type_id);
              return {
                label: `${s.id} — ${plasticType ? plasticType.name : '—'} ${s.color}`,
                id: s.id
              };
            })}
            value={
              form.spool_id
                ? (() => {
                    const s = spools.find(sp => sp.id === form.spool_id);
                    if (!s) return '';
                    const plasticType = plasticTypes.find(t => t.id === s.plastic_type_id);
                    return `${s.id} — ${plasticType ? plasticType.name : '—'} ${s.color}`;
                  })()
                : ''
            }
            onInputChange={(e, newInput) => {
              setForm(f => ({ ...f, spool_id: newInput }));
            }}
            onChange={(e, newValue) => {
              if (typeof newValue === 'object' && newValue && newValue.id) {
                setForm(f => ({ ...f, spool_id: newValue.id }));
              } else if (typeof newValue === 'string') {
                setForm(f => ({ ...f, spool_id: newValue }));
              } else {
                setForm(f => ({ ...f, spool_id: '' }));
              }
            }}
            renderInput={params => (
              <TextField {...params} label="Катушка" margin="normal" fullWidth />
            )}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            fullWidth
            freeSolo
            options={[{ label: 'Без проекта', id: '' }, ...projects.map(p => ({ label: p.name, id: p.id }))]}
            value={
              form.project_id
                ? (projects.find(p => p.id === form.project_id)?.name || form.project_id)
                : 'Без проекта'
            }
            onInputChange={(e, newInput) => {
              setForm(f => ({ ...f, project_id: newInput }));
            }}
            onChange={(e, newValue) => {
              if (typeof newValue === 'object' && newValue && typeof newValue.id !== 'undefined') {
                setForm(f => ({ ...f, project_id: newValue.id }));
              } else if (typeof newValue === 'string') {
                setForm(f => ({ ...f, project_id: newValue }));
              } else {
                setForm(f => ({ ...f, project_id: '' }));
              }
            }}
            renderInput={params => (
              <TextField {...params} label="Проект" margin="normal" fullWidth />
            )}
            sx={{ mb: 2 }}
          />
          <TextField label="Кол-во (г)" type="number" value={form.amount_used} onChange={e => setForm(f => ({ ...f, amount_used: e.target.value }))} fullWidth margin="normal" />
          <TextField label="Цель" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
      {/* Диалог подтверждения удаления траты */}
      <Dialog open={confirmDialog.open} onClose={cancelDelete}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить трату #{confirmDialog.id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
