import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fromLonLat } from 'ol/proj';
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import AnalysisReportDashboard from '../components/AnalysisReportDashboard';
import { GuideTrigger } from '../components/WelcomeGuideModal';
import ChatBot from '../components/ChatBot';
import {
  downloadDashboardCandidateReport,
  downloadAnalysisSnapshotReport,
  fetchDashboardCandidateAnalysis,
  fetchDashboardCandidatesByRegion,
} from '../api/dashboardApi';
import { KOREA_REGIONS, SUPPORTED_SIDO_LIST } from '../data/koreaRegions';
import { buildAnalysisReportViewModel } from '../utils/analysisReportModel';
import { loadDashboardSelections, normalizeDashboardSelections } from '../utils/dashboardSelection';
import { API_BASE_URL } from '../api/axiosInstance';
import '../styles/Dashboard.css';

const PAGE_SIZE = 20;

const formatScore = (value) => (
  value == null ? '-' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
);

const DashboardPage = () => {
  const location = useLocation();
  const transferredCandidates = useMemo(() => {
    const routed = normalizeDashboardSelections(location.state?.selectedCandidates);
    return routed.length > 0 ? routed : loadDashboardSelections();
  }, [location.state]);
  const hasTransferredCandidates = transferredCandidates.length > 0;
  const [apiKey, setApiKey] = useState(null);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('ALL');
  const [candidatePage, setCandidatePage] = useState(() => (
    hasTransferredCandidates
      ? {
        content: transferredCandidates,
        totalElements: transferredCandidates.length,
      }
      : null
  ));
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [analyzedCandidate, setAnalyzedCandidate] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const analysisLoadingRef = useRef(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState('site');
  const [status, setStatus] = useState({
    type: hasTransferredCandidates ? 'success' : 'info',
    text: hasTransferredCandidates
      ? `유휴부지 분석에서 선택한 후보지 ${transferredCandidates.length}건을 불러왔습니다.`
      : '시/도와 시/군/구를 선택해 분석 후보지를 조회하세요.',
  });

  const filteredCandidates = useMemo(
    () => (candidatePage?.content || []).filter((candidate) => (
        selectedAssetType === 'ALL'
        || (selectedAssetType === 'LAND' && candidate.siteType === 'LAND')
        || (selectedAssetType === 'BUILDING' && candidate.siteType === 'ROOF')
      )),
    [candidatePage, selectedAssetType],
  );
  const totalPages = Math.ceil(filteredCandidates.length / PAGE_SIZE);
  const candidates = filteredCandidates.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const reportViewModel = useMemo(
    () => buildAnalysisReportViewModel({ analysis }),
    [analysis],
  );
  const selectedCandidateHasAnalysis = Boolean(
    analysis && analyzedCandidate?.id === selectedCandidate?.id,
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/vworld-key`)
      .then((response) => response.json())
      .then((data) => setApiKey(data.apiKey))
      .catch(() => setStatus({
        type: 'error',
        text: '지도 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      }));
  }, []);

  const resetCandidateSelection = () => {
    setCandidatePage(null);
    setCurrentPage(0);
    setSelectedCandidate(null);
    setAnalyzedCandidate(null);
    setCoordinates(null);
    setAnalysis(null);
  };

  const handleSidoChange = (event) => {
    setSelectedSido(event.target.value);
    setSelectedSigungu('');
    resetCandidateSelection();
  };

  const loadCandidates = async () => {
    if (!selectedSido || !selectedSigungu) {
      setStatus({ type: 'error', text: '시/도와 시/군/구를 모두 선택해 주세요.' });
      return;
    }

    setCandidateLoading(true);
    setSelectedCandidate(null);
    setAnalyzedCandidate(null);
    setCoordinates(null);
    setAnalysis(null);
    setStatus({ type: 'loading', text: '선택 지역의 AI 분석 후보지를 조회하고 있습니다.' });
    try {
      const result = await fetchDashboardCandidatesByRegion({
        sido: selectedSido,
        sigungu: selectedSigungu,
        page: 0,
        size: 1_000,
      });
      setCandidatePage(result);
      setCurrentPage(0);
      setStatus({
        type: result.totalElements > 0 ? 'success' : 'info',
        text: result.totalElements > 0
          ? `${selectedSido} ${selectedSigungu} 후보지 ${result.totalElements}건을 찾았습니다.`
          : '선택한 지역에 등록된 분석 후보지가 없습니다.',
      });
    } catch (error) {
      setCandidatePage(null);
      setStatus({
        type: 'error',
        text: error.response?.data?.message || '지역 후보지 조회에 실패했습니다.',
      });
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleRegionSearch = (event) => {
    event.preventDefault();
    loadCandidates();
  };

  const handleAssetTypeChange = (assetType) => {
    setSelectedAssetType(assetType);
    setCurrentPage(0);
    setSelectedCandidate(null);
    setCoordinates(null);
    if (candidatePage) {
      const count = candidatePage.content.filter((candidate) => (
        assetType === 'ALL'
        || (assetType === 'LAND' && candidate.siteType === 'LAND')
        || (assetType === 'BUILDING' && candidate.siteType === 'ROOF')
      )).length;
      setStatus({
        type: count > 0 ? 'success' : 'info',
        text: `조회된 후보지에서 ${count}건이 선택한 유형과 일치합니다.`,
      });
    }
  };

  const analyzeCandidate = async (candidate) => {
    if (analysisLoadingRef.current) return;

    analysisLoadingRef.current = true;
    setAnalysisLoading(true);
    setStatus({ type: 'loading', text: '선택 후보지의 ML·SHAP 상세 결과를 불러오고 있습니다.' });
    try {
      const detail = await fetchDashboardCandidateAnalysis(candidate.id);
      setAnalysis(detail);
      setAnalyzedCandidate(candidate);
      const hasEconomicEstimate = [
        detail.capacityKw,
        detail.annualGenerationKwh,
        detail.estimatedAnnualRevenue,
        detail.paybackPeriodYears,
      ].every((value) => value != null);
      setStatus(hasEconomicEstimate
        ? { type: 'success', text: '입지 적합도와 경제성 분석 결과를 표시했습니다.' }
        : { type: 'info', text: '입지 적합도 분석을 표시했습니다. 경제성 지표는 아직 미산정입니다.' });
      setActiveMobilePanel('result');
    } catch (error) {
      setStatus({
        type: 'error',
        text: error.response?.data?.message || '후보지 상세 분석을 불러오지 못했습니다.',
      });
    } finally {
      analysisLoadingRef.current = false;
      setAnalysisLoading(false);
    }
  };

  const selectCandidate = (candidate) => {
    if (analysisLoadingRef.current) return;

    setSelectedCandidate(candidate);
    setCoordinates(
      candidate.longitude != null && candidate.latitude != null
        ? fromLonLat([candidate.longitude, candidate.latitude])
        : null,
    );
    setStatus({
      type: 'success',
      text: '후보지를 선택했습니다. 지도 위치를 확인한 뒤 AI 분석 실행을 눌러주세요.',
    });
    setActiveMobilePanel('map');
  };

  const handleAnalyze = async () => {
    if (!selectedCandidate) {
      setStatus({ type: 'error', text: '분석 후보지를 먼저 선택해 주세요.' });
      return;
    }

    await analyzeCandidate(selectedCandidate);
  };

  const downloadReport = async (targetType) => {
    if (!analyzedCandidate || reportDownloading) return;
    setReportDownloading(true);
    try {
      const reportBlob = analysis?.analysisId
        ? await downloadAnalysisSnapshotReport(analysis.analysisId)
        : await downloadDashboardCandidateReport(analyzedCandidate.id);
      const url = URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SolarAivle_${analyzedCandidate.sourceId || analyzedCandidate.id}_${targetType}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', text: '분석 보고서 다운로드가 완료되었습니다.' });
    } catch {
      setStatus({ type: 'error', text: '보고서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setReportDownloading(false);
    }
  };

  return (
    <Layout>
      <section className="dashboard-page">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">SOLAR AIVLE · DASHBOARD</p>
            <div className="guide-title-row"><h1>통합 대시보드</h1><GuideTrigger /></div>
            <span>
              {hasTransferredCandidates
                ? '선택한 후보지를 비교하고 상세 사업성을 확인하세요.'
                : '지역별 태양광 후보지를 조회하고 AI 분석 결과를 확인하세요.'}
            </span>
          </div>
        </div>

        <div className={`dashboard-status status-${status.type}`} role="status" aria-live="polite">
          <span className="status-dot" />
          {status.type === 'loading' && <span className="status-spinner" />}
          {status.text}
        </div>

        <nav className="dashboard-mobile-nav" aria-label="대시보드 영역">
          <button type="button" className={activeMobilePanel === 'site' ? 'active' : ''} onClick={() => setActiveMobilePanel('site')}><span>01</span> 지역·후보지</button>
          <button type="button" className={activeMobilePanel === 'map' ? 'active' : ''} onClick={() => setActiveMobilePanel('map')}><span>02</span> 지도</button>
          <button type="button" className={activeMobilePanel === 'result' ? 'active' : ''} onClick={() => setActiveMobilePanel('result')}><span>03</span> 분석 결과<i /></button>
        </nav>

        <div className="dashboard-grid">
          <div className="dashboard-sidebar">
            <aside className={`dashboard-panel search-panel ${activeMobilePanel === 'site' ? 'mobile-active' : ''}`}>
              <div className="panel-heading">
                <span className="panel-step">01</span>
                <div>
                  <h2>{hasTransferredCandidates ? '선택 후보지' : '지역 선택'}</h2>
                  <p>
                    {hasTransferredCandidates
                      ? '유휴부지 분석에서 선택한 후보지를 확인하세요.'
                      : '분석할 행정구역을 선택하세요.'}
                  </p>
                </div>
              </div>

              {!hasTransferredCandidates && <form onSubmit={handleRegionSearch} className="dashboard-region-form">
                <label htmlFor="dashboard-sido">
                  시/도
                  <select id="dashboard-sido" value={selectedSido} onChange={handleSidoChange}>
                    <option value="">시/도 선택</option>
                    {SUPPORTED_SIDO_LIST.map((sido) => <option key={sido} value={sido}>{sido}</option>)}
                  </select>
                </label>
                <label htmlFor="dashboard-sigungu">
                  시/군/구
                  <select
                    id="dashboard-sigungu"
                    value={selectedSigungu}
                    onChange={(event) => {
                      setSelectedSigungu(event.target.value);
                      resetCandidateSelection();
                    }}
                    disabled={!selectedSido}
                  >
                    <option value="">시/군/구 선택</option>
                    {(KOREA_REGIONS[selectedSido] || []).map((sigungu) => (
                      <option key={sigungu} value={sigungu}>{sigungu}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="analyze-button" disabled={candidateLoading || !selectedSido || !selectedSigungu}>
                  {candidateLoading ? '조회 중...' : '분석 후보지 조회'}
                </button>
              </form>}
            </aside>

            <section className={`dashboard-panel candidate-panel ${activeMobilePanel === 'site' ? 'mobile-active' : ''}`} aria-labelledby="candidate-panel-title">
              <div className="list-title">
                <h3 id="candidate-panel-title">{hasTransferredCandidates ? '대시보드 분석 목록' : '분석 후보지'}</h3>
                <span>
                  {hasTransferredCandidates
                    ? `${filteredCandidates.length}건`
                    : candidatePage
                    ? `${currentPage + 1}/${Math.max(totalPages, 1)} 페이지`
                    : '지역을 선택하세요'}
                </span>
              </div>

              <fieldset className="installation-place-tabs dashboard-asset-type" aria-label="후보지 유형">
                <div className="installation-place-options" role="group" aria-label="후보지 유형">
                  <button type="button" className={selectedAssetType === 'ALL' ? 'selected' : ''} onClick={() => handleAssetTypeChange('ALL')}>전체</button>
                  <button type="button" className={selectedAssetType === 'LAND' ? 'selected' : ''} onClick={() => handleAssetTypeChange('LAND')}>토지</button>
                  <button type="button" className={selectedAssetType === 'BUILDING' ? 'selected' : ''} onClick={() => handleAssetTypeChange('BUILDING')}>지붕/옥상</button>
                </div>
              </fieldset>

              {candidates.length > 0 ? (
                <>
                  <div className="candidate-scroll-area" tabIndex="0" aria-label="분석 후보지 목록">
                    {candidates.map((item) => (
                      <div className="candidate-row candidate-row-single" key={item.id}>
                        <button
                          type="button"
                          className={selectedCandidate?.id === item.id ? 'active' : ''}
                          onClick={() => selectCandidate(item)}
                          disabled={analysisLoading}
                          aria-pressed={selectedCandidate?.id === item.id}
                        >
                          <span className={`candidate-score ${item.suitabilityScore >= 80 ? 'high' : item.suitabilityScore >= 70 ? 'medium' : ''}`}>
                            {formatScore(item.suitabilityScore)}
                          </span>
                          <span className="candidate-address">
                            {item.address}
                            <small>
                              {item.siteType === 'ROOF' ? '건물' : '토지'} · {item.grade || '-'}
                              {item.candidateRank != null && ` · ${item.candidateRank}위`}
                            </small>
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="candidate-pagination">
                    <button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((page) => page - 1)}>이전</button>
                    <span>{currentPage + 1} / {totalPages}</span>
                    <button type="button" disabled={currentPage + 1 >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>다음</button>
                  </div>
                </>
              ) : (
                <p className="candidate-empty">
                  {candidatePage ? '선택한 유형에 해당하는 후보지가 없습니다.' : '시/도와 시/군/구를 선택해 조회하세요.'}
                </p>
              )}

              <button
                type="button"
                className="analyze-button candidate-analyze-button"
                onClick={handleAnalyze}
                disabled={!selectedCandidate || analysisLoading}
              >
                {analysisLoading ? 'AI 분석 중...' : selectedCandidateHasAnalysis ? 'AI 분석 다시 실행' : 'AI 분석 실행'}
              </button>
            </section>

            <div className={`dashboard-map ${activeMobilePanel === 'map' ? 'mobile-active' : ''}`}>
              <div className="map-caption">
                <span>선택 후보지 위치</span>
                <b>{selectedCandidate?.address || '후보지를 선택해 주세요.'}</b>
              </div>
              {apiKey
                ? <MapView apiKey={apiKey} selectedCoordinates={coordinates} />
                : <div className="map-loading">지도를 불러오는 중...</div>}
              {selectedCandidate && (
                <button
                  type="button"
                  className="mobile-map-analyze-button"
                  onClick={handleAnalyze}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? 'AI 분석 중...' : selectedCandidateHasAnalysis ? 'AI 분석 다시 실행' : '이 후보지 AI 분석하기'}
                </button>
              )}
            </div>
          </div>

          <div className={`dashboard-report-pane ${activeMobilePanel === 'result' ? 'mobile-active' : ''}`}>
              <AnalysisReportDashboard
                report={reportViewModel}
                onDownload={downloadReport}
                isDownloading={reportDownloading}
              />
          </div>
        </div>
              <ChatBot />
      </section>
    </Layout>
  );
};

export default DashboardPage;
