import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAuthTokenHeader } from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up auto-login check on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await apiClient.post('/api/v1/auth/refresh');
        setUser({ username: data.username, email: data.email });
        setAuthTokenHeader(data.accessToken);
      } catch (err) {
        // Safe to ignore on mount (means no active session cookie exists)
        setUser(null);
        setAuthTokenHeader(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for unauthorized events from api client to log out user
    const handleUnauthorized = () => {
      setUser(null);
      setAuthTokenHeader(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (usernameOrEmail, password) => {
    const { data } = await apiClient.post('/api/v1/auth/login', {
      usernameOrEmail,
      password,
    });
    setUser({ username: data.username, email: data.email });
    setAuthTokenHeader(data.accessToken);
    return data;
  };

  const register = async (username, email, password) => {
    const { data } = await apiClient.post('/api/v1/auth/register', {
      username,
      email,
      password,
    });
    setUser({ username: data.username, email: data.email });
    setAuthTokenHeader(data.accessToken);
    return data;
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (err) {
      console.error('Logout error on backend:', err);
    } finally {
      setUser(null);
      setAuthTokenHeader(null);
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
