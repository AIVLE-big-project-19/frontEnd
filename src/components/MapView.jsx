import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

const MapView = ({ apiKey, setMap, selectedCoordinates }) => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const initialMap = new Map({ target: mapElement.current, layers: [new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) })], view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 14 }) });
    mapRef.current = initialMap;
    setMap(initialMap);
    return () => initialMap.setTarget(null);
  }, [apiKey, setMap]);

  useEffect(() => {
    if (!selectedCoordinates || !mapRef.current) return;
    // VWorld place search returns EPSG:900913 coordinates, which OpenLayers uses as EPSG:3857.
    // Move the satellite map to the selected location without rendering a marker.
    mapRef.current.getView().animate({ center: selectedCoordinates, zoom: 18, duration: 350 });
  }, [selectedCoordinates]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;
