import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleLogin } from '../api/authApi';
import { getMyProfile } from '../api/myPageApi';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../auth/tokenStorage';
import { buildGoogleRedirectUri, consumeGoogleOAuthState } from '../auth/googleOAuth';
import '../styles/AuthPage.css';

const GENERIC_ERROR_MESSAGE = '구글 로그인에 실패했습니다. 다시 시도해주세요.';
const ALREADY_LOCAL_MESSAGE = '이미 일반 회원가입된 이메일입니다. 일반 로그인을 이용해주세요.';

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // StrictMode는 개발 모드에서 mount effect를 두 번 실행한다. 구글 인가 code는 1회용이라
    // 두 번째 호출이 이미 소모된 code로 실패해 첫 호출의 성공을 덮어쓸 수 있으므로 1회만 실행되게 막는다.
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const fail = (message) => {
      navigate('/login', { replace: true, state: { message } });
    };

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const expectedState = consumeGoogleOAuthState();

    if (!code || !returnedState || returnedState !== expectedState) {
      fail(GENERIC_ERROR_MESSAGE);
      return;
    }

    const run = async () => {
      let tokens;
      try {
        const result = await googleLogin({ code, redirectUri: buildGoogleRedirectUri() });
        tokens = result.data;
      } catch (err) {
        if (err.response?.status === 409) {
          fail(ALREADY_LOCAL_MESSAGE);
        } else {
          fail(GENERIC_ERROR_MESSAGE);
        }
        return;
      }

      try {
        setAccessToken(tokens.accessToken);
        const profile = await getMyProfile();
        auth.login(tokens, profile.loginId, true);
        navigate('/', { replace: true });
      } catch {
        setAccessToken(null);
        fail(GENERIC_ERROR_MESSAGE);
      }
    };

    run();
  }, [searchParams, navigate, auth]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-subtitle">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
