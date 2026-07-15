import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Layout from '../components/Layout';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import ChatBot from '../components/ChatBot';
import '../styles/MainPage.css';
import { transform } from 'ol/proj';

const MainPage = () => {
  const [map, setMap] = useState(null);
  const [results, setResults] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("지도를 이동해 보세요.");
  const [recentSearches, setRecentSearches] = useState([]);
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

  const handleMove = (x, y) => {
    if (map) {
      map.getView().setCenter([parseFloat(x), parseFloat(y)]);
      map.getView().setZoom(19);
    }
  };

  const handleItemClick = (item) => {
    handleMove(item.point.x, item.point.y);
    setRecentSearches((prev) => {
      const updated = [item, ...prev.filter((i) => i.title !== item.title)].slice(0, 3);
      return updated;
    });
  };

  const handleSearch = (data) => {
    setResults(data);
    setIsSearched(true);
  };

  return (
    <Layout>
      {!apiKey ? (
        <div>지도를 불러오는 중...</div>
      ) : (
        <>
          <div className="search-bar-container">
            <SearchBar onSearchResult={handleSearch} />

            {(isSearched || recentSearches.length > 0) && (
              <div className="results-wrapper">
                {isSearched && (
                  results.length > 0 ? (
                    <ul className="dropdown-list">
                      {results.map((item, i) => (
                        <li key={i} onClick={() => handleItemClick(item)} className="result-item">
                          <div className="item-title">{item.title}</div>
                          <div className="item-address">{item.address?.road || item.address?.parcel}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-result">검색 결과가 없습니다.</div>
                  )
                )}

                {recentSearches.length > 0 && (
                  <div className="recent-searches">
                    <h4>최근 검색 기록</h4>
                    {recentSearches.map((item, i) => (
                      <div key={i} className="recent-item" onClick={() => handleItemClick(item)}>
                        {item.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="map-container">
            <MapView apiKey={apiKey} setMap={setMap} />

            <div className="address-display">
              {currentAddress}
              <button className="pdf-download-btn" onClick={handleDownloadPdf} style={{marginLeft: '10px'}}>
                보고서 다운로드
              </button>

              <button className="board-move-btn" onClick={() => navigate("/boards")} style={{ marginLeft: '10px' }}>
                게시판
              </button>
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

export default MainPage;
