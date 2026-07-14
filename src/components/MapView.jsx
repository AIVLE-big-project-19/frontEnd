import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

const MapView = ({ apiKey, mapRef, setMap }) => {
  const mapElement = useRef(null);

  useEffect(() => {
    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) }),
      ],
      view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 19 }),
    });

    setMap(initialMap); // 부모에게 map 객체 전달
    return () => initialMap.setTarget(null);
  }, [apiKey, setMap]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;