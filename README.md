# 📱 3DMAKES - Gestionale Clienti

**Progressive Web App** moderna e minimal per la gestione completa di clienti, documenti, ordini e report analitici.

> 🎉 **NUOVO!** Ora installabile come app su iPhone!

## 🚀 Come Utilizzarlo

### 💻 Su Desktop
1. **Apri il file `index.html`** nel tuo browser (doppio click sul file)
2. Inizia ad aggiungere i tuoi clienti e gestire i loro dati!

### 📱 Su iPhone (Installazione App)
1. Leggi la guida: **[INSTALLAZIONE_IPHONE.md](INSTALLAZIONE_IPHONE.md)** 📖
2. Apri in Safari → Condividi → "Aggiungi alla schermata Home"
3. ✅ L'app si apre a schermo intero come un'app nativa!

### 🌐 Online (Opzionale)
Vuoi accedere da ovunque? Leggi: **[HOSTING_ONLINE.md](HOSTING_ONLINE.md)** 🌐
- Hosting gratuito su Netlify/Vercel/Firebase
- Accesso da qualsiasi dispositivo
- URL permanente e HTTPS

## 📱 Nuove Funzionalità PWA

### ✨ Progressive Web App
- **📲 Installabile su iPhone** - Come un'app dall'App Store
- **📴 Funziona Offline** - Service Worker per cache intelligente
- **⚡ Veloce** - Caricamento istantaneo dopo la prima visita
- **🎯 Schermo Intero** - Esperienza app nativa
- **🔄 Auto-aggiornamento** - Sempre l'ultima versione disponibile

## ✨ Funzionalità

### 👥 Gestione Clienti
- Crea, modifica ed elimina clienti
- Salva informazioni complete: nome, email, telefono, indirizzo, P.IVA
- Ricerca rapida tra i clienti
- Interfaccia intuitiva con sidebar laterale

### 📄 Documenti
Per ogni cliente puoi gestire diversi tipi di documenti:
- **Fatture** 📄
- **Preventivi** 📋
- **Contratti** 📝
- **Altri documenti** 📁

Ogni documento include:
- Numero/riferimento
- Importo
- Data
- Note aggiuntive

### 📎 File
Carica e gestisci qualsiasi tipo di file per ogni cliente:
- **PDF** 📕
- **Word** (doc, docx) 📘
- **Excel** (xls, xlsx, csv) 📗
- **PowerPoint** (ppt, pptx) 📙
- **Immagini** (jpg, png, gif, etc.) 🖼️
- **Video** 🎬
- **Audio** 🎵
- **Archivi** (zip, rar, etc.) 📦
- **E molto altro!** 📎

Funzionalità:
- Upload di file fino a 5MB
- Anteprima informazioni (nome, tipo, dimensione)
- Descrizione opzionale
- Download diretto
- Icone automatiche in base al tipo di file
- Salvataggio sicuro nel browser

### 📝 Note
- Crea note testuali per ogni cliente
- Aggiungi titoli e contenuti dettagliati
- Modifica e elimina note quando necessario
- Visualizza data di creazione

### 🛒 Ordini
Gestisci gli ordini con stati di avanzamento:
- **🔨 In Lavorazione** - Ordini attualmente in corso
- **✅ Completato** - Ordini terminati
- **⏳ In Attesa** - Ordini in sospeso
- **❌ Annullato** - Ordini annullati

**Stati Pagamento:**
- ✅ **Pagato** - Ordine completamente pagato
- ❌ **Non Pagato** - Ordine da saldare
- ⏳ **Parziale** - Pagamento parziale (con importo pagato e saldo)

Per ogni ordine puoi salvare:
- Numero ordine (auto-incrementale)
- Descrizione dettagliata
- Importo
- Data
- Stato di avanzamento
- Stato pagamento
- Metodo pagamento (contanti, bonifico, carta, TWINT, PayPal)

**💡 Modifica Rapida:**
- Clicca su qualsiasi ordine (dal cliente o dal report) per modificarlo
- I bottoni ✏️ e 🗑️ restano disponibili per azioni rapide

### 📊 Dashboard Interattiva
**Nuovo!** Panoramica completa della tua attività:

