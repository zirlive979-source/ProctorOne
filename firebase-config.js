// js/firebase-config.js
// Konfigurasi Firebase proyek "proctorone0".
// Ini adalah client config publik (bukan secret key) — aman ditaruh di frontend,
// tapi keamanan data tetap dijaga lewat Firestore Security Rules (lihat README.md).

const firebaseConfig = {
  apiKey: "AIzaSyAiHWcO2Yr4-vOgoLZbrbCVjVbE6b-vG_k",
  authDomain: "proctorone0.firebaseapp.com",
  projectId: "proctorone0",
  storageBucket: "proctorone0.firebasestorage.app",
  messagingSenderId: "154238804961",
  appId: "1:154238804961:web:537df773a356b1ad14a8a0"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
