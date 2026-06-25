import apiClient from './apiClient';

export const getCategories = async () => {
  const { data } = await apiClient.get('/api/v1/categories');
  return data;
};

export const createCategory = async (categoryDto) => {
  const { data } = await apiClient.post('/api/v1/categories', categoryDto);
  return data;
};
