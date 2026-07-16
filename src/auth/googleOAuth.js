const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_STORAGE_KEY = 'googleOAuthState';

export const buildGoogleRedirectUri = () => `${window.location.origin}/oauth/google/callback`;

export const buildGoogleAuthUrl = () => {
  const state = window.crypto.randomUUID();
  sessionStorage.setItem(STATE_STORAGE_KEY, state);

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: buildGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
};

// 저장된 state를 1회성으로 읽고 즉시 제거한다(재사용/재생 공격 방지).
export const consumeGoogleOAuthState = () => {
  const state = sessionStorage.getItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  return state;
};
