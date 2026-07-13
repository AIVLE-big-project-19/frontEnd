import { useState } from 'react';

function App() {
  const [title, setTitle] = useState('');

  const connectTest = () => {
    fetch('/api/boards/1')
      .then((res) => res.json())
      .then((data) => setTitle(data.title))
      .catch((err) => console.error("연결 실패:", err));
  };

  return (
    <div style={{ padding: '50px' }}>
      <h1>연결 테스트</h1>
      <button onClick={connectTest}>Spring Boot 서버 호출하기</button>
      <p style={{ marginTop: '20px', fontWeight: 'bold' }}>
        서버 응답: {title}
      </p>
    </div>
  );
}

export default App;