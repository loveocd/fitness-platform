import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('fitness_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && payload.code === 0) return payload.data;
    const message = payload?.message || '请求失败';
    ElMessage.error(message);
    return Promise.reject(new Error(message));
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '网络请求失败';
    if (status === 401) {
      localStorage.removeItem('fitness_token');
      localStorage.removeItem('fitness_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    } else {
      ElMessage.error(message);
    }
    return Promise.reject(error);
  }
);

export default request;
