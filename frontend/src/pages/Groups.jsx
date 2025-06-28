import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const role = localStorage.getItem('role');

  const fetchGroups = async () => {
    try {
      // Предполагается, что есть эндпоинт /roles_groups/groups/ только для админа
      const res = await api.get('/roles_groups/groups/');
      setGroups(res.data);
    } catch {
      setError('Ошибка загрузки групп или нет прав');
    }
  };

  useEffect(() => { fetchGroups(); }, []);

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
    setConfirmDialog({ open: true, id });
  };
  const confirmDelete = async () => {
    setError('');
    try {
      await api.delete(`/roles_groups/groups/${confirmDialog.id}`);
      setConfirmDialog({ open: false, id: null });
      fetchGroups();
    } catch {
      setError('Ошибка удаления группы');
      setConfirmDialog({ open: false, id: null });
    }
  };
  const cancelDelete = () => setConfirmDialog({ open: false, id: null });

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
    <Box>
      <Typography variant="h5" mb={2}>Группы</Typography>
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
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              {role === 'admin' && <TableCell>Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(g => (
              <TableRow key={g.id}>
                <TableCell>{g.id}</TableCell>
                <TableCell>{g.name}</TableCell>
                {role === 'admin' && (
                  <TableCell>
                    <Button color="error" size="small" onClick={() => handleDeleteGroup(g.id)} sx={{mr:1}}>Удалить</Button>
                    {g.is_active === 0 || g.is_active === false ? (
                      <Button color="success" size="small" onClick={() => handleUnblockGroup(g.id)}>Разблокировать</Button>
                    ) : (
                      <Button color="warning" size="small" onClick={() => handleBlockGroup(g.id)}>Заблокировать</Button>
                    )}
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
          <Typography>Вы уверены, что хотите удалить группу #{confirmDialog.id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
