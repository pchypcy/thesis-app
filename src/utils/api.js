// utils/api.js — HTTP client (axios) ported to RN
//   - token เก็บใน storage (sync mirror) แทน localStorage
//   - 401 → เด้งไป Login ผ่าน navRef (แทน window.location.href)
//   - คง interceptor ทั้ง instance `api` และ global axios เหมือนเดิม

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { storage } from './storage';
import { navigate, getCurrentRouteName } from '../navigation/navRef';

const TOKEN_KEY = 'ingreen_token';

export function getToken() {
    return storage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) storage.setItem(TOKEN_KEY, token);
    else storage.removeItem(TOKEN_KEY);
}

export function clearAuth() {
    setToken(null);
    storage.removeItem('username');
    storage.removeItem('persona');
}

function attachInterceptors(instance) {
    instance.interceptors.request.use((config) => {
        const t = getToken();
        if (t) config.headers.Authorization = `Bearer ${t}`;
        if (!config.headers['ngrok-skip-browser-warning']) {
            config.headers['ngrok-skip-browser-warning'] = 'true';
        }
        return config;
    });

    instance.interceptors.response.use(
        (res) => res,
        (err) => {
            if (err.response?.status === 401) {
                clearAuth();
                const cur = getCurrentRouteName();
                if (cur !== 'Login' && cur !== 'Quiz') navigate('Login');
            }
            return Promise.reject(err);
        }
    );
}

export const api = axios.create({
    baseURL: API_BASE_URL,
    // 30s: เผื่อ cold start ของ Render free tier (เครื่องตื่นช้าหลังหลับ)
    timeout: 30000,
    headers: { 'ngrok-skip-browser-warning': 'true' },
});

attachInterceptors(api);
attachInterceptors(axios);

export default api;
