import { defineStore } from 'pinia';
import request from '../api/request';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('fitness_user') || 'null');
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('fitness_token') || '',
    user: readUser()
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    role: (state) => state.user?.role || '',
    displayName: (state) => state.user?.nickname || state.user?.username || '用户',
    provider: (state) => state.user?.provider || null
  },
  actions: {
    saveSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('fitness_token', token);
      localStorage.setItem('fitness_user', JSON.stringify(user));
    },
    async login(payload) {
      const data = await request.post('/auth/login', payload);
      this.saveSession(data.token, data.user);
      return data.user;
    },
    async register(payload) {
      return request.post('/auth/register', payload);
    },
    async fetchMe() {
      const user = await request.get('/auth/me');
      this.user = user;
      localStorage.setItem('fitness_user', JSON.stringify(user));
      return user;
    },
    updateLocalUser(patch) {
      this.user = { ...this.user, ...patch };
      localStorage.setItem('fitness_user', JSON.stringify(this.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('fitness_token');
      localStorage.removeItem('fitness_user');
    }
  }
});

export function homePathForRole(role) {
  if (role === 'provider') return '/provider/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/user/home';
}
