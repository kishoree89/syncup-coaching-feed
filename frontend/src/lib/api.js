// Axios instance pointed at the Express API.
// Centralized so every page/component uses the same baseURL.
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10_000,
});

export default api;
