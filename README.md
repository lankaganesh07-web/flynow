# SkyVault ✈ — Premium Flight Booking

A modern, premium flight booking web application built with **vanilla HTML, CSS, and JavaScript**, powered by **Firebase** (Firestore + Auth + Analytics).

## ✨ Features

- 🔍 **Flight Search** — Search flights between 20+ cities worldwide
- 🪑 **Cabin Class Selection** — Economy, Business, First Class
- 🏨 **Hotels** — Browse curated hotels with filters (Budget, Mid-range, Luxury)
- 📦 **Packages** — All-inclusive holiday packages (Beach, City, Adventure, Luxury)
- 💳 **Secure Payment** — Card payment flow before booking confirmation
- 🔐 **Firebase Authentication** — Email/Password Sign In & Sign Up
- ☁️ **Firestore** — All bookings saved to cloud in real-time
- 📋 **My Bookings** — Modal showing all past bookings from Firestore
- 🎨 **Premium UI** — Dark glassmorphism, animated particles, gradient effects

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/skyvault-flight-booking.git
cd skyvault-flight-booking
```

### 2. Set up Firebase
```bash
# Copy the example config
cp firebase-config.example.js firebase-config.js
```
Then open `firebase-config.js` and fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com/).

### 3. Enable Firebase Services
In your Firebase Console:
- **Firestore Database** → Create database → Start in test mode
- **Authentication** → Get started → Enable **Email/Password**
- **Analytics** → Enable

### 4. Set Firestore Rules (for development)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{doc} {
      allow read, write: if true;
    }
  }
}
```

### 5. Open the app
Just open `index.html` in your browser — no build step needed!

## 📁 Project Structure

```
projectQ/
├── index.html              # Main SPA shell
├── style.css               # All styles (dark theme, glassmorphism)
├── app.js                  # Main JS — flights, hotels, packages, auth, payment
├── firebase-config.js      # 🔒 GITIGNORED — your real Firebase keys
├── firebase-config.example.js  # ✅ Safe template for new developers
├── .gitignore
└── README.md
```

## 🔒 Security

- `firebase-config.js` is in `.gitignore` and will **never** be committed
- Use `firebase-config.example.js` as the template
- For production, restrict your Firebase API key domains in the Firebase Console

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | Vanilla CSS (glassmorphism, animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Analytics | Firebase Analytics |
| Fonts | Google Fonts (Outfit, DM Sans) |
