import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { fetchAdminAnalysisLogs } from '../api/adminAnalysisLogApi';
import { ANALYSIS_HISTORY_STATUSES } from '../utils/analysisHistory';
import '../styles/adminUsers.css';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-';

const statusLabel = (value) => ANALYSIS_HISTORY_STATUSES.find((item) => item.value === value)?.label || '검토 중';

const PAGE_SIZE = 20;

function AdminAnalysisLogsPage() {
  const { isAdmin, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isInitializing || !isAdmin) return;

    const loadLogs = async () => {
      try {
        setLogs(await fetchAdminAnalysisLogs());
      } catch (requestError) {
        setError(requestError.response?.data?.message || '분석 로그를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isAdmin, isInitializing]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return logs;
    return logs.filter((item) => (
      item.address?.toLowerCase().includes(normalizedQuery)
      || item.loginId?.toLowerCase().includes(normalizedQuery)
    ));
  }, [logs, query]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => (
    filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  ), [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (isInitializing) {
    return <Layout><div className="admin-users-state">권한을 확인하는 중...</div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="admin-users-state">
          <h1>접근 권한이 없습니다.</h1>
          <p>관리자 계정으로 로그인해야 전체 분석 로그를 볼 수 있습니다.</p>
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
            <h1>전체 분석 로그</h1>
            <p>모든 사용자가 실행한 후보지 분석 이력을 한눈에 확인합니다.</p>
          </div>
          <button type="button" className="admin-users-back" onClick={() => navigate('/mypage')}>마이페이지</button>
        </div>

        {error && <div className="admin-users-error" role="alert">{error}</div>}

        <div className="admin-log-toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="아이디 또는 주소로 검색"
            aria-label="분석 로그 검색"
          />
          <span>{filteredLogs.length}건</span>
        </div>

        {loading ? (
          <div className="admin-users-state">분석 로그를 불러오는 중...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="admin-users-state">
            <h1>표시할 분석 로그가 없습니다.</h1>
            <p>{logs.length === 0 ? '아직 아무도 후보지를 분석하지 않았습니다.' : '검색 조건에 맞는 로그가 없습니다.'}</p>
          </div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <caption className="sr-only">전체 사용자 분석 로그</caption>
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>주소</th>
                  <th>유형</th>
                  <th>등급</th>
                  <th>점수</th>
                  <th>분석 일시</th>
                  <th>상태</th>
                  <th>즐겨찾기</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((item) => (
                  <tr key={item.analysisId}>
                    <td data-label="사용자">{item.loginId || '(탈퇴한 사용자)'}</td>
                    <td data-label="주소">{item.address}</td>
                    <td data-label="유형">{item.siteType === 'BUILDING' ? '지붕/옥상' : '토지'}</td>
                    <td data-label="등급">{item.grade || '-'}</td>
                    <td data-label="점수">{item.totalScore ?? '-'}</td>
                    <td data-label="분석 일시">{formatDate(item.analyzedAt)}</td>
                    <td data-label="상태">{statusLabel(item.status)}</td>
                    <td data-label="즐겨찾기">{item.favorite ? '★' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredLogs.length > PAGE_SIZE && (
          <nav className="admin-log-pagination" aria-label="분석 로그 페이지 이동">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>이전</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>다음</button>
          </nav>
        )}
      </main>
    </Layout>
  );
}

export default AdminAnalysisLogsPage;
