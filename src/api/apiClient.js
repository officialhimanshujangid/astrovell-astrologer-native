import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URI = 'https://astrology-i7c9.onrender.com/'
const BASE_URL = `${BASE_URI}api`;
const SOCKET_BASE = 'https://astrology-i7c9.onrender.com';

export { SOCKET_BASE };
const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach astrologer auth token from AsyncStorage
API.interceptors.request.use(
  async (config) => {
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    try {
      const token = await AsyncStorage.getItem('astrologerToken');
      console.log(`[API REQUEST] Token found: ${!!token}`);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) { }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} FAILED:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    return Promise.reject(error);
  }
);

export default API;
