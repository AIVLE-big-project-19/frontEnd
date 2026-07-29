import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import SatelliteThumbnail from '../components/SatelliteThumbnail';
import {
  uploadRecommendation,
  fetchRecommendation,
  fetchMyRecommendations,
  deleteRecommendation,
} from '../api/recommendationApi';
import { useAuth } from '../context/AuthContext';
import '../styles/RecommendationTest.css';

const POLL_INTERVAL_MS = 15000;

const STATUS_LABEL = { DONE: '완료', FAILED: '실패', RUNNING: '진행 중', QUEUED: '대기 중' };
const STATUS_BADGE_MODIFIER = { DONE: 'done', FAILED: 'failed', RUNNING: 'running', QUEUED: 'queued' };

const sortRecommendations = (list) => {
  return [...list].sort((a, b) => {
    const scoreA = a['2_scores_and_evaluation']?.total_score;
    const scoreB = b['2_scores_and_evaluation']?.total_score;
    if (scoreA == null && scoreB == null) return 0;
    if (scoreA == null) return 1;
    if (scoreB == null) return -1;
    return scoreB - scoreA;
  });
};

const StatusBadge = ({ status }) => {
  const modifier = STATUS_BADGE_MODIFIER[status] || 'unknown';
  return <span className={`rec-status-badge rec-status-badge--${modifier}`}>{STATUS_LABEL[status] || status}</span>;
};

const fmt = (value, unit = '') => (value === null || value === undefined || value === '' ? '정보 없음' : `${value}${unit}`);

const DetailRow = ({ label, value }) => (
  <div className="rec-detail-row">
    <span className="rec-detail-label">{label}</span>
    <span className="rec-detail-value">{value}</span>
  </div>
);

