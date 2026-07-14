import React from 'react';
import Layout from '../components/Layout'; 

const TestPage = () => {
  return (
    <Layout>
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>레이아웃 테스트 페이지</h1>
        <p>테스트 페이지</p>
        <button onClick={() => alert('테스트 중입니다!')}>
          확인 버튼
        </button>
      </div>
    </Layout>
  );
};

export default TestPage;