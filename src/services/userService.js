import apiClient from './apiClient';

export const updateProfile = async (profileData) => {
  const { data } = await apiClient.put('/api/v1/users/profile', profileData);
  return data;
};

export const updatePassword = async (passwordData) => {
  const { data } = await apiClient.put('/api/v1/users/password', passwordData);
  return data;
};
