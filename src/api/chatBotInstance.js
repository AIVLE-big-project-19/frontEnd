import axios from 'axios';
import { attachAuthHeader } from './axiosInstance';

// 챗봇은 Spring 백엔드(/api)가 아니라 별도 FastAPI 서버(chat_bot, 8003)에서 서비스된다.
// 그 서버는 토큰이 없거나 만료돼도 에러 없이 익명으로 동작하므로, axiosInstance처럼
// 401 발생 시 토큰을 재발급받고 재시도하는 로직은 필요 없다. 로그인 중이면 같은
// Authorization 헤더를 붙여서 로그인 사용자의 채팅 기록이 이어지게만 해준다.
const chatBotInstance = axios.create({ baseURL: '/chatbot-api' });

chatBotInstance.interceptors.request.use(attachAuthHeader);

export default chatBotInstance;
