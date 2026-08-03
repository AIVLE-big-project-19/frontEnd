import { API_BASE_URL } from './axiosInstance';

export const fetchMapSearch = async (keyword) => {
  const response = await fetch(`${API_BASE_URL}/map/search?keyword=${encodeURIComponent(keyword)}`);
  return response.json();
};


export const fetchAddressByPoint = async (lon, lat) => {
  const response = await fetch(`${API_BASE_URL}/map/address?point=${lon},${lat}`);
  return response.json();
};