import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { uploadRecommendation, fetchRecommendation } from '../api/recommendationApi';

const POLL_INTERVAL_MS = 15000;

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

const RecommendationTestPage = () => {
  const [file, setFile] = useState(null);
  const [limit, setLimit] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | polling | done | failed
  const [stage, setStage] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const intervalRef = useRef(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

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
      }
    } catch (error) {
      stopPolling();
      setStatus('failed');
      setErrorMessage(`요청 실패: ${error.message}`);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    stopPolling();
    setStatus('uploading');
    setErrorMessage(null);
    setFunnel(null);
    setRecommendations(null);
    setStage(null);

    try {
      const data = await uploadRecommendation(file, limit);
      setJobId(data.id);
      setStatus('polling');
      poll(data.id);
      intervalRef.current = setInterval(() => poll(data.id), POLL_INTERVAL_MS);
    } catch (error) {
      setStatus('idle');
      setErrorMessage(error.response?.data?.message || `요청 실패: ${error.message}`);
    }
  };

  const isBusy = status === 'uploading' || status === 'polling';

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
        <h1>추천 업로드 테스트</h1>

        <form onSubmit={handleUpload}>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label>
              limit:
              <input
                type="number"
                min="1"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                style={{ marginLeft: '8px', width: '60px' }}
              />
            </label>
          </div>
          <button type="submit" disabled={!file || isBusy} style={{ marginTop: '10px' }}>
            분석하기
          </button>
        </form>

        {jobId != null && <p>job id: {jobId}</p>}
        {status === 'uploading' && <p>업로드 중...</p>}
        {status === 'polling' && <p>진행 중... {stage ? `(stage: ${stage})` : ''}</p>}
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {status === 'done' && (
          <div>
            <h2>Funnel</h2>
            <pre>{JSON.stringify(funnel, null, 2)}</pre>

            <h2>추천 후보지 ({recommendations.length})</h2>
            {recommendations.map((item, index) => {
              const site = item['1_site_info'] || {};
              const scores = item['2_scores_and_evaluation'] || {};
              return (
                <div
                  key={site.site_id || index}
                  style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}
                >
                  <p>
                    <strong>{site.address}</strong> ({item.target_type})
                  </p>
                  <p>
                    등급: {scores.grade ?? '분석 대기'} / 점수: {scores.total_score ?? '분석 대기'} / 상태:{' '}
                    {scores.status}
                  </p>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationTestPage;
