import React, { useState } from 'react';
import { fetchMapSearch } from '../api/mapApi';

const SearchBar = ({ onSearchResult }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = async () => {
    const data = await fetchMapSearch(keyword);
    if (data.response.status === 'OK') onSearchResult(data.response.result.items);
    else onSearchResult([]);
  };

  return (
    <div style={{ padding: '10px' }}>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <button onClick={handleSearch}>검색</button>
    </div>
  );
};

export default SearchBar;