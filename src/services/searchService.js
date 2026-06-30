import apiClient from './apiClient';

export const globalSearch = async (query) => {
  const { data } = await apiClient.get('/api/v1/search', {
    params: { q: query }
  });
  return data;
};
