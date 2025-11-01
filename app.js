// ===== FIREBASE SETUP =====
// Configurazione caricata da firebase-config.js
let firebaseDb = null;
let cloudSyncEnabled = false;
let userId = null;

// ===== STATO DELL'APPLICAZIONE =====
let state = {
    clients: [],
    currentClientId: null,
    editMode: false,
    editItemId: null,
    reportData: [],
    orderCounter: 1 // Counter per numeri ordine sequenziali
};

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    loadFromStorage();
    renderClients();
    setupEventListeners();
    
    // Se ci sono clienti, seleziona il primo
    if (state.clients.length > 0) {
        selectClient(state.clients[0].id);
    }
});

// ===== FIREBASE FUNCTIONS =====
function initFirebase() {
    try {
        // Verifica se Firebase è configurato correttamente
        if (typeof firebaseConfig === 'undefined') {
            console.log('Firebase config non trovato. Modifica firebase-config.js con le tue credenziali.');
            updateCloudStatus(false);
            return;
        }
        
        // Verifica se la config è quella di default (placeholder)
        if (firebaseConfig.apiKey === 'TUA_API_KEY' || firebaseConfig.apiKey.includes('placeholder')) {
            console.log('⚠️ Firebase non configurato. Inserisci le tue credenziali in firebase-config.js');
            updateCloudStatus(false);
            return;
        }
        
        // Inizializza Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        firebaseDb = firebase.database();
        
        // Usa un ID condiviso per tutti gli utenti
        userId = 'shared_gestionale';
        
        console.log('✅ Firebase inizializzato con successo!');
        console.log('📊 Modalità condivisa: tutti gli utenti vedono gli stessi dati');
        setupCloudSync();
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Firebase:', error);
        console.log('Verifica le credenziali in firebase-config.js');
        updateCloudStatus(false);
    }
}

function updateCloudStatus(connected) {
    const statusEl = document.getElementById('cloudStatus');
    const textEl = statusEl.querySelector('.cloud-text');
    
    cloudSyncEnabled = connected;
    
    if (connected) {
        statusEl.classList.add('connected');
        textEl.textContent = 'Cloud';
    } else {
        statusEl.classList.remove('connected');
        textEl.textContent = 'Locale';
    }
}

function setupCloudSync() {
    if (!firebaseDb || !userId) return;
    
    const ref = firebaseDb.ref('clients/' + userId);
    
    // Prima sincronizzazione: carica dati dal cloud
    ref.once('value', (snapshot) => {
        const cloudData = snapshot.val();
        
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            // Usa sempre i dati del cloud (database condiviso)
            console.log(`📥 Caricati ${cloudData.length} clienti dal cloud`);
            state.clients = cloudData;
            saveToStorage(); // Salva anche in locale
            renderClients();
            
            // Riseleziona il cliente se c'era
            if (state.currentClientId) {
                const client = state.clients.find(c => c.id === state.currentClientId);
                if (client) {
                    selectClient(state.currentClientId);
                }
            }
        } else if (state.clients.length > 0) {
            // Nessun dato nel cloud, carica quello locale
            console.log(`📤 Caricamento ${state.clients.length} clienti locali nel cloud`);
            ref.set(state.clients);
        }
        
        // Attiva sincronizzazione real-time
        ref.on('value', (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData && Array.isArray(cloudData)) {
                // Solo se i dati sono diversi (evita loop)
                if (JSON.stringify(cloudData) !== JSON.stringify(state.clients)) {
                    console.log('🔄 Aggiornamento automatico dal cloud');
                    state.clients = cloudData;
                    saveToStorage();
                    renderClients();
                    
                    // Mantieni la vista corrente se possibile
                    if (state.currentClientId) {
                        const client = state.clients.find(c => c.id === state.currentClientId);
                        if (client) {
                            selectClient(state.currentClientId);
                        } else {
                            // Cliente eliminato, torna alla lista
                            if (state.clients.length > 0) {
                                selectClient(state.clients[0].id);
                            } else {
                                document.getElementById('clientDetail').style.display = 'none';
                                document.getElementById('emptyState').style.display = 'block';
                            }
                        }
                    }
                }
            }
        });
        
        updateCloudStatus(true);
        console.log('✅ Sincronizzazione cloud attiva in modalità condivisa!');
        
        // Carica il counter dal cloud
        loadCounterFromCloud().then(() => {
            console.log('✅ Setup completo con counter sincronizzato');
        });
        
        // Mostra notifica successo
        showNotification('☁️ Database condiviso attivo!', 'success');
    }, (error) => {
        console.error('Errore sincronizzazione:', error);
        updateCloudStatus(false);
        showNotification('❌ Errore connessione cloud', 'error');
    });
}

function saveToCloud() {
    if (!firebaseDb || !cloudSyncEnabled || !userId) return;
    
    try {
        firebaseDb.ref('clients/' + userId).set(state.clients);
    } catch (error) {
        console.error('Errore salvataggio cloud:', error);
    }
}

