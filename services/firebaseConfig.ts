import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDfB_L0wUSedHvqjRrxS_gwjODs7tPa5zM",
  authDomain: "wtp-apps.firebaseapp.com",
  databaseURL: "https://wtp-apps-default-rtdb.firebaseio.com",
  projectId: "wtp-apps",
  storageBucket: "wtp-apps.firebasestorage.app",
  messagingSenderId: "177289312201",
  appId: "1:177289312201:web:e79fe0d4888ab70b755a18",
  measurementId: "G-6ZZWJF3G9T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services with server-side safety checks
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;