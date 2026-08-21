import axios from 'axios';
import { attachAuthHeader } from './axiosInstance';

const chatBotInstance = axios.create({
  baseURL: import.meta.env.VITE_CHATBOT_BASE_URL || 'http://localhost:8010',
});

chatBotInstance.interceptors.request.use(attachAuthHeader);

export default chatBotInstance;
