import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, sendChatPdf } from '../api/chatApi';
import { consumeTopOverlay, getOverlayZIndex, registerOverlay, unregisterOverlay } from '../utils/overlayStack';
import '../styles/ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '안녕하세요! 후보지 조회 추천을 해드릴게요!\n PDF 보고서를 한 번 첨부해두시면, 이후에는 그냥 채팅으로 편하게 질문하실 수 있어요!' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportName, setReportName] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const overlayIdRef = useRef(Symbol('chatbot'));
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    registerOverlay(overlayIdRef.current);
    if (rootRef.current) rootRef.current.style.zIndex = String(getOverlayZIndex(overlayIdRef.current));
    const handleEscape = (event) => {
      if (event.key === 'Escape' && consumeTopOverlay(overlayIdRef.current)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      unregisterOverlay(overlayIdRef.current);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const applyBotResponse = (data) => {
    const reply = data?.data?.reply ?? '죄송해요, 답변을 가져오지 못했어요.';
    setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
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
      const data = await sendChatMessage(text, reportContext);
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

  const handlePdfButtonClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || isLoading) return;

    const question = input.trim() || '이 보고서를 분석해서 요약해줘.';
    setMessages((prev) => [...prev, { role: 'user', text: `[PDF 첨부: ${file.name}] ${question}` }]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await sendChatPdf(file, question);
      const context = data?.data?.report_context ?? null;
      setReportContext(context);
      setReportName(context ? file.name : null);
      applyBotResponse(data);
    } catch (error) {
      console.error('PDF 분석 실패:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'PDF 보고서를 분석하지 못했어요. 형식을 확인하고 다시 시도해주세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="chatbot-root">
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

          {reportName && (
            <div className="chatbot-report-indicator">
              [{reportName}] 
              <br/>보고서를 참고해서 답변하고 있어요.
            </div>
          )}

          <div className="chatbot-input-area">
            <input
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handlePdfChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="chatbot-pdf-btn"
              onClick={handlePdfButtonClick}
              disabled={isLoading}
              title={reportName ? '다른 PDF 보고서로 교체' : 'PDF 보고서 첨부'}
            >
              PDF
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
