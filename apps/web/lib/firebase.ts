import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

declare global {
  interface Window {
    __FIREBASE_CONFIG__?: {
      apiKey?: string;
      authDomain?: string;
      projectId?: string;
      appId?: string;
    };
  }
}

const config = typeof window !== 'undefined' ? window.__FIREBASE_CONFIG__ : undefined;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (config?.apiKey) {
  firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0]!;
  firebaseAuth = getAuth(firebaseApp);
}

export { firebaseAuth };
