import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { fetchPlasticTypes, addPlasticType } from '../api/plasticTypes';
import { Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Alert, MenuItem, Select, InputLabel, FormControl, IconButton, Grid, Autocomplete } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileDownload from 'js-file-download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Pagination from '@mui/material/Pagination';

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
  const [selectedType, setSelectedType] = useState('all');
  const [usageDialog, setUsageDialog] = useState({ open: false, spool: null });
  const [usageForm, setUsageForm] = useState({ amount_used: '', purpose: '', project_id: '' });
  const [usageError, setUsageError] = useState('');
  const [projects, setProjects] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [search, setSearch] = useState('');
  const [minWeightRemaining, setMinWeightRemaining] = useState('');
  const [sort, setSort] = useState({ field: '', direction: 'asc' }); // field: 'weight_total' | 'weight_remaining'
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const role = localStorage.getItem('role');
  const API_URL = import.meta.env.VITE_API_URL || '/api'; // Используем переменную окружения

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
      setPlasticTypes(Array.isArray(types) ? types : []);
    } catch {
      setPlasticTypes([]);
    }
  };

  useEffect(() => {
    fetchSpools();
    fetchTypes();
    api.get('/projects/')
      .then(res => setProjects(res.data))
      .catch(() => setProjects([]));
  }, []);
