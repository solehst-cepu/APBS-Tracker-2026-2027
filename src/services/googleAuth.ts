import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface ParsedAuthError {
  code: string;
  message: string;
  isUnauthorizedDomain: boolean;
  isPopupBlocked: boolean;
  currentHostname: string;
  projectId: string;
}

export function parseFirebaseAuthError(error: unknown): ParsedAuthError {
  const errObj = error as { code?: string; message?: string };
  const code = errObj?.code || '';
  const rawMessage = errObj?.message || 'Terjadi kesalahan saat login dengan Google.';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = firebaseConfig.projectId || '';

  if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      message: `Domain "${currentHostname}" belum didaftarkan di Authorized Domains Firebase Authentication (Project: ${projectId}). Tambahkan domain ini di Firebase Console agar Sign in with Google dapat berjalan di Vercel.`,
      isUnauthorizedDomain: true,
      isPopupBlocked: false,
      currentHostname,
      projectId,
    };
  }

  if (code === 'auth/popup-blocked' || rawMessage.includes('auth/popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      message: 'Browser memblokir jendela pop-up login Google. Izinkan pop-up untuk situs ini atau gunakan tombol Mode Redirect.',
      isUnauthorizedDomain: false,
      isPopupBlocked: true,
      currentHostname,
      projectId,
    };
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      message: 'Jendela login Google ditutup sebelum proses masuk selesai. Silakan coba lagi.',
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      currentHostname,
      projectId,
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message: 'Metode login Google belum diaktifkan pada proyek Firebase Authentication Anda.',
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      currentHostname,
      projectId,
    };
  }

  return {
    code,
    message: rawMessage,
    isUnauthorizedDomain: false,
    isPopupBlocked: false,
    currentHostname,
    projectId,
  };
}

export const isRunningInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const checkRedirectAuthResult = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) return null;
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Redirect auth result error:', error);
    throw error;
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan akses token Google Workspace');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignInRedirect = async (): Promise<void> => {
  if (isRunningInIframe()) {
    throw new Error('Mode redirect tidak didukung di dalam iframe preview. Izinkan pop-up browser Anda.');
  }
  await signInWithRedirect(auth, provider);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
