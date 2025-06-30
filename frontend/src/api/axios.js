import axios from 'axios';

const API_URL = '/api'; // Используем относительный путь для проксирования через nginx

const api = axios.create({
  baseURL: API_URL,
});

// Добавление токена авторизации ко всем запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Глобальный перехватчик ошибок для блокировки группы
api.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      typeof error.response.data.detail === 'string' &&
      error.response.data.detail.includes('группа заблокирована')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('group_id');
      alert('Ваша группа заблокирована. Обратитесь к администратору.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