useEffect(() => {
  const handler = () => fetchSpools();
  window.addEventListener('spools-updated', handler);
  return () => window.removeEventListener('spools-updated', handler);
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
    const spool = spools.find(s => s.id === id);
    const type = plasticTypes.find(t => t.id === spool?.plastic_type_id)?.name || '';
    setConfirmDialog({ open: true, id, desc: spool ? `${type} ${spool.color}` : '' });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/spools/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null, desc: '' });
      fetchSpools();
    } catch {
      setError('Ошибка удаления катушки');
      setConfirmDialog({ open: false, id: null, desc: '' });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null, desc: '' });

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

  // Быстрая трата пластика
  const handleOpenUsage = (spool) => {
    setUsageDialog({ open: true, spool });
    setUsageForm({ amount_used: '', purpose: '', project_id: '' });
    setUsageError('');
  };
  const handleCloseUsage = () => {
    setUsageDialog({ open: false, spool: null });
    setUsageForm({ amount_used: '', purpose: '', project_id: '' });
    setUsageError('');
  };
  const handleUsage = async () => {
    setUsageError('');
    try {
      await api.post('/usage/', {
        spool_id: usageDialog.spool.id,
        amount_used: Number(usageForm.amount_used),
        purpose: usageForm.purpose,
        project_id: usageForm.project_id || null,
      });
      handleCloseUsage();
      fetchSpools();
    } catch {
      setUsageError('Ошибка траты пластика');
    }
  };

  // Сброс страницы на первую при изменении поиска, группы или типа пластика
  const isFirstRender = useRef(true);
  const prevSearch = useRef(search);
  const prevGroup = useRef(selectedGroup);
  const prevType = useRef(selectedType);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevSearch.current = search;
      prevGroup.current = selectedGroup;
      prevType.current = selectedType;
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
    if (selectedType !== prevType.current) {
      setPage(1);
      prevType.current = selectedType;
    }
  }, [search, selectedGroup, selectedType]);

  // Фильтрация катушек по группе (только для админа)
  let filteredSpools = Array.isArray(spools) ? spools : [];
  if (role === 'admin' && selectedGroup !== 'all') {
    filteredSpools = filteredSpools.filter(s => s.group_id === Number(selectedGroup));
  }

  // Фильтр по типу пластика
  if (selectedType !== 'all') {
    filteredSpools = filteredSpools.filter(s => String(s.plastic_type_id) === String(selectedType));
  }

  // Фильтр по минимальному остатку пластика
  if (minWeightRemaining !== '' && !isNaN(Number(minWeightRemaining))) {
    filteredSpools = filteredSpools.filter(s => Number(s.weight_remaining) >= Number(minWeightRemaining));
  }

  // Универсальный поиск по таблице катушек
  const searchedSpools = filteredSpools.filter(spool => {
    const type = plasticTypes.find(t => t.id === spool.plastic_type_id)?.name || '';
    const group = groups.find(g => Number(g.id) === Number(spool.group_id))?.name || '';
    const values = [
      String(spool.id),
      type,
      spool.color,
      String(spool.weight_total),
      String(spool.weight_remaining),
      group
    ].join(' ').toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // Сортировка
  const sortedSpools = [...searchedSpools].sort((a, b) => {
    if (!sort.field) return 0;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return (a[sort.field] - b[sort.field]) * dir;
  });

  const pagedSpools = sortedSpools.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageCount = Math.ceil(sortedSpools.length / rowsPerPage);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1200, px: { xs: 1, sm: 2 } }}>
        <Typography variant="h5" align="center" sx={{ mt: 3, mb: 3, fontWeight: 600 }}>
          Катушки
        </Typography>
        <Grid container spacing={2} alignItems="center" mb={3}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Поиск по таблице"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete
              size="small"
              options={[{ label: 'Все типы', id: 'all' }, ...plasticTypes.map(t => ({ label: t.name, id: t.id }))]}
              value={
                selectedType === 'all'
                  ? { label: 'Все типы', id: 'all' }
                  : plasticTypes.find(t => String(t.id) === String(selectedType))
                    ? { label: plasticTypes.find(t => String(t.id) === String(selectedType)).name, id: selectedType }
                    : { label: 'Все типы', id: 'all' }
              }
              onChange={(_, newValue) => {
                setSelectedType(newValue ? newValue.id : 'all');
              }}
              renderInput={params => <TextField {...params} label="Тип пластика" fullWidth />}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
              sx={{ minWidth: 180, maxWidth: 240 }}
            />
          </Grid>
          {role === 'admin' && (
            <Grid item xs={12} md={3}>
              <FormControl size="small" sx={{ minWidth: 180, maxWidth: 240 }}>
                <InputLabel id="filter-group-label">Фильтр по группе</InputLabel>
                <Select
                  labelId="filter-group-label"
                  value={selectedGroup}
                  label="Фильтр по группе"
                  onChange={e => setSelectedGroup(e.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                >
                  <MenuItem value="all">Все группы</MenuItem>
                  {groups.map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} md={3}>
            <TextField
              label="Мин. остаток (г)"
              type="number"
              value={minWeightRemaining}
              onChange={e => setMinWeightRemaining(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: { xs: 2, md: 0 } }}
            />
          </Grid>
          <Grid item xs={12} md={3} display="flex" justifyContent="flex-end" alignItems="center">
            <Button variant="contained" onClick={() => setOpen(true)} sx={{ width: '100%' }}>
              Добавить катушку
            </Button>
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
                <TableCell sx={{ wordBreak: 'break-word' }}>Тип пластика</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Цвет</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>
                  <Box display="flex" alignItems="center">
                    Общий вес (г)
                    <IconButton size="small" onClick={() => setSort(s => ({ field: 'weight_total', direction: s.field === 'weight_total' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      {sort.field === 'weight_total' ? (
                        sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                      ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>
                  <Box display="flex" alignItems="center">
                    Остаток (г)
                    <IconButton size="small" onClick={() => setSort(s => ({ field: 'weight_remaining', direction: s.field === 'weight_remaining' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      {sort.field === 'weight_remaining' ? (
                        sort.direction === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />
                      ) : <ArrowUpwardIcon fontSize="inherit" sx={{ opacity: 0.3 }} />}
                    </IconButton>
                  </Box>
                </TableCell>
                {role === 'admin' && <TableCell sx={{ wordBreak: 'break-word' }}>Группа</TableCell>}
                <TableCell sx={{ wordBreak: 'break-word' }}>QR</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedSpools.map(spool => (
                <TableRow key={spool.id}>
                  <TableCell>{spool.id}</TableCell>
                  <TableCell>{plasticTypes.find(t => t.id === spool.plastic_type_id)?.name || '—'}</TableCell>
                  <TableCell>{spool.color}</TableCell>
                  <TableCell>{spool.weight_total}</TableCell>
                  <TableCell>{spool.weight_remaining}</TableCell>
                  {role === 'admin' && <TableCell>{groups.find(g => Number(g.id) === Number(spool.group_id))?.name || '—'}</TableCell>}
                  <TableCell>
                    {spool.qr_code_path ? (
                      <img
                        src={spool.qr_code_path + '?v=' + Date.now()}
                        alt={spool.qr_code_path}
                        width={80}
                        style={{ border: '1px solid red', verticalAlign: 'middle', maxWidth: '100%' }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Grid container direction="column" spacing={1} sx={{ minWidth: 120 }}>
                      <Grid item>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          onClick={() => handleDownloadQr(spool.id, `spool_${spool.id}_qr.png`)}
                        >
                          Скачать
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          fullWidth
                          onClick={() => handleDelete(spool.id)}
                        >
                          Удалить
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          size="small"
                          color="primary"
                          variant="contained"
                          fullWidth
                          onClick={() => handleOpenUsage(spool)}
                        >
                          Потратить
                        </Button>
                      </Grid>
                    </Grid>
                  </TableCell>
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
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Добавить катушку</DialogTitle>
          <DialogContent>
            <Box display="flex" alignItems="center" gap={1}>
              <Autocomplete
                freeSolo
                options={plasticTypes.map(t => ({ label: t.name, id: t.id }))}
                value={
                  form.plastic_type_id
                    ? plasticTypes.find(t => t.id === form.plastic_type_id)?.name || ''
                    : ''
                }
                onInputChange={(e, newInput) => {
                  setForm(f => ({ ...f, plastic_type_id: newInput }));
                }}
                onChange={(e, newValue) => {
                  if (typeof newValue === 'object' && newValue && newValue.id) {
                    setForm(f => ({ ...f, plastic_type_id: newValue.id }));
                  } else if (typeof newValue === 'string') {
                    setForm(f => ({ ...f, plastic_type_id: newValue }));
                  } else {
                    setForm(f => ({ ...f, plastic_type_id: '' }));
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Тип пластика" margin="normal" fullWidth />
                )}
                sx={{ flex: 1 }}
              />
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
              <Autocomplete
                freeSolo
                options={groups.map(g => ({ label: g.name, id: g.id }))}
                value={
                  form.group_id
                    ? groups.find(g => g.id === form.group_id)?.name || ''
                    : ''
                }
                onInputChange={(e, newInput) => {
                  setForm(f => ({ ...f, group_id: newInput }));
                }}
                onChange={(e, newValue) => {
                  if (typeof newValue === 'object' && newValue && newValue.id) {
                    setForm(f => ({ ...f, group_id: newValue.id }));
                  } else if (typeof newValue === 'string') {
                    setForm(f => ({ ...f, group_id: newValue }));
                  } else {
                    setForm(f => ({ ...f, group_id: '' }));
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Группа" margin="normal" fullWidth />
                )}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} variant="contained">Создать</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог быстрой траты пластика */}
        <Dialog open={usageDialog.open} onClose={handleCloseUsage} fullWidth maxWidth="sm">
          <DialogTitle>Потратить пластик</DialogTitle>
          <DialogContent>
            <Typography mb={1}>
              Катушка #{usageDialog.spool?.id} — {plasticTypes.find(t => t.id === usageDialog.spool?.plastic_type_id)?.name || ''}, {usageDialog.spool?.color}
            </Typography>
            <TextField
              label="Сколько потратить (г)"
              type="number"
              value={usageForm.amount_used}
              onChange={e => setUsageForm(f => ({ ...f, amount_used: e.target.value }))}
              fullWidth
              margin="normal"
            />
            <Autocomplete
              freeSolo
              options={projects
                .filter(p => usageDialog.spool && p.group_id === usageDialog.spool.group_id)
                .map(p => ({ label: p.name, id: p.id }))}
              value={
                usageForm.project_id
                  ? projects.find(p => p.id === usageForm.project_id)?.name || ''
                  : ''
              }
              onInputChange={(e, newInput) => {
                setUsageForm(f => ({ ...f, project_id: newInput }));
              }}
              onChange={(e, newValue) => {
                if (typeof newValue === 'object' && newValue && newValue.id) {
                  setUsageForm(f => ({ ...f, project_id: newValue.id }));
                } else if (typeof newValue === 'string') {
                  setUsageForm(f => ({ ...f, project_id: newValue }));
                } else {
                  setUsageForm(f => ({ ...f, project_id: '' }));
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Проект" margin="normal" fullWidth />
              )}
            />
            <TextField
              label="Цель использования"
              value={usageForm.purpose}
              onChange={e => setUsageForm(f => ({ ...f, purpose: e.target.value }))}
              fullWidth
              margin="normal"
            />
            {usageError && <Alert severity="error">{usageError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseUsage}>Отмена</Button>
            <Button onClick={handleUsage} variant="contained">Потратить</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог подтверждения удаления катушки */}
        <Dialog open={confirmDialog.open} onClose={cancelDelete} fullWidth maxWidth="sm">
          <DialogTitle>Подтвердите удаление</DialogTitle>
          <DialogContent>
            <Typography>Вы уверены, что хотите удалить катушку "{confirmDialog.desc}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Отмена</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
