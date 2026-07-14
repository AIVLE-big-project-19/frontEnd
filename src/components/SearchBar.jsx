import React, { useState } from 'react';
import { fetchMapSearch } from '../api/mapApi';



const SearchBar = ({ onSearchResult }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = async () => {
    const data = await fetchMapSearch(keyword);
    if (data.response.status === 'OK') onSearchResult(data.response.result.items);
    else onSearchResult([]);
  };
  
  const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
};

  return (
    <div style={{ padding: '10px' }}>
      <input value={keyword} onKeyDown={handleKeyDown} onChange={(e) => setKeyword(e.target.value)} />
      <button className="search-button" onClick={handleSearch}>검색</button>
    </div>
  );
};

export default SearchBar;