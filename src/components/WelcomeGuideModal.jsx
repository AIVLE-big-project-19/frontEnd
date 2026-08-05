import { useState } from 'react';
import '../styles/AuthPage.css';

const SEEN_KEY = 'welcome-guide-seen';

const WelcomeGuideModal = () => {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY));

  const handleClose = () => {
    localStorage.setItem(SEEN_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
        <h2>SolarAivle 사용 가이드</h2>
        <div className="terms-content">
          <p><strong>유휴부지 분석</strong><br />주소나 지도를 통해 유휴부지를 검색하면 AI가 태양광 설치 적합도와 예상 발전량을 분석해드립니다.</p>
          <p><strong>통합 대시보드</strong><br />분석한 후보지들의 적합도, 예상 수익성, 회수 기간 등을 한눈에 비교할 수 있습니다.</p>
          <p><strong>분석 이력 관리</strong><br />저장한 후보지를 다시 조회하거나 분석 리포트를 PDF로 다운로드할 수 있습니다.</p>
          <p><strong>커뮤니티</strong><br />공지사항·FAQ를 확인하거나, 1:1문의로 궁금한 점을 남기면 이메일로 답변 알림을 받아보실 수 있습니다.</p>
        </div>
        <button type="button" className="auth-submit" onClick={handleClose}>
          확인했어요
        </button>
      </div>
    </div>
  );
};

export default WelcomeGuideModal;
