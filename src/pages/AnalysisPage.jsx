import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import ChatBot from '../components/ChatBot';
import { GuideTrigger } from '../components/WelcomeGuideModal';
import '../styles/AnalysisPage.css';
import { transform } from 'ol/proj';
import { searchIdleLands, downloadIdleLandReport, fetchIdleLandParcelData } from '../api/idleLandApi';
import { fetchAddressByPoint } from '../api/mapApi';
import { saveDashboardSelections } from '../utils/dashboardSelection';
import instance from '../api/axiosInstance';

const GRADE_CLASS = { A: 'grade-a', B: 'grade-b', C: 'grade-c' };

const AnalysisPage = () => {
  const [map, setMap] = useState(null);
  const [results, setResults] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("지도를 이동해 보세요.");
  const [recentSearches, setRecentSearches] = useState([]);
  const [idleLandResults, setIdleLandResults] = useState([]);
  const [idleLandLoading, setIdleLandLoading] = useState(false);
  const [idleLandSearched, setIdleLandSearched] = useState(false);
  const [idleLandError, setIdleLandError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedIdleLandIds, setSelectedIdleLandIds] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedParcelGeometry, setSelectedParcelGeometry] = useState(null);
  const [selectedPanelLayout, setSelectedPanelLayout] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    instance.get('/vworld-key')
      .then(({ data }) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  useEffect(() => {
    if (map && apiKey) {
      const handleMoveEnd = () => {
        const center = map.getView().getCenter();
        const latLon = transform(center, 'EPSG:3857', 'EPSG:4326');

        fetchAddressByPoint(latLon[0], latLon[1])
          .then((data) => {
            if (data.response?.status === 'OK') {
              setCurrentAddress(data.response.result[0].text);
            } else {
              setCurrentAddress("지도의 위치를 다른곳으로 옮겨서 확인해보세요.");
            }
          })
          .catch(() => setCurrentAddress("통신 오류 발생"));
      };

      map.on('moveend', handleMoveEnd);
      return () => map.un('moveend', handleMoveEnd);
    }
  }, [map, apiKey]);


  const handleItemClick = (item) => {
    setSelectedCoordinates([parseFloat(item.point.x), parseFloat(item.point.y)]);
    setRecentSearches((prev) => {
      const updated = [item, ...prev.filter((i) => i.title !== item.title)].slice(0, 3);
      return updated;
    });
  };

  const handleSearch = (data) => {
    setResults(data);
    setIsSearched(true);
  };

  const handleIdleLandSearch = async (keyword) => {
    setIdleLandLoading(true);
    setIdleLandSearched(true);
    setIdleLandError('');
    try {
      const data = await searchIdleLands(keyword);
      setIdleLandResults(data || []);
      setSelectedIdleLandIds([]);
    } catch (error) {
      setIdleLandResults([]);
      setIdleLandError(error.response?.data?.message || '유휴부지 검색 중 오류가 발생했습니다.');
    } finally {
      setIdleLandLoading(false);
    }
  };

  const handleIdleLandItemClick = async (item) => {
    if (item.longitude == null || item.latitude == null) return;
    setSelectedCoordinates(transform([item.longitude, item.latitude], 'EPSG:4326', 'EPSG:3857'));
    setSelectedAddress(item.address || null);
   
    setSelectedParcelGeometry(null);
    setSelectedPanelLayout(null);
    try {
      const data = await fetchIdleLandParcelData(item.id);
      setSelectedParcelGeometry(data?.parcelGeometry || null);
      setSelectedPanelLayout(data?.panelLayout || null);
    } catch (error) {
      console.error('필지·패널 데이터 조회 실패', error);
      setSelectedParcelGeometry(null);
      setSelectedPanelLayout(null);
    }
  };

  const handleIdleLandSelection = (itemId) => {
    setSelectedIdleLandIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const panelSummary = selectedPanelLayout?.features?.length
    ? {
        total: selectedPanelLayout.features.length,
        valid: selectedPanelLayout.features.filter((f) => f.properties?.valid).length,
      }
    : null;

  const handleDashboardAnalysis = () => {
    const selectedCandidates = idleLandResults.filter((item) => selectedIdleLandIds.includes(item.id));
    const candidates = saveDashboardSelections(selectedCandidates);
    navigate('/dashboard', { state: { selectedCandidates: candidates } });
  };


  return (
    <Layout>
      {!apiKey ? (
        <div>지도를 불러오는 중...</div>
      ) : (
        <>
          <div className="search-bar-container">
            <div className="analysis-page-title"><span>AI 태양광 입지 분석</span><GuideTrigger /></div>
            <SearchBar onSearchResult={handleSearch} onIdleLandSearch={handleIdleLandSearch} />

            {idleLandSearched && (
              <div className="idle-land-panel">
                <h4>유휴부지 후보지 검색 결과</h4>
                {idleLandLoading ? (
                  <div className="no-result">검색 중...</div>
                ) : idleLandError ? (
                  <div className="no-result">{idleLandError}</div>
                ) : idleLandResults.length === 0 ? (
                  <div className="no-result">일치하는 유휴부지 후보지가 없습니다.</div>
                ) : (
                  <ul className="idle-land-list">
                    {idleLandResults.map((item) => (
                      <li
                        key={item.id}
                        className={`idle-land-item ${selectedIdleLandIds.includes(item.id) ? 'selected' : ''}`}
                      >
                        <label className="idle-land-select">
                          <input
                            type="checkbox"
                            checked={selectedIdleLandIds.includes(item.id)}
                            onChange={() => handleIdleLandSelection(item.id)}
                            aria-label={`${item.address} 대시보드 분석 선택`}
                          />
                          <span aria-hidden="true" />
                        </label>
                        <div
                          className="idle-land-item-info"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleIdleLandItemClick(item)}
                          onKeyDown={(e) => e.key === 'Enter' && handleIdleLandItemClick(item)}
                        >
                          <span className={`idle-land-grade ${GRADE_CLASS[item.solarReadinessGrade] || ''}`}>
                            {item.solarReadinessGrade || '-'}
                          </span>
                          <div>
                            <div className="item-title">{item.address}</div>
                            <div className="item-address">
                              {item.assetType === 'BUILDING' ? '건물형' : '토지형'}
                              {item.solarReadinessScore != null && ` · 적합도 ${item.solarReadinessScore.toFixed(1)}점`}
                              {item.candidateRank != null && ` · 전체 ${item.candidateRank}위`}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {idleLandResults.length > 0 && !idleLandLoading && !idleLandError && (
                  <div className="idle-land-dashboard-actions">
                    <span>{selectedIdleLandIds.length}개 후보지 선택</span>
                    <button
                      type="button"
                      className="idle-land-dashboard-btn"
                      disabled={selectedIdleLandIds.length === 0}
                      onClick={handleDashboardAnalysis}
                    >
                      대시보드 분석
                    </button>
                  </div>
                )}
              </div>
            )}

            
                


          </div>

          <div className="map-container">
            <MapView apiKey={apiKey} setMap={setMap} selectedCoordinates={selectedCoordinates} selectedAddress={selectedAddress} parcelGeometry={selectedParcelGeometry} panelLayout={selectedPanelLayout} />

            {panelSummary && (
              <div className="panel-count-badge">
                예상 설치 가능 패널 <strong>{panelSummary.valid}개</strong>
                {panelSummary.valid !== panelSummary.total && ` (전체 ${panelSummary.total}개 중)`}
              </div>
            )}

            <div className="address-display">
              {currentAddress}

            </div>


            {map && (
              <div className="zoom-controls">
                <button onClick={() => map.getView().setZoom(map.getView().getZoom() + 1)}>+</button>
                <button onClick={() => map.getView().setZoom(map.getView().getZoom() - 1)}>-</button>
              </div>
            )}
          </div>
        </>
      )}

      <ChatBot />
    </Layout>
  );
};

export default AnalysisPage;
