// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvbfap6a0u_mqqs7qqor5k_JmG55-AwX4",
  authDomain: "blots-4642d.firebaseapp.com",
  projectId: "blots-4642d",
  storageBucket: "blots-4642d.firebasestorage.app",
  messagingSenderId: "1079280780676",
  appId: "1:1079280780676:web:e8b71624dc76b3a2e849d1",
  measurementId: "G-QBQX7KSKRB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app)