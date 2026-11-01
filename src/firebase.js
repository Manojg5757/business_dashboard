import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const e = import.meta.env;
export const firebaseConfig = {
  apiKey: e.VITE_FB_API_KEY,
  authDomain: e.VITE_FB_AUTH_DOMAIN,
  projectId: e.VITE_FB_PROJECT_ID,
  storageBucket: e.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: e.VITE_FB_SENDER_ID,
  appId: e.VITE_FB_APP_ID,
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-south1');
// Comma-separated list of Google accounts allowed to use the dashboard
export const OWNER_EMAILS = (e.VITE_OWNER_EMAIL || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
export const VAPID_KEY = e.VITE_FB_VAPID_KEY;