**KPI Cards:**
- 👥 Totale clienti
- 📦 Totale ordini
- 💰 Fatturato totale (solo ordini pagati)
- 🔨 Ordini in lavorazione

**Sezioni Dashboard:**
- 📋 **Ultimi Ordini** - I 5 ordini più recenti (cliccabili)
- ⏳ **Pagamenti in Sospeso** - Ordini da saldare
- 👤 **Clienti Recenti** - Ultimi clienti aggiunti
- 📈 **Statistiche Rapide** - Conteggi ordini per stato

### 📊 Sistema Report Avanzato
Analisi completa degli ordini con filtri multipli:

**Periodi Disponibili:**
- 📅 Settimana corrente
- 📅 Mese corrente
- 📅 Trimestre corrente
- 📅 Anno corrente
- 📅 Tutti i periodi
- 📅 Periodo personalizzato (data da/a)

**Filtri:**
- Filtra per cliente specifico
- Filtra per stato ordine
- Combinazione di filtri multipli

**Statistiche Automatiche:**
- 📦 Totale ordini nel periodo
- 💰 Valore totale fatturato
- ✅ Numero ordini completati
- 📈 Valore medio per ordine

**Export e Stampa:**
- 📄 Esporta in CSV (compatibile Excel)
- 🖨️ Stampa report formattato
- 📋 Tabella dettagliata con tutti gli ordini

## ☁️ Salvataggio Cloud + Locale

### **Salvataggio Locale (Default)**
Tutti i dati vengono salvati automaticamente nel **localStorage** del browser:
- ✅ Nessun server necessario
- ✅ Dati sempre disponibili offline
- ✅ Salvataggio automatico ad ogni modifica
- ✅ Privacy totale - nessun dato su server esterni

### **Salvataggio Cloud (Opzionale)**
Integrazione Firebase per sincronizzazione cloud:
- ☁️ **Backup automatico** su Google Firebase
- 🔄 **Sincronizzazione real-time** tra dispositivi
- 📱 Accedi ai dati da qualsiasi dispositivo
- 🔒 Sicurezza enterprise-grade

**Come Attivare Firebase:**
1. Leggi la guida completa: **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** 📖
2. Crea un progetto su [Firebase Console](https://console.firebase.google.com/)
3. Abilita **Realtime Database**
4. Copia le tue credenziali Firebase
5. Modifica il file **`firebase-config.js`** con le tue credenziali
6. Ricarica l'app - Firebase si attiverà automaticamente! ✅

**⚠️ Note importanti**:
- Limite di 5MB per file singolo (limite localStorage)
- Se cancelli i dati del browser, rimangono comunque nel cloud (se configurato)
- Firebase piano gratuito: 1GB storage + 10GB trasferimento/mese

## 🎨 Design

- Interfaccia **minimal** e pulita
- Design **moderno** ispirato ai migliori tool di produttività
- **Responsive** - funziona su desktop, tablet e mobile
- Animazioni fluide e transizioni eleganti
- Palette colori professionale

## 🛠️ Tecnologie

- HTML5
- CSS3 (con variabili CSS e animazioni)
- JavaScript Vanilla (nessuna dipendenza)
- Font: Inter (Google Fonts)

## 📱 Compatibilità

Funziona su tutti i browser moderni:
- Chrome/Edge
- Firefox
- Safari
- Opera

## 💡 Suggerimenti d'Uso

1. **Ricerca rapida**: Usa la barra di ricerca per trovare velocemente un cliente
2. **Organizzazione**: Usa le note per salvare informazioni importanti su ogni cliente
3. **Tracking ordini**: Aggiorna lo stato degli ordini per tenere traccia dei progressi
4. **Documenti**: Salva i riferimenti a fatture e preventivi per avere tutto sotto controllo
5. **File**: Carica contratti, documenti firmati, immagini o qualsiasi file necessario (max 5MB)
6. **Report**: Genera report periodici per analizzare l'andamento del business
7. **Export CSV**: Usa l'export CSV per importare i dati in Excel o altri software
8. **Backup Cloud**: Configura Firebase per non perdere mai i tuoi dati

## 🔒 Privacy

Tutti i dati rimangono sul tuo computer, nel localStorage del browser. Nessuna informazione viene inviata a server esterni.

---

**Buon lavoro con il tuo gestionale! 🎉**

