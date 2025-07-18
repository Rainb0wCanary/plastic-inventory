import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Grid, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Pagination from '@mui/material/Pagination';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role_id: '', group_id: '' });
  const [roles, setRoles] = useState([]);
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

  // Универсальный поиск по таблице пользователей с учётом фильтра по группе
  let filteredUsers = users;
  if (role === 'admin' && selectedGroup !== 'all') {
    filteredUsers = users.filter(u => u.group && String(u.group.id) === String(selectedGroup));
  }
  const searchedUsers = filteredUsers.filter(u => {
    const roleName = u.role?.name || '';
    const groupName = u.group?.name || '';
    const values = [
      String(u.id),
      u.username,
      roleName,
      groupName
    ].join(' ').toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // Сортировка
  const sortedUsers = [...searchedUsers].sort((a, b) => {
    if (!sort.field) return 0;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return (a[sort.field] - b[sort.field]) * dir;
  });

  const pagedUsers = sortedUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageCount = Math.ceil(sortedUsers.length / rowsPerPage);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/roles_groups/users/');
      console.log('USERS API DATA:', res.data); // Диагностика
      setUsers(res.data);
    } catch (e) {
      setError('Ошибка загрузки пользователей или нет прав');
      console.error('USERS API ERROR:', e); // Диагностика
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (role === 'admin') {
      api.get('/roles_groups/roles/').then(res => {
        setRoles(res.data);
        console.log('ROLES API DATA:', res.data); // Диагностика
      }).catch((e) => {
        setRoles([]);
        console.error('ROLES API ERROR:', e); // Диагностика
      });
      api.get('/groups/').then(res => {
        setGroups(res.data);
        console.log('GROUPS API DATA:', res.data); // Диагностика
      }).catch((e) => {
        setGroups([]);
        console.error('GROUPS API ERROR:', e); // Диагностика
      });
    }
    if (role === 'moderator') {
      setRoles([{ id: 3, name: 'user' }]);
      api.get('/auth/me').then(res => {
        setGroups(res.data.group ? [res.data.group] : []);
        setForm(f => ({ ...f, group_id: res.data.group ? res.data.group.id : '' }));
        console.log('AUTH ME API DATA:', res.data); // Диагностика
      }).catch((e) => {
        console.error('AUTH ME API ERROR:', e); // Диагностика
      });
    }
  }, [role]);

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

  const handleCreate = async () => {
    setError('');
    try {
      const payload = {
        username: form.username,
        password: form.password,
        role_id: Number(role === 'moderator' ? 3 : form.role_id), // обязательно число
        group_id: form.group_id ? Number(form.group_id) : null, // обязательно число или null
      };
      await api.post('/roles_groups/users/', payload);
      setOpen(false);
      if (role === 'moderator') {
        // Сохраняем group_id для модератора после сброса формы
        setForm({ username: '', password: '', role_id: '', group_id: form.group_id });
      } else {
        setForm({ username: '', password: '', role_id: '', group_id: '' });
      }
      fetchUsers();
    } catch {
      setError('Ошибка создания пользователя');
    }
  };

  const handleDelete = (id) => {
    const user = users.find(u => u.id === id);
    setConfirmDialog({ open: true, id, name: user ? user.username : '' });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/roles_groups/users/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null, name: '' });
      fetchUsers();
    } catch {
      setError('Ошибка удаления пользователя');
      setConfirmDialog({ open: false, id: null, name: '' });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null, name: '' });

  return (
    <Box sx={{ maxWidth: 1200, width: '100%', p: 2, display: 'flex', justifyContent: 'center', mx: 'auto' }}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" align="center" sx={{ mt: 3, mb: 3, fontWeight: 600 }}>
          Пользователи
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
            <Button variant="contained" onClick={() => setOpen(true)} fullWidth>Добавить пользователя</Button>
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
                <TableCell sx={{ wordBreak: 'break-word' }}>Имя</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Роль</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Группа</TableCell>
                {(role === 'admin' || role === 'moderator') && <TableCell sx={{ wordBreak: 'break-word' }}>Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{u.id}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{u.username}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{u.role && u.role.name}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{u.group && u.group.name}</TableCell>
                  {(role === 'admin' || role === 'moderator') && (
                    <TableCell sx={{ wordBreak: 'break-word' }} align="center">
                      <Box display="flex" flexDirection="column" gap={1} alignItems="stretch" justifyContent="center" textAlign="center" width="100%">
                        {((role === 'admin' && (u.role ? u.role.name !== 'admin' : true) && u.username !== localStorage.getItem('username')) ||
                          (role === 'admin' && !u.role && u.username !== localStorage.getItem('username'))
                        ) && (
                          <>
                            <Button color="error" size="small" variant="contained" onClick={() => handleDelete(u.id)} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                              Удалить
                            </Button>
                            {u.is_active === 0 ? (
                              <Button color="success" size="small" variant="contained" onClick={async () => {
                                try {
                                  await api.put(`/roles_groups/users/${u.id}/unblock`);
                                  fetchUsers();
                                } catch {
                                  setError('Ошибка разблокировки пользователя');
                                }
                              }} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                                Разблокировать
                              </Button>
                            ) : (
                              <Button color="warning" size="small" variant="contained" onClick={async () => {
                                try {
                                  await api.put(`/roles_groups/users/${u.id}/block`);
                                  fetchUsers();
                                } catch {
                                  setError('Ошибка блокировки пользователя');
                                }
                              }} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                                Заблокировать
                              </Button>
                            )}
                          </>
                        )}
                        {role === 'moderator' && u.role && u.role.name === 'user' && u.username !== localStorage.getItem('username') && u.group && String(u.group.id) === String(form.group_id) && (
                          <>
                            <Button color="error" size="small" variant="contained" onClick={() => handleDelete(u.id)} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                              Удалить
                            </Button>
                            {u.is_active === 0 ? (
                              <Button color="success" size="small" variant="contained" onClick={async () => {
                                try {
                                  await api.put(`/roles_groups/users/${u.id}/unblock`);
                                  fetchUsers();
                                } catch {
                                  setError('Ошибка разблокировки пользователя');
                                }
                              }} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                                Разблокировать
                              </Button>
                            ) : (
                              <Button color="warning" size="small" variant="contained" onClick={async () => {
                                try {
                                  await api.put(`/roles_groups/users/${u.id}/block`);
                                  fetchUsers();
                                } catch {
                                  setError('Ошибка блокировки пользователя');
                                }
                              }} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                                Заблокировать
                              </Button>
                            )}
                          </>
                        )}
                      </Box>
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
          <DialogTitle>Добавить пользователя</DialogTitle>
          <DialogContent>
            <TextField label="Имя пользователя" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} fullWidth margin="normal" />
            <TextField label="Пароль" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} fullWidth margin="normal" />
            <Autocomplete
              fullWidth
              options={roles.map(r => ({ label: r.name, id: r.id }))}
              value={
                form.role_id
                  ? (roles.find(r => r.id === form.role_id)?.name || form.role_id)
                  : ''
              }
              onInputChange={(e, newInput) => {
                setForm(f => ({ ...f, role_id: newInput }));
              }}
              onChange={(e, newValue) => {
                if (typeof newValue === 'object' && newValue && typeof newValue.id !== 'undefined') {
                  setForm(f => ({ ...f, role_id: newValue.id }));
                } else if (typeof newValue === 'string') {
                  setForm(f => ({ ...f, role_id: newValue }));
                } else {
                  setForm(f => ({ ...f, role_id: '' }));
                }
              }}
              renderInput={params => (
                <TextField {...params} label="Роль" margin="normal" fullWidth />
              )}
              disabled={role === 'moderator'}
              sx={{ mb: 2 }}
            />
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
              disabled={role === 'moderator'}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} variant="contained">Создать</Button>
          </DialogActions>
        </Dialog>
        {/* Диалог подтверждения удаления пользователя */}
        <Dialog open={confirmDialog.open} onClose={cancelDelete}>
          <DialogTitle>Подтвердите удаление</DialogTitle>
          <DialogContent>
            <Typography>Вы уверены, что хотите удалить пользователя "{confirmDialog.name}"?</Typography>
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
