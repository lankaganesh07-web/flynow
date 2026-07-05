/* ============================================
   SkyVault — firebase-config.js
   Firebase initialization (compat SDK v10)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCMjb4UeMZ9BvkmqBHo03MLICgLg2nU-qE",
  authDomain: "flight-booking-ticket-a5447.firebaseapp.com",
  projectId: "flight-booking-ticket-a5447",
  storageBucket: "flight-booking-ticket-a5447.firebasestorage.app",
  messagingSenderId: "986928556354",
  appId: "1:986928556354:web:351246c9883f710d7940db",
  measurementId: "G-KMN1S22BWX"
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Expose globally for app.js
window.db = firebase.firestore();
window.auth = firebase.auth();
window.fbAnalytics = firebase.analytics();

// Mark Firebase as ready
window.firebaseReady = true;

console.log("%c🔥 Firebase connected — SkyVault", "color:#A78BFA;font-weight:700;font-size:13px;");
