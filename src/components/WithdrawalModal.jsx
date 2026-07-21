import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withdraw } from '../api/myPageApi';
import '../styles/AuthPage.css';

const WithdrawalModal = ({ provider, onClose }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await withdraw(provider === 'LOCAL' ? password : undefined);
      auth.clearLocalSession();
      navigate('/login', { state: { message: '회원탈퇴가 완료되었습니다.' } });
    } catch (err) {
      setError(err.response?.data?.message || '회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {provider === 'LOCAL' ? (
          <>
            <p>탈퇴하려면 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
            />
          </>
        ) : (
          <p>정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="auth-submit auth-submit-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="auth-submit"
            onClick={handleWithdraw}
            disabled={isSubmitting || (provider === 'LOCAL' && !password)}
          >
            탈퇴하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalModal;
