import apiClient from './apiClient';

export const getTodos = async (params) => {
  const { data } = await apiClient.get('/api/v1/todos', { params });
  return data;
};

export const createTodo = async (dto) => {
  const { data } = await apiClient.post('/api/v1/todos', dto);
  return data;
};

export const updateTodo = async (id, dto) => {
  const { data } = await apiClient.put(`/api/v1/todos/${id}`, dto);
  return data;
};

export const toggleTodo = async (id) => {
  const { data } = await apiClient.patch(`/api/v1/todos/${id}/toggle`);
  return data;
};

export const completeTodo = async (id, dto) => {
  const { data } = await apiClient.patch(`/api/v1/todos/${id}/complete`, dto);
  return data;
};

export const deleteTodo = async (id) => {
  await apiClient.delete(`/api/v1/todos/${id}`);
};
