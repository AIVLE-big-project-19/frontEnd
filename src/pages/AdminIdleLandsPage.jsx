import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { uploadIdleLandCsv, uploadIdleLandCsvFromS3 } from '../api/idleLandApi';
import '../styles/adminUsers.css';
import '../styles/adminIdleLands.css';

function AdminIdleLandsPage() {
  const { isAdmin, isInitializing } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [s3Loading, setS3Loading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setResult(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('업로드할 CSV 파일을 선택해주세요.');
      return;
    }
    if (!window.confirm('기존 유휴부지 데이터를 이 CSV 내용으로 전량 교체합니다. 계속하시겠습니까?')) {
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    try {
      const data = await uploadIdleLandCsv(selectedFile);
      setResult(data);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || '유휴부지 CSV 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFromS3 = async () => {
    if (!window.confirm('S3에 올려둔 CSV로 기존 유휴부지 데이터를 전량 교체합니다. 계속하시겠습니까?')) {
      return;
    }

    setS3Loading(true);
    setError('');
    setResult(null);
    try {
      const data = await uploadIdleLandCsvFromS3();
      setResult(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'S3에서 CSV를 가져오는 데 실패했습니다.');
    } finally {
      setS3Loading(false);
    }
  };

  if (isInitializing) {
    return <Layout><div className="admin-users-state">권한을 확인하는 중...</div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="admin-users-state">
          <h1>접근 권한이 없습니다.</h1>
          <p>관리자 계정으로 로그인해야 유휴부지 데이터를 관리할 수 있습니다.</p>
          <button type="button" onClick={() => navigate('/')}>홈으로</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="admin-users-page">
        <div className="admin-users-heading">
          <div>
            <span>ADMINISTRATION</span>
            <h1>유휴부지 데이터 관리</h1>
            <p>유휴부지 CSV를 업로드하면 기존 데이터를 전량 교체합니다.</p>
          </div>
        </div>

        {error && <div className="admin-users-error" role="alert">{error}</div>}

        <div className="idle-land-upload-card">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            className="idle-land-upload-btn"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? '업로드 중...' : '업로드 및 전량 교체'}
          </button>

          {result && (
            <div className="idle-land-upload-result">
              업로드 완료: 총 {result.totalCount}건 (토지 {result.landCount} / 건물 {result.buildingCount}
              {result.unknownCount > 0 && ` / 미확인 ${result.unknownCount}`})
            </div>
          )}
        </div>

        <div className="idle-land-upload-card idle-land-s3-card">
          <div className="idle-land-s3-info">
            <span className="idle-land-s3-badge">테스트용</span>
            <p>파일을 직접 고르지 않고, S3에 미리 올려둔 CSV를 그대로 가져와 같은 방식으로 전량 교체합니다.</p>
          </div>
          <button
            type="button"
            className="idle-land-upload-btn idle-land-s3-btn"
            onClick={handleUploadFromS3}
            disabled={s3Loading || uploading}
          >
            {s3Loading ? '가져오는 중...' : 'S3에서 불러오기'}
          </button>
        </div>
      </main>
    </Layout>
  );
}

export default AdminIdleLandsPage;