function saveCounterToCloud() {
    if (!firebaseDb || !cloudSyncEnabled || !userId) return;
    
    try {
        firebaseDb.ref('counter/' + userId).set(state.orderCounter);
    } catch (error) {
        console.error('Errore salvataggio counter cloud:', error);
    }
}

function loadCounterFromCloud() {
    if (!firebaseDb || !userId) return Promise.resolve();
    
    return firebaseDb.ref('counter/' + userId).once('value')
        .then(snapshot => {
            const cloudCounter = snapshot.val();
            
            if (cloudCounter !== null && cloudCounter !== undefined) {
                // Usa il counter del cloud (è la fonte di verità condivisa)
                state.orderCounter = parseInt(cloudCounter);
                localStorage.setItem('gestionale_order_counter', state.orderCounter.toString());
                console.log(`📋 Counter ordini caricato dal cloud: ${state.orderCounter}`);
            } else {
                // Nessun counter nel cloud, carica il counter locale o calcola
                const localCounter = localStorage.getItem('gestionale_order_counter');
                if (localCounter) {
                    state.orderCounter = parseInt(localCounter);
                } else {
                    state.orderCounter = calculateNextOrderNumber();
                }
                // Salva nel cloud per la prossima volta
                saveCounterToCloud();
                console.log(`📋 Counter ordini inizializzato: ${state.orderCounter}`);
            }
            
            // Sincronizza il counter in tempo reale
            setupCounterSync();
        })
        .catch(error => {
            console.error('Errore caricamento counter:', error);
            // Fallback a localStorage
            const localCounter = localStorage.getItem('gestionale_order_counter');
            if (localCounter) {
                state.orderCounter = parseInt(localCounter);
            } else {
                state.orderCounter = calculateNextOrderNumber();
            }
        });
}

function setupCounterSync() {
    if (!firebaseDb || !userId) return;
    
    // Ascolta modifiche al counter in tempo reale
    firebaseDb.ref('counter/' + userId).on('value', (snapshot) => {
        const cloudCounter = snapshot.val();
        
        if (cloudCounter !== null && cloudCounter !== undefined) {
            const newCounter = parseInt(cloudCounter);
            
            // Aggiorna solo se il counter cloud è maggiore (per evitare conflitti)
            if (newCounter > state.orderCounter) {
                state.orderCounter = newCounter;
                localStorage.setItem('gestionale_order_counter', state.orderCounter.toString());
                console.log(`🔄 Counter aggiornato dal cloud: ${state.orderCounter}`);
            }
        }
    });
}

