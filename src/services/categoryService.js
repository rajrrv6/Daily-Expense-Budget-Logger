import apiClient from './apiClient';

export const getCategories = async () => {
  const { data } = await apiClient.get('/api/v1/categories');
  return data;
};

export const createCategory = async (categoryDto) => {
  const { data } = await apiClient.post('/api/v1/categories', categoryDto);
  return data;
};

export const updateCategory = async (id, categoryDto) => {
  const { data } = await apiClient.put(`/api/v1/categories/${id}`, categoryDto);
  return data;
};

export const deleteCategory = async (id) => {
  await apiClient.delete(`/api/v1/categories/${id}`);
};

export const getCategoryDetails = async (id) => {
  const { data } = await apiClient.get(`/api/v1/categories/${id}/details`);
  return data;
};
