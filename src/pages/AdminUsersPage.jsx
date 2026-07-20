import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { changeUserRole, getAdminUsers } from '../api/adminApi';
import '../styles/adminUsers.css';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
  : '-';

function AdminUsersPage() {
  const { isAdmin, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (isInitializing || !isAdmin) return;

    const loadUsers = async () => {
      try {
        setUsers(await getAdminUsers());
      } catch (requestError) {
        setError(requestError.response?.data?.message || '회원 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdmin, isInitializing]);

  const handleRoleChange = async (user, role) => {
    if (role === user.role) return;
    if (!window.confirm(`${user.loginId}님의 권한을 ${role}로 변경하시겠습니까?`)) return;

    setSavingId(user.id);
    setError('');
    try {
      const updated = await changeUserRole(user.id, role);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError.response?.data?.message || '권한 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  if (isInitializing) {
    return <Layout><div className="admin-users-state">권한을 확인하는 중...</div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="admin-users-state">
          <h1>접근 권한이 없습니다.</h1>
          <p>관리자 계정으로 로그인해야 회원 권한을 관리할 수 있습니다.</p>
          <button type="button" onClick={() => navigate('/')}>홈으로</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="admin-users-page">
        <div className="admin-users-heading">
          <div>
            <span>ADMINISTRATION</span>
            <h1>회원 권한 관리</h1>
            <p>전체 회원의 게시판 권한을 관리합니다.</p>
          </div>
          <button type="button" className="admin-users-back" onClick={() => navigate('/mypage')}>마이페이지</button>
        </div>

        {error && <div className="admin-users-error" role="alert">{error}</div>}

        {loading ? (
          <div className="admin-users-state">회원 목록을 불러오는 중...</div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <caption className="sr-only">회원별 관리자 권한 목록</caption>
              <thead>
                <tr><th>아이디</th><th>이름</th><th>이메일</th><th>가입일</th><th>권한</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="아이디">{user.loginId || '(소셜 계정)'}</td>
                    <td data-label="이름">{user.name}</td>
                    <td data-label="이메일">{user.email}</td>
                    <td data-label="가입일">{formatDate(user.createdAt)}</td>
                    <td data-label="권한">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        aria-label={`${user.loginId || user.email} 권한`}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                      >
                        <option value="USER">일반 사용자</option>
                        <option value="ADMIN">관리자</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default AdminUsersPage;
