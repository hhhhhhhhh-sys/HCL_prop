// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Add if using Authentication
import { getFirestore } from "firebase/firestore"; // Add if using Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDQzG7stvPQBxFl1BbR6EsY1Efu_ckBGBo",
  authDomain: "attendance-management-sy-d81b1.firebaseapp.com",
  projectId: "attendance-management-sy-d81b1",
  storageBucket: "attendance-management-sy-d81b1.firebasestorage.app",
  messagingSenderId: "893624544452",
  appId: "1:893624544452:web:a872e68d122fe4a3b6ad91",
  measurementId: "G-XK91QXQNKK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app); // For Authentication
export const db = getFirestore(app); // For Firestore Database
// export const analytics = getAnalytics(app); // (Optional) If using Analytics