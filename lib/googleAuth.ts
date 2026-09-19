// Client-side Google OAuth authorization helper

export interface GoogleUserSession {
  accessToken: string;
  expiresAt: number; // Timestamp in ms
  email?: string;
  name?: string;
  picture?: string;
}

const STORAGE_KEY = 'GOOGLE_AUTH_SESSION';

// Reads from environment variable NEXT_PUBLIC_GOOGLE_CLIENT_ID
export const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export function getStoredAuthSession(): GoogleUserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: GoogleUserSession = JSON.parse(raw);
    // Check if token is expired (giving 60s buffer)
    if (session.expiresAt && Date.now() >= session.expiresAt - 60000) {
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function saveAuthSession(session: GoogleUserSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Fetch Google User Profile using token
export async function fetchUserInfo(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    }
  } catch (err) {
    console.error('Failed to fetch user info:', err);
  }
  return {};
}

// Load GIS script dynamically
export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// Prompt user for Google Login via GIS Token Client or OAuth popup
export async function requestGoogleAccessToken(): Promise<GoogleUserSession> {
  const clientId = DEFAULT_CLIENT_ID;

  if (!clientId) {
    throw new Error('Google OAuth Client ID is missing. Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (google && google.accounts && google.accounts.oauth2) {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (response.access_token) {
              const expiresIn = Number(response.expires_in || 3600);
              const expiresAt = Date.now() + expiresIn * 1000;
              const userInfo = await fetchUserInfo(response.access_token);

              const session: GoogleUserSession = {
                accessToken: response.access_token,
                expiresAt,
                ...userInfo,
              };

              saveAuthSession(session);
              resolve(session);
            } else {
              reject(new Error('No access token received from Google.'));
            }
          },
        });
        client.requestAccessToken();
      } else {
        // Fallback popup if GIS client fails to load
        const redirectUri = window.location.origin;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=token&scope=${encodeURIComponent(SCOPES)}`;

        const popup = window.open(authUrl, 'GoogleAuthPopup', 'width=500,height=600');
        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        const checkPopup = setInterval(() => {
          try {
            if (!popup || popup.closed) {
              clearInterval(checkPopup);
              reject(new Error('Google Authorization window closed by user.'));
            }
            if (popup.location.hash) {
              const hashParams = new URLSearchParams(popup.location.hash.substring(1));
              const token = hashParams.get('access_token');
              const expiresIn = Number(hashParams.get('expires_in') || 3600);
              popup.close();
              clearInterval(checkPopup);

              if (token) {
                const expiresAt = Date.now() + expiresIn * 1000;
                fetchUserInfo(token).then((userInfo) => {
                  const session: GoogleUserSession = {
                    accessToken: token,
                    expiresAt,
                    ...userInfo,
                  };
                  saveAuthSession(session);
                  resolve(session);
                });
              } else {
                reject(new Error('Authorization failed or denied.'));
              }
            }
          } catch (e) {
            // Ignore cross-origin errors while polling location
          }
        }, 500);
      }
    } catch (err: any) {
      reject(err);
    }
  });
}
