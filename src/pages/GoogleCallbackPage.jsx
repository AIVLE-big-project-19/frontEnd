import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleLogin } from '../api/authApi';
import { getMyProfile } from '../api/myPageApi';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../auth/tokenStorage';
import { buildGoogleRedirectUri, consumeGoogleOAuthState } from '../auth/googleOAuth';
import { useRunOnce } from '../hooks/useRunOnce';
import '../styles/AuthPage.css';

const GENERIC_ERROR_MESSAGE = '구글 로그인에 실패했습니다. 다시 시도해주세요.';
const ALREADY_LOCAL_MESSAGE = '이미 일반 회원가입된 이메일입니다. 일반 로그인을 이용해주세요.';

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const hasRun = useRunOnce();

  useEffect(() => {
    if (hasRun()) {
      return;
    }

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
        const profile = await getMyProfile({ skipErrorModal: true });
        auth.login(tokens, profile.loginId || profile.name, true);
        navigate('/', { replace: true });
      } catch {
        setAccessToken(null);
        fail(GENERIC_ERROR_MESSAGE);
      }
    };

    run();
  }, [searchParams, navigate, auth, hasRun]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-subtitle">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
