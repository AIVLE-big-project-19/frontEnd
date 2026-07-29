import React, { useState } from 'react';

export default function SolarAnalysisComponent() {
  const [imageFile, setImageFile] = useState(null);
  const [extent3857, setExtent3857] = useState('14137453.06,4347530.64,14137653.06,4347730.64');
  const [results, setResults] = useState([]);
  const [annotatedImage, setAnnotatedImage] = useState(''); // Base64 이미지 상태
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert('지도 이미지를 선택해 주세요.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('extent3857', extent3857);

    try {
      const response = await fetch('http://localhost:8080/api/v1/solar/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('분석 실패');

      const data = await response.json();
      setResults(data.predictions || []);
      setAnnotatedImage(data.annotated_image || ''); // Base64 이미지 세팅
    } catch (error) {
      console.error(error);
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>☀️ 태양광 입지 AI 분석 (시각화 결과)</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" disabled={loading} style={{ marginLeft: '10px' }}>
          {loading ? '분석 중...' : '분석 시작'}
        </button>
      </form>

      {/* 🖼️ AI가 분석하여 Polygon을 입힌 이미지 출력 */}
      {annotatedImage && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3>🎨 AI 감지 영역 시각화 결과</h3>
          <img
            src={annotatedImage}
            alt="AI Visualized Result"
            style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #007bff' }}
          />
        </div>
      )}

      {/* 📊 상세 데이터 리스트 */}
      <h3>📊 감지 목록 ({results.length}건)</h3>
      {results.map((item, index) => (
        <div key={index} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '8px' }}>
          <strong>후보지 #{index + 1} ({item.candidate_type})</strong> - 신뢰도: {(item.confidence * 100).toFixed(1)}%, 면적: {item.real_area.toFixed(2)}m²
        </div>
      ))}
    </div>
  );
}