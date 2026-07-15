import { useNavigate } from 'react-router-dom';
import { clearSession } from '../auth/tokenStorage';

const PasswordResetSuccessModal = ({ loginId }) => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    clearSession();
    navigate('/login', { state: { loginId } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <p>비밀번호 변경이 완료되었습니다.</p>
        <button type="button" className="auth-submit" onClick={handleLoginClick}>
          로그인
        </button>
      </div>
    </div>
  );
};

export default PasswordResetSuccessModal;
