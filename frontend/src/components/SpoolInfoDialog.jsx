import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert, TextField, Autocomplete } from '@mui/material';

export default function SpoolInfoDialog({ open, onClose, spool, group, plasticType, onDelete, onSpend, error, projects = [] }) {
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageForm, setUsageForm] = useState({ amount_used: '', purpose: '', project_id: '' });
  const [usageError, setUsageError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSpendClick = () => {
    setUsageOpen(true);
    setUsageForm({ amount_used: '', purpose: '', project_id: '' });
    setUsageError('');
  };
  const handleCloseUsage = () => {
    setUsageOpen(false);
    setUsageForm({ amount_used: '', purpose: '', project_id: '' });
    setUsageError('');
  };
  const handleUsage = async () => {
    if (!usageForm.amount_used || isNaN(Number(usageForm.amount_used)) || Number(usageForm.amount_used) <= 0) {
      setUsageError('Введите корректное количество');
      return;
    }
    if (onSpend) {
      await onSpend({
        ...usageForm,
        amount_used: Number(usageForm.amount_used),
        project_id: usageForm.project_id || null,
        spool_id: spool.id,
        onError: setUsageError,
        onSuccess: handleCloseUsage
      });
    }
  };
  const handleDeleteClick = () => setConfirmOpen(true);
  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    if (onDelete) await onDelete();
  };
  const handleCancelDelete = () => setConfirmOpen(false);

  if (!spool) return null;
  return (
    <>
      <Dialog 
        open={open} 
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') onClose();
        }} 
        maxWidth="xs" 
        fullWidth
      >
        <DialogTitle>Информация о катушке</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>ID: {spool.id}</Typography>
            <Typography>Тип пластика: <b>{plasticType?.name || '—'}</b></Typography>
            <Typography>Цвет: <b>{spool.color}</b></Typography>
            <Typography>Вес общий: <b>{spool.weight_total} г</b></Typography>
            <Typography>Остаток: <b>{spool.weight_remaining} г</b></Typography>
            <Typography>Группа: <b>{group?.name || '—'}</b></Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSpendClick} color="primary" variant="contained">Потратить</Button>
          <Button onClick={handleDeleteClick} color="error" variant="contained">Удалить</Button>
          <Button onClick={onClose} variant="outlined">Закрыть</Button>
        </DialogActions>
      </Dialog>
      {/* Диалог подтверждения удаления */}
      <Dialog open={confirmOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить катушку "{plasticType?.name || ''} {spool.color}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Отмена</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
      {/* Диалог быстрой траты пластика */}
      <Dialog 
        open={usageOpen} 
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') handleCloseUsage();
        }} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle>Потратить пластик</DialogTitle>
        <DialogContent>
          <Typography mb={1}>
            Катушка #{spool.id} — {plasticType?.name || ''}, {spool.color}
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
              .filter(p => spool && p.group_id === spool.group_id)
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
    </>
  );
}
