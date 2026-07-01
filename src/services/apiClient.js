import axios from 'axios';

const apiClient = axios.create({
  baseURL: '', // Proxied locally to http://localhost:8080 via vite.config.js
  timeout: 10000, // 10 seconds request timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for sending/receiving secure cookies
});

let isRefreshing = false;
let failedQueue = [];
let refreshPromise = null;

export const refreshSession = () => {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = apiClient.post('/api/v1/auth/refresh')
    .then((res) => {
      refreshPromise = null;
      return res;
    })
    .catch((err) => {
      refreshPromise = null;
      throw err;
    });
  return refreshPromise;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Set token injection helper
export const setAuthTokenHeader = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Generate Correlation ID if not present on client side (for correlation tracking)
    if (!config.headers['X-Correlation-ID']) {
      config.headers['X-Correlation-ID'] = crypto.randomUUID();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for 401 Refresh & 429 Rate Limiting
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 0. Handle Timeout Errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'The server took too long to respond. Please check your connection and retry.';
      return Promise.reject(error);
    }

    // 1. Handle Rate Limit Exceeded (HTTP 429)
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`Rate limit hit! Retry-After: ${retryAfter}s`);
      // We return the error so UI components can catch it and display a Toast alert
      return Promise.reject(error);
    }

    // 2. Handle Authentication Expiration (HTTP 401)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/api/v1/auth/refresh') || originalRequest.url.includes('/api/v1/auth/login')) {
        // If the refresh call itself fails, we must force logout
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        refreshSession()
          .then(({ data }) => {
            const token = data.accessToken;
            setAuthTokenHeader(token);
            processQueue(null, token);
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // Trigger a custom event to alert AuthContext to log out user
            window.dispatchEvent(new Event('auth:unauthorized'));
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
