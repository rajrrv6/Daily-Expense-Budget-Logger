import apiClient from './apiClient';

export const getBudgets = async () => {
  const { data } = await apiClient.get('/api/v1/budgets');
  return data;
};

export const createBudget = async (budgetData) => {
  const { data } = await apiClient.post('/api/v1/budgets', budgetData);
  return data;
};

export const updateBudget = async (id, budgetData) => {
  const { data } = await apiClient.put(`/api/v1/budgets/${id}`, budgetData);
  return data;
};

export const deleteBudget = async (id) => {
  await apiClient.delete(`/api/v1/budgets/${id}`);
};
