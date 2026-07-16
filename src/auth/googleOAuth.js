const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export const buildGoogleRedirectUri = () => `${window.location.origin}/oauth/google/callback`;

export const buildGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: buildGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
};
