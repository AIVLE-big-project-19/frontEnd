import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatBot from '../components/ChatBot';
import { downloadAnalysisSnapshotReport, downloadDashboardCandidateReport } from '../api/dashboardApi';
import {
  deleteAllAnalysisHistory,
  deleteAnalysisHistory,
  deleteSelectedAnalysisHistory,
  fetchAnalysisHistory,
  updateAnalysisHistoryManagement,
} from '../api/analysisHistoryApi';
import { buildAnalysisReportViewModel } from '../utils/analysisReportModel';
import { GuideTrigger } from '../components/WelcomeGuideModal';
import { ANALYSIS_HISTORY_STATUSES } from '../utils/analysisHistory';
import '../styles/AnalysisHistory.css';

const formatNumber = (value, suffix = '') => (
  value == null || !Number.isFinite(Number(value))
    ? '-'
    : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`
);

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-';
const PAGE_SIZE = 10;
const historyEntryKey = (item) => String(item.analysisId ?? item.id ?? `candidate-${item.candidateId}`);
const getReport = (item) => buildAnalysisReportViewModel({ analysis: item.analysis });

const statusLabel = (value) => ANALYSIS_HISTORY_STATUSES.find((item) => item.value === value)?.label || '검토 중';

function AnalysisHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [compareIds, setCompareIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchAnalysisHistory()
      .then((remoteHistory) => {
        if (!active) return;
        const normalizedHistory = remoteHistory.map((item) => ({
          ...item,
          siteType: item.siteType === 'BUILDING' ? 'ROOF' : item.siteType,
          suitabilityScore: item.analysis?.suitabilityScore ?? null,
          grade: item.analysis?.grade ?? null,
        }));
        const uniqueHistory = Array.from(
          new Map(normalizedHistory.map((item) => [historyEntryKey(item), item])).values(),
        );
        setHistory(uniqueHistory);
      })
      .catch(() => {
        if (active) setHistory([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = useMemo(() => (
    filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  ), [currentPage, filteredHistory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, typeFilter, statusFilter, query]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => (
      history.some((item) => historyEntryKey(item) === id)
    )));
  }, [history]);

  const compareItems = useMemo(() => compareIds
    .map((id) => history.find((item) => historyEntryKey(item) === String(id)))
    .filter(Boolean)
    .sort((left, right) => (
      (Number(right.suitabilityScore) || 0) - (Number(left.suitabilityScore) || 0)
    )), [compareIds, history]);

  const comparisonRows = useMemo(() => [
    { label: '적합도', value: (item) => formatNumber(item.suitabilityScore, '점') },
    { label: '설치 유형', value: (item) => (item.siteType === 'ROOF' ? '지붕/옥상' : '토지') },
    { label: '예상 발전량', value: (item) => formatNumber(getReport(item).economics.annualGenerationKwh, ' kWh') },
    { label: '연간 예상 수익', value: (item) => formatNumber(getReport(item).economics.annualRevenue, '원') },
    { label: '회수 기간', value: (item) => formatNumber(getReport(item).economics.paybackYears, '년') },
  ], []);

  const removeFromSelections = (entryKeys) => {
    const keys = new Set(entryKeys);
    setCompareIds((current) => current.filter((id) => !keys.has(id)));
    setSelectedIds((current) => current.filter((id) => !keys.has(id)));
  };

  const updateEntry = (item, updates) => {
    const entryKey = historyEntryKey(item);
    setHistory((current) => current.map((historyItem) => (
      historyEntryKey(historyItem) === entryKey ? { ...historyItem, ...updates } : historyItem
    )));
    updateAnalysisHistoryManagement(item.analysisId, {
      favorite: updates.favorite ?? item.favorite ?? false,
      status: updates.status ?? item.status ?? 'REVIEWING',
    }).catch(() => window.alert('분석 이력 변경에 실패했습니다.'));
  };

  const toggleCompare = (item) => {
    const entryKey = historyEntryKey(item);
    setCompareIds((current) => {
      if (current.includes(entryKey)) return current.filter((id) => id !== entryKey);
      if (current.length >= 3) return current;
      return [...current, entryKey];
    });
  };

  const deleteEntry = (item) => {
    if (!window.confirm('이 분석 이력을 삭제하시겠습니까?')) return;
    const entryKey = historyEntryKey(item);
    setHistory((current) => current.filter((historyItem) => historyEntryKey(historyItem) !== entryKey));
    removeFromSelections([entryKey]);
    deleteAnalysisHistory(item.analysisId).catch(() => window.alert('분석 이력 삭제에 실패했습니다.'));
  };

  const toggleSelection = (item) => {
    const entryKey = historyEntryKey(item);
    setSelectedIds((current) => (
      current.includes(entryKey)
        ? current.filter((id) => id !== entryKey)
        : [...current, entryKey]
    ));
  };

  const toggleAllFilteredSelection = () => {
    const filteredIds = filteredHistory.map(historyEntryKey);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => (
      allSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : Array.from(new Set([...current, ...filteredIds]))
    ));
  };

  const deleteSelectedEntries = () => {
    const itemsToDelete = history.filter((item) => selectedIds.includes(historyEntryKey(item)));
    if (itemsToDelete.length === 0) return;
    if (!window.confirm(`선택한 분석 이력 ${itemsToDelete.length}개를 삭제하시겠습니까?`)) return;

    const entryKeys = itemsToDelete.map(historyEntryKey);
    const selectedKeySet = new Set(entryKeys);
    setHistory((current) => current.filter((item) => !selectedKeySet.has(historyEntryKey(item))));
    removeFromSelections(entryKeys);
    deleteSelectedAnalysisHistory(itemsToDelete.map((item) => item.analysisId))
      .catch(() => window.alert('선택한 분석 이력 삭제에 실패했습니다.'));
  };

  const deleteAllEntries = () => {
    if (history.length === 0) return;
    if (!window.confirm(`저장된 분석 이력 ${history.length}개를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    setHistory([]);
    removeFromSelections(history.map(historyEntryKey));
    setCurrentPage(1);
    deleteAllAnalysisHistory()
      .catch(() => window.alert('분석 이력 전체 삭제에 실패했습니다.'));
  };

  const downloadReport = async (item) => {
    setDownloadingId(historyEntryKey(item));
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
            <div className="guide-title-row"><h1>분석 이력 관리</h1><GuideTrigger /></div>
            <p>분석한 후보지를 저장하고 검토 상태와 비교 결과를 관리하세요.</p>
          </div>
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
                  <thead><tr><th>지표</th>{compareItems.map((item, index) => <th key={historyEntryKey(item)}><span className="history-compare-rank">{index + 1}위</span>{item.address}</th>)}</tr></thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label}>
                        <th>{row.label}</th>
                        {compareItems.map((item) => <td key={historyEntryKey(item)}>{row.value(item)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="history-list-heading">
          <div className="history-list-title"><h2>저장된 후보지</h2><span>{filteredHistory.length}건</span></div>
          {history.length > 0 && (
            <div className="history-bulk-actions">
              <label className="history-select-all">
                <input
                  type="checkbox"
                  checked={filteredHistory.length > 0 && filteredHistory.every((item) => selectedIds.includes(historyEntryKey(item)))}
                  onChange={toggleAllFilteredSelection}
                />
                전체 선택
              </label>
              <button type="button" onClick={deleteSelectedEntries} disabled={selectedIds.length === 0}>
                선택 삭제{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
              <button type="button" className="danger" onClick={deleteAllEntries}>전체 삭제</button>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="history-empty">
            <span className="history-loading-spinner" aria-hidden="true" />
            <strong>저장된 후보지를 불러오는 중입니다...</strong>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="history-empty">
            <strong>{history.length === 0 ? '아직 저장된 분석 이력이 없습니다.' : '조건에 맞는 분석 이력이 없습니다.'}</strong>
            <p>통합 대시보드에서 후보지를 분석하면 이곳에 자동으로 저장됩니다.</p>
            <button type="button" className="history-primary-button" onClick={() => navigate('/dashboard')}>통합 대시보드로 이동</button>
          </div>
        ) : (
          <div className="history-list">
            {paginatedHistory.map((item) => {
              const report = getReport(item);
              return (
                <article className={`history-card${item.favorite ? ' is-favorite' : ''}`} key={historyEntryKey(item)}>
                  <label className="history-card-select" aria-label={`${item.address} 선택`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(historyEntryKey(item))}
                      onChange={() => toggleSelection(item)}
                    />
                  </label>
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
                    <button type="button" className={`history-favorite-button${item.favorite ? ' active' : ''}`} onClick={() => updateEntry(item, { favorite: !item.favorite })} aria-label={item.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}>{item.favorite ? '★' : '☆'}</button>
                    <label className="history-status-select"><span>상태</span><select value={item.status} onChange={(event) => updateEntry(item, { status: event.target.value })}>{ANALYSIS_HISTORY_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                    <div className="history-buttons">
                      <button type="button" onClick={() => toggleCompare(item)} className={compareIds.includes(historyEntryKey(item)) ? 'selected' : ''}>{compareIds.includes(historyEntryKey(item)) ? '비교 선택됨' : '비교 선택'}</button>
                      <button type="button" onClick={() => downloadReport(item)} disabled={downloadingId === historyEntryKey(item)}>{downloadingId === historyEntryKey(item) ? '생성 중...' : 'PDF 다운로드'}</button>
                      <button type="button" className="danger" onClick={() => deleteEntry(item)}>삭제</button>
                    </div>
                    <small className={`history-status status-${item.status}`}>{statusLabel(item.status)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {filteredHistory.length > PAGE_SIZE && (
          <nav className="history-pagination" aria-label="분석 이력 페이지 이동">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>이전</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>다음</button>
          </nav>
        )}
                      <ChatBot />
      </section>
    </Layout>
  );
}

export default AnalysisHistoryPage;
