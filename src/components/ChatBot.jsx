import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage, sendChatExcel } from '../api/chatApi';
import '../styles/ChatBot.css';

const ChatBot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '안녕하세요! 후보지 조회 추천을 해드릴게요!\n 채팅을 입력하거나 제공된 excel 파일을 업로드 해주시면 답변 드리겠습니다!' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const applyBotResponse = (data) => {
    const reply = data?.data?.reply ?? '죄송해요, 답변을 가져오지 못했어요.';
    const action = data?.data?.action;

    setMessages((prev) => [...prev, { role: 'bot', text: reply }]);

    if (action?.type === 'NAVIGATE' && action.path) {
      setTimeout(() => {
        navigate(action.path);
        setIsOpen(false);
      }, 600);
    }
  };

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
      applyBotResponse(data);
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

  const handleExcelButtonClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const handleExcelChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: `[엑셀 업로드] ${file.name}` }]);
    setIsLoading(true);

    try {
      const data = await sendChatExcel(file);
      applyBotResponse(data);
    } catch (error) {
      console.error('엑셀 분석 실패:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: '엑셀 파일을 분석하지 못했어요. 형식을 확인하고 다시 시도해주세요.' },
      ]);
    } finally {
      setIsLoading(false);
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
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleExcelChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="chatbot-excel-btn"
              onClick={handleExcelButtonClick}
              disabled={isLoading}
              title="엑셀 파일 업로드"
            >
              엑셀
            </button>
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