function showNotification(message, type = 'info') {
    // Crea notifica temporanea
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== CLOUD SETTINGS =====
function showCloudSettings() {
    // Mostra info database condiviso
    document.getElementById('currentUserId').value = 'shared_gestionale (Database Condiviso)';
    
    // Mostra stato sincronizzazione
    updateCloudSyncStatusDisplay();
    
    openModal('cloudSettingsModal');
}

function updateCloudSyncStatusDisplay() {
    const statusEl = document.getElementById('cloudSyncStatus');
    
    if (cloudSyncEnabled && firebaseDb) {
        const clientsCount = state.clients.length;
        statusEl.innerHTML = `✅ <strong>Database Condiviso Attivo</strong><br><small>Tutti vedono gli stessi ${clientsCount} clienti • Sync real-time</small>`;
        statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
        statusEl.style.color = 'var(--success)';
    } else {
        statusEl.innerHTML = '⚠️ <strong>Solo locale</strong><br><small>I dati sono salvati solo su questo dispositivo</small>';
        statusEl.style.background = 'rgba(255, 170, 0, 0.1)';
        statusEl.style.color = 'var(--warning)';
    }
}

function copyUserId() {
    showNotification('ℹ️ Database condiviso: tutti vedono gli stessi dati!', 'info');
}

function changeUserId() {
    alert('ℹ️ Database Condiviso\n\nTutti gli utenti vedono automaticamente gli stessi dati.\nNon serve cambiare User ID!');
}

// ===== STORAGE =====
function saveToStorage() {
    localStorage.setItem('gestionale_data', JSON.stringify(state.clients));
    localStorage.setItem('gestionale_order_counter', state.orderCounter.toString());
    saveToCloud();
    saveCounterToCloud(); // Salva anche il counter nel cloud
}

function loadFromStorage() {
    const data = localStorage.getItem('gestionale_data');
    if (data) {
        state.clients = JSON.parse(data);
    }
    
    // Il counter verrà caricato dal cloud in setupCloudSync
    // Se non c'è cloud, usa localStorage come fallback
    const counter = localStorage.getItem('gestionale_order_counter');
    if (counter) {
        state.orderCounter = parseInt(counter);
    } else {
        // Se non esiste, calcola il counter basato sugli ordini esistenti
        state.orderCounter = calculateNextOrderNumber();
    }
}

// Calcola il prossimo numero ordine basato sugli ordini esistenti
function calculateNextOrderNumber() {
    let maxNumber = 0;
    const currentYear = new Date().getFullYear();
    
    state.clients.forEach(client => {
        if (client.orders) {
            client.orders.forEach(order => {
                // Cerca pattern ORD-YYYY-XXX
                const match = order.number.match(/ORD-(\d{4})-(\d+)/);
                if (match) {
                    const year = parseInt(match[1]);
                    const num = parseInt(match[2]);
                    // Solo ordini dell'anno corrente
                    if (year === currentYear && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            });
        }
    });
    
    return maxNumber + 1;
}

// ===== UTILITIES =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(amount) {
    if (!amount) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function generateOrderNumber() {
    const year = new Date().getFullYear();
    const paddedNumber = state.orderCounter.toString().padStart(3, '0');
    return `ORD-${year}-${paddedNumber}`;
}

function incrementOrderCounter() {
    state.orderCounter++;
    localStorage.setItem('gestionale_order_counter', state.orderCounter.toString());
    
    // Salva immediatamente nel cloud per sincronizzare con altri dispositivi
    if (firebaseDb && cloudSyncEnabled && userId) {
        firebaseDb.ref('counter/' + userId).set(state.orderCounter)
            .then(() => {
                console.log(`✅ Counter incrementato nel cloud: ${state.orderCounter}`);
            })
            .catch(error => {
                console.error('Errore incremento counter cloud:', error);
            });
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Ricerca clienti
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        renderClients(searchTerm);
    });

    // Bottoni clienti
    document.getElementById('addClientBtn').addEventListener('click', openAddClientModal);
    document.getElementById('editClientBtn').addEventListener('click', openEditClientModal);
    document.getElementById('deleteClientBtn').addEventListener('click', deleteCurrentClient);
    document.getElementById('saveClientBtn').addEventListener('click', saveClient);

    // Bottoni documenti
    document.getElementById('addDocumentBtn').addEventListener('click', openAddDocumentModal);
    document.getElementById('saveDocumentBtn').addEventListener('click', saveDocument);

    // Bottoni note
    document.getElementById('addNoteBtn').addEventListener('click', openAddNoteModal);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);

    // Bottoni ordini
    document.getElementById('addOrderBtn').addEventListener('click', openAddOrderModal);
    document.getElementById('saveOrderBtn').addEventListener('click', saveOrder);

    // Bottoni file
    document.getElementById('addFileBtn').addEventListener('click', openAddFileModal);
    document.getElementById('saveFileBtn').addEventListener('click', saveFile);
    document.getElementById('modalFileInput').addEventListener('change', handleFileSelect);

    // Bottoni report
    document.getElementById('viewReportsBtn').addEventListener('click', openReportView);
    document.getElementById('closeReportBtn').addEventListener('click', closeReportView);
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    document.getElementById('reportPeriod').addEventListener('change', handlePeriodChange);
    document.getElementById('exportCSVBtn').addEventListener('click', exportToCSV);
    document.getElementById('printReportBtn').addEventListener('click', printReport);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Chiusura modal con click fuori
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Imposta data odierna di default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modalDocDate').value = today;
    document.getElementById('modalOrderDate').value = today;
}

// ===== GESTIONE TABS =====
function switchTab(tabName) {
    // Aggiorna bottoni
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Aggiorna contenuto
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabMap = {
        'documents': 'documentsTab',
        'files': 'filesTab',
        'notes': 'notesTab',
        'orders': 'ordersTab'
    };
    
    document.getElementById(tabMap[tabName]).classList.add('active');
}

// ===== CLIENTI =====
function renderClients(searchTerm = '') {
    const clientsList = document.getElementById('clientsList');
    const filteredClients = state.clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm))
    );

    if (filteredClients.length === 0) {
        clientsList.innerHTML = '<div class="empty-section"><p>Nessun cliente trovato</p></div>';
        return;
    }

    clientsList.innerHTML = filteredClients.map(client => `
        <div class="client-item ${client.id === state.currentClientId ? 'active' : ''}" 
             onclick="selectClient('${client.id}')">
            <div class="client-item-name">${client.name}</div>
            <div class="client-item-info">${client.email || 'Nessuna email'}</div>
        </div>
    `).join('');
}

function selectClient(clientId) {
    state.currentClientId = clientId;
    const client = state.clients.find(c => c.id === clientId);
    
    if (!client) return;

    // Nascondi empty state, mostra dettagli
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('clientDetail').style.display = 'block';

    // Aggiorna header
    document.getElementById('clientName').textContent = client.name;
    const info = [client.email, client.phone, client.vat].filter(Boolean).join(' • ');
    document.getElementById('clientInfo').textContent = info || 'Nessuna informazione aggiuntiva';

    // Aggiorna lista clienti
    renderClients(document.getElementById('searchInput').value);

    // Renderizza contenuto
    renderDocuments();
    renderFiles();
    renderNotes();
    renderOrders();
}

