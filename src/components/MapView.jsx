import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';

// 빨간 핀 아이콘을 별도 이미지 파일 없이 인라인 SVG로 그림
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
  <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.716 23.284 0 15 0z" fill="#e11d2e" stroke="#7f1d1d" stroke-width="1.5"/>
  <circle cx="15" cy="15" r="5.5" fill="#ffffff"/>
</svg>`;

const markerStyle = new Style({
  image: new Icon({
    src: 'data:image/svg+xml;utf8,' + encodeURIComponent(PIN_SVG),
    anchor: [0.5, 1],
  }),
});

const MapView = ({ apiKey, setMap, selectedCoordinates }) => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markerSource = useRef(new VectorSource());

  useEffect(() => {
    const initialMap = new Map({ target: mapElement.current, layers: [new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) }), new VectorLayer({ source: markerSource.current, style: markerStyle })], view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 14 }) });
    mapRef.current = initialMap;
    setMap(initialMap);
    return () => initialMap.setTarget(null);
  }, [apiKey, setMap]);

  useEffect(() => {
    if (!selectedCoordinates || !mapRef.current) return;
    markerSource.current.clear();
    // VWorld place search is requested with EPSG:900913, which is OpenLayers' EPSG:3857.
    // The returned x/y must therefore be used directly; converting it again as longitude/latitude
    // moves the pin far outside the visible map.
    const point = selectedCoordinates;
    markerSource.current.addFeature(new Feature(new Point(point)));
    // VWorld 위성 타일은 19레벨까지만 제공됨 - 그 이상 확대하면 타일이 없어 회색으로 보임
    mapRef.current.getView().animate({ center: point, zoom: 19, duration: 350 });
  }, [selectedCoordinates]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;
