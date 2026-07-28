import { useEffect, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import MapView from './MapView';

const SatelliteThumbnail = ({ apiKey, point, height = '320px' }) => {
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!map || !point) return;
    map.getView().setCenter(fromLonLat([point.lon, point.lat]));
    map.getView().setZoom(19);
  }, [map, point]);

  return <MapView apiKey={apiKey} setMap={setMap} height={height} />;
};

export default SatelliteThumbnail;
