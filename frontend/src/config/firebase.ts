import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCdyEYHG_cbOed_5GSpku9At98-4mSqTG8",
  authDomain: "qrcodeborrowdiwa.firebaseapp.com",
  projectId: "qrcodeborrowdiwa",
  storageBucket: "qrcodeborrowdiwa.firebasestorage.app",
  messagingSenderId: "889751326787",
  appId: "1:889751326787:web:2601cc18b05c9084fe04f6",
  measurementId: "G-69DZBETXGL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut };
