import React, { useState } from 'react';
import { fetchMapSearch } from '../api/mapApi';
import { SIDO_LIST, KOREA_REGIONS } from '../data/koreaRegions';

const SearchBar = ({ onSearchResult }) => {
  const [keyword, setKeyword] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [detailKeyword, setDetailKeyword] = useState('');

  const runSearch = async (searchKeyword) => {
    if (!searchKeyword.trim()) {
      onSearchResult([]);
      return;
    }
    const data = await fetchMapSearch(searchKeyword);
    if (data.response.status === 'OK') onSearchResult(data.response.result.items);
    else onSearchResult([]);
  };

  const handleSearch = () => runSearch(keyword);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSidoChange = (e) => {
    setSido(e.target.value);
    setSigungu('');
  };

  const handleDetailSearch = () => {
    const combined = [sido, sigungu, detailKeyword.trim()].filter(Boolean).join(' ');
    runSearch(combined);
  };

  const handleDetailKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleDetailSearch();
    }
  };

  return (
    <div className="search-bar-root">
      <div className="search-input-row">
        <input value={keyword} onKeyDown={handleKeyDown} onChange={(e) => setKeyword(e.target.value)} />
        <button className="search-button" onClick={handleSearch}>검색</button>
      </div>

      <button
        type="button"
        className="detail-search-toggle"
        onClick={() => setShowDetail((prev) => !prev)}
      >
        상세검색 {showDetail ? '▲' : '▼'}
      </button>

      {showDetail && (
        <div className="detail-search-panel">
          <div className="detail-search-selects">
            <select value={sido} onChange={handleSidoChange}>
              <option value="">시/도 선택</option>
              {SIDO_LIST.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select value={sigungu} onChange={(e) => setSigungu(e.target.value)} disabled={!sido}>
              <option value="">시/군/구 선택</option>
              {(KOREA_REGIONS[sido] || []).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <input
            className="detail-search-input"
            placeholder="상세 주소/키워드 (선택)"
            value={detailKeyword}
            onKeyDown={handleDetailKeyDown}
            onChange={(e) => setDetailKeyword(e.target.value)}
          />

          <button className="search-button detail-search-button" onClick={handleDetailSearch} disabled={!sido}>
            지역으로 검색
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;