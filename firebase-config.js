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

// URL pubblico dove è online il gestionale (https), per i link registrazione clienti.
const gestionalePublicUrl = 'https://clienti.3dmakes.ch';

// Password team per il gestionale staff (cambiala in firebase-config.js).
// Nota: è visibile nel codice sorgente — usa una password dedicata, non quella email.
const gestionaleStaffPassword = 'SQUIDDY2026';

// Esposto su window per auth-staff.js
if (typeof window !== 'undefined') {
    window.gestionaleStaffPassword = gestionaleStaffPassword;
    window.gestionalePublicUrl = gestionalePublicUrl;
}

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

// ===== FIRESTORE (preventivi) =====
// Per «Genera Preventivo», link registrazione clienti e «Storico Preventivi»: nella Firebase Console abilita
// Firestore Database (stesso progetto gestionale-a0cb6). Esempio regole di test:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /preventivi/{id} { allow read, write: if true; }
    match /counters/{id} { allow read, write: if true; }
    match /client_intake_links/{id} { allow read, write: if true; }
  }
}
*/

// ===== AUTENTICAZIONE ANONIMA =====
// Staff: password in auth-staff.js → poi login anonimo Firebase.
// Pubblico: registrazione-cliente.html usa initFirebaseAuthAnon() direttamente.
let _firebaseAuthPromise = null;
function initFirebaseAuthAnon() {
    if (_firebaseAuthPromise) return _firebaseAuthPromise;
    _firebaseAuthPromise = new Promise((resolve, reject) => {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK non caricato.');
            }
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            if (typeof firebase.auth !== 'function') {
                throw new Error('Firebase Auth SDK mancante: aggiungi firebase-auth-compat.js alla pagina.');
            }
            const auth = firebase.auth();
            if (auth.currentUser) {
                resolve(auth.currentUser);
                return;
            }
            let resolved = false;
            const unsub = auth.onAuthStateChanged(user => {
                if (user && !resolved) {
                    resolved = true;
                    try { unsub(); } catch (e) { /* ignore */ }
                    resolve(user);
                }
            });
            auth.signInAnonymously().catch(err => {
                if (!resolved) {
                    resolved = true;
                    try { unsub(); } catch (e) { /* ignore */ }
                    reject(err);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
    return _firebaseAuthPromise;
}

// Esporta la configurazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}

