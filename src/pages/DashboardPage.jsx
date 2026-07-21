import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import { fetchMapSearch } from '../api/mapApi';
import { createSiteAnalysis, fetchDemoAnalyses, fetchMyAnalysisHistory } from '../api/dashboardApi';
import '../styles/Dashboard.css';

const formatNumber = (value, suffix = '') => value === undefined || value === null
  ? '-' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`;

const DashboardPage = () => {
  const [apiKey, setApiKey] = useState(null);
  const [map, setMap] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [address, setAddress] = useState('');
  const [areaM2, setAreaM2] = useState(100);
  const [capacityKw, setCapacityKw] = useState(10);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoSites, setDemoSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('주소를 검색하고 후보지를 선택해 주세요.');

  useEffect(() => {
    fetch('/api/vworld-key').then((response) => response.json()).then((data) => setApiKey(data.apiKey))
      .catch(() => setMessage('지도 정보를 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    fetchDemoAnalyses()
      .then((items) => {
        setDemoSites(items || []);
        if (items?.length) {
          setAnalysis(items[0]);
          setMessage('데모 후보지 결과를 불러왔습니다. 후보지를 선택해 비교해 보세요.');
        }
      })
      .catch(() => setMessage('데모 후보지 정보를 불러오지 못했습니다.'));
  }, []);

  const handleSearch = async (event) => {
    event?.preventDefault();
    if (!keyword.trim()) return;
    try {
      const data = await fetchMapSearch(keyword.trim());
      const items = data?.response?.status === 'OK' ? data.response.result.items : [];
      setSearchResults(items);
      setMessage(items.length ? '후보지를 선택해 분석을 시작하세요.' : '검색 결과가 없습니다.');
    } catch { setMessage('장소 검색 중 오류가 발생했습니다.'); }
  };

  const selectSite = (item) => {
    setAddress(item.address?.road || item.address?.parcel || item.title);
    setKeyword(item.title);
    setSearchResults([]);
    if (map && item.point?.x && item.point?.y) { map.getView().setCenter([Number(item.point.x), Number(item.point.y)]); map.getView().setZoom(18); }
    setMessage('후보지가 선택되었습니다. 면적과 설치 용량을 확인한 뒤 분석하세요.');
  };

  const handleAnalyze = async () => {
    if (!address.trim()) { setMessage('분석할 후보지를 먼저 선택해 주세요.'); return; }
    setLoading(true);
    try {
      const result = await createSiteAnalysis({ address, areaM2: Number(areaM2), capacityKw: Number(capacityKw) });
      setAnalysis(result);
      setMessage('부지 분석이 완료되었습니다. 로그인 사용자의 결과는 자동으로 저장됩니다.');
    } catch (error) { setMessage(error.response?.data?.message || '부지 분석에 실패했습니다. 입력값을 확인해 주세요.'); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    try { const items = await fetchMyAnalysisHistory(); setHistory(items || []); setMessage(items?.length ? '최근 분석 이력을 불러왔습니다.' : '저장된 분석 이력이 없습니다.'); }
    catch { setMessage('분석 이력은 로그인한 사용자만 조회할 수 있습니다.'); }
  };

  const downloadReport = async () => {
    if (!analysis) return;
    try {
      const response = await fetch('/api/pdf/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: analysis.address }) });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = 'SolarAivle_Site_Analysis.pdf'; link.click(); URL.revokeObjectURL(url);
    } catch { setMessage('보고서 생성에 실패했습니다.'); }
  };

  return <Layout><section className="dashboard-page">
    <div className="dashboard-heading"><div><p>SOLAR SPATIAL INTELLIGENCE</p><h1>통합 대시보드</h1></div><button type="button" className="history-button" onClick={loadHistory}>내 분석 이력</button></div>
    <p className="dashboard-message" role="status">{message}</p>
    <div className="dashboard-grid">
      <aside className="dashboard-panel search-panel"><h2>후보지 검색</h2><form onSubmit={handleSearch} className="dashboard-search-form"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="주소 또는 장소명을 입력하세요" /><button type="submit">검색</button></form>
        {searchResults.length > 0 && <ul className="dashboard-results">{searchResults.map((item, index) => <li key={`${item.id || item.title}-${index}`}><button type="button" onClick={() => selectSite(item)}><strong>{item.title}</strong><span>{item.address?.road || item.address?.parcel}</span></button></li>)}</ul>}
        <div className="site-inputs"><label>선택 후보지<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="검색 결과에서 선택" /></label><label>부지 면적 (㎡)<input type="number" min="1" value={areaM2} onChange={(event) => setAreaM2(event.target.value)} /></label><label>설치 용량 (kW)<input type="number" min="0.1" step="0.1" value={capacityKw} onChange={(event) => setCapacityKw(event.target.value)} /></label><button type="button" className="analyze-button" onClick={handleAnalyze} disabled={loading}>{loading ? '분석 중...' : '부지 분석 실행'}</button></div>
        {demoSites.length > 0 && <div className="history-list"><h3>데모 후보지</h3>{demoSites.map((item) => <button type="button" key={item.id} onClick={() => { setAnalysis(item); setAddress(item.address); setAreaM2(item.areaM2); setCapacityKw(item.capacityKw); }}>{item.address}<span>{item.suitabilityScore}점 · {item.grade}</span></button>)}</div>}
        {history.length > 0 && <div className="history-list"><h3>내 최근 분석</h3>{history.map((item) => <button type="button" key={item.id} onClick={() => setAnalysis(item)}>{item.address}<span>{item.suitabilityScore}점 · {item.grade}</span></button>)}</div>}</aside>
      <div className="dashboard-map">{apiKey ? <MapView apiKey={apiKey} setMap={setMap} /> : <div className="map-loading">지도를 불러오는 중...</div>}</div>
      <aside className="dashboard-panel analysis-panel"><h2>분석 결과</h2>{!analysis ? <div className="empty-analysis">후보지를 선택한 후 분석을 실행하면 적합도와 수익성 결과가 표시됩니다.</div> : <><div className={`grade-card grade-${analysis.grade === '적합' ? 'good' : analysis.grade === '검토 필요' ? 'review' : 'bad'}`}><span>태양광 설치 적합도</span><strong>{analysis.suitabilityScore}점</strong><b>{analysis.grade}</b></div><dl className="score-list"><div><dt>일사량</dt><dd>{analysis.irradiationScore}점</dd></div><div><dt>지형</dt><dd>{analysis.terrainScore}점</dd></div><div><dt>접근성</dt><dd>{analysis.accessScore}점</dd></div></dl><h3>예상 시뮬레이션</h3><dl className="metric-list"><div><dt>예상 연간 발전량</dt><dd>{formatNumber(analysis.annualGenerationKwh, ' kWh')}</dd></div><div><dt>예상 설치비</dt><dd>{formatNumber(analysis.estimatedInstallationCost, '원')}</dd></div><div><dt>예상 연 수익</dt><dd>{formatNumber(analysis.estimatedAnnualRevenue, '원')}</dd></div><div><dt>투자 회수기간</dt><dd>{formatNumber(analysis.paybackPeriodYears, '년')}</dd></div></dl><button type="button" className="report-button" onClick={downloadReport}>분석 보고서 다운로드</button></>}</aside>
    </div>
  </section></Layout>;
};

export default DashboardPage;
