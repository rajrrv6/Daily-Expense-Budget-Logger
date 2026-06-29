import apiClient from './apiClient';

export const updateProfile = async (profileData) => {
  const { data } = await apiClient.put('/api/v1/users/profile', profileData);
  return data;
};

export const updatePassword = async (passwordData) => {
  const { data } = await apiClient.put('/api/v1/users/password', passwordData);
  return data;
};

export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/api/v1/users/profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const getUsers = async ({ role, status, search, pageNumber, pageSize }) => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  params.append('pageNumber', String(pageNumber));
  params.append('pageSize', String(pageSize));
  
  const { data } = await apiClient.get(`/api/v1/users?${params.toString()}`);
  return data;
};

export const updateUserRole = async (userId, roleName) => {
  const { data } = await apiClient.put(`/api/v1/users/${userId}/role`, { roleName });
  return data;
};

export const toggleUserLock = async (userId) => {
  const { data } = await apiClient.put(`/api/v1/users/${userId}/lock`);
  return data;
};

export const getAuditLogs = async ({ actionType, search, pageNumber, pageSize }) => {
  const params = new URLSearchParams();
  if (actionType) params.append('actionType', actionType);
  if (search) params.append('search', search);
  params.append('pageNumber', String(pageNumber));
  params.append('pageSize', String(pageSize));

  const { data } = await apiClient.get(`/api/v1/users/audit-logs?${params.toString()}`);
  return data;
};
