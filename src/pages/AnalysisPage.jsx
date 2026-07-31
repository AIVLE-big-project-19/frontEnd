import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import ChatBot from '../components/ChatBot';
import '../styles/AnalysisPage.css';
import { transform } from 'ol/proj';
import { searchIdleLands, downloadIdleLandReport } from '../api/idleLandApi';
import { saveDashboardSelections } from '../utils/dashboardSelection';
import { API_BASE_URL } from '../api/axiosInstance';

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
  const [parcelFeatures, setParcelFeatures] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/vworld-key`)
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  useEffect(() => {
    fetch('/data/parcelPolygons.geojson')
      .then((res) => res.json())
      .then((data) => setParcelFeatures(data.features || []))
      .catch((err) => console.error("필지 경계 데이터 로딩 실패", err));
  }, []);

  // 레이캐스팅으로 점이 하나의 폴리곤 링 내부에 있는지 판정 (표준 point-in-polygon 알고리즘)
  const isPointInRing = (lon, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // MultiPolygon(구멍 포함) 내부에 점이 있는지 판정: 외곽선 안쪽 && 어떤 구멍에도 속하지 않아야 함
  const isPointInMultiPolygon = (lon, lat, multiPolygonCoords) =>
    multiPolygonCoords.some(([outerRing, ...holes]) => {
      if (!isPointInRing(lon, lat, outerRing)) return false;
      return !holes.some((hole) => isPointInRing(lon, lat, hole));
    });

  // 검색 결과 좌표와 매칭되는 필지 폴리곤을 찾는다.
  // 주소 문자열은 인코딩이 깨져 있어 신뢰할 수 없으므로 좌표로 매칭한다.
  // "가장 가까운 필지"로 대체하는 방식은 밀집 지역에서 엉뚱한 옆 필지(도로/구거 등)를
  // 잘못 그리는 원인이 되므로 쓰지 않고, 점이 실제로 폴리곤 내부에 있을 때만 매칭한다.
  // 로컬 GeoJSON에는 지적도 조회에 성공한 후보지만 들어있으므로, 이 파일에 없는
  // 주소를 클릭하면 매칭되는 필지가 없어 아무 것도 그려지지 않는 것이 정상 동작이다.
  const findParcelGeometry = (lon, lat) => {
    const numLon = Number(lon);
    const numLat = Number(lat);
    if (!Number.isFinite(numLon) || !Number.isFinite(numLat) || parcelFeatures.length === 0) return null;

    const matched = parcelFeatures.find((feature) => {
      const coords = feature.geometry?.coordinates;
      return coords && isPointInMultiPolygon(numLon, numLat, coords);
    });

    if (!matched) {
      console.info('[parcel] 이 좌표를 포함하는 필지 경계 데이터가 없습니다:', numLon, numLat);
      return null;
    }
    return matched.geometry;
  };

  useEffect(() => {
    if (map && apiKey) {
      const handleMoveEnd = () => {
        const center = map.getView().getCenter();
        const latLon = transform(center, 'EPSG:3857', 'EPSG:4326');

        fetch(`https://api.vworld.kr/req/address?service=address&request=getAddress&point=${latLon[0]},${latLon[1]}&type=road&key=${apiKey}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.response?.status === 'OK') {
              setCurrentAddress(data.response.result[0].text);
            } else {
              setCurrentAddress("해당 위치의 주소 정보가 없습니다.");
            }
          })
          .catch(() => setCurrentAddress("통신 오류 발생"));
      };

      map.on('moveend', handleMoveEnd);
      return () => map.un('moveend', handleMoveEnd);
    }
  }, [map, apiKey]);

  const handleDownloadPdf = async () => {
    if (currentAddress.includes("지도를") || currentAddress.includes("오류")) {
      alert("유효한 주소를 선택해주세요.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAddress }),
      });

      if (!response.ok) throw new Error("PDF 생성 실패");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SolarAivle_Report.pdf';
      a.click();
    } catch (error) {
      console.error("PDF 다운로드 에러:", error);
      alert("보고서 생성 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadSamplePdf = async (targetType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pdf/generate/sample?type=${targetType}`);

      if (!response.ok) throw new Error("예제 PDF 생성 실패");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SolarAivle_Sample_${targetType}.pdf`;
      a.click();
    } catch (error) {
      console.error("예제 PDF 다운로드 에러:", error);
      alert("예제 보고서 생성 중 오류가 발생했습니다.");
    }
  };

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

  const handleIdleLandItemClick = (item) => {
    if (item.longitude == null || item.latitude == null) return;
    setSelectedCoordinates(transform([item.longitude, item.latitude], 'EPSG:4326', 'EPSG:3857'));
    setSelectedAddress(item.address || null);
    // 클릭한 주소와 매칭되는 필지가 있으면 그 폴리곤만 그리고, 없으면 이전에 그려진 선을 지운다.
    setSelectedParcelGeometry(findParcelGeometry(item.longitude, item.latitude));
  };

  const handleIdleLandSelection = (itemId) => {
    setSelectedIdleLandIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const handleDashboardAnalysis = () => {
    const selectedCandidates = idleLandResults.filter((item) => selectedIdleLandIds.includes(item.id));
    const candidates = saveDashboardSelections(selectedCandidates);
    navigate('/dashboard', { state: { selectedCandidates: candidates } });
  };

  const handleIdleLandReportDownload = async (item) => {
    setDownloadingId(item.id);
    try {
      const blob = await downloadIdleLandReport(item.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SolarAivle_${item.sourceId || item.id}_Report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Layout>
      {!apiKey ? (
        <div>지도를 불러오는 중...</div>
      ) : (
        <>
          <div className="search-bar-container">
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
                        <button
                          type="button"
                          className="idle-land-download-btn"
                          disabled={downloadingId === item.id}
                          onClick={() => handleIdleLandReportDownload(item)}
                        >
                          {downloadingId === item.id ? '생성 중...' : '보고서 다운로드'}
                        </button>
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
            <MapView apiKey={apiKey} setMap={setMap} selectedCoordinates={selectedCoordinates} selectedAddress={selectedAddress} parcelGeometry={selectedParcelGeometry} />

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
