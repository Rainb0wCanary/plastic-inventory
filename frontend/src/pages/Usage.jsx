import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { fetchPlasticTypes } from '../api/plasticTypes';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, MenuItem, Select, InputLabel, FormControl } from '@mui/material';

export default function Usage() {
  const [usages, setUsages] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ spool_id: '', amount_used: '', purpose: '', project_id: '' });
  const [error, setError] = useState('');
  const [spools, setSpools] = useState([]);
  const [projects, setProjects] = useState([]);
  const [plasticTypes, setPlasticTypes] = useState([]);

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
              const project = projects.find(p => p.id === u.project_id);
              const plasticType = spool ? plasticTypes.find(t => t.id === spool.plastic_type_id) : undefined;
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{spool ? `${plasticType ? plasticType.name : ''} ${spool.color}` : u.spool_id}</TableCell>
                  <TableCell>{project ? project.name : (u.project_id || '—')}</TableCell>
                  <TableCell>{u.amount_used}</TableCell>
                  <TableCell>{u.purpose}</TableCell>
                  <TableCell>{new Date(u.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button color="error" size="small" onClick={async () => {
                      try {
                        await api.delete(`/usage/${u.id}`);
                        fetchUsages();
                      } catch {
                        setError('Ошибка удаления траты');
                      }
                    }}>Удалить</Button>
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="spool-select-label">Катушка</InputLabel>
            <Select
              labelId="spool-select-label"
              value={form.spool_id}
              label="Катушка"
              onChange={e => setForm(f => ({ ...f, spool_id: e.target.value }))}
            >
              {spools.map(s => {
                const plasticType = plasticTypes.find(t => t.id === s.plastic_type_id);
                return (
                  <MenuItem key={s.id} value={s.id}>
                    {s.id} — {plasticType ? plasticType.name : ''} {s.color}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="project-select-label">Проект</InputLabel>
            <Select
              labelId="project-select-label"
              value={form.project_id}
              label="Проект"
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <MenuItem value="">Без проекта</MenuItem>
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Кол-во (г)" type="number" value={form.amount_used} onChange={e => setForm(f => ({ ...f, amount_used: e.target.value }))} fullWidth margin="normal" />
          <TextField label="Цель" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
