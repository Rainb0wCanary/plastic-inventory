import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CircularProgress, CssBaseline, AppBar, Toolbar, Button, Box } from '@mui/material';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Login from './pages/Login';
import Spools from './pages/Spools';
import Usage from './pages/Usage';
import Projects from './pages/Projects';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import QrScanDialog from './components/QrScanDialog';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SpoolInfoDialog from './components/SpoolInfoDialog';
import api from './api/axios';

function App() {
  const [count, setCount] = useState(0)
  const [token, setToken] = useState(undefined);
  const [role, setRole] = useState(undefined);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [spoolDialog, setSpoolDialog] = useState({ open: false, spool: null, error: '' });
  const [groups, setGroups] = useState([]);
  const [plasticTypes, setPlasticTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [spendState, setSpendState] = useState({ open: false, usageForm: { amount_used: '', purpose: '', project_id: '' }, error: '', onSuccess: null });

  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setRole(localStorage.getItem('role'));
    setLoading(false);
    const onStorage = () => {
      setToken(localStorage.getItem('token'));
      setRole(localStorage.getItem('role'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Обновлять состояние после логина
  const handleLogin = () => {
    setToken(localStorage.getItem('token'));
    setRole(localStorage.getItem('role'));
  };

  // Если уже авторизован и на /login, сразу редиректим на /spools
  useEffect(() => {
    if (token && location.pathname === '/login') {
      navigate('/spools', { replace: true });
    }
  }, [token, location, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    api.get('/groups/').then(res => setGroups(res.data)).catch(() => setGroups([]));
    api.get('/spools/types').then(res => setPlasticTypes(res.data)).catch(() => setPlasticTypes([]));
    api.get('/projects/').then(res => setProjects(res.data)).catch(() => setProjects([]));
  }, []);

  if (loading || token === undefined || role === undefined) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><CircularProgress /></div>;
  }

  return (
    <>
      <CssBaseline />
      {token && (
        <AppBar position="static" elevation={4}>
          <Toolbar>
            <img src="/vite.svg" alt="logo" style={{height: 36, marginRight: 16}} />
            <Button
              variant="outlined"
              color="success"
              onClick={() => setQrDialogOpen(true)}
              sx={{
                mr: 2,
                fontWeight: 700,
                borderWidth: 2,
                borderRadius: 2,
                px: 2.5,
                py: 1,
                boxShadow: '0 2px 8px 0 rgba(0,128,0,0.08)',
                background: 'linear-gradient(90deg, #e8f5e9 0%, #f1f8e9 100%)',
                color: '#1b5e20',
                '&:hover': {
                  background: 'linear-gradient(90deg, #c8e6c9 0%, #e8f5e9 100%)',
                  borderColor: '#388e3c',
                  color: '#388e3c',
                },
                letterSpacing: 1
              }}
              startIcon={<CameraAltIcon sx={{ color: '#388e3c' }} />}
            >
              Сканировать QR
            </Button>
            {token && <Button color="inherit" href="/spools">Катушки</Button>}
            {token && <Button color="inherit" href="/usage">Траты</Button>}
            {token && <Button color="inherit" href="/projects">Проекты</Button>}
            {token && (role === 'admin' || role === 'moderator') && <Button color="inherit" href="/users">Пользователи</Button>}
            {token && role === 'admin' && <Button color="inherit" href="/groups">Группы</Button>}
            <Box sx={{ flexGrow: 1 }} />
            {token && <Button color="inherit" href="/profile">Профиль</Button>}
            {token && <Button color="inherit" onClick={handleLogout}>Выйти</Button>}
          </Toolbar>
        </AppBar>
      )}
      <QrScanDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        onResult={async data => {
          setQrResult(data);
          let spoolId = null;
          try {
            // Отправляем строку на бэкенд для декодирования
            const res = await api.post('/spools/decode_qr', { qr: data });
            spoolId = res.data.id;
          } catch {
            setSpoolDialog({ open: true, spool: null, error: 'Некорректный QR-код: не удалось извлечь id' });
            setTimeout(() => setQrDialogOpen(false), 200); // Даем диалогу открыться
            return;
          }
          try {
            const res = await api.get(`/spools/${spoolId}`);
            setSpoolDialog({ open: true, spool: res.data, error: '' });
          } catch (e) {
            setSpoolDialog({ open: true, spool: null, error: 'Катушка не найдена или QR некорректен' });
          }
          setTimeout(() => setQrDialogOpen(false), 200); // Даем диалогу открыться
        }}
      />
      <SpoolInfoDialog
        open={spoolDialog.open}
        onClose={() => setSpoolDialog({ open: false, spool: null, error: '' })}
        spool={spoolDialog.spool}
        group={spoolDialog.spool ? (groups?.find(g => g.id === spoolDialog.spool.group_id) || null) : null}
        plasticType={spoolDialog.spool ? (plasticTypes?.find(t => t.id === spoolDialog.spool.plastic_type_id) || null) : null}
        error={spoolDialog.error}
        projects={projects}
        onDelete={async () => {
          if (!spoolDialog.spool) return;
          try {
            await api.delete(`/spools/${spoolDialog.spool.id}`);
            setSpoolDialog({ open: false, spool: null, error: '' });
            // Триггерим обновление списка катушек
            window.dispatchEvent(new CustomEvent('spools-updated'));
          } catch {
            setSpoolDialog(s => ({ ...s, error: 'Ошибка удаления катушки' }));
          }
        }}
        onSpend={async ({ amount_used, purpose, project_id, spool_id, onError, onSuccess }) => {
          try {
            await api.post('/usage/', {
              spool_id,
              amount_used: Number(amount_used),
              purpose,
              project_id: project_id || null,
            });
            if (onSuccess) onSuccess();
            // Триггерим обновление списка катушек
            window.dispatchEvent(new CustomEvent('spools-updated'));
          } catch {
            if (onError) onError('Ошибка траты пластика');
          }
        }}
      />
      <Routes>
        {!token && <Route path="*" element={<Navigate to="/login" />} />}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        {token && <Route path="/spools" element={<ProtectedRoute><Spools /></ProtectedRoute>} />}
        {token && <Route path="/usage" element={<ProtectedRoute><Usage /></ProtectedRoute>} />}
        {token && <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />}
        {token && <Route path="/users" element={<ProtectedRoute allowedRoles={["admin", "moderator"]}><Users /></ProtectedRoute>} />}
        {token && <Route path="/groups" element={<ProtectedRoute allowedRoles={["admin"]}><Groups /></ProtectedRoute>} />}
        {token && <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />}
        {token && <Route path="*" element={<Navigate to="/spools" />} />}
      </Routes>
    </>
  );
}

export default App
