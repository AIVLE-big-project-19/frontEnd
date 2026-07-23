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
  const [coordinates, setCoordinates] = useState(null);
  const [areaM2, setAreaM2] = useState(100);
  const [capacityKw, setCapacityKw] = useState(10);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoSites, setDemoSites] = useState([]);
  const [compareSites, setCompareSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState('site');
  const [status, setStatus] = useState({ type: 'info', text: '주소를 검색하거나 데모 후보지를 선택해 분석을 시작하세요.' });

  useEffect(() => {
    fetch('/api/vworld-key').then((response) => response.json()).then((data) => setApiKey(data.apiKey))
      .catch(() => setStatus({ type: 'error', text: '지도 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }));
  }, []);

  useEffect(() => {
    fetchDemoAnalyses().then((items) => {
      setDemoSites(items || []);
      if (items?.length) {
        setAnalysis(items[0]);
        setStatus({ type: 'success', text: '데모 후보지 결과를 불러왔습니다. 목록에서 다른 후보지를 선택하거나 비교해 보세요.' });
      }
    }).catch(() => setStatus({ type: 'error', text: '데모 후보지 정보를 불러오지 못했습니다.' }));
  }, []);

  const applySite = (site) => {
    setAnalysis(site);
    setAddress(site.address);
    setAreaM2(site.areaM2);
    setCapacityKw(site.capacityKw);
    setCoordinates(site.longitude && site.latitude ? [site.longitude, site.latitude] : null);
    setActiveMobilePanel('result');
    setStatus({ type: 'success', text: '후보지를 선택했습니다. 지도와 분석 결과를 확인해 보세요.' });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    try {
      const data = await fetchMapSearch(keyword.trim());
      const items = data?.response?.status === 'OK' ? data.response.result.items : [];
      setSearchResults(items);
      setStatus({ type: items.length ? 'info' : 'error', text: items.length ? '검색 결과에서 분석할 후보지를 선택하세요.' : '검색 결과가 없습니다. 주소를 다시 확인해 주세요.' });
    } catch {
      setStatus({ type: 'error', text: '장소 검색 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    }
  };

  const selectSearchResult = (item) => {
    const selectedAddress = item.address?.road || item.address?.parcel || item.title;
    const point = item.point?.x && item.point?.y ? [Number(item.point.x), Number(item.point.y)] : null;
    setAddress(selectedAddress);
    setKeyword(item.title);
    setCoordinates(point);
    setSearchResults([]);
    setActiveMobilePanel('map');
    if (map && point) {
      map.getView().setCenter(point);
      map.getView().setZoom(18);
    }
    setStatus({ type: 'success', text: '후보지를 선택했습니다. 면적과 설치 용량을 확인한 뒤 분석을 실행하세요.' });
  };

  const handleAnalyze = async () => {
    if (!address.trim()) {
      setStatus({ type: 'error', text: '분석할 후보지를 먼저 선택해 주세요.' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'loading', text: '부지 조건을 계산하고 있습니다. 잠시만 기다려 주세요.' });
    try {
      const result = await createSiteAnalysis({ address, latitude: coordinates?.[1], longitude: coordinates?.[0], areaM2: Number(areaM2), capacityKw: Number(capacityKw) });
      setAnalysis(result);
      setCoordinates(result.longitude && result.latitude ? [result.longitude, result.latitude] : coordinates);
      setActiveMobilePanel('result');
      setStatus({ type: 'success', text: '분석이 완료되었습니다. 예상 수익과 투자 회수기간을 확인해 보세요.' });
    } catch (error) {
      setStatus({ type: 'error', text: error.response?.data?.message || '부지 분석에 실패했습니다. 입력값을 확인해 주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const items = await fetchMyAnalysisHistory();
      setHistory(items || []);
      setStatus({ type: items?.length ? 'success' : 'info', text: items?.length ? '최근 분석 이력을 불러왔습니다.' : '저장된 분석 이력이 없습니다.' });
    } catch {
      setStatus({ type: 'error', text: '분석 이력은 로그인한 사용자만 조회할 수 있습니다.' });
    }
  };

  const toggleCompare = (site) => {
    setCompareSites((current) => {
      if (current.some((item) => item.id === site.id)) return current.filter((item) => item.id !== site.id);
      if (current.length === 3) {
        setStatus({ type: 'info', text: '후보지는 최대 3곳까지 비교할 수 있습니다.' });
        return current;
      }
      return [...current, site];
    });
  };

  const downloadReport = async () => {
    if (!analysis) return;
    try {
      const response = await fetch('/api/pdf/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: analysis.address }) });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SolarAivle_Site_Analysis.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus({ type: 'error', text: '보고서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };

  const gradeClass = analysis?.grade === '적합' ? 'good' : analysis?.grade === '검토 필요' ? 'review' : 'bad';

  return <Layout><section className="dashboard-page">
    <header className="dashboard-hero">
      <div><p className="eyebrow">SOLAR SPATIAL INTELLIGENCE</p><h1>통합 대시보드</h1><span>후보지 탐색부터 발전 수익 예측까지, 한 번에 확인하세요.</span></div>
      <div className="hero-actions"><div className="demo-count"><b>{demoSites.length || '-'}</b><span>데모 후보지</span></div><button type="button" className="history-button" onClick={loadHistory}>내 분석 이력</button></div>
    </header>
    <div className={`dashboard-status status-${status.type}`} role="status" aria-live="polite"><span className="status-dot" />{status.type === 'loading' && <span className="status-spinner" />}{status.text}</div>
    <nav className="dashboard-mobile-nav" aria-label="대시보드 영역">
      <button type="button" className={activeMobilePanel === 'site' ? 'active' : ''} onClick={() => setActiveMobilePanel('site')}><span>01</span> 후보지</button>
      <button type="button" className={activeMobilePanel === 'map' ? 'active' : ''} onClick={() => setActiveMobilePanel('map')}><span>02</span> 지도</button>
      <button type="button" className={activeMobilePanel === 'result' ? 'active' : ''} onClick={() => setActiveMobilePanel('result')}><span>03</span> 결과{analysis && <i />}</button>
    </nav>
    <div className="dashboard-grid">
      <aside className={`dashboard-panel search-panel ${activeMobilePanel === 'site' ? 'mobile-active' : ''}`}>
        <div className="panel-heading"><span className="panel-step">01</span><div><h2>후보지 선택</h2><p>주소를 검색하거나 예시 데이터를 선택하세요.</p></div></div>
        <form onSubmit={handleSearch} className="dashboard-search-form"><input aria-label="주소 또는 장소명" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="주소 또는 장소명 입력" /><button type="submit">검색</button></form>
        {searchResults.length > 0 && <ul className="dashboard-results">{searchResults.map((item, index) => <li key={`${item.id || item.title}-${index}`}><button type="button" onClick={() => selectSearchResult(item)}><strong>{item.title}</strong><span>{item.address?.road || item.address?.parcel}</span></button></li>)}</ul>}
        <div className="site-inputs"><label>선택 후보지<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="검색 결과에서 선택" /></label><div className="input-row"><label>부지 면적 (㎡)<input type="number" min="1" value={areaM2} onChange={(event) => setAreaM2(event.target.value)} /></label><label>설치 용량 (kW)<input type="number" min="0.1" step="0.1" value={capacityKw} onChange={(event) => setCapacityKw(event.target.value)} /></label></div><button type="button" className="analyze-button" onClick={handleAnalyze} disabled={loading}>{loading ? '분석 중...' : '부지 분석 실행'}</button></div>
        {demoSites.length > 0 && <div className="candidate-list"><div className="list-title"><h3>데모 후보지</h3><span>{compareSites.length}/3 비교 선택</span></div>{demoSites.map((item) => <div className="candidate-row" key={item.id}><button type="button" className={analysis?.id === item.id ? 'active' : ''} onClick={() => applySite(item)}><span className={`candidate-score ${item.suitabilityScore >= 80 ? 'high' : item.suitabilityScore >= 70 ? 'medium' : ''}`}>{item.suitabilityScore}</span><span className="candidate-address">{item.address}<small>{item.grade} · {formatNumber(item.capacityKw, ' kW')}</small></span></button><button type="button" className={`compare-toggle ${compareSites.some((site) => site.id === item.id) ? 'selected' : ''}`} onClick={() => toggleCompare(item)} aria-label={`${item.address} 비교 선택`}>비교</button></div>)}</div>}
        {history.length > 0 && <div className="candidate-list history-list"><div className="list-title"><h3>내 최근 분석</h3></div>{history.map((item) => <button type="button" key={item.id} onClick={() => applySite(item)}><span className="candidate-score">{item.suitabilityScore}</span><span className="candidate-address">{item.address}<small>{item.grade}</small></span></button>)}</div>}
      </aside>
      <div className={`dashboard-map ${activeMobilePanel === 'map' ? 'mobile-active' : ''}`}><div className="map-caption"><span>LIVE MAP</span><b>{address || '후보지를 선택하세요'}</b><small>{coordinates ? '선택 위치가 지도에 표시됩니다' : '검색 후 위치를 확인할 수 있습니다'}</small></div>{apiKey ? <MapView apiKey={apiKey} setMap={setMap} selectedCoordinates={coordinates} /> : <div className="map-loading">지도를 불러오는 중...</div>}</div>
      <aside className={`dashboard-panel analysis-panel ${activeMobilePanel === 'result' ? 'mobile-active' : ''}`}>
        <div className="panel-heading"><span className="panel-step">02</span><div><h2>분석 결과</h2><p>적합도와 예상 수익을 확인하세요.</p></div></div>
        {!analysis ? <div className="empty-analysis"><strong>아직 분석 결과가 없어요.</strong><span>후보지를 선택한 후 분석을 실행하면 수익성과 적합도가 이곳에 표시됩니다.</span><button type="button" onClick={() => setActiveMobilePanel('site')}>후보지 선택하기</button></div> : <><div className={`grade-card grade-${gradeClass}`}><div><span>태양광 설치 적합도</span><b>{analysis.grade}</b></div><strong>{analysis.suitabilityScore}<small>점</small></strong><div className="score-bar"><i style={{ width: `${analysis.suitabilityScore}%` }} /></div></div><dl className="score-list"><div><dt>일사량</dt><dd>{analysis.irradiationScore}점</dd></div><div><dt>지형</dt><dd>{analysis.terrainScore}점</dd></div><div><dt>접근성</dt><dd>{analysis.accessScore}점</dd></div></dl><div className="simulation-heading"><span className="panel-step">03</span><div><h3>수익성 시뮬레이션</h3><p>현재 입력 조건 기준의 예상값입니다.</p></div></div><dl className="metric-list"><div><dt>연 수익</dt><dd>{formatNumber(analysis.estimatedAnnualRevenue, '원')}</dd></div><div><dt>투자 회수기간</dt><dd>{formatNumber(analysis.paybackPeriodYears, '년')}</dd></div><div><dt>연간 발전량</dt><dd>{formatNumber(analysis.annualGenerationKwh, ' kWh')}</dd></div><div><dt>설치비</dt><dd>{formatNumber(analysis.estimatedInstallationCost, '원')}</dd></div></dl><button type="button" className="report-button" onClick={downloadReport}>분석 보고서 다운로드 <span>↓</span></button></>}
        {compareSites.length > 0 && <section className="comparison-panel"><div className="comparison-heading"><h3>후보지 비교</h3><button type="button" onClick={() => setCompareSites([])}>초기화</button></div><div className="comparison-list">{compareSites.map((site) => <article key={site.id}><strong>{site.suitabilityScore}점</strong><span>{site.address}</span><small>연 수익 {formatNumber(site.estimatedAnnualRevenue, '원')}</small></article>)}</div></section>}
      </aside>
    </div>
  </section></Layout>;
};

export default DashboardPage;
