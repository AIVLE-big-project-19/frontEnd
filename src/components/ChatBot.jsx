import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage } from '../api/chatApi';
import '../styles/ChatBot.css';

const ChatBot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(text);
      const reply = data?.data?.reply ?? '죄송해요, 답변을 가져오지 못했어요.';
      const action = data?.data?.action;

      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);

      if (action?.type === 'NAVIGATE' && action.path) {
        setTimeout(() => {
          navigate(action.path);
          setIsOpen(false);
        }, 600);
      }
    } catch (error) {
      console.error('챗봇 응답 실패:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chatbot-root">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>SolarAivle 챗봇</span>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message bot chatbot-typing">입력 중...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading}>
              전송
            </button>
          </div>
        </div>
      )}

      <button className="chatbot-toggle-btn" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? '×' : '챗봇'}
      </button>
    </div>
  );
};

export default ChatBot;
