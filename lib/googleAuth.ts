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

export function requestGoogleAccessToken(): Promise<GoogleUserSession> {
  const clientId = DEFAULT_CLIENT_ID;

  if (!clientId) {
    return Promise.reject(new Error('Google OAuth Client ID is missing. Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.'));
  }

  const doAuth = () => new Promise<GoogleUserSession>((resolve, reject) => {
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
        reject(new Error('Google Identity Services script not loaded. Please wait a moment and try again.'));
      }
    } catch (err: any) {
      reject(err);
    }
  });

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cannot authenticate on server side'));
  }

  // If already loaded, call synchronously to preserve gesture
  if ((window as any).google?.accounts?.oauth2) {
    return doAuth();
  } else {
    // Attempt to load and then call, though this might get popup blocked on mobile
    return loadGoogleIdentityScript().then(doAuth);
  }
}
