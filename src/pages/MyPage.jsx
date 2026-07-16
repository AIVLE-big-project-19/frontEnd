import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { changeMyPassword, getMyBoards, getMyProfile, updateMyProfile } from '../api/myPageApi';
import '../styles/MyPage.css';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;

const getErrorMessage = (error, fallback) => {
  const response = error.response?.data;
  if (response?.data && typeof response.data === 'object') {
    return Object.values(response.data)[0] || response.message || fallback;
  }
  return response?.message || fallback;
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
  : '-';

function MyPage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [boards, setBoards] = useState([]);
  const [name, setName] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadMyPage = async () => {
      try {
        const [profileData, boardData] = await Promise.all([getMyProfile(), getMyBoards()]);
        setProfile(profileData);
        setName(profileData.name);
        setBoards(boardData);
      } catch (error) {
        setMessage({ type: 'error', text: getErrorMessage(error, '마이페이지를 불러오지 못했습니다.') });
      } finally {
        setLoading(false);
      }
    };
    loadMyPage();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: '이름을 입력해주세요.' });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(name.trim());
      setProfile(updated);
      setName(updated.name);
      setMessage({ type: 'success', text: '회원 정보가 수정되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, '회원 정보 수정에 실패했습니다.') });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!passwordPattern.test(passwords.next)) {
      setMessage({ type: 'error', text: '새 비밀번호는 8~16자의 영문, 숫자, 특수문자를 모두 포함해야 합니다.' });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setMessage({ type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다.' });
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword(passwords.current, passwords.next);
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해주세요.' });
      setPasswords({ current: '', next: '', confirm: '' });
      setTimeout(() => logout(), 1200);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, '비밀번호 변경에 실패했습니다.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mypage">
        <div className="mypage-heading">
          <div>
            <span className="mypage-eyebrow">MY PAGE</span>
            <h1>마이페이지</h1>
            <p>내 정보와 활동 내역을 확인하세요.</p>
          </div>
          {profile && <div className="mypage-avatar" aria-hidden="true">{profile.name?.slice(0, 1)}</div>}
        </div>

        {message.text && <div className={`mypage-message ${message.type}`} role="alert">{message.text}</div>}

        {loading ? (
          <div className="mypage-state">내 정보를 불러오는 중...</div>
        ) : profile && (
          <div className="mypage-grid">
            <section className="mypage-card">
              <div className="mypage-card-title"><h2>기본 정보</h2><span>가입일 {formatDate(profile.createdAt)}</span></div>
              <form onSubmit={saveProfile}>
                <label>아이디<input value={profile.loginId || '-'} readOnly /></label>
                <label>이메일<input value={profile.email} readOnly /></label>
                <label>이름<input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></label>
                <button className="mypage-primary" disabled={saving || name.trim() === profile.name}>정보 저장</button>
              </form>
            </section>

            <section className="mypage-card">
              <div className="mypage-card-title"><h2>비밀번호 변경</h2><span>로컬 계정 전용</span></div>
              {profile.provider === 'LOCAL' ? (
                <form onSubmit={savePassword}>
                  <label>현재 비밀번호<input type="password" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /></label>
                  <label>새 비밀번호<input type="password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} /></label>
                  <label>새 비밀번호 확인<input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></label>
                  <p className="mypage-hint">8~16자, 영문·숫자·특수문자 포함</p>
                  <button className="mypage-primary" disabled={saving || !passwords.current || !passwords.next || !passwords.confirm}>비밀번호 변경</button>
                </form>
              ) : <div className="mypage-state">소셜 계정은 연결된 서비스에서 비밀번호를 변경해주세요.</div>}
            </section>

            <section className="mypage-card mypage-activity">
              <div className="mypage-card-title"><h2>내가 쓴 글</h2><span>총 {boards.length}개</span></div>
              {boards.length === 0 ? <div className="mypage-state">작성한 게시글이 없습니다.</div> : (
                <div className="mypage-board-list">
                  {boards.map((board) => (
                    <Link key={board.boardId} to={`/boards/${board.boardId}`}>
                      <span className="mypage-board-category">{board.category}</span>
                      <strong>{board.title}</strong>
                      <span>{formatDate(board.createdAt)} · 조회 {board.viewCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default MyPage;
