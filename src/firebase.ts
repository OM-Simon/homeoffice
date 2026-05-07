// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCctBoeSTT23GKbEa68nddaM8HjmIsOd1Q",
  authDomain: "cs-ho-manager.firebaseapp.com",
  projectId: "cs-ho-manager",
  storageBucket: "cs-ho-manager.firebasestorage.app",
  messagingSenderId: "14670306622",
  appId: "1:14670306622:web:b93979c653902f334ae06f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);