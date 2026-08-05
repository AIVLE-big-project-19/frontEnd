import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/AuthPage.css';

const HIDE_UNTIL_KEY = 'welcome-guide-hide-date';
const VISIBLE_PATHS = ['/analysis', '/dashboard', '/analysis-history'];
const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5;

const todayKey = () => new Date().toDateString();

const shouldAutoShow = () => localStorage.getItem(HIDE_UNTIL_KEY) !== todayKey();

const WelcomeGuideModal = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(shouldAutoShow);
  const [position, setPosition] = useState(() => ({
    left: 24,
    top: window.innerHeight - BUTTON_SIZE - 24,
  }));
  const dragRef = useRef(null);
  const draggedRef = useRef(false);

  if (!VISIBLE_PATHS.includes(pathname)) return null;

  const handleClose = () => {
    setOpen(false);
  };

  const handleHideToday = () => {
    localStorage.setItem(HIDE_UNTIL_KEY, todayKey());
    setOpen(false);
  };

  const handlePointerDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origLeft: position.left, origTop: position.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      draggedRef.current = true;
    }
    const maxLeft = window.innerWidth - BUTTON_SIZE;
    const maxTop = window.innerHeight - BUTTON_SIZE;
    setPosition({
      left: Math.min(Math.max(dragRef.current.origLeft + dx, 0), maxLeft),
      top: Math.min(Math.max(dragRef.current.origTop + dy, 0), maxTop),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleToggle = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        type="button"
        aria-label="사용법 보기"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleToggle}
        style={{
          position: 'fixed',
          left: position.left,
          top: position.top,
          zIndex: 999,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          border: 'none',
          background: '#14b8a6',
          color: '#fff',
          fontSize: 24,
          cursor: 'grab',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        📢
      </button>

      {open && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="닫기"
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                color: '#667085',
              }}
            >
              ×
            </button>
            <h2>SolarAivle 사용 가이드</h2>
            <div className="terms-content">
              <p><strong>유휴부지 분석</strong><br />주소나 지도를 통해 유휴부지를 검색하면 AI가 태양광 설치 적합도와 예상 발전량을 분석해드립니다.</p>
              <p><strong>통합 대시보드</strong><br />분석한 후보지들의 적합도, 예상 수익성, 회수 기간 등을 한눈에 비교할 수 있습니다.</p>
              <p><strong>분석 이력 관리</strong><br />저장한 후보지를 다시 조회하거나 분석 리포트를 PDF로 다운로드할 수 있습니다.</p>
              <p><strong>커뮤니티</strong><br />공지사항·FAQ를 확인하거나, 1:1문의로 궁금한 점을 남기면 이메일로 답변 알림을 받아보실 수 있습니다.</p>
            </div>
            <button type="button" className="auth-submit auth-submit-secondary" onClick={handleHideToday}>
              오늘 하루 안 보기
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WelcomeGuideModal;
