import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete } from '@mui/material';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role_id: '', group_id: '' });
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const role = localStorage.getItem('role');

  const fetchUsers = async () => {
    try {
      // Эндпоинт для пользователей теперь с префиксом /roles_groups
      const res = await api.get('/roles_groups/users/');
      setUsers(res.data);
    } catch {
      setError('Ошибка загрузки пользователей или нет прав');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (role === 'admin') {
      api.get('/roles_groups/roles/').then(res => setRoles(res.data)).catch(() => setRoles([]));
      api.get('/groups/').then(res => setGroups(res.data)).catch(() => setGroups([]));
    }
    if (role === 'moderator') {
      // Для модератора только роль user и только своя группа
      setRoles([{ id: 3, name: 'user' }]); // id роли user (уточните id в вашей БД)
      api.get('/auth/me').then(res => {
        setGroups(res.data.group ? [res.data.group] : []);
        setForm(f => ({ ...f, group_id: res.data.group ? res.data.group.id : '' }));
      });
    }
  }, [role]);

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
    setConfirmDialog({ open: true, id });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/roles_groups/users/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null });
      fetchUsers();
    } catch {
      setError('Ошибка удаления пользователя');
      setConfirmDialog({ open: false, id: null });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null });

  return (
    <Box>
      <Typography variant="h5" mb={2}>Пользователи</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2, mr: 2 }}>Добавить пользователя</Button>
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
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Группа</TableCell>
              {(role === 'admin' || role === 'moderator') && <TableCell>Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.role && u.role.name}</TableCell>
                <TableCell>{u.group && u.group.name}</TableCell>
                {(role === 'admin' || role === 'moderator') && (
                  <TableCell>
                    {((role === 'admin' && (u.role ? u.role.name !== 'admin' : true) && u.username !== localStorage.getItem('username')) ||
                      (role === 'admin' && !u.role && u.username !== localStorage.getItem('username'))
                    ) && (
                      <>
                        <Button color="error" size="small" onClick={() => handleDelete(u.id)}>
                          Удалить
                        </Button>
                        {u.is_active === 0 ? (
                          <Button color="success" size="small" onClick={async () => {
                            try {
                              await api.put(`/roles_groups/users/${u.id}/unblock`);
                              fetchUsers();
                            } catch {
                              setError('Ошибка разблокировки пользователя');
                            }
                          }}>Разблокировать</Button>
                        ) : (
                          <Button color="warning" size="small" onClick={async () => {
                            try {
                              await api.put(`/roles_groups/users/${u.id}/block`);
                              fetchUsers();
                            } catch {
                              setError('Ошибка блокировки пользователя');
                            }
                          }}>Заблокировать</Button>
                        )}
                      </>
                    )}
                    {role === 'moderator' && u.role && u.role.name === 'user' && u.username !== localStorage.getItem('username') && u.group && String(u.group.id) === String(form.group_id) && (
                      <>
                        <Button color="error" size="small" onClick={() => handleDelete(u.id)}>
                          Удалить
                        </Button>
                        {u.is_active === 0 ? (
                          <Button color="success" size="small" onClick={async () => {
                            try {
                              await api.put(`/roles_groups/users/${u.id}/unblock`);
                              fetchUsers();
                            } catch {
                              setError('Ошибка разблокировки пользователя');
                            }
                          }}>Разблокировать</Button>
                        ) : (
                          <Button color="warning" size="small" onClick={async () => {
                            try {
                              await api.put(`/roles_groups/users/${u.id}/block`);
                              fetchUsers();
                            } catch {
                              setError('Ошибка блокировки пользователя');
                            }
                          }}>Заблокировать</Button>
                        )}
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {/* Диалог подтверждения удаления пользователя */}
      <Dialog open={confirmDialog.open} onClose={cancelDelete}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить пользователя #{confirmDialog.id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
