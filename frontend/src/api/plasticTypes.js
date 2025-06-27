import api from './axios';

export const fetchPlasticTypes = async () => {
  const res = await api.get('/plastic_types/all');
  return res.data;
};

export const addPlasticType = async (name) => {
  const res = await api.post('/plastic_types/add', { name });
  return res.data;
};
