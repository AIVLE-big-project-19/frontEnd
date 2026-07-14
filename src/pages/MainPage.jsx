import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';

const MainPage = () => {
  const [map, setMap] = useState(null);
  const [results, setResults] = useState([]);
  const [apiKey, setApiKey] = useState(null); // 백엔드에서 받은 키 상태

  useEffect(() => {
    // 백엔드 API 호출
    fetch('/api/vworld-key')
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((err) => console.error("키 로딩 실패", err));
  }, []);

  const handleMove = (x, y) => {
    if (map) {
      map.getView().setCenter([parseFloat(x), parseFloat(y)]);
      map.getView().setZoom(19);
    }
  };

  // 키를 가져오기 전까지 대기
  if (!apiKey) return <div>지도를 불러오는 중...</div>;

  return (
    <div>
      <SearchBar onSearchResult={setResults} />
      
      {/* 백엔드에서 받은 apiKey를 전달 */}
      <MapView apiKey={apiKey} setMap={setMap} />
      
      {results.length > 0 && (
        <ul>
          {results.map((item, i) => (
            <li key={i} onClick={() => handleMove(item.point.x, item.point.y)} style={{ cursor: 'pointer' }}>
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MainPage;