// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDO36KGPU_eTWkUmXum3AsTN2MF55gX-EM",
  authDomain: "sundayroles-82235.firebaseapp.com",
  projectId: "sundayroles-82235",
  storageBucket: "sundayroles-82235.firebasestorage.app",
  messagingSenderId: "527108942830",
  appId: "1:527108942830:web:b2158b7ca92ee2dea43cff",
  measurementId: "G-H0D6FNB3PW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
