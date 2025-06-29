import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const role = localStorage.getItem('role');
  const isFirstRender = useRef(true);
  const prevSearch = useRef(search);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/roles_groups/groups/');
      setGroups(res.data);
    } catch {
      setError('Ошибка загрузки групп или нет прав');
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevSearch.current = search;
      return;
    }
    if (search !== prevSearch.current) {
      setPage(1);
      prevSearch.current = search;
    }
  }, [search]);

  const handleCreateGroup = async () => {
    setError('');
    try {
      await api.post('/roles_groups/groups/', { name: groupName });
      setOpenGroup(false);
      setGroupName('');
      fetchGroups();
    } catch {
      setError('Ошибка создания группы');
    }
  };

  const handleDeleteGroup = (id) => {
    const group = groups.find(g => g.id === id);
    setConfirmDialog({ open: true, id, name: group ? group.name : '' });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/roles_groups/groups/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null, name: '' });
      fetchGroups();
    } catch {
      setError('Ошибка удаления группы');
      setConfirmDialog({ open: false, id: null, name: '' });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null, name: '' });

  const handleBlockGroup = async (id) => {
    setError('');
    try {
      await api.put(`/roles_groups/groups/${id}/block`);
      fetchGroups();
    } catch {
      setError('Ошибка блокировки группы');
    }
  };
  const handleUnblockGroup = async (id) => {
    setError('');
    try {
      await api.put(`/roles_groups/groups/${id}/unblock`);
      fetchGroups();
    } catch {
      setError('Ошибка разблокировки группы');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, width: '100%', p: 2, display: 'flex', justifyContent: 'center', mx: 'auto' }}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" mb={2} align="center" sx={{ fontWeight: 600 }}>
          Группы
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {role === 'admin' && (
          <Button variant="contained" onClick={() => setOpenGroup(true)} sx={{ mb: 2 }}>
            Создать группу
          </Button>
        )}
        <Dialog open={openGroup} onClose={() => setOpenGroup(false)}>
          <DialogTitle>Создать группу</DialogTitle>
          <DialogContent>
            <TextField label="Название группы" value={groupName} onChange={e => setGroupName(e.target.value)} fullWidth margin="normal" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenGroup(false)}>Отмена</Button>
            <Button onClick={handleCreateGroup} variant="contained">Создать</Button>
          </DialogActions>
        </Dialog>
        <Paper sx={{ width: '100%' }}>
          <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ wordBreak: 'break-word' }}>ID</TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>Название</TableCell>
                {role === 'admin' && <TableCell sx={{ wordBreak: 'break-word' }}>Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.id}>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{g.id}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>{g.name}</TableCell>
                  {role === 'admin' && (
                    <TableCell sx={{ wordBreak: 'break-word' }} align="center">
                      <Box display="flex" flexDirection="column" gap={1} alignItems="stretch" justifyContent="center" textAlign="center" width="100%">
                        <Button color="error" size="small" variant="contained" onClick={() => handleDeleteGroup(g.id)} sx={{ width: '100%', fontWeight: 600, py: 1, mb: 0.5 }}>
                          Удалить
                        </Button>
                        {g.is_active === 0 || g.is_active === false ? (
                          <Button color="success" size="small" variant="contained" onClick={() => handleUnblockGroup(g.id)} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                            Разблокировать
                          </Button>
                        ) : (
                          <Button color="warning" size="small" variant="contained" onClick={() => handleBlockGroup(g.id)} sx={{ width: '100%', fontWeight: 600, py: 1 }}>
                            Заблокировать
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        {/* Диалог подтверждения удаления группы */}
        <Dialog open={confirmDialog.open} onClose={cancelDelete}>
          <DialogTitle>Подтвердите удаление</DialogTitle>
          <DialogContent>
            <Typography>Вы уверены, что хотите удалить группу "{confirmDialog.name}"?</Typography>
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
