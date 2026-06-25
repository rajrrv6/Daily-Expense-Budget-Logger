import apiClient from './apiClient';

export const getExpenses = async (params) => {
  const { data } = await apiClient.get('/api/v1/expenses', { params });
  return data;
};

export const getExpenseById = async (id) => {
  const { data } = await apiClient.get(`/api/v1/expenses/${id}`);
  return data;
};

export const createExpense = async (dto) => {
  const { data } = await apiClient.post('/api/v1/expenses', dto);
  return data;
};

export const updateExpense = async (id, dto) => {
  const { data } = await apiClient.put(`/api/v1/expenses/${id}`, dto);
  return data;
};

export const deleteExpense = async (id) => {
  await apiClient.delete(`/api/v1/expenses/${id}`);
};

export const getDashboardSummary = async () => {
  const { data } = await apiClient.get('/api/v1/analytics/dashboard');
  return data;
};

export const getRecentExpenses = async (limit = 5) => {
  const { data } = await apiClient.get('/api/v1/analytics/recent', { params: { limit } });
  return data;
};

export const getMonthlyTrends = async () => {
  const { data } = await apiClient.get('/api/v1/analytics/trends');
  return data;
};

export const getCategoryComparison = async () => {
  const { data } = await apiClient.get('/api/v1/analytics/categories/comparison');
  return data;
};

export const getRangeAggregation = async (startDate, endDate) => {
  const { data } = await apiClient.get('/api/v1/analytics/aggregate', {
    params: { startDate, endDate },
  });
  return data;
};

export const getBudgetForecast = async () => {
  const { data } = await apiClient.get('/api/v1/analytics/forecast');
  return data;
};

export const exportExpenses = async (startDate, endDate) => {
  const response = await apiClient.get('/api/v1/expenses/export', {
    params: { startDate, endDate },
    responseType: 'blob',
  });
  return response.data;
};

export const uploadReceipt = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/api/v1/expenses/receipts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const getReceiptFile = async (filename) => {
  const response = await apiClient.get(`/api/v1/expenses/receipts/${filename}`, {
    responseType: 'blob',
  });
  return response.data;
};

