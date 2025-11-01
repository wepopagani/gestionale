// ===== CONFIGURAZIONE FIREBASE =====
// Credenziali del progetto: gestionale-a0cb6
// Database: europe-west1

const firebaseConfig = {
  apiKey: "AIzaSyCBUMEwdWXnPKaMdkhtPSMwouMFeyDlsH0",
  authDomain: "gestionale-a0cb6.firebaseapp.com",
  databaseURL: "https://gestionale-a0cb6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestionale-a0cb6",
  storageBucket: "gestionale-a0cb6.firebasestorage.app",
  messagingSenderId: "138577304711",
  appId: "1:138577304711:web:7c93e1fc4b62c5447dac22",
  measurementId: "G-T0BGZHM5E4"
};

// IMPORTANTE: Abilita Realtime Database
// 1. Nel menu Firebase Console, vai su "Realtime Database"
// 2. Click "Crea database"
// 3. Scegli location (es: europe-west1)
// 4. Inizia in modalità test (per ora)
// 5. Regole di sicurezza iniziali:
/*
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
*/
// ⚠️ ATTENZIONE: Queste regole sono aperte per test!
// Per produzione, configura regole più sicure con autenticazione

// Esporta la configurazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}