function openAddClientModal() {
    state.editMode = false;
    document.getElementById('modalClientTitle').textContent = 'Nuovo Cliente';
    document.getElementById('modalClientName').value = '';
    document.getElementById('modalClientEmail').value = '';
    document.getElementById('modalClientPhone').value = '';
    document.getElementById('modalClientAddress').value = '';
    document.getElementById('modalClientVat').value = '';
    openModal('clientModal');
}

function openEditClientModal() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    state.editMode = true;
    document.getElementById('modalClientTitle').textContent = 'Modifica Cliente';
    document.getElementById('modalClientName').value = client.name;
    document.getElementById('modalClientEmail').value = client.email || '';
    document.getElementById('modalClientPhone').value = client.phone || '';
    document.getElementById('modalClientAddress').value = client.address || '';
    document.getElementById('modalClientVat').value = client.vat || '';
    openModal('clientModal');
}

function saveClient() {
    const name = document.getElementById('modalClientName').value.trim();
    
    if (!name) {
        alert('Il nome del cliente è obbligatorio');
        return;
    }

    const clientData = {
        name,
        email: document.getElementById('modalClientEmail').value.trim(),
        phone: document.getElementById('modalClientPhone').value.trim(),
        address: document.getElementById('modalClientAddress').value.trim(),
        vat: document.getElementById('modalClientVat').value.trim(),
        documents: [],
        files: [],
        notes: [],
        orders: []
    };

    if (state.editMode) {
        // Modifica cliente esistente
        const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
        state.clients[clientIndex] = { ...state.clients[clientIndex], ...clientData };
    } else {
        // Nuovo cliente
        const newClient = {
            id: generateId(),
            ...clientData,
            createdAt: new Date().toISOString()
        };
        state.clients.push(newClient);
        state.currentClientId = newClient.id;
    }

    saveToStorage();
    renderClients();
    selectClient(state.currentClientId);
    closeModal('clientModal');
}

function deleteCurrentClient() {
    if (!confirm('Sei sicuro di voler eliminare questo cliente? Tutti i dati associati verranno persi.')) {
        return;
    }

    state.clients = state.clients.filter(c => c.id !== state.currentClientId);
    state.currentClientId = null;
    
    saveToStorage();
    renderClients();
    
    // Mostra empty state o seleziona primo cliente
    if (state.clients.length === 0) {
        document.getElementById('clientDetail').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    } else {
        selectClient(state.clients[0].id);
    }
}

