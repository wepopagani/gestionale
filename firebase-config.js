// ===== CONFIGURAZIONE FIREBASE =====
// Sostituisci questi valori con le tue credenziali Firebase
// 
// COME OTTENERE LE CREDENZIALI:
// 1. Vai su https://console.firebase.google.com/
// 2. Seleziona il tuo progetto (o creane uno nuovo)
// 3. Vai su Impostazioni Progetto (icona ingranaggio) > Generali
// 4. Scorri in basso fino a "Le tue app"
// 5. Se non hai ancora un'app web, click su "Aggiungi app" > Web (icona </>)
// 6. Registra l'app (nome: "Gestionale")
// 7. Copia i valori da "firebaseConfig" e incollali qui sotto

const firebaseConfig = {
    apiKey: "TUA_API_KEY",                          // es: "AIzaSyC..."
    authDomain: "TUO_PROGETTO.firebaseapp.com",    // es: "mio-gestionale.firebaseapp.com"
    databaseURL: "https://TUO_PROGETTO.firebaseio.com", // o "...europe-west1.firebasedatabase.app"
    projectId: "TUO_PROGETTO_ID",                   // es: "mio-gestionale"
    storageBucket: "TUO_PROGETTO.appspot.com",     // es: "mio-gestionale.appspot.com"
    messagingSenderId: "123456789012",              // Numero di 12 cifre
    appId: "1:123456789012:web:abcdef123456"       // ID app completo
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

