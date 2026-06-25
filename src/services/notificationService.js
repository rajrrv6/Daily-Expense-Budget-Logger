import apiClient from './apiClient';

export const getNotifications = async (page = 0, size = 10) => {
  const { data } = await apiClient.get(`/api/v1/notifications?page=${page}&size=${size}&sort=createdAt,desc`);
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await apiClient.get('/api/v1/notifications/unread-count');
  return data.unreadCount;
};

export const markAsRead = async (id) => {
  const { data } = await apiClient.put(`/api/v1/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await apiClient.put('/api/v1/notifications/read-all');
  return data;
};

export const deleteNotification = async (id) => {
  await apiClient.delete(`/api/v1/notifications/${id}`);
};

export const getPreferences = async () => {
  const { data } = await apiClient.get('/api/v1/notifications/preferences');
  return data;
};

export const updatePreferences = async (preferencesData) => {
  const { data } = await apiClient.put('/api/v1/notifications/preferences', preferencesData);
  return data;
};
