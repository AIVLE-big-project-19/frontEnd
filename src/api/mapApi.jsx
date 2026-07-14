export const fetchMapSearch = async (keyword) => {
  const response = await fetch(`/api/map/search?keyword=${encodeURIComponent(keyword)}`);
  return response.json();
};