import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS'; // [추가] WMS 소스 추가
import { fromLonLat } from 'ol/proj';

const MapView = ({ apiKey, mapRef, setMap }) => {
  const mapElement = useRef(null);

  useEffect(() => {
    // [추가] 지적 경계 레이어 정의
    const cadastralLayer = new TileLayer({
      source: new TileWMS({
        url: 'https://api.vworld.kr/req/wms?',
        params: {
          LAYERS: 'lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun', // 지적 경계선 레이어
          STYLES: 'lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun',
          FORMAT: 'image/png',
          CRS: 'EPSG:3857',
          TRANSPARENT: true,
          APIKEY: apiKey, // 부모에서 전달받은 키 사용
        },
      }),
    });

    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({ 
          source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Satellite/{z}/{y}/{x}.jpeg` }) 
        }),
        cadastralLayer, // [수정] 레이어 배열에 추가
      ],
      view: new View({ center: fromLonLat([127.0486, 37.2635]), zoom: 19 }),
    });

    setMap(initialMap);
    return () => initialMap.setTarget(null);
  }, [apiKey, setMap]);

  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
};

export default MapView;