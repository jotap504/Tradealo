import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
export const firebaseAuth = getAuth(firebaseApp);
