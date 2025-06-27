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

function App() {
  const [count, setCount] = useState(0)
  const [token, setToken] = useState(undefined);
  const [role, setRole] = useState(undefined);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

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
