import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, Autocomplete, Grid, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Pagination from '@mui/material/Pagination';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', group_id: '' });
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: '', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const rowsPerPage = 10;
  const role = localStorage.getItem('role');
  const isFirstRender = useRef(true);
  const prevSearch = useRef(search);
  const prevGroup = useRef(selectedGroup);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      console.log('PROJECTS API DATA:', res.data); // Диагностика
      setProjects(res.data);
    } catch (e) {
      setError('Ошибка загрузки проектов');
      console.error('PROJECTS API ERROR:', e); // Диагностика
    }
  };

  // Для админа подгружаем группы
  useEffect(() => {
    if (role === 'admin') {
      api.get('/groups/')
        .then(res => {
          setGroups(res.data);
          console.log('GROUPS API DATA:', res.data); // Диагностика
        })
        .catch((e) => {
          setGroups([]);
          console.error('GROUPS API ERROR:', e); // Диагностика
        });
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
    const project = projects.find(p => p.id === id);
    setConfirmDialog({ open: true, id, name: project ? project.name : '' });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/projects/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null, name: '' });
      fetchProjects();
    } catch {
      setError('Ошибка удаления проекта');
      setConfirmDialog({ open: false, id: null, name: '' });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null, name: '' });

  // Фильтрация проектов по группе (только для админа)
  let filteredProjects = projects;
  if (role === 'admin' && selectedGroup !== 'all') {
    filteredProjects = projects.filter(p => String(p.group_id) === String(selectedGroup));
  }
  // Универсальный поиск по таблице проектов
  const searchedProjects = filteredProjects.filter(p => {
    const group = groups.find(g => g.id === p.group_id)?.name || '';
    const values = [
      String(p.id),
      p.name,
      p.description,
      group
    ].join(' ').toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // Сортировка
  const sortedProjects = [...searchedProjects].sort((a, b) => {
    if (!sort.field) return 0;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return (a[sort.field] - b[sort.field]) * dir;
  });

  const pagedProjects = sortedProjects.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageCount = Math.ceil(sortedProjects.length / rowsPerPage);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevSearch.current = search;
      prevGroup.current = selectedGroup;
      return;
    }
    if (search !== prevSearch.current) {
      setPage(1);
      prevSearch.current = search;
    }
    if (selectedGroup !== prevGroup.current) {
      setPage(1);
      prevGroup.current = selectedGroup;
    }
  }, [search, selectedGroup]);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1200, px: { xs: 1, sm: 2 } }}>
        <Typography variant="h5" align="center" sx={{ mt: 3, mb: 3, fontWeight: 600 }}>
          Проекты
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
          {role === 'admin' && (
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
            <Button variant="contained" onClick={() => setOpen(true)} fullWidth>Добавить проект</Button>
          </Grid>
        </Grid>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ mt: 2, mb: 3, width: '100%' }}>
          <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ wordBreak: 'break-word' }}>
                  <Box display="flex" alignItems="center">
                    ID
                    <IconButton size="small" onClick={() => setSort(s => ({ field: 'id', direction: s.field === 'id' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      {sort.field === 'id' ? (
                        sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                      ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Название</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Описание</TableCell>
                {role === 'admin' && <TableCell sx={{ wordBreak: 'break-word' }}>Группа</TableCell>}
                {(role === 'admin' || role === 'moderator') && <TableCell sx={{ wordBreak: 'break-word' }}>Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedProjects.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.description}</TableCell>
                  {role === 'admin' && <TableCell>{groups.find(g => g.id === p.group_id)?.name || '—'}</TableCell>}
                  {(role === 'admin' || (role === 'moderator' && String(p.group_id) === String(localStorage.getItem('group_id')))) && (
                    <TableCell>
                      <Button color="error" size="small" variant="contained" onClick={() => handleDelete(p.id)}>
                        Удалить
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
            <Typography>Вы уверены, что хотите удалить проект "{confirmDialog.name}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Отмена</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
