import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import '../styles/MainPage.css';
import { transform } from 'ol/proj';
import AuthNav from '../components/AuthNav';

const MainPage = () => {
  const [map, setMap] = useState(null);
  const [results, setResults] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("지도를 이동해 보세요.");

  useEffect(() => {
    fetch('/api/vworld-key')
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  // [수정] moveend 이벤트는 딱 한 곳에서만 관리합니다.
useEffect(() => {
  if (map && apiKey) {
const handleMoveEnd = () => {
  const center = map.getView().getCenter(); // [14142802, 4476290] 같은 값 반환
  
  // [수정] EPSG:3857(현재 지도) 좌표를 EPSG:4326(경위도)으로 변환
  const latLon = transform(center, 'EPSG:3857', 'EPSG:4326');
  
  // 변환된 latLon[0](경도), latLon[1](위도) 사용
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
    return () => map.un('moveend', handleMoveEnd); // 이벤트 정리
  }
}, [map, apiKey]);


  useEffect(() => {
    fetch('/api/vworld-key')
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  // 지도가 로드된 후 moveend 이벤트 등록
  useEffect(() => {
    if (map) {
      map.on('moveend', () => {
        // 실제 운영 시에는 여기서 VWorld 역지오코딩 API를 호출하여 주소를 업데이트하세요
        setCurrentAddress("지도 중심 주소 표시 영역");
      });
    }
  }, [map]);

  const handleMove = (x, y) => {
    if (map) {
      map.getView().setCenter([parseFloat(x), parseFloat(y)]);
      map.getView().setZoom(19);
    }
  };

  const handleSearch = (data) => {
    setResults(data);
    setIsSearched(true);
  };

  if (!apiKey) return <div>지도를 불러오는 중...</div>;

  return (
    <div className="app-container">
      <header>
        <div className="logo">SolarAivle</div>
        <AuthNav />
      </header>

      <main className="main-content">
        <div className="search-bar-container">
          <SearchBar onSearchResult={handleSearch} />
          
          {isSearched && (
            results.length > 0 ? (
              <ul className="dropdown-list">
                {results.map((item, i) => (
                  <li key={i} onClick={() => handleMove(item.point.x, item.point.y)} className="result-item">
                    <div className="item-title">{item.title}</div>
                    <div className="item-address">{item.address?.road || item.address?.parcel}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-result">검색 결과가 없습니다.</div>
            )
          )}
        </div>
        
        <div className="map-container">
          <MapView apiKey={apiKey} setMap={setMap} />
          
          <div className="address-display"> {currentAddress}</div>

          {map && (
            <div className="zoom-controls">
              <button onClick={() => map.getView().setZoom(map.getView().getZoom() + 1)}>+</button>
              <button onClick={() => map.getView().setZoom(map.getView().getZoom() - 1)}>-</button>
            </div>
          )}
        </div>
      </main>

      <footer>
        © 2026 19th Big Project. All rights reserved.
      </footer>
    </div>
  );
};

export default MainPage;