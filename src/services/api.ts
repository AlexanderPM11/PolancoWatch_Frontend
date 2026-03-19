import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5246';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  },
  forgotPassword: async (email?: string, username?: string) => {
    const response = await api.post('/api/auth/forgot-password', { email, username });
    return response.data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword });
    return response.data;
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  updateProfile: async (currentPassword: string, newUsername?: string, newPassword?: string) => {
    const response = await api.post('/api/auth/profile', { currentPassword, newUsername, newPassword });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    if (response.data.username) {
        localStorage.setItem('username', response.data.username);
    }
    return response.data;
  }
};

export const dockerService = {
  startContainer: async (id: string) => {
    const response = await api.post(`/api/docker/container/${id}/start`);
    return response.data;
  },
  stopContainer: async (id: string) => {
    const response = await api.post(`/api/docker/container/${id}/stop`);
    return response.data;
  },
  restartContainer: async (id: string) => {
    const response = await api.post(`/api/docker/container/${id}/restart`);
    return response.data;
  }
};

export const alertsService = {
  getRules: async () => {
    const response = await api.get('/api/alerts/rules');
    return response.data;
  },
  updateRule: async (rule: any) => {
    const response = await api.post('/api/alerts/rules', rule);
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/api/alerts/history');
    return response.data;
  }
};

export const metricsService = {
  getHistory: async (durationHours: number = 24) => {
    const response = await api.get(`/api/metrics/history?durationHours=${durationHours}`);
    return response.data;
  }
};

export const settingsService = {
  getNotificationSettings: async () => {
    const response = await api.get('/api/settings/notifications');
    return response.data;
  },
  updateNotificationSettings: async (settings: any) => {
    const response = await api.put('/api/settings/notifications', settings);
    return response.data;
  }
};

export interface WebMonitor {
  id: number;
  name: string;
  url: string;
  checkIntervalSeconds: number;
  isActive: boolean;
  lastCheckTime?: string;
  lastStatusUp: boolean;
  lastLatencyMs: number;
}

export interface WebCheck {
  id: number;
  webMonitorId: number;
  timestamp: string;
  isUp: boolean;
  latencyMs: number;
  statusCode: number;
  errorMessage?: string;
}

export const webMonitorService = {
  getMonitors: () => api.get<WebMonitor[]>('/api/webmonitors').then(res => res.data),
  getMonitor: (id: number) => api.get<WebMonitor>(`/api/webmonitors/${id}`).then(res => res.data),
  getHistory: (id: number, limit = 50) => api.get<WebCheck[]>(`/api/webmonitors/${id}/history?limit=${limit}`).then(res => res.data),
  createMonitor: (monitor: Partial<WebMonitor>) => api.post<WebMonitor>('/api/webmonitors', monitor).then(res => res.data),
  updateMonitor: (id: number, data: Partial<WebMonitor>) => api.put(`/api/webmonitors/${id}`, data).then(res => res.data),
  deleteMonitor: (id: number) => api.delete(`/api/webmonitors/${id}`),
  toggleMonitor: (id: number) => api.post<{ isActive: boolean }>(`/api/webmonitors/${id}/toggle`).then(res => res.data),
};

export default api;
