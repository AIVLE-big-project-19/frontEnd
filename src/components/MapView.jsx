import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style, Stroke, Fill, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';

const parcelStyle = new Style({
  stroke: new Stroke({ color: '#ffdd00', width: 3 }),
  fill: new Fill({ color: 'rgba(255, 221, 0, 0.15)' }),
});


const panelStyleFn = (feature) => {
  const valid = feature.get('valid');
  return new Style({
    stroke: new Stroke({ color: valid ? '#22c55e' : '#ef4444', width: 1 }),
    fill: new Fill({ color: valid ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.25)' }),
  });
};

const geoJsonFormat = new GeoJSON();

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
  <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.716 23.284 0 15 0z" fill="#e11d2e" stroke="#7f1d1d" stroke-width="1.5"/>
  <circle cx="15" cy="15" r="5.5" fill="#ffffff"/>
</svg>`;

const markerIcon = new Icon({
  src: 'data:image/svg+xml;utf8,' + encodeURIComponent(PIN_SVG),
  anchor: [0.5, 1],
});

const buildMarkerStyle = (label) => new Style({
  image: markerIcon,
  text: label
    ? new Text({
        text: label,
        font: '600 12px "Malgun Gothic", sans-serif',
        offsetY: 14,
        textAlign: 'center',
        textBaseline: 'top',
        fill: new Fill({ color: '#ffffff' }),
        backgroundFill: new Fill({ color: 'rgba(24, 23, 23, 0.6)' }),
        padding: [3, 6, 3, 6],
      })
    : undefined,
});

const MapView = ({ apiKey, setMap, selectedCoordinates, selectedAddress, parcelGeometry, panelLayout }) => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markerSource = useRef(new VectorSource());
  const parcelSource = useRef(new VectorSource());
  const panelSource = useRef(new VectorSource());

  useEffect(() => {
    const initialMap = new Map({
      target: mapElement.current,
      controls: [],
      layers: [
        new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) }),
        new VectorLayer({ source: parcelSource.current, style: parcelStyle }),
        new VectorLayer({ source: panelSource.current, style: panelStyleFn }),
        new VectorLayer({ source: markerSource.current }),
      ],
      view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 14 }),
    });
    mapRef.current = initialMap;
    setMap?.(initialMap);
    return () => initialMap.setTarget(null);
  }, [apiKey, setMap]);

  useEffect(() => {
    if (!selectedCoordinates || !mapRef.current) return;
    markerSource.current.clear();
    const point = selectedCoordinates;
    const feature = new Feature(new Point(point));
    feature.setStyle(buildMarkerStyle(selectedAddress));
    markerSource.current.addFeature(feature);
    mapRef.current.getView().animate({ center: point, zoom: 19, duration: 350 });
  }, [selectedCoordinates, selectedAddress]);

  useEffect(() => {
    if (!mapRef.current) return;
    parcelSource.current.clear();
    if (!parcelGeometry) return;
    const feature = geoJsonFormat.readFeature(
      { type: 'Feature', geometry: parcelGeometry },
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
    );
    parcelSource.current.addFeature(feature);
  }, [parcelGeometry]);

  useEffect(() => {
    if (!mapRef.current) return;
    panelSource.current.clear();
    if (!panelLayout) return;
    const features = geoJsonFormat.readFeatures(
      panelLayout,
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
    );
    panelSource.current.addFeatures(features);
  }, [panelLayout]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;
