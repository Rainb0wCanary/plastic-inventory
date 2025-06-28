import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { fetchPlasticTypes, addPlasticType } from '../api/plasticTypes';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, MenuItem, Select, InputLabel, FormControl, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileDownload from 'js-file-download';

export default function Spools() {
  const [spools, setSpools] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plastic_type_id: '', color: '', weight_total: '', weight_remaining: '', group_id: '' });
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [plasticTypes, setPlasticTypes] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const role = localStorage.getItem('role');
  const API_URL = "http://localhost:8000";

  const fetchSpools = async () => {
    try {
      const res = await api.get('/spools/');
      setSpools(res.data);
    } catch {
      setError('Ошибка загрузки катушек');
    }
  };

  const fetchTypes = async () => {
    try {
      const types = await fetchPlasticTypes();
      setPlasticTypes(types);
    } catch {
      setPlasticTypes([]);
    }
  };

  useEffect(() => {
    fetchSpools();
    fetchTypes();
  }, []);

  useEffect(() => {
    api.get('/groups/')
      .then(res => setGroups(res.data))
      .catch(() => setGroups([]));
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      const payload = {
        plastic_type_id: Number(form.plastic_type_id),
        color: form.color,
        weight_total: form.weight_total
      };
      if (form.weight_remaining !== '') {
        payload.weight_remaining = Number(form.weight_remaining);
      }
      if (role === 'admin' && form.group_id) {
        payload.group_id = Number(form.group_id);
      }
      await api.post('/spools/', payload);
      setOpen(false);
      setForm({ plastic_type_id: '', color: '', weight_total: '', weight_remaining: '', group_id: '' });
      fetchSpools();
    } catch {
      setError('Ошибка создания катушки');
    }
  };

  const handleAddType = async () => {
    setError('');
    try {
      const added = await addPlasticType(newType);
      setPlasticTypes([...plasticTypes, added]);
      setForm(f => ({ ...f, plastic_type_id: added.id }));
      setShowAddType(false);
      setNewType('');
    } catch {
      setError('Ошибка добавления типа пластика');
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.delete(`/spools/${id}`);
      fetchSpools();
    } catch {
      setError('Ошибка удаления катушки');
    }
  };

  // Скачивание QR-кода через axios с токеном
  const handleDownloadQr = async (spoolId, fileName = 'qr_code.png') => {
    try {
      const response = await api.get(`/spools/${spoolId}/download_qr`, {
        responseType: 'blob',
      });
      FileDownload(response.data, fileName);
    } catch (e) {
      setError('Ошибка скачивания QR-кода');
    }
  };

  // Фильтрация катушек по группе (только для админа)
  const filteredSpools = role === 'admin' && selectedGroup !== 'all'
    ? spools.filter(s => s.group_id === Number(selectedGroup))
    : spools;

  return (
    <Box>
      <Typography variant="h5" mb={2}>Катушки</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Добавить катушку</Button>
      {error && <Alert severity="error">{error}</Alert>}
      {role === 'admin' && (
        <FormControl sx={{ minWidth: 200, mb: 2, mr: 2 }} size="small">
          <InputLabel id="filter-group-label">Фильтр по группе</InputLabel>
          <Select
            labelId="filter-group-label"
            value={selectedGroup}
            label="Фильтр по группе"
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <MenuItem value="all">Все группы</MenuItem>
            {groups.map(g => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Цвет</TableCell>
              <TableCell>Вес (г)</TableCell>
              <TableCell>Остаток (г)</TableCell>
              {role === 'admin' && <TableCell>Группа</TableCell>}
              <TableCell>QR</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSpools.map(spool => (
              <TableRow key={spool.id}>
                <TableCell>{spool.id}</TableCell>
                <TableCell>{plasticTypes.find(t => t.id === spool.plastic_type_id)?.name || '—'}</TableCell>
                <TableCell>{spool.color}</TableCell>
                <TableCell>{spool.weight_total}</TableCell>
                <TableCell>{spool.weight_remaining}</TableCell>
                {role === 'admin' && <TableCell>{groups.find(g => Number(g.id) === Number(spool.group_id))?.name || '—'}</TableCell>}
                <TableCell>
                  {spool.qr_code_path ? (
                    <>
                      <img
                        src={API_URL + spool.qr_code_path}
                        alt={spool.qr_code_path}
                        width={80}
                        style={{ border: '1px solid red', verticalAlign: 'middle' }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                        onClick={() => handleDownloadQr(spool.id, `spool_${spool.id}_qr.png`)}
                      >
                        Скачать
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ ml: 1 }}
                        onClick={() => handleDelete(spool.id)}
                      >
                        Удалить
                      </Button>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Добавить катушку</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="plastic-type-label">Тип пластика</InputLabel>
              <Select
                labelId="plastic-type-label"
                value={form.plastic_type_id}
                label="Тип пластика"
                onChange={e => setForm(f => ({ ...f, plastic_type_id: e.target.value }))}
              >
                {plasticTypes.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={() => setShowAddType(true)} sx={{ mt: 2 }}>
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          {showAddType && (
            <Box display="flex" alignItems="center" gap={1} mt={1} mb={2}>
              <TextField
                label="Новый тип пластика"
                value={newType}
                onChange={e => setNewType(e.target.value)}
                size="small"
              />
              <Button onClick={handleAddType} variant="outlined">Добавить</Button>
              <Button onClick={() => setShowAddType(false)} size="small">Отмена</Button>
            </Box>
          )}
          <TextField label="Цвет" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} fullWidth margin="normal" />
          <TextField label="Вес (г)" type="number" value={form.weight_total} onChange={e => setForm(f => ({ ...f, weight_total: e.target.value }))} fullWidth margin="normal" />
          <TextField label="Остаток (г)" type="number" value={form.weight_remaining} onChange={e => setForm(f => ({ ...f, weight_remaining: e.target.value }))} fullWidth margin="normal" helperText="Если не указано — будет равен весу" />
          {role === 'admin' && (
            <FormControl fullWidth margin="normal">
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                value={form.group_id || ''}
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
