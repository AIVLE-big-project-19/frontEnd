import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { analyzeVisionCsv } from '../api/recommendationApi';
import '../styles/RecommendationTest.css';

const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

const triggerDownload = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const RecommendationTestPage = () => {
  const [file, setFile] = useState(null);
  const [limit, setLimit] = useState(3);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [result, setResult] = useState(null); // { filename, url }
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef(null);
  const resultUrlRef = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopTimer();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    []
  );

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
      setErrorMessage(`limit은 ${MIN_LIMIT}~${MAX_LIMIT} 사이여야 합니다.`);
      return;
    }

    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResult(null);
    setErrorMessage(null);
    setIsRateLimited(false);
    setStatus('uploading');
    setElapsedSec(0);
    stopTimer();
    timerRef.current = setInterval(() => setElapsedSec((sec) => sec + 1), 1000);

    try {
      const { blob, filename } = await analyzeVisionCsv(file, limit);
      stopTimer();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ filename, url });
      setStatus('done');
      triggerDownload(url, filename);
    } catch (error) {
      stopTimer();
      setStatus('error');
      setIsRateLimited(error.response?.status === 503);
      setErrorMessage(error.message || '분석 요청에 실패했습니다.');
    }
  };

  const isBusy = status === 'uploading';

  return (
    <Layout>
      <div className="rec-page">
        <h1 className="rec-title">부지 추천 분석</h1>

        <form className="rec-upload-card" onSubmit={handleUpload}>
          <div className="rec-upload-row">
            <input
              className="rec-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
          <div className="rec-upload-row">
            <label className="rec-limit-label">
              limit (1~20):
              <input
                className="rec-limit-input"
                type="number"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              />
            </label>
          </div>
          <button className="rec-submit-button" type="submit" disabled={!file || isBusy}>
            분석하기
          </button>
        </form>

        {status === 'uploading' && (
          <p className="rec-status-line">
            분석 진행 중입니다... ({elapsedSec}초 경과) 지오코딩 → 피처수집 → 비전 분석 순서로 처리되어 수십 초에서
            수 분까지 걸릴 수 있습니다. 창을 닫지 말고 기다려주세요.
          </p>
        )}

        {errorMessage && (
          <p className="rec-error-text">
            {errorMessage}
            {isRateLimited && ' 잠시 후 다시 시도해주세요.'}
          </p>
        )}

        {status === 'done' && result && (
          <section className="rec-results-section">
            <p className="rec-status-line">분석이 완료되어 CSV 파일이 자동으로 다운로드되었습니다.</p>
            <p className="rec-status-line">
              이 결과는 다시 조회할 수 없으니 필요하면 지금 보관해두세요. ({result.filename})
            </p>
            <button
              type="button"
              className="rec-submit-button"
              onClick={() => triggerDownload(result.url, result.filename)}
            >
              다시 다운로드
            </button>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationTestPage;
