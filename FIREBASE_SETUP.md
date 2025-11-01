# 🔥 Guida Configurazione Firebase

Segui questi passaggi per attivare il salvataggio cloud con Firebase.

## 📋 Prerequisiti

- Account Google / Gmail
- Browser web

---

## 🚀 Passaggi Setup

### 1️⃣ Crea/Accedi al Progetto Firebase

1. Vai su **[Firebase Console](https://console.firebase.google.com/)**
2. Fai login con il tuo account Google
3. Click su **"Aggiungi progetto"** (o seleziona uno esistente)
4. Nome progetto: `gestionale` (o nome a tua scelta)
5. Disabilita Google Analytics (opzionale, non necessario)
6. Click **"Crea progetto"**
7. Attendi il completamento e click **"Continua"**

---

### 2️⃣ Abilita Realtime Database

1. Nel menu laterale, vai su **"Realtime Database"**
2. Click su **"Crea database"**
3. **Location**: Scegli la più vicina a te (es: `europe-west1`)
4. **Regole di sicurezza**: Seleziona **"Inizia in modalità test"**
   - ⚠️ Le regole test scadono dopo 30 giorni
   - Più avanti configureremo regole più sicure
5. Click **"Abilita"**

✅ Il database è ora creato e visibile!

---

### 3️⃣ Ottieni le Credenziali

1. Click sull'icona **⚙️ Impostazioni** (in alto a sinistra)
2. Seleziona **"Impostazioni progetto"**
3. Nella tab **"Generali"**, scorri in basso fino a **"Le tue app"**
4. Se non c'è ancora un'app web, click su **"</>"** (Web app)
5. **Nome app**: `Gestionale Web`
6. ❌ NON selezionare "Configura anche Firebase Hosting"
7. Click **"Registra app"**
8. **Copia tutto il blocco firebaseConfig** che appare:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tuo-progetto.firebaseapp.com",
  databaseURL: "https://tuo-progetto.firebaseio.com",
  projectId: "tuo-progetto",
  storageBucket: "tuo-progetto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

### 4️⃣ Configura il Gestionale

1. Apri il file **`firebase-config.js`** nella cartella del gestionale
2. Sostituisci i valori placeholder con quelli copiati:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",                           // ← Incolla qui
    authDomain: "tuo-progetto.firebaseapp.com",    // ← Incolla qui
    databaseURL: "https://tuo-progetto.firebaseio.com", // ← Incolla qui
    projectId: "tuo-progetto",                     // ← Incolla qui
    storageBucket: "tuo-progetto.appspot.com",     // ← Incolla qui
    messagingSenderId: "123456789",                // ← Incolla qui
    appId: "1:123456789:web:abc123"                // ← Incolla qui
};
```

3. **Salva il file**

---

### 5️⃣ Testa la Connessione

1. Apri `index.html` nel browser (o ricarica la pagina)
2. Apri la **Console del Browser** (F12 o Cmd+Option+I su Mac)
3. Cerca questi messaggi:
   - ✅ `Firebase inizializzato con successo!`
   - ✅ `Sincronizzazione cloud attiva!`
4. In alto a destra nella sidebar vedrai:
   - ☁️ **"Cloud"** (verde) = Connesso ✅
   - ☁️ **"Locale"** (grigio) = Non connesso ❌

---

## 🎉 Fatto! Firebase è Attivo

Ora tutti i dati vengono salvati automaticamente sia in locale che nel cloud!

### 🧪 Test Funzionamento

1. Aggiungi un cliente
2. Apri la Firebase Console → Realtime Database
3. Dovresti vedere i dati in formato JSON:

```
gestionale-xxxxx (tuo-database)
  └─ clients
      └─ user_abc123
          └─ [0] (primo cliente)
              ├─ id: "..."
              ├─ name: "Nome Cliente"
              ├─ email: "..."
              └─ ...
```

---

## 🔒 Configura Regole di Sicurezza (Importante!)

Le regole "test" scadono dopo 30 giorni. Ecco regole più sicure:

1. Firebase Console → Realtime Database → **Regole**
2. Sostituisci con queste regole base:

```json
{
  "rules": {
    "clients": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

⚠️ **NOTA**: Queste regole richiedono autenticazione utente.
Per ora puoi usare regole aperte per test:

```json
{
  "rules": {
    "clients": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## 💡 Funzionalità Cloud

### ✅ Cosa Fa Firebase

- ☁️ **Backup automatico**: Tutti i dati salvati nel cloud
- 🔄 **Sync real-time**: Modifiche visibili immediatamente su tutti i dispositivi
- 📱 **Multi-device**: Accedi da PC, tablet, smartphone
- 💾 **Persistenza**: Dati sicuri anche se cancelli il browser
- 🆓 **Gratuito**: Piano Spark gratuito (1GB storage + 10GB transfer/mese)

### 🔄 Sincronizzazione

Quando apri l'app con Firebase attivo:
- Se hai dati sia in locale che nel cloud, ti chiede quali usare
- Le modifiche si sincronizzano automaticamente in tempo reale
- Puoi lavorare offline, i dati si sincronizzano alla riconnessione

---

## ❓ Problemi Comuni

### "Firebase non configurato"
- Controlla di aver copiato tutte le credenziali correttamente
- Verifica che non ci siano virgolette mancanti
- Ricarica la pagina (Ctrl+F5 o Cmd+Shift+R)

### "Errore connessione cloud"
- Verifica la connessione internet
- Controlla che il Realtime Database sia abilitato
- Controlla le regole di sicurezza nella Firebase Console

### Indicatore rimane "Locale"
- Apri la Console browser (F12) e cerca messaggi di errore
- Verifica il `databaseURL` in `firebase-config.js`
- Assicurati che il database sia in modalità "test" o con regole aperte

---

## 📚 Risorse

- [Documentazione Firebase](https://firebase.google.com/docs)
- [Realtime Database Guide](https://firebase.google.com/docs/database)
- [Regole di Sicurezza](https://firebase.google.com/docs/database/security)

---

## 🆘 Supporto

Hai problemi? Controlla:
1. Console browser (F12) per messaggi di errore
2. Firebase Console → Realtime Database → verifica che il DB sia attivo
3. Le credenziali in `firebase-config.js` sono corrette?

**Buon gestionale con Firebase! 🚀**

