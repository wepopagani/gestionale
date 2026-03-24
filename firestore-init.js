/**
 * Inizializza Firestore sul progetto in firebase-config.js.
 * Long polling aiuta su reti con proxy/firewall che bloccano WebChannel.
 */
function applyFirestoreConnectionSettings(db) {
    if (!db) return;
    try {
        db.settings({ experimentalAutoDetectLongPolling: true });
    } catch (e) {
        try {
            db.settings({ experimentalForceLongPolling: true });
        } catch (e2) { /* già applicato o SDK non supporta */ }
    }
}

/** @returns {firebase.firestore.Firestore | null} */
function initFirestoreDb() {
    if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') return null;
    if (!firebaseConfig.apiKey || String(firebaseConfig.apiKey).includes('placeholder')) return null;
    let app;
    try {
        app = firebase.app();
    } catch (e) {
        app = firebase.initializeApp(firebaseConfig);
    }
    const db = app.firestore();
    applyFirestoreConnectionSettings(db);
    return db;
}

function formatFirestoreError(e) {
    const code = e && e.code ? String(e.code) : '';
    const msg = e && e.message ? String(e.message) : String(e);

    if (/firestore\.googleapis\.com|Firestore API has not been used|API has not been used.*disabled/i.test(msg)) {
        return (
            'Firestore non è ancora attivo sul progetto Firebase.\n\n' +
            'Passi da fare:\n' +
            '1) Apri https://console.firebase.google.com → progetto gestionale-a0cb6\n' +
            '2) Menu «Firestore Database» → «Crea database» (scegli una regione, es. europe-west1).\n' +
            '   Questo abilita anche l’API Cloud Firestore su Google Cloud.\n' +
            '3) Se serve ancora, abilita manualmente l’API:\n' +
            '   https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=gestionale-a0cb6\n' +
            '4) Attendi 1–2 minuti e ricarica questa pagina.\n\n' +
            '(Aprire il sito da file:/// a volte complica i test: usa un server locale, es. «python3 -m http.server» nella cartella del progetto.)'
        );
    }

    if (code === 'permission-denied' && /Missing or insufficient permissions/i.test(msg)) {
        return (
            '[permission-denied] Regole Firestore troppo restrittive.\n\n' +
            'In Firebase → Firestore → Regole, per test consenti lettura/scrittura su preventivi (poi restringi in produzione).'
        );
    }

    let hint = '';
    if (/unavailable|failed-precondition|deadline-exceeded|network|Could not reach|backend/i.test(msg + code)) {
        hint =
            '\n\nCosa controllare:\n' +
            '• Firebase → Firestore: database creato.\n' +
            '• Apri il sito da http://localhost o https (meglio che solo file://).\n' +
            '• VPN / ad-blocker disattivati per prova.';
    }
    return (code ? '[' + code + '] ' : '') + msg + hint;
}
