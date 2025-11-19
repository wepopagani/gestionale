# 📱 Installazione su iPhone

## Come installare 3DMAKES Gestionale come App

### Passo 1: Apri in Safari
Apri il gestionale nel browser **Safari** (non Chrome o altri browser).  
URL: `file:///Users/wepo/Desktop/gestionale/index.html`

### Passo 2: Condividi
Tocca il pulsante **Condividi** (l'icona con la freccia verso l'alto) nella barra in basso.

### Passo 3: Aggiungi alla Home
Scorri in basso e seleziona **"Aggiungi alla schermata Home"**.

### Passo 4: Conferma
- Vedrai l'icona 3DMAKES e il nome dell'app
- Tocca **"Aggiungi"** in alto a destra
- ✅ L'app apparirà sulla tua Home Screen!

---

## 🎯 Vantaggi dell'installazione

✅ **Icona sulla Home Screen** - Come un'app normale  
✅ **Schermo intero** - Senza la barra del browser  
✅ **Funziona offline** - I dati sono salvati localmente  
✅ **Veloce** - File cached per prestazioni ottimali  
✅ **Sincronizzazione Cloud** - Con Firebase in tempo reale  

---

## 🌐 Hosting Online (Opzionale)

Se vuoi accedere all'app da ovunque (non solo da questo Mac), puoi hostare i file su:

### Opzione 1: Netlify (Gratuito)
1. Vai su [netlify.com](https://www.netlify.com/)
2. Trascina la cartella `gestionale` nel box
3. Ottieni un URL tipo: `https://3dmakes-gestionale.netlify.app`

### Opzione 2: Vercel (Gratuito)
1. Vai su [vercel.com](https://vercel.com/)
2. Importa il progetto
3. Deploy automatico

### Opzione 3: Firebase Hosting (Gratuito)
```bash
# Installa Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inizializza hosting
cd gestionale
firebase init hosting

# Deploy
firebase deploy
```

---

## 🔧 Requisiti Tecnici

- **iOS 11.3+** - Per supporto PWA completo
- **Safari** - Necessario per l'installazione
- **Connessione Internet** - Solo per sincronizzazione Firebase
- **Spazio Locale** - I dati sono salvati in localStorage

---

## 💡 Suggerimenti

1. **Backup Periodici**: Esporta i dati dal Report → CSV
2. **Aggiornamenti**: Ricarica l'app (swipe down) per aggiornare
3. **Problemi?**: Rimuovi l'app e reinstalla
4. **Multi-dispositivo**: Usa Firebase per sincronizzare tra dispositivi

---

## 🆘 Risoluzione Problemi

### L'app non si apre a schermo intero
- Assicurati di averla installata da Safari
- Rimuovi e reinstalla l'app

### I dati non si sincronizzano
- Controlla la connessione Internet
- Verifica che Firebase sia configurato correttamente
- Controlla lo stato cloud in alto a sinistra (dovrebbe dire "Cloud")

### L'icona non appare
- Safari potrebbe usare uno screenshot
- Puoi personalizzare l'icona modificando `logo.png`

---

## 📊 Dimensioni File

- **App Base**: ~500 KB
- **Cache Offline**: ~1 MB
- **Dati LocalStorage**: Variabile (max 5-10 MB)

---

Buon lavoro con il tuo gestionale! 🚀

**3DMAKES Team**

