import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';

const markerStyle = new Style({
  image: new CircleStyle({ radius: 9, fill: new Fill({ color: '#f5ad24' }), stroke: new Stroke({ color: '#071a2f', width: 3 }) }),
});

const MapView = ({ apiKey, setMap, selectedCoordinates }) => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markerSource = useRef(new VectorSource());

  useEffect(() => {
    const cadastralLayer = new TileLayer({ source: new TileWMS({ url: 'https://api.vworld.kr/req/wms?', params: { LAYERS: 'lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun', STYLES: 'lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun', FORMAT: 'image/png', CRS: 'EPSG:3857', TRANSPARENT: true, APIKEY: apiKey } }) });
    const initialMap = new Map({ target: mapElement.current, layers: [new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) }), cadastralLayer, new VectorLayer({ source: markerSource.current, style: markerStyle })], view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 14 }) });
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
    mapRef.current.getView().animate({ center: point, zoom: 18, duration: 350 });
  }, [selectedCoordinates]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;
