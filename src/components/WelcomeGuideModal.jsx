import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/AuthPage.css';

const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5;

const GUIDE_CONTENT = {
  '/analysis': {
    title: '유휴부지 분석 사용법',
    items: [
      { title: '지역 탐색', desc: '주소를 검색하거나 지도를 움직여 원하는 지역을 찾아보세요.' },
      { title: '유휴부지 검색', desc: '키워드로 검색하면 AI가 분석한 적합도 등급(A/B/C)과 함께 후보지 목록이 나타납니다.' },
      { title: '대시보드로 보내기', desc: '관심 있는 후보지를 체크박스로 여러 개 선택한 뒤 "대시보드 분석" 버튼을 누르면 통합 대시보드로 바로 넘어갑니다.' },
    ],
  },
  '/dashboard': {
    title: '통합 대시보드 사용법',
    items: [
      { title: '후보지 조회', desc: '시/도·시/군/구를 선택해 후보지를 조회하거나, 유휴부지 분석에서 선택해 온 후보지를 바로 확인할 수 있습니다.' },
      { title: '유형별 필터링', desc: '전체·토지·지붕/옥상 탭으로 원하는 유형만 좁혀볼 수 있습니다.' },
      { title: 'AI 분석 실행', desc: '후보지를 선택하고 "AI 분석 실행"을 누르면 적합도·발전량·수익성 등 상세 분석 결과와 PDF 다운로드가 제공됩니다.' },
    ],
  },
  '/analysis-history': {
    title: '분석 이력 관리 사용법',
    items: [
      { title: '자동 저장', desc: '통합 대시보드에서 AI 분석을 실행하면 결과가 이곳에 자동으로 저장됩니다.' },
      { title: '필터·검색', desc: '즐겨찾기, 부지 유형, 검토 상태, 주소 검색으로 원하는 이력을 빠르게 찾을 수 있습니다.' },
      { title: '비교·관리', desc: '최대 3개까지 선택해 지표를 나란히 비교하고, 상태 변경·PDF 재다운로드·삭제도 가능합니다.' },
    ],
  },
};

const WelcomeGuideModal = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState(() => ({
    left: 24,
    top: window.innerHeight - BUTTON_SIZE - 24,
  }));
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const guide = GUIDE_CONTENT[pathname];

  if (!guide) return null;

  const handleClose = () => {
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
            <h2>{guide.title}</h2>
            <div className="terms-content">
              {guide.items.map((item) => (
                <p key={item.title}><strong>{item.title}</strong><br />{item.desc}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WelcomeGuideModal;