// ===== DOCUMENTI =====
function renderDocuments() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const documentsList = document.getElementById('documentsList');
    
    if (!client.documents || client.documents.length === 0) {
        documentsList.innerHTML = '<div class="empty-section"><p>Nessun documento caricato</p></div>';
        return;
    }

    const docIcons = {
        'fattura': '📄',
        'preventivo': '📋',
        'contratto': '📝',
        'altro': '📁'
    };

    const docTypes = {
        'fattura': 'Fattura',
        'preventivo': 'Preventivo',
        'contratto': 'Contratto',
        'altro': 'Documento'
    };

    documentsList.innerHTML = client.documents.map(doc => `
        <div class="document-card">
            <div class="document-card-header">
                <div class="document-type">${docIcons[doc.type]}</div>
                <button class="document-card-menu" onclick="deleteDocument('${doc.id}')">🗑️</button>
            </div>
            <div class="document-card-title">${docTypes[doc.type]}</div>
            <div class="document-card-number">${doc.number}</div>
            ${doc.notes ? `<p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">${doc.notes}</p>` : ''}
            <div class="document-card-footer">
                <div class="document-card-amount">${formatCurrency(doc.amount)}</div>
                <div class="document-card-date">${formatDate(doc.date)}</div>
            </div>
        </div>
    `).join('');
}

function openAddDocumentModal() {
    state.editMode = false;
    document.getElementById('modalDocType').value = 'fattura';
    document.getElementById('modalDocNumber').value = '';
    document.getElementById('modalDocAmount').value = '';
    document.getElementById('modalDocDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalDocNotes').value = '';
    openModal('documentModal');
}

function saveDocument() {
    const number = document.getElementById('modalDocNumber').value.trim();
    
    if (!number) {
        alert('Il numero/riferimento del documento è obbligatorio');
        return;
    }

    const document = {
        id: generateId(),
        type: document.getElementById('modalDocType').value,
        number,
        amount: parseFloat(document.getElementById('modalDocAmount').value) || 0,
        date: document.getElementById('modalDocDate').value,
        notes: document.getElementById('modalDocNotes').value.trim(),
        createdAt: new Date().toISOString()
    };

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    if (!state.clients[clientIndex].documents) {
        state.clients[clientIndex].documents = [];
    }
    state.clients[clientIndex].documents.push(document);

    saveToStorage();
    renderDocuments();
    closeModal('documentModal');
}

function deleteDocument(docId) {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    state.clients[clientIndex].documents = state.clients[clientIndex].documents.filter(d => d.id !== docId);
    
    saveToStorage();
    renderDocuments();
}

// ===== NOTE =====
function renderNotes() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const notesList = document.getElementById('notesList');
    
    if (!client.notes || client.notes.length === 0) {
        notesList.innerHTML = '<div class="empty-section"><p>Nessuna nota presente</p></div>';
        return;
    }

    notesList.innerHTML = client.notes.map(note => `
        <div class="note-card">
            <div class="note-card-header">
                <div class="note-card-title">${note.title || 'Nota senza titolo'}</div>
                <div class="note-card-actions">
                    <button onclick="editNote('${note.id}')">✏️</button>
                    <button onclick="deleteNote('${note.id}')">🗑️</button>
                </div>
            </div>
            <div class="note-card-content">${note.content}</div>
            <div class="note-card-date">${formatDate(note.createdAt)}</div>
        </div>
    `).join('');
}

function openAddNoteModal() {
    state.editMode = false;
    state.editItemId = null;
    document.getElementById('modalNoteTitle').textContent = 'Nuova Nota';
    document.getElementById('modalNoteTitle-input').value = '';
    document.getElementById('modalNoteContent').value = '';
    openModal('noteModal');
}

function editNote(noteId) {
    const client = state.clients.find(c => c.id === state.currentClientId);
    const note = client.notes.find(n => n.id === noteId);
    
    if (!note) return;

    state.editMode = true;
    state.editItemId = noteId;
    document.getElementById('modalNoteTitle').textContent = 'Modifica Nota';
    document.getElementById('modalNoteTitle-input').value = note.title || '';
    document.getElementById('modalNoteContent').value = note.content;
    openModal('noteModal');
}

function saveNote() {
    const content = document.getElementById('modalNoteContent').value.trim();
    
    if (!content) {
        alert('Il contenuto della nota è obbligatorio');
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    
    if (state.editMode && state.editItemId) {
        // Modifica nota esistente
        const noteIndex = state.clients[clientIndex].notes.findIndex(n => n.id === state.editItemId);
        state.clients[clientIndex].notes[noteIndex] = {
            ...state.clients[clientIndex].notes[noteIndex],
            title: document.getElementById('modalNoteTitle-input').value.trim(),
            content,
            updatedAt: new Date().toISOString()
        };
    } else {
        // Nuova nota
        const note = {
            id: generateId(),
            title: document.getElementById('modalNoteTitle-input').value.trim(),
            content,
            createdAt: new Date().toISOString()
        };

        if (!state.clients[clientIndex].notes) {
            state.clients[clientIndex].notes = [];
        }
        state.clients[clientIndex].notes.push(note);
    }

    saveToStorage();
    renderNotes();
    closeModal('noteModal');
}

function deleteNote(noteId) {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) {
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    state.clients[clientIndex].notes = state.clients[clientIndex].notes.filter(n => n.id !== noteId);
    
    saveToStorage();
    renderNotes();
}

// ===== ORDINI =====
function renderOrders() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const ordersList = document.getElementById('ordersList');
    
    if (!client.orders || client.orders.length === 0) {
        ordersList.innerHTML = '<div class="empty-section"><p>Nessun ordine presente</p></div>';
        return;
    }

    const statusLabels = {
        'in_lavorazione': '🔨 In Lavorazione',
        'completato': '✅ Completato',
        'in_attesa': '⏳ In Attesa',
        'annullato': '❌ Annullato'
    };

    ordersList.innerHTML = client.orders.map(order => `
        <div class="order-card">
            <div class="order-card-header">
                <div class="order-card-info">
                    <h4>${order.number}</h4>
                    <div class="order-card-description">${order.description}</div>
                </div>
                <span class="order-status ${order.status}">${statusLabels[order.status]}</span>
            </div>
            <div class="order-card-footer">
                <div class="order-card-amount">${formatCurrency(order.amount)}</div>
                <div class="order-card-date">${formatDate(order.date)}</div>
                <div class="order-card-actions">
                    <button class="btn-small" onclick="editOrder('${order.id}')" style="padding: 4px 12px; font-size: 12px;">✏️</button>
                    <button class="btn-danger" onclick="deleteOrder('${order.id}')" style="padding: 4px 12px; font-size: 12px;">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAddOrderModal() {
    state.editMode = false;
    state.editItemId = null;
    document.getElementById('modalOrderTitle').textContent = 'Nuovo Ordine';
    
    // Auto-compila numero ordine sequenziale
    document.getElementById('modalOrderNumber').value = generateOrderNumber();
    document.getElementById('modalOrderNumber').setAttribute('readonly', true);
    document.getElementById('modalOrderNumber').style.background = '#f1f5f9';
    document.getElementById('modalOrderNumber').style.cursor = 'not-allowed';
    
    document.getElementById('modalOrderDescription').value = '';
    document.getElementById('modalOrderAmount').value = '';
    document.getElementById('modalOrderDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalOrderStatus').value = 'in_lavorazione';
    openModal('orderModal');
}

function editOrder(orderId) {
    const client = state.clients.find(c => c.id === state.currentClientId);
    const order = client.orders.find(o => o.id === orderId);
    
    if (!order) return;

    state.editMode = true;
    state.editItemId = orderId;
    document.getElementById('modalOrderTitle').textContent = 'Modifica Ordine';
    
    // In modifica, permetti di modificare il numero ordine
    document.getElementById('modalOrderNumber').value = order.number;
    document.getElementById('modalOrderNumber').removeAttribute('readonly');
    document.getElementById('modalOrderNumber').style.background = '';
    document.getElementById('modalOrderNumber').style.cursor = '';
    
    document.getElementById('modalOrderDescription').value = order.description;
    document.getElementById('modalOrderAmount').value = order.amount;
    document.getElementById('modalOrderDate').value = order.date;
    document.getElementById('modalOrderStatus').value = order.status;
    openModal('orderModal');
}

function saveOrder() {
    const number = document.getElementById('modalOrderNumber').value.trim();
    const description = document.getElementById('modalOrderDescription').value.trim();
    
    if (!number || !description) {
        alert('Numero ordine e descrizione sono obbligatori');
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    
    if (state.editMode && state.editItemId) {
        // Modifica ordine esistente
        const orderIndex = state.clients[clientIndex].orders.findIndex(o => o.id === state.editItemId);
        state.clients[clientIndex].orders[orderIndex] = {
            ...state.clients[clientIndex].orders[orderIndex],
            number,
            description,
            amount: parseFloat(document.getElementById('modalOrderAmount').value) || 0,
            date: document.getElementById('modalOrderDate').value,
            status: document.getElementById('modalOrderStatus').value,
            updatedAt: new Date().toISOString()
        };
    } else {
        // Nuovo ordine
        const order = {
            id: generateId(),
            number,
            description,
            amount: parseFloat(document.getElementById('modalOrderAmount').value) || 0,
            date: document.getElementById('modalOrderDate').value,
            status: document.getElementById('modalOrderStatus').value,
            createdAt: new Date().toISOString()
        };

        if (!state.clients[clientIndex].orders) {
            state.clients[clientIndex].orders = [];
        }
        state.clients[clientIndex].orders.push(order);
        
        // Incrementa il counter per il prossimo ordine
        incrementOrderCounter();
    }

    saveToStorage();
    renderOrders();
    closeModal('orderModal');
}

function deleteOrder(orderId) {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) {
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    state.clients[clientIndex].orders = state.clients[clientIndex].orders.filter(o => o.id !== orderId);
    
    saveToStorage();
    renderOrders();
}

// ===== FILE =====
function getFileIcon(mimeType, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // PDF
    if (mimeType === 'application/pdf' || extension === 'pdf') return '📕';
    
    // Word
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension)) return '📘';
    
    // Excel
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) return '📗';
    
    // PowerPoint
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) return '📙';
    
    // Immagini
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return '🖼️';
    
    // Video
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv'].includes(extension)) return '🎬';
    
    // Audio
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return '🎵';
    
    // Archivi
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return '📦';
    
    // Testo
    if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml'].includes(extension)) return '📄';
    
    // Default
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function renderFiles() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const filesList = document.getElementById('filesList');
    
    if (!client.files || client.files.length === 0) {
        filesList.innerHTML = '<div class="empty-section"><p>Nessun file caricato</p></div>';
        return;
    }

    filesList.innerHTML = client.files.map(file => `
        <div class="file-card">
            <div class="file-icon">${getFileIcon(file.mimeType, file.name)}</div>
            <div class="file-card-name">${file.name}</div>
            <div class="file-card-type">${file.mimeType || 'Tipo sconosciuto'}</div>
            ${file.description ? `<div class="file-card-description">"${file.description}"</div>` : ''}
            <div class="file-card-footer">
                <div class="file-card-size">${formatFileSize(file.size)}</div>
                <div class="file-card-date">${formatDate(file.createdAt)}</div>
            </div>
            <div class="file-card-actions">
                <button onclick="downloadFile('${file.id}')" title="Scarica">⬇️</button>
                <button onclick="deleteFile('${file.id}')" title="Elimina">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openAddFileModal() {
    state.selectedFile = null;
    document.getElementById('modalFileInput').value = '';
    document.getElementById('modalFileDescription').value = '';
    document.getElementById('fileInputDisplay').classList.remove('has-file');
    document.getElementById('fileInputDisplay').querySelector('.file-input-text').textContent = 'Clicca per scegliere un file o trascinalo qui';
    document.getElementById('fileInfoDisplay').style.display = 'none';
    openModal('fileModal');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Controllo dimensione (max 5MB per localStorage)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('Il file è troppo grande! Dimensione massima: 5MB\n\nPer file più grandi, considera di salvare un link esterno o usa un servizio cloud.');
        document.getElementById('modalFileInput').value = '';
        return;
    }

    state.selectedFile = file;

    // Aggiorna visualizzazione
    const display = document.getElementById('fileInputDisplay');
    display.classList.add('has-file');
    display.querySelector('.file-input-text').textContent = `✓ ${file.name} selezionato`;

    // Mostra informazioni file
    document.getElementById('fileInfoName').textContent = file.name;
    document.getElementById('fileInfoType').textContent = file.type || 'Sconosciuto';
    document.getElementById('fileInfoSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfoDisplay').style.display = 'block';
}

function saveFile() {
    if (!state.selectedFile) {
        alert('Seleziona un file da caricare');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const fileData = {
            id: generateId(),
            name: state.selectedFile.name,
            mimeType: state.selectedFile.type,
            size: state.selectedFile.size,
            description: document.getElementById('modalFileDescription').value.trim(),
            data: e.target.result, // Base64 data
            createdAt: new Date().toISOString()
        };

        const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
        if (!state.clients[clientIndex].files) {
            state.clients[clientIndex].files = [];
        }
        state.clients[clientIndex].files.push(fileData);

        saveToStorage();
        renderFiles();
        closeModal('fileModal');
        
        state.selectedFile = null;
    };

    reader.onerror = function() {
        alert('Errore durante la lettura del file');
    };

    reader.readAsDataURL(state.selectedFile);
}

function downloadFile(fileId) {
    const client = state.clients.find(c => c.id === state.currentClientId);
    const file = client.files.find(f => f.id === fileId);
    
    if (!file) return;

    // Crea un link temporaneo per il download
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function deleteFile(fileId) {
    if (!confirm('Sei sicuro di voler eliminare questo file?')) {
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    state.clients[clientIndex].files = state.clients[clientIndex].files.filter(f => f.id !== fileId);
    
    saveToStorage();
    renderFiles();
}

// ===== REPORT SYSTEM =====
function openReportView() {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('clientDetail').style.display = 'none';
    document.getElementById('reportView').style.display = 'block';
    
    // Popola dropdown clienti
    const clientSelect = document.getElementById('reportClient');
    clientSelect.innerHTML = '<option value="all">Tutti i Clienti</option>';
    state.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientSelect.appendChild(option);
    });
    
    // Reset filtri
    document.getElementById('reportPeriod').value = 'month';
    document.getElementById('reportStatus').value = 'all';
}

function closeReportView() {
    document.getElementById('reportView').style.display = 'none';
    
    if (state.clients.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
    } else if (state.currentClientId) {
        document.getElementById('clientDetail').style.display = 'block';
    } else {
        document.getElementById('emptyState').style.display = 'block';
    }
}

function handlePeriodChange() {
    const period = document.getElementById('reportPeriod').value;
    const customDates = document.getElementById('customDates');
    
    if (period === 'custom') {
        customDates.style.display = 'grid';
        document.getElementById('reportDateFrom').value = new Date().toISOString().split('T')[0];
        document.getElementById('reportDateTo').value = new Date().toISOString().split('T')[0];
    } else {
        customDates.style.display = 'none';
    }
}

function getDateRange(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from, to;
    
    switch(period) {
        case 'week':
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            from = monday;
            to = new Date();
            break;
            
        case 'month':
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date();
            break;
            
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            from = new Date(now.getFullYear(), quarter * 3, 1);
            to = new Date();
            break;
            
        case 'year':
            from = new Date(now.getFullYear(), 0, 1);
            to = new Date();
            break;
            
        case 'custom':
            from = new Date(document.getElementById('reportDateFrom').value);
            to = new Date(document.getElementById('reportDateTo').value);
            break;
            
        case 'all':
        default:
            from = new Date(2000, 0, 1);
            to = new Date();
            break;
    }
    
    return { from, to };
}

function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const clientFilter = document.getElementById('reportClient').value;
    const statusFilter = document.getElementById('reportStatus').value;
    
    const dateRange = getDateRange(period);
    
    // Raccolta ordini da tutti i clienti
    const allOrders = [];
    
    state.clients.forEach(client => {
        if (!client.orders) return;
        
        // Filtra per cliente se selezionato
        if (clientFilter !== 'all' && client.id !== clientFilter) return;
        
        client.orders.forEach(order => {
            const orderDate = new Date(order.date);
            
            // Filtra per periodo
            if (orderDate >= dateRange.from && orderDate <= dateRange.to) {
                // Filtra per stato
                if (statusFilter === 'all' || order.status === statusFilter) {
                    allOrders.push({
                        ...order,
                        clientId: client.id,
                        clientName: client.name
                    });
                }
            }
        });
    });
    
    // Ordina per data (più recenti prima)
    allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    state.reportData = allOrders;
    
    // Calcola statistiche
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const completedOrders = allOrders.filter(o => o.status === 'completato').length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Aggiorna summary
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('avgOrderValue').textContent = formatCurrency(avgOrderValue);
    
    // Renderizza tabella
    renderReportTable(allOrders);
}

function renderReportTable(orders) {
    const tbody = document.getElementById('reportTableBody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-report">Nessun ordine trovato per i filtri selezionati</td></tr>';
        return;
    }
    
    const statusLabels = {
        'in_lavorazione': 'In Lavorazione',
        'completato': 'Completato',
        'in_attesa': 'In Attesa',
        'annullato': 'Annullato'
    };
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${formatDate(order.date)}</td>
            <td><strong>${order.clientName}</strong></td>
            <td>${order.number}</td>
            <td>${order.description}</td>
            <td><span class="report-status-badge ${order.status}">${statusLabels[order.status]}</span></td>
            <td class="report-amount">${formatCurrency(order.amount)}</td>
        </tr>
    `).join('');
}

