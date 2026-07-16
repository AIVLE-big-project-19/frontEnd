import { buildGoogleRedirectUri, buildGoogleAuthUrl } from './googleOAuth';

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
