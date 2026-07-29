import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import AnalysisReportDashboard from '../components/AnalysisReportDashboard';
import { fetchMapSearch } from '../api/mapApi';
import { createSiteAnalysis, fetchDemoAnalyses, fetchMyAnalysisHistory } from '../api/dashboardApi';
import { SITE_SORT_OPTIONS, sortSiteAnalyses } from '../utils/siteAnalysisSort';
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
  const [areaM2, setAreaM2] = useState(1200);
  const [capacityKw, setCapacityKw] = useState(100);
  const [installationPlace, setInstallationPlace] = useState('ROOF');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoSites, setDemoSites] = useState([]);
  const [compareSites, setCompareSites] = useState([]);
  const [candidateTypeFilter, setCandidateTypeFilter] = useState('ALL');
  const [candidateSort, setCandidateSort] = useState('suitabilityScore');
  const [candidateSortDirection, setCandidateSortDirection] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState('result');
  const [status, setStatus] = useState({
    type: 'info',
    text: '첨부된 옥상형 분석 보고서의 핵심 결과를 대시보드로 확인하세요.',
  });

  const sortedDemoSites = useMemo(
    () => sortSiteAnalyses(
      demoSites.filter((site) => candidateTypeFilter === 'ALL' || (site.siteType || 'LAND') === candidateTypeFilter),
      candidateSort,
      candidateSortDirection,
    ),
    [demoSites, candidateTypeFilter, candidateSort, candidateSortDirection],
  );

  useEffect(() => {
    fetch('/api/vworld-key')
      .then((response) => response.json())
      .then((data) => setApiKey(data.apiKey))
      .catch(() => setStatus({ type: 'error', text: '지도 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }));
  }, []);

  useEffect(() => {
    fetchDemoAnalyses()
      .then((items) => {
        const nextItems = items || [];
        setDemoSites(nextItems);
        setStatus({
          type: 'success',
          text: '첨부된 옥상형 샘플 보고서를 표시하고 있습니다. 후보지를 선택하면 결과가 갱신됩니다.',
        });
      })
      .catch(() => setStatus({
        type: 'info',
        text: '샘플 보고서 데이터를 표시하고 있습니다. 후보지를 검색해 새 분석을 시작할 수 있습니다.',
      }));
  }, []);

  const applySite = (site) => {
    setAnalysis(site);
    setAddress(site.address);
    setAreaM2(site.areaM2);
    setCapacityKw(site.capacityKw);
    setInstallationPlace(site.siteType || 'LAND');
    setCoordinates(site.longitude && site.latitude ? [site.longitude, site.latitude] : null);
    setActiveMobilePanel('result');
    setStatus({ type: 'success', text: '후보지를 선택했습니다. 분석 보고서가 선택 결과로 갱신되었습니다.' });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    try {
      const data = await fetchMapSearch(keyword.trim());
      const items = data?.response?.status === 'OK' ? data.response.result.items : [];
      setSearchResults(items);
      setStatus({
        type: items.length ? 'info' : 'error',
        text: items.length
          ? '검색 결과에서 분석할 후보지를 선택하세요.'
          : '검색 결과가 없습니다. 주소를 다시 확인해 주세요.',
      });
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
    setStatus({ type: 'loading', text: '입지·수익성·리스크 지표를 계산하고 있습니다.' });
    try {
      const result = await createSiteAnalysis({
        address,
        siteType: installationPlace,
        latitude: coordinates?.[1],
        longitude: coordinates?.[0],
        areaM2: Number(areaM2),
        capacityKw: Number(capacityKw),
      });
      setAnalysis(result);
      setCoordinates(result.longitude && result.latitude
        ? [result.longitude, result.latitude]
        : coordinates);
      setActiveMobilePanel('result');
      setStatus({ type: 'success', text: '분석이 완료되었습니다. AI 판단 근거와 실행 체크리스트를 확인하세요.' });
    } catch (error) {
      setStatus({
        type: 'error',
        text: error.response?.data?.message || '부지 분석에 실패했습니다. 입력값을 확인해 주세요.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const items = await fetchMyAnalysisHistory();
      setHistory(items || []);
      setStatus({
        type: items?.length ? 'success' : 'info',
        text: items?.length ? '최근 분석 이력을 불러왔습니다.' : '저장된 분석 이력이 없습니다.',
      });
    } catch {
      setStatus({ type: 'error', text: '분석 이력은 로그인한 사용자만 조회할 수 있습니다.' });
    }
  };

  const toggleCompare = (site) => {
    setCompareSites((current) => {
      if (current.some((item) => item.id === site.id)) {
        return current.filter((item) => item.id !== site.id);
      }
      if (current.length === 3) {
        setStatus({ type: 'info', text: '후보지는 최대 3곳까지 비교할 수 있습니다.' });
        return current;
      }
      return [...current, site];
    });
  };

  const handleCandidateSortChange = (event) => {
    const nextSort = event.target.value;
    setCandidateSort(nextSort);
    const option = SITE_SORT_OPTIONS.find((item) => item.value === nextSort);
    if (option) setCandidateSortDirection(option.direction);
  };

  const downloadReport = async (targetType) => {
    try {
      const response = await fetch(`/api/pdf/generate/sample?type=${targetType}`);
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `SolarAivle_Sample_${targetType}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus({ type: 'error', text: '보고서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };

  return (
    <Layout>
      <section className="dashboard-page">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">SOLAR SPATIAL INTELLIGENCE</p>
            <h1>통합 대시보드</h1>
            <span>AI 적합도부터 수익성, 리스크와 현장 점검까지 한 화면에서 확인하세요.</span>
          </div>
          <div className="hero-actions">
            <div className="demo-count"><b>{demoSites.length || '-'}</b><span>분석 후보지</span></div>
            <button type="button" className="history-button" onClick={loadHistory}>내 분석 이력</button>
          </div>
        </div>

        <div className={`dashboard-status status-${status.type}`} role="status" aria-live="polite">
          <span className="status-dot" />
          {status.type === 'loading' && <span className="status-spinner" />}
          {status.text}
        </div>

        <nav className="dashboard-mobile-nav" aria-label="대시보드 영역">
          <button type="button" className={activeMobilePanel === 'site' ? 'active' : ''} onClick={() => setActiveMobilePanel('site')}><span>01</span> 후보지</button>
          <button type="button" className={activeMobilePanel === 'map' ? 'active' : ''} onClick={() => setActiveMobilePanel('map')}><span>02</span> 지도</button>
          <button type="button" className={activeMobilePanel === 'result' ? 'active' : ''} onClick={() => setActiveMobilePanel('result')}><span>03</span> 보고서<i /></button>
        </nav>

        <div className="dashboard-grid">
          <aside className={`dashboard-panel search-panel ${activeMobilePanel === 'site' ? 'mobile-active' : ''}`}>
            <div className="panel-heading">
              <span className="panel-step">01</span>
              <div><h2>후보지 조건</h2><p>주소와 설치 조건을 입력하세요.</p></div>
            </div>

            <form onSubmit={handleSearch} className="dashboard-search-form">
              <input aria-label="주소 또는 장소명" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="주소 또는 장소명 입력" />
              <button type="submit">검색</button>
            </form>

            {searchResults.length > 0 && (
              <ul className="dashboard-results">
                {searchResults.map((item, index) => (
                  <li key={`${item.id || item.title}-${index}`}>
                    <button type="button" onClick={() => selectSearchResult(item)}>
                      <strong>{item.title}</strong>
                      <span>{item.address?.road || item.address?.parcel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="site-inputs">
              <div className="installation-place-group">
                <label>선택 후보지<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="검색 결과에서 선택" /></label>
                <fieldset className="installation-place-tabs">
                  <legend>설치 장소</legend>
                  <div className="installation-place-options" role="group" aria-label="설치 장소 선택">
                    <button type="button" className={installationPlace === 'LAND' ? 'selected' : ''} onClick={() => setInstallationPlace('LAND')} aria-pressed={installationPlace === 'LAND'}><span>토지</span><small>지상 설치</small></button>
                    <button type="button" className={installationPlace === 'ROOF' ? 'selected' : ''} onClick={() => setInstallationPlace('ROOF')} aria-pressed={installationPlace === 'ROOF'}><span>지붕/옥상</span><small>건물 상부 설치</small></button>
                  </div>
                </fieldset>
              </div>
              <div className="land-info-group">
                <h3>설치 정보</h3>
                <div className="input-row">
                  <label>전체 면적 (㎡)<input type="number" min="1" value={areaM2} onChange={(event) => setAreaM2(event.target.value)} /></label>
                  <label>설치 용량 (kW)<input type="number" min="0.1" step="0.1" value={capacityKw} onChange={(event) => setCapacityKw(event.target.value)} /></label>
                </div>
              </div>
              <button type="button" className="analyze-button" onClick={handleAnalyze} disabled={loading}>{loading ? '분석 중...' : 'AI 분석 실행'}</button>
            </div>

            {demoSites.length > 0 && (
              <div className="candidate-list">
                <div className="list-title"><h3>분석 후보지</h3><span>{compareSites.length}/3 비교 선택</span></div>
                <div className="candidate-type-filter">
                  <label htmlFor="candidate-type-filter">부지 유형</label>
                  <select id="candidate-type-filter" value={candidateTypeFilter} onChange={(event) => setCandidateTypeFilter(event.target.value)}>
                    <option value="ALL">전체</option><option value="LAND">토지</option><option value="ROOF">지붕/옥상</option>
                  </select>
                </div>
                <div className="candidate-sort-controls">
                  <label htmlFor="candidate-sort">정렬 기준</label>
                  <select id="candidate-sort" value={candidateSort} onChange={handleCandidateSortChange}>
                    {SITE_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setCandidateSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} aria-label="정렬 방향 변경">
                    {candidateSortDirection === 'asc' ? '내림차순' : '오름차순'}
                  </button>
                </div>
                {sortedDemoSites.map((item) => (
                  <div className="candidate-row" key={item.id}>
                    <button type="button" className={analysis?.id === item.id ? 'active' : ''} onClick={() => applySite(item)}>
                      <span className={`candidate-score ${item.suitabilityScore >= 80 ? 'high' : item.suitabilityScore >= 70 ? 'medium' : ''}`}>{item.suitabilityScore}</span>
                      <span className="candidate-address">{item.address}<small>{item.siteType === 'ROOF' ? '지붕/옥상' : '토지'} · {item.grade} · {formatNumber(item.capacityKw, ' kW')}</small></span>
                    </button>
                    <button type="button" className={`compare-toggle ${compareSites.some((site) => site.id === item.id) ? 'selected' : ''}`} onClick={() => toggleCompare(item)} aria-label={`${item.address} 비교 선택`}>비교</button>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="candidate-list history-list">
                <div className="list-title"><h3>내 최근 분석</h3></div>
                {history.map((item) => (
                  <button type="button" key={item.id} onClick={() => applySite(item)}>
                    <span className="candidate-score">{item.suitabilityScore}</span>
                    <span className="candidate-address">{item.address}<small>{item.grade}</small></span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="dashboard-workspace">
            <div className={`dashboard-map ${activeMobilePanel === 'map' ? 'mobile-active' : ''}`}>
              <div className="map-caption">
                <span>LIVE SITE MAP</span>
                <b>{address || '충청남도 홍성군 홍북읍 충남대로 21'}</b>
                <small>{coordinates ? '선택 위치가 지도에 표시됩니다' : '샘플 분석 대상 위치'}</small>
              </div>
              {apiKey
                ? <MapView apiKey={apiKey} setMap={setMap} selectedCoordinates={coordinates} />
                : <div className="map-loading">지도를 불러오는 중...</div>}
            </div>

            <div className={`dashboard-report-pane ${activeMobilePanel === 'result' ? 'mobile-active' : ''}`}>
              <AnalysisReportDashboard
                analysis={analysis}
                address={address}
                areaM2={areaM2}
                capacityKw={capacityKw}
                onDownload={downloadReport}
              />

              {compareSites.length > 0 && (
                <section className="comparison-panel">
                  <div className="comparison-heading"><h3>후보지 비교</h3><button type="button" onClick={() => setCompareSites([])}>초기화</button></div>
                  <div className="comparison-list">
                    {compareSites.map((site) => (
                      <article key={site.id}>
                        <strong>{site.suitabilityScore}점</strong><span>{site.address}</span>
                        <small>연 수익 {formatNumber(site.estimatedAnnualRevenue, '원')}</small>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default DashboardPage;
