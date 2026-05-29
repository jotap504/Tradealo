import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const apiKey = process.env.FIREBASE_API_KEY;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (apiKey) {
  const firebaseConfig = {
    apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  firebaseAuth = getAuth(firebaseApp);
}

export { firebaseAuth };
