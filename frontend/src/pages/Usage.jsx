import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { fetchPlasticTypes } from '../api/plasticTypes';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, Autocomplete, Grid, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Pagination from '@mui/material/Pagination';

export default function Usage() {
  const [usages, setUsages] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ spool_id: '', amount_used: '', purpose: '', project_id: '' });
  const [error, setError] = useState('');
  const [spools, setSpools] = useState([]);
  const [projects, setProjects] = useState([]);
  const [plasticTypes, setPlasticTypes] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: '', direction: 'asc' });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');

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
    api.get('/groups/').then(res => setGroups(res.data)).catch(() => setGroups([]));
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
    const usage = usages.find(u => u.id === id);
    setConfirmDialog({ open: true, id, date: usage ? new Date(usage.timestamp).toLocaleString() : '' });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/usage/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null, date: '' });
      fetchUsages();
    } catch {
      setError('Ошибка удаления траты');
      setConfirmDialog({ open: false, id: null, date: '' });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null, date: '' });

  // Фильтрация трат по группе (только для админа)
  let filteredUsages = usages;
  if (localStorage.getItem('role') === 'admin' && selectedGroup !== 'all') {
    filteredUsages = usages.filter(u => {
      const project = projects.find(p => p.id === u.project_id);
      return project && String(project.group_id) === String(selectedGroup);
    });
  }
  // Универсальный поиск по таблице трат
  const searchedUsages = filteredUsages.filter(u => {
    const spool = spools.find(s => s.id === u.spool_id);
    const plasticType = plasticTypes.find(t => t.id === (spool ? spool.plastic_type_id : null));
    const project = projects.find(p => p.id === u.project_id);
    const group = project ? groups.find(g => g.id === project.group_id)?.name || '' : '';
    const values = [
      String(u.id),
      spool && plasticType ? `${plasticType.name} ${spool.color}` : u.spool_id,
      project ? project.name : (u.project_id || ''),
      String(u.amount_used),
      u.purpose,
      new Date(u.timestamp).toLocaleString(),
      group
    ].join(' ').toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // Сортировка
  const sortedUsages = [...searchedUsages].sort((a, b) => {
    if (!sort.field) return 0;
    const dir = sort.direction === 'asc' ? 1 : -1;
    if (sort.field === 'timestamp') {
      // Сортировка по дате
      return (new Date(a.timestamp) - new Date(b.timestamp)) * dir;
    }
    return (a[sort.field] - b[sort.field]) * dir;
  });

  const pagedUsages = sortedUsages.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageCount = Math.ceil(sortedUsages.length / rowsPerPage);

  return (
    <Box>
      <Typography variant="h5" align="center" sx={{ mt: 3, mb: 3, fontWeight: 600 }}>
        Траты
      </Typography>
      <Grid container spacing={2} alignItems="center" mb={3}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Поиск по таблице"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            fullWidth
          />
        </Grid>
        {localStorage.getItem('role') === 'admin' && (
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={[{ label: 'Все группы', id: 'all' }, ...groups.map(g => ({ label: g.name, id: g.id }))]}
              value={
                selectedGroup === 'all'
                  ? { label: 'Все группы', id: 'all' }
                  : groups.find(g => String(g.id) === String(selectedGroup))
                    ? { label: groups.find(g => String(g.id) === String(selectedGroup)).name, id: selectedGroup }
                    : { label: 'Все группы', id: 'all' }
              }
              onChange={(_, newValue) => {
                setSelectedGroup(newValue ? newValue.id : 'all');
              }}
              renderInput={params => <TextField {...params} label="Группа" fullWidth />}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
              sx={{ minWidth: 180, maxWidth: 240 }}
            />
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <Button variant="contained" onClick={() => setOpen(true)} fullWidth>Добавить трату</Button>
        </Grid>
      </Grid>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ mt: 2, mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Box display="flex" alignItems="center">
                  ID
                  <IconButton size="small" onClick={() => setSort(s => ({ field: 'id', direction: s.field === 'id' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                    {sort.field === 'id' ? (
                      sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                    ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell>Катушка</TableCell>
              <TableCell>Проект</TableCell>
              {localStorage.getItem('role') === 'admin' && <TableCell>Группа</TableCell>}
              <TableCell>
                <Box display="flex" alignItems="center">
                  Кол-во (г)
                  <IconButton size="small" onClick={() => setSort(s => ({ field: 'amount_used', direction: s.field === 'amount_used' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                    {sort.field === 'amount_used' ? (
                      sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                    ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell>Цель</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Дата
                  <IconButton size="small" onClick={() => setSort(s => ({ field: 'timestamp', direction: s.field === 'timestamp' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                    {sort.field === 'timestamp' ? (
                      sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                    ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedUsages.map(u => {
              const spool = spools.find(s => s.id === u.spool_id);
              const plasticType = plasticTypes.find(t => t.id === (spool ? spool.plastic_type_id : null));
              const project = projects.find(p => p.id === u.project_id);
              const group = project ? groups.find(g => g.id === project.group_id)?.name || '—' : '—';
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{spool && plasticType ? `${plasticType.name} ${spool.color}` : u.spool_id}</TableCell>
                  <TableCell>{project ? project.name : (u.project_id || '—')}</TableCell>
                  {localStorage.getItem('role') === 'admin' && <TableCell>{group}</TableCell>}
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
        <Box display="flex" justifyContent="center" my={2}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
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
          <Typography>Вы уверены, что хотите удалить трату #{confirmDialog.id} за "{confirmDialog.date}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
