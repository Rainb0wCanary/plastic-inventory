import axios from 'axios';

// Используем переменную окружения VITE_API_URL, если она есть, иначе fallback на '/api'
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
