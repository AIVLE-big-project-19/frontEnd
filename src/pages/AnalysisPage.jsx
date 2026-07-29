import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import ChatBot from '../components/ChatBot';
import '../styles/AnalysisPage.css';
import { transform } from 'ol/proj';
import { searchIdleLands, downloadIdleLandReport } from '../api/idleLandApi';

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
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/vworld-key')
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  useEffect(() => {
    if (map && apiKey) {
      const handleMoveEnd = () => {
        const center = map.getView().getCenter();
        const latLon = transform(center, 'EPSG:3857', 'EPSG:4326');

        fetch(`/vworld-api/req/address?service=address&request=getAddress&point=${latLon[0]},${latLon[1]}&type=road&key=${apiKey}`)
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
      const response = await fetch('/api/pdf/generate', {
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
      const response = await fetch(`/api/pdf/generate/sample?type=${targetType}`);

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
                      <li key={item.id} className="idle-land-item">
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
              </div>
            )}

            
                


          </div>

          <div className="map-container">
            <MapView apiKey={apiKey} setMap={setMap} selectedCoordinates={selectedCoordinates} />

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
