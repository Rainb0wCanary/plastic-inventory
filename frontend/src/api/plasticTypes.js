import api from './axios';

export async function fetchPlasticTypes() {
  const res = await api.get('/spools/types');
  return res.data;
}

export async function addPlasticType(name) {
  const res = await api.post('/spools/types', { name });
  return res.data;
}
