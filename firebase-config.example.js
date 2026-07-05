/* ============================================
   SkyVault — firebase-config.example.js
   
   HOW TO USE:
   1. Copy this file and rename it to: firebase-config.js
   2. Replace each placeholder below with your actual Firebase values
      from: Firebase Console → Your Project → Project Settings → Your apps
   3. firebase-config.js is in .gitignore and will NEVER be committed
   ============================================ */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
  measurementId:     "YOUR_MEASUREMENT_ID"   // optional
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Expose globally for app.js
window.db          = firebase.firestore();
window.auth        = firebase.auth();
window.fbAnalytics = firebase.analytics();

// Mark Firebase as ready
window.firebaseReady = true;
