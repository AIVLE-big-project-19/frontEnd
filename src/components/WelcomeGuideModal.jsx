import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { consumeTopOverlay, getOverlayZIndex, registerOverlay, unregisterOverlay } from '../utils/overlayStack';
import '../styles/ChatBot.css';
import '../styles/WelcomeGuide.css';

const GUIDE_OPEN_EVENT = 'solar-aivle:open-guide';

const GUIDE_CONTENT = {
  '/analysis': {
    title: '유휴부지 분석 사용법',
    items: [
      { title: '지도 검색', desc: '주소를 검색하거나 지도에서 위치를 선택해 후보지를 확인하세요.' },
      { title: '유휴부지 검색', desc: '조건을 입력하면 AI가 분석한 적합도와 후보지 목록을 확인할 수 있습니다.' },
      { title: '대시보드로 보내기', desc: '후보지를 선택한 뒤 대시보드 분석 버튼을 누르면 통합 대시보드로 이동합니다.' },
    ],
  },
  '/dashboard': {
    title: '통합 대시보드 사용법',
    items: [
      { title: '후보지 조회', desc: '지역을 선택해 분석할 후보지를 조회하거나 유휴부지 분석에서 선택한 후보지를 확인하세요.' },
      { title: '유형별 필터', desc: '전체·토지·지붕/옥상 유형으로 후보지 목록을 필터링할 수 있습니다.' },
      { title: 'AI 분석 실행', desc: '후보지를 선택하고 AI 분석을 실행하면 상세 결과와 PDF 보고서를 확인할 수 있습니다.' },
    ],
  },
  '/analysis-history': {
    title: '분석 이력 관리 사용법',
    items: [
      { title: '자동 저장', desc: '통합 대시보드에서 AI 분석을 실행하면 결과가 자동으로 저장됩니다.' },
      { title: '필터·검색', desc: '즐겨찾기, 부지 유형, 검토 상태, 주소 검색으로 원하는 이력을 빠르게 찾을 수 있습니다.' },
      { title: '비교·관리', desc: '최대 3개의 후보지를 비교하고 상태 변경, PDF 다운로드, 삭제를 이용할 수 있습니다.' },
    ],
  },
};

export const GuideTrigger = ({ className = '' }) => {
  const { pathname } = useLocation();
  if (!GUIDE_CONTENT[pathname]) return null;

  return (
    <button
      type="button"
      className={`guide-trigger-btn ${className}`.trim()}
      aria-label="사용법 보기"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent(GUIDE_OPEN_EVENT, {
          detail: {
            left: Math.max(12, Math.min(rect.right + 12, window.innerWidth - 372)),
            top: Math.max(12, Math.min(rect.top, window.innerHeight - 520)),
          },
        }));
      }}
    >
      ?
    </button>
  );
};

const WelcomeGuideModal = () => {
  const { pathname } = useLocation();
  const guide = GUIDE_CONTENT[pathname];
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 24, top: 88 });
  const overlayIdRef = useRef(Symbol('welcome-guide'));
  const guideWindowRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    const handleOpen = (event) => {
      if (event.detail) setPosition(event.detail);
      setOpen((current) => !current);
    };
    window.addEventListener(GUIDE_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(GUIDE_OPEN_EVENT, handleOpen);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    registerOverlay(overlayIdRef.current);
    if (guideWindowRef.current) guideWindowRef.current.style.zIndex = String(getOverlayZIndex(overlayIdRef.current));
    const handleEscape = (event) => {
      if (event.key === 'Escape' && consumeTopOverlay(overlayIdRef.current)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      unregisterOverlay(overlayIdRef.current);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!guide || !open) return null;

  return (
    <div ref={guideWindowRef} className="welcome-guide-window chatbot-window" style={position} role="dialog" aria-labelledby="welcome-guide-title">
      <div className="chatbot-header">
        <span id="welcome-guide-title">{guide.title}</span>
        <button type="button" className="chatbot-close-btn" aria-label="닫기" onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="chatbot-messages welcome-guide-messages">
        {guide.items.map((item) => (
          <div key={item.title} className="chatbot-message bot welcome-guide-message">
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeGuideModal;
