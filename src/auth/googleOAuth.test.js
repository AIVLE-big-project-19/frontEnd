import { buildGoogleRedirectUri, buildGoogleAuthUrl, consumeGoogleOAuthState } from './googleOAuth';

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('buildGoogleRedirectUri는 현재 origin 기준 콜백 경로를 반환한다', () => {
  expect(buildGoogleRedirectUri()).toBe('http://localhost:3000/oauth/google/callback');
});

test('buildGoogleAuthUrl은 client_id, redirect_uri, response_type, scope를 포함한 구글 인증 URL을 반환한다', () => {
  const url = new URL(buildGoogleAuthUrl());
  expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  expect(url.searchParams.get('client_id')).toBe('test-client-id');
  expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/oauth/google/callback');
  expect(url.searchParams.get('response_type')).toBe('code');
  expect(url.searchParams.get('scope')).toBe('openid email profile');
});

test('buildGoogleAuthUrl은 state를 생성해 URL과 sessionStorage에 동일하게 저장한다', () => {
  const url = new URL(buildGoogleAuthUrl());
  const stateInUrl = url.searchParams.get('state');
  expect(stateInUrl).toBeTruthy();
  expect(sessionStorage.getItem('googleOAuthState')).toBe(stateInUrl);
});

test('consumeGoogleOAuthState는 저장된 state를 한 번 반환하고 이후엔 제거되어 있다', () => {
  sessionStorage.setItem('googleOAuthState', 'state-123');
  expect(consumeGoogleOAuthState()).toBe('state-123');
  expect(consumeGoogleOAuthState()).toBeNull();
});