function exportToCSV() {
    if (state.reportData.length === 0) {
        alert('Genera prima un report per esportarlo');
        return;
    }
    
    // Intestazioni CSV
    let csv = 'Data,Cliente,N° Ordine,Descrizione,Stato,Importo\n';
    
    // Righe dati
    state.reportData.forEach(order => {
        const row = [
            formatDate(order.date),
            `"${order.clientName}"`,
            `"${order.number}"`,
            `"${order.description}"`,
            order.status,
            order.amount || 0
        ].join(',');
        csv += row + '\n';
    });
    
    // Aggiungi totali
    const totalRevenue = state.reportData.reduce((sum, o) => sum + (o.amount || 0), 0);
    csv += '\n';
    csv += `TOTALE ORDINI,${state.reportData.length},,,,\n`;
    csv += `TOTALE FATTURATO,,,,,${totalRevenue}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const period = document.getElementById('reportPeriod').value;
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `report_ordini_${period}_${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function printReport() {
    if (state.reportData.length === 0) {
        alert('Genera prima un report per stamparlo');
        return;
    }
    
    // Crea finestra di stampa
    const printWindow = window.open('', '', 'height=600,width=800');
    
    const period = document.getElementById('reportPeriod').value;
    const periodLabels = {
        'week': 'Questa Settimana',
        'month': 'Questo Mese',
        'quarter': 'Questo Trimestre',
        'year': 'Quest\'Anno',
        'all': 'Tutti i Periodi',
        'custom': 'Periodo Personalizzato'
    };
    
    const totalOrders = state.reportData.length;
    const totalRevenue = state.reportData.reduce((sum, o) => sum + (o.amount || 0), 0);
    const completedOrders = state.reportData.filter(o => o.status === 'completato').length;
    
    const statusLabels = {
        'in_lavorazione': 'In Lavorazione',
        'completato': 'Completato',
        'in_attesa': 'In Attesa',
        'annullato': 'Annullato'
    };
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Ordini - ${periodLabels[period]}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                h1 {
                    color: #6366f1;
                    margin-bottom: 10px;
                }
                .meta {
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-box {
                    border: 1px solid #e2e8f0;
                    padding: 15px;
                    border-radius: 8px;
                }
                .summary-label {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 5px;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background: #f1f5f9;
                    padding: 12px;
                    text-align: left;
                    border-bottom: 2px solid #e2e8f0;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #666;
                }
                td {
                    padding: 12px;
                    border-bottom: 1px solid #e2e8f0;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                }
                .status-completato { background: #d1fae5; color: #065f46; }
                .status-in_lavorazione { background: #dbeafe; color: #1e40af; }
                .status-in_attesa { background: #fef3c7; color: #92400e; }
                .status-annullato { background: #fee2e2; color: #991b1b; }
                @media print {
                    body { padding: 10px; }
                    .summary { page-break-inside: avoid; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <h1>📊 Report Ordini</h1>
            <div class="meta">
                Periodo: ${periodLabels[period]} | Generato il: ${new Date().toLocaleDateString('it-IT')}
            </div>
            
            <div class="summary">
                <div class="summary-box">
                    <div class="summary-label">Totale Ordini</div>
                    <div class="summary-value">${totalOrders}</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Valore Totale</div>
                    <div class="summary-value">${formatCurrency(totalRevenue)}</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Completati</div>
                    <div class="summary-value">${completedOrders}</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Media Ordine</div>
                    <div class="summary-value">${formatCurrency(totalRevenue / totalOrders)}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>N° Ordine</th>
                        <th>Descrizione</th>
                        <th>Stato</th>
                        <th>Importo</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.reportData.map(order => `
                        <tr>
                            <td>${formatDate(order.date)}</td>
                            <td><strong>${order.clientName}</strong></td>
                            <td>${order.number}</td>
                            <td>${order.description}</td>
                            <td><span class="status-badge status-${order.status}">${statusLabels[order.status]}</span></td>
                            <td><strong>${formatCurrency(order.amount)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

