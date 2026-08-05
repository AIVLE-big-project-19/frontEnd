import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { downloadAnalysisSnapshotReport, downloadDashboardCandidateReport } from '../api/dashboardApi';
import { deleteAnalysisHistory, fetchAnalysisHistory, updateAnalysisHistoryManagement } from '../api/analysisHistoryApi';
import { buildAnalysisReportViewModel } from '../utils/analysisReportModel';
import {
  ANALYSIS_HISTORY_STATUSES,
  loadAnalysisHistory,
  removeAnalysisHistoryEntry,
  updateAnalysisHistoryEntry,
} from '../utils/analysisHistory';
import '../styles/AnalysisHistory.css';

const formatNumber = (value, suffix = '') => (
  value == null || !Number.isFinite(Number(value))
    ? '-'
    : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`
);

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-';

const statusLabel = (value) => ANALYSIS_HISTORY_STATUSES.find((item) => item.value === value)?.label || '검토 중';

function AnalysisHistoryPage() {
  const navigate = useNavigate();
  const { loginId } = useAuth();
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [compareIds, setCompareIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAnalysisHistory()
      .then((remoteHistory) => {
        if (!active) return;
        setHistory(remoteHistory.map((item) => ({
          ...item,
          siteType: item.siteType === 'BUILDING' ? 'ROOF' : item.siteType,
          suitabilityScore: item.analysis?.suitabilityScore ?? null,
          grade: item.analysis?.grade ?? null,
        })));
      })
      .catch(() => {
        if (active) setHistory(loadAnalysisHistory(loginId));
      });
    return () => { active = false; };
  }, [loginId]);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return history.filter((item) => {
      const matchesFavorite = filter !== 'FAVORITES' || item.favorite;
      const matchesType = typeFilter === 'ALL' || item.siteType === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesQuery = !normalizedQuery || item.address.toLowerCase().includes(normalizedQuery);
      return matchesFavorite && matchesType && matchesStatus && matchesQuery;
    });
  }, [filter, history, query, statusFilter, typeFilter]);

  const compareItems = useMemo(() => compareIds
    .map((id) => history.find((item) => String(item.candidateId) === String(id)))
    .filter(Boolean)
    .sort((left, right) => (
      (Number(right.suitabilityScore) || 0) - (Number(left.suitabilityScore) || 0)
    )), [compareIds, history]);

  const updateEntry = (candidateId, updates) => {
    const next = updateAnalysisHistoryEntry(loginId, candidateId, updates);
    const remoteItem = history.find((item) => String(item.candidateId) === String(candidateId));
    if (remoteItem?.analysisId) {
      setHistory((current) => current.map((item) => (
        String(item.analysisId) === String(remoteItem.analysisId) ? { ...item, ...updates } : item
      )));
      updateAnalysisHistoryManagement(remoteItem.analysisId, {
        favorite: updates.favorite ?? remoteItem.favorite ?? false,
        status: updates.status ?? remoteItem.status ?? 'REVIEWING',
      }).catch(() => window.alert('분석 이력 변경에 실패했습니다.'));
    } else {
      setHistory(next);
    }
  };

  const toggleCompare = (candidateId) => {
    setCompareIds((current) => {
      if (current.includes(candidateId)) return current.filter((id) => id !== candidateId);
      if (current.length >= 3) return current;
      return [...current, candidateId];
    });
  };

  const deleteEntry = (candidateId) => {
    if (!window.confirm('이 분석 이력을 삭제하시겠습니까?')) return;
    const remoteItem = history.find((item) => String(item.candidateId) === String(candidateId));
    if (remoteItem?.analysisId) {
      setHistory((current) => current.filter((item) => item.analysisId !== remoteItem.analysisId));
    } else {
      setHistory(removeAnalysisHistoryEntry(loginId, candidateId));
    }
    setCompareIds((current) => current.filter((id) => id !== candidateId));
    if (remoteItem?.analysisId) {
      deleteAnalysisHistory(remoteItem.analysisId).catch(() => window.alert('분석 이력 삭제에 실패했습니다.'));
    }
  };

  const downloadReport = async (item) => {
    setDownloadingId(item.candidateId);
    try {
      const blob = item.analysisId
        ? await downloadAnalysisSnapshotReport(item.analysisId)
        : await downloadDashboardCandidateReport(item.candidateId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SolarAivle_${item.sourceId || item.candidateId}_Report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('보고서를 다시 다운로드하지 못했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Layout>
      <section className="analysis-history-page">
        <div className="analysis-history-hero">
          <div>
            <p className="analysis-history-eyebrow">SOLAR AIVLE · ANALYSIS ARCHIVE</p>
            <h1>분석 이력 관리</h1>
            <p>분석한 후보지를 저장하고 검토 상태와 비교 결과를 관리하세요.</p>
          </div>
          <div className="analysis-history-count"><strong>{history.length}</strong><span>저장된 분석</span></div>
        </div>

        <div className="analysis-history-toolbar">
          <div className="history-tabs" role="tablist" aria-label="분석 이력 필터">
            <button type="button" className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>전체</button>
            <button type="button" className={filter === 'FAVORITES' ? 'active' : ''} onClick={() => setFilter('FAVORITES')}>즐겨찾기</button>
          </div>
          <div className="history-type-tabs" role="tablist" aria-label="부지 유형 필터">
            <button type="button" className={typeFilter === 'ALL' ? 'active' : ''} onClick={() => setTypeFilter('ALL')}>전체 유형</button>
            <button type="button" className={typeFilter === 'LAND' ? 'active' : ''} onClick={() => setTypeFilter('LAND')}>토지</button>
            <button type="button" className={typeFilter === 'ROOF' ? 'active' : ''} onClick={() => setTypeFilter('ROOF')}>지붕/옥상</button>
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="검토 상태 필터">
            <option value="ALL">모든 상태</option>
            {ANALYSIS_HISTORY_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주소로 검색" aria-label="분석 이력 검색" />
        </div>

        {compareItems.length > 0 && (
          <section className="history-compare" aria-labelledby="history-compare-title">
            <div className="history-section-heading">
              <div><span>선택 비교</span><h2 id="history-compare-title">과거 분석 결과 비교</h2></div>
              <button type="button" className="history-text-button" onClick={() => setCompareIds([])}>선택 해제</button>
            </div>
            {compareItems.length < 2 ? (
              <p className="history-compare-hint">비교할 후보지를 한 곳 더 선택하세요. 최대 3곳까지 비교할 수 있습니다.</p>
            ) : (
              <div className="history-compare-table-wrap">
                <table className="history-compare-table">
                  <thead><tr><th>지표</th>{compareItems.map((item, index) => <th key={item.candidateId}><span className="history-compare-rank">{index + 1}위</span>{item.address}</th>)}</tr></thead>
                  <tbody>
                    <tr><th>적합도</th>{compareItems.map((item) => <td key={item.candidateId}>{formatNumber(item.suitabilityScore, '점')}</td>)}</tr>
                    <tr><th>설치 유형</th>{compareItems.map((item) => <td key={item.candidateId}>{item.siteType === 'ROOF' ? '지붕/옥상' : '토지'}</td>)}</tr>
                    <tr><th>예상 발전량</th>{compareItems.map((item) => <td key={item.candidateId}>{formatNumber(buildAnalysisReportViewModel({ analysis: item.analysis }).economics.annualGenerationKwh, ' kWh')}</td>)}</tr>
                    <tr><th>연간 예상 수익</th>{compareItems.map((item) => <td key={item.candidateId}>{formatNumber(buildAnalysisReportViewModel({ analysis: item.analysis }).economics.annualRevenue, '원')}</td>)}</tr>
                    <tr><th>회수 기간</th>{compareItems.map((item) => <td key={item.candidateId}>{formatNumber(buildAnalysisReportViewModel({ analysis: item.analysis }).economics.paybackYears, '년')}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="history-list-heading"><h2>저장된 후보지</h2><span>{filteredHistory.length}건</span></div>
        {filteredHistory.length === 0 ? (
          <div className="history-empty">
            <strong>{history.length === 0 ? '아직 저장된 분석 이력이 없습니다.' : '조건에 맞는 분석 이력이 없습니다.'}</strong>
            <p>통합 대시보드에서 후보지를 분석하면 이곳에 자동으로 저장됩니다.</p>
            <button type="button" className="history-primary-button" onClick={() => navigate('/dashboard')}>통합 대시보드로 이동</button>
          </div>
        ) : (
          <div className="history-list">
            {filteredHistory.map((item) => {
              const report = buildAnalysisReportViewModel({ analysis: item.analysis });
              return (
                <article className={`history-card${item.favorite ? ' is-favorite' : ''}`} key={item.candidateId}>
                  <div className="history-card-main">
                    <div className="history-card-topline">
                      <span className={`history-site-type ${item.siteType === 'ROOF' ? 'roof' : 'land'}`}>{item.siteType === 'ROOF' ? '지붕/옥상' : '토지'}</span>
                      <span className="history-date">분석일 {formatDate(item.analyzedAt)}</span>
                    </div>
                    <h3>{item.address}</h3>
                    <div className="history-metrics">
                      <div><span>적합도</span><strong>{formatNumber(item.suitabilityScore, '점')}</strong></div>
                      <div><span>예상 발전량</span><strong>{formatNumber(report.economics.annualGenerationKwh, ' kWh')}</strong></div>
                      <div><span>회수 기간</span><strong>{formatNumber(report.economics.paybackYears, '년')}</strong></div>
                    </div>
                  </div>
                  <div className="history-card-actions">
                    <button type="button" className={`history-favorite-button${item.favorite ? ' active' : ''}`} onClick={() => updateEntry(item.candidateId, { favorite: !item.favorite })} aria-label={item.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}>{item.favorite ? '★' : '☆'}</button>
                    <label className="history-status-select"><span>상태</span><select value={item.status} onChange={(event) => updateEntry(item.candidateId, { status: event.target.value })}>{ANALYSIS_HISTORY_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                    <div className="history-buttons">
                      <button type="button" onClick={() => toggleCompare(item.candidateId)} className={compareIds.includes(item.candidateId) ? 'selected' : ''}>{compareIds.includes(item.candidateId) ? '비교 선택됨' : '비교 선택'}</button>
                      <button type="button" onClick={() => downloadReport(item)} disabled={downloadingId === item.candidateId}>{downloadingId === item.candidateId ? '생성 중...' : 'PDF 다운로드'}</button>
                      <button type="button" className="danger" onClick={() => deleteEntry(item.candidateId)}>삭제</button>
                    </div>
                    <small className={`history-status status-${item.status}`}>{statusLabel(item.status)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default AnalysisHistoryPage;