const RecommendationDetail = ({ item }) => {
  const site = item['1_site_info'] || {};
  const evaluation = item['2_scores_and_evaluation'] || {};
  const detailScores = evaluation.detail_scores || {};
  const xai = evaluation.xai_explanation || {};
  const simulationData = item['3_vision_ai_simulation'] || {};
  const simulation = simulationData.simulation || {};
  const visionAnalysis = simulationData.vision_analysis || {};
  const riskAndSupport = item['4_risk_and_support'] || {};
  const riskCheck = riskAndSupport.rule_based_risk_check || {};
  const checklist = item['5_pre_investigation_checklist'] || [];

  return (
    <div className="rec-detail">
      <div className="rec-detail-section">
        <h3>부지 정보</h3>
        <DetailRow label="부지명" value={fmt(site.site_name)} />
        <DetailRow label="주소" value={fmt(site.address)} />
        <DetailRow label="유형" value={fmt(site.space_type)} />
        <DetailRow label="총 면적" value={fmt(site.total_area, '㎡')} />
        <DetailRow label="가용 면적" value={fmt(site.available_area, '㎡')} />
        <DetailRow label="가용률" value={fmt(site.availability_rate_percent, '%')} />
        <DetailRow label="관리 기관" value={fmt(site.owner_agency)} />
      </div>

      <div className="rec-detail-section">
        <h3>평가 결과</h3>
        <DetailRow label="등급" value={fmt(evaluation.grade)} />
        <DetailRow label="우선순위" value={fmt(evaluation.priority_rank)} />
        <DetailRow label="총점" value={fmt(evaluation.total_score)} />
        <DetailRow label="상태" value={fmt(evaluation.status)} />
        <DetailRow label="AI 기술 점수" value={fmt(detailScores.ml_technical_score)} />
        <DetailRow label="Vision AI 점수" value={fmt(detailScores.vision_ai_score)} />
        <DetailRow label="Rule 기반 점수" value={fmt(detailScores.rule_based_score)} />
        {detailScores.ml_reason && <p className="rec-detail-reason">{detailScores.ml_reason}</p>}
        {detailScores.vision_reason && <p className="rec-detail-reason">{detailScores.vision_reason}</p>}
        {detailScores.rule_reason && <p className="rec-detail-reason">{detailScores.rule_reason}</p>}
        {xai.bonus_reason?.length > 0 && (
          <div className="rec-detail-sublist">
            <span className="rec-detail-label">가점 요인</span>
            <ul>
              {xai.bonus_reason.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {xai.penalty_reason?.length > 0 && (
          <div className="rec-detail-sublist">
            <span className="rec-detail-label">감점 요인</span>
            <ul>
              {xai.penalty_reason.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rec-detail-section">
        <h3>비전 AI 분석 &amp; 시뮬레이션</h3>
        <DetailRow label="경사도" value={fmt(visionAnalysis.slope_degree, '°')} />
        <DetailRow label="방향" value={fmt(visionAnalysis.aspect_direction)} />
        <DetailRow label="식생 비율" value={fmt(visionAnalysis.vegetation_coverage_percent, '%')} />
        <DetailRow label="진입로 여부" value={fmt(visionAnalysis.has_access_road)} />
        <DetailRow label="진입로 폭" value={fmt(visionAnalysis.access_road_width_m, 'm')} />
        <DetailRow label="권장 방향" value={fmt(visionAnalysis.recommended_orientation)} />
        <DetailRow label="권장 경사각" value={fmt(visionAnalysis.recommended_tilt_angle_deg, '°')} />
        <DetailRow label="예상 발전량" value={fmt(simulation.annual_generation_kwh, ' kWh/년')} />
        <DetailRow label="예상 수익" value={fmt(simulation.annual_revenue_krw, '원/년')} />
        <DetailRow label="투자 회수 기간" value={fmt(simulation.payback_years, '년')} />
        <DetailRow label="권장 설비 용량" value={fmt(simulation.recommended_capacity_kw, 'kW')} />
        <DetailRow label="ROI" value={fmt(simulation.roi_percent, '%')} />
      </div>

      <div className="rec-detail-section">
        <h3>리스크 &amp; 지원</h3>
        <DetailRow label="계통연계" value={fmt(riskCheck.grid_connection)} />
        <DetailRow label="민원 이력" value={fmt(riskCheck.public_complaint)} />
        <DetailRow label="규제" value={fmt(riskCheck.regulation)} />
        <DetailRow
          label="추천 보조금"
          value={riskAndSupport.recommended_subsidies?.length > 0 ? riskAndSupport.recommended_subsidies.join(', ') : '정보 없음'}
        />
      </div>

      {checklist.length > 0 && (
        <div className="rec-detail-section">
          <h3>사전 조사 체크리스트</h3>
          <ul className="rec-checklist">
            {checklist.map((entry, i) => (
              <li key={i}>
                <strong>{entry.item}</strong>
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const RecommendationTestPage = () => {
  const { isLoggedIn } = useAuth();

  const [file, setFile] = useState(null);
  const [limit, setLimit] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | polling | done | failed
  const [stage, setStage] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [vworldApiKey, setVworldApiKey] = useState(null);
  const [satelliteByIndex, setSatelliteByIndex] = useState({});
  const [showFunnel, setShowFunnel] = useState(true);
  const intervalRef = useRef(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (!isLoggedIn) {
      setHistory([]);
      return;
    }
    fetchMyRecommendations()
      .then((items) => setHistory(items || []))
      .catch(() => setHistory([]));
  }, [isLoggedIn]);

  const refreshHistory = async () => {
    if (!isLoggedIn) return;
    try {
      const items = await fetchMyRecommendations();
      setHistory(items || []);
    } catch {
      // 이력 갱신 실패는 조용히 무시하고 기존 목록을 유지한다
    }
  };

  const poll = async (id) => {
    try {
      const data = await fetchRecommendation(id);
      if (data.status === 'RUNNING' || data.status === 'QUEUED') {
        setStatus('polling');
        setStage(data.stage);
        return;
      }
      stopPolling();
      if (data.status === 'DONE') {
        setStatus('done');
        setFunnel(data.funnel);
        setRecommendations(sortRecommendations(data.recommendations || []));
      } else if (data.status === 'FAILED') {
        setStatus('failed');
        setErrorMessage(data.errorMessage);
      } else {
        setStatus('failed');
        setErrorMessage(`예상치 못한 상태: ${data.status}`);
      }
      refreshHistory();
    } catch (error) {
      stopPolling();
      setStatus('failed');
      setErrorMessage(`요청 실패: ${error.message}`);
    }
  };

  const trackJob = (id, { showFunnel: shouldShowFunnel = true } = {}) => {
    stopPolling();
    setJobId(id);
    setShowFunnel(shouldShowFunnel);
    setStatus('polling');
    setErrorMessage(null);
    setFunnel(null);
    setRecommendations(null);
    setStage(null);
    setSatelliteByIndex({});
    poll(id);
    intervalRef.current = setInterval(() => poll(id), POLL_INTERVAL_MS);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    stopPolling();
    setStatus('uploading');
    setErrorMessage(null);
    setJobId(null);

    try {
      const data = await uploadRecommendation(file, limit);
      trackJob(data.id);
      refreshHistory();
    } catch (error) {
      setStatus('idle');
      setErrorMessage(error.response?.data?.message || `요청 실패: ${error.message}`);
    }
  };

  const handleHistoryItemClick = (item) => {
    trackJob(item.id, { showFunnel: false });
  };

  const handleHistoryItemDelete = async (item) => {
    if (!window.confirm('이 추천 이력을 삭제하시겠습니까?')) return;
    try {
      await deleteRecommendation(item.id);
      setHistory((prev) => prev.filter((h) => h.id !== item.id));
      if (jobId === item.id) {
        stopPolling();
        setJobId(null);
        setStatus('idle');
        setFunnel(null);
        setRecommendations(null);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || `삭제 실패: ${error.message}`);
    }
  };

  const ensureVworldApiKey = async () => {
    if (vworldApiKey) return vworldApiKey;
    const response = await fetch('/api/vworld-key');
    const data = await response.json();
    setVworldApiKey(data.apiKey);
    return data.apiKey;
  };

  const handleToggleDetail = async (index, address) => {
    const existing = satelliteByIndex[index];
    if (existing?.status === 'loaded') {
      setSatelliteByIndex((prev) => ({
        ...prev,
        [index]: { ...prev[index], expanded: !prev[index].expanded },
      }));
      return;
    }

    setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'loading', expanded: true } }));

    try {
      const apiKey = await ensureVworldApiKey();
      const geoResponse = await fetch(
        `/vworld-api/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}`
      );
      const geoData = await geoResponse.json();
      const point = geoData?.response?.status === 'OK' ? geoData.response.result.point : null;
      if (!point?.x || !point?.y) {
        setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'error', expanded: true } }));
        return;
      }
      setSatelliteByIndex((prev) => ({
        ...prev,
        [index]: {
          status: 'loaded',
          expanded: true,
          apiKey,
          point: { lon: Number(point.x), lat: Number(point.y) },
        },
      }));
    } catch {
      setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'error', expanded: true } }));
    }
  };

  const isBusy = status === 'uploading' || status === 'polling';

  return (
    <Layout>
      <div className="rec-page">
        <h1 className="rec-title">추천 업로드 테스트</h1>

        <form className="rec-upload-card" onSubmit={handleUpload}>
          <div className="rec-upload-row">
            <input
              className="rec-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
          <div className="rec-upload-row">
            <label className="rec-limit-label">
              limit:
              <input
                className="rec-limit-input"
                type="number"
                min="1"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              />
            </label>
          </div>
          <button className="rec-submit-button" type="submit" disabled={!file || isBusy}>
            분석하기
          </button>
        </form>

        {jobId != null && <p className="rec-status-line">job id: {jobId}</p>}
        {status === 'uploading' && <p className="rec-status-line">업로드 중...</p>}
        {status === 'polling' && (
          <p className="rec-status-line">진행 중... {stage ? `(stage: ${stage})` : ''}</p>
        )}
        {errorMessage && <p className="rec-error-text">{errorMessage}</p>}

        <section className="rec-history-section">
          <h2 className="rec-history-heading">내 추천 이력</h2>
          {!isLoggedIn && <p className="rec-history-empty">로그인 후 확인할 수 있습니다.</p>}
          {isLoggedIn && history.length === 0 && (
            <p className="rec-history-empty">저장된 추천 이력이 없습니다.</p>
          )}
          {isLoggedIn && history.length > 0 && (
            <ul className="rec-history-list">
              {history.map((item) => (
                <li className="rec-history-row" key={item.id}>
                  <button
                    type="button"
                    className="rec-history-item"
                    onClick={() => handleHistoryItemClick(item)}
                  >
                    <span className="rec-history-item-main">
                      <span className="rec-history-filename">{item.originalFilename}</span>
                      <StatusBadge status={item.status} />
                    </span>
                    <span className="rec-history-date">
                      {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </span>
                    {item.status === 'FAILED' && item.errorMessage && (
                      <span className="rec-history-error">{item.errorMessage}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="rec-history-delete"
                    onClick={() => handleHistoryItemDelete(item)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {status === 'done' && (
          <section className="rec-results-section">
            {showFunnel && (
              <>
                <h2>Funnel</h2>
                <pre className="rec-funnel-block">{JSON.stringify(funnel, null, 2)}</pre>
              </>
            )}

            <h2>추천 후보지 ({recommendations.length})</h2>
            <div className="rec-recommendation-list">
              {recommendations.map((item, index) => {
                const site = item['1_site_info'] || {};
                const scores = item['2_scores_and_evaluation'] || {};
                const satellite = satelliteByIndex[index];
                return (
                  <div className="rec-recommendation-card" key={site.site_id || index}>
                    <p className="rec-recommendation-address">
                      <strong>{site.address}</strong> ({item.target_type})
                    </p>
                    <p className="rec-recommendation-meta">
                      등급: {scores.grade ?? '분석 대기'} / 점수: {scores.total_score ?? '분석 대기'} / 상태:{' '}
                      {scores.status}
                    </p>
                    <button
                      type="button"
                      className="rec-detail-button"
                      onClick={() => handleToggleDetail(index, site.address)}
                    >
                      상세보기
                    </button>
                    {satellite?.expanded && (
                      <div className="rec-satellite-panel">
                        {satellite.status === 'loading' && <p>위성사진을 불러오는 중...</p>}
                        {satellite.status === 'error' && (
                          <p className="rec-satellite-error">위성사진을 불러올 수 없습니다.</p>
                        )}
                        {satellite.status === 'loaded' && (
                          <SatelliteThumbnail apiKey={satellite.apiKey} point={satellite.point} />
                        )}
                      </div>
                    )}
                    <RecommendationDetail item={item} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationTestPage;
