import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import SatelliteThumbnail from '../components/SatelliteThumbnail';
import { uploadRecommendation, fetchRecommendation, fetchMyRecommendations } from '../api/recommendationApi';
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

  const trackJob = (id) => {
    stopPolling();
    setJobId(id);
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
    trackJob(item.id);
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
                <li key={item.id}>
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
                </li>
              ))}
            </ul>
          )}
        </section>

        {status === 'done' && (
          <section className="rec-results-section">
            <h2>Funnel</h2>
            <pre className="rec-funnel-block">{JSON.stringify(funnel, null, 2)}</pre>

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
                    <pre className="rec-json-block">{JSON.stringify(item, null, 2)}</pre>
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
