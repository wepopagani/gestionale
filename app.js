// Versione 2.1 - CHF currency + Reports + Payments
// Ultimo aggiornamento: Sat Nov  1 19:02:58 CET 2025
console.log('✅ Gestionale 3DMAKES v2.1 caricato');
console.log('💰 Valuta: CHF (Franchi Svizzeri)');

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
    orderCounter: 1, // Counter per numeri ordine sequenziali
    isSyncingFromCloud: false // Flag per evitare loop di sincronizzazione
};

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registrato:', registration.scope);
                
                // Controlla aggiornamenti ogni ora
                setInterval(() => {
                    registration.update();
                }, 3600000);
            })
            .catch((error) => {
                console.log('❌ Registrazione Service Worker fallita:', error);
            });
    });
}

// Gestione installazione PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Previene il prompt automatico
    e.preventDefault();
    deferredPrompt = e;
    console.log('💡 App installabile come PWA');
});

// ===== DARK MODE =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Salva la preferenza
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // Aggiorna icona
    const icon = document.getElementById('themeIcon');
    icon.textContent = isDark ? '☀️' : '🌙';
    
    // Animazione
    icon.style.transform = 'scale(1.2)';
    setTimeout(() => {
        icon.style.transform = 'scale(1)';
    }, 200);
    
    console.log(isDark ? '🌙 Dark mode attivato' : '☀️ Light mode attivato');
}

// ===== TOGGLE SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const icon = document.getElementById('toggleSidebarIcon');
    const body = document.body;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    
    // Aggiungi/rimuovi classe al body per gestire il layout
    if (isCollapsed) {
        body.classList.add('sidebar-collapsed');
    } else {
        body.classList.remove('sidebar-collapsed');
    }
    
    // Cambia icona
    icon.textContent = isCollapsed ? '▶' : '◀';
    
    // Salva preferenza
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
    
    console.log(isCollapsed ? '◀ Sidebar nascosta' : '▶ Sidebar visibile');
}

// Carica preferenza sidebar
function loadSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        document.querySelector('.sidebar').classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
        document.getElementById('toggleSidebarIcon').textContent = '▶';
    }
}

// Carica preferenza dark mode
function loadDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeIcon').textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeIcon').textContent = '🌙';
    }
}

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', () => {
    loadDarkMode(); // Carica tema salvato
    loadSidebarState(); // Carica stato sidebar
    initFirebase();
    loadFromStorage();
    renderClients();
    setupEventListeners();
    
    // Se ci sono clienti, mostra la dashboard
    if (state.clients.length > 0) {
        showDashboard();
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
                    console.log(`📊 Dati cloud: ${cloudData.length} clienti`);
                    console.log(`📊 Dati locali: ${state.clients.length} clienti`);
                    
                    // Imposta flag per evitare loop
                    state.isSyncingFromCloud = true;
                    
                    state.clients = cloudData;
                    saveToStorage(); // Salva solo in localStorage, non nel cloud
                    renderClients();
                    
                    // Rimuovi flag dopo un breve delay
                    setTimeout(() => {
                        state.isSyncingFromCloud = false;
                    }, 1000);
                    
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
        const timestamp = new Date().toLocaleTimeString();
        console.log(`☁️ [${timestamp}] Salvataggio ${state.clients.length} clienti nel cloud`);
        firebaseDb.ref('clients/' + userId).set(state.clients)
            .then(() => {
                console.log(`✅ [${timestamp}] Dati salvati nel cloud con successo`);
            })
            .catch(error => {
                console.error(`❌ [${timestamp}] Errore salvataggio cloud:`, error);
                showNotification('⚠️ Errore sincronizzazione cloud', 'error');
            });
    } catch (error) {
        console.error('❌ Errore salvataggio cloud:', error);
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
    try {
        const timestamp = new Date().toLocaleTimeString();
        localStorage.setItem('gestionale_data', JSON.stringify(state.clients));
        localStorage.setItem('gestionale_order_counter', state.orderCounter.toString());
        console.log(`💾 [${timestamp}] Salvato in localStorage: ${state.clients.length} clienti`);
        
        // Non salvare nel cloud se stiamo sincronizzando DAL cloud (evita loop)
        if (!state.isSyncingFromCloud) {
            saveToCloud();
            saveCounterToCloud();
        } else {
            console.log(`⏭️ [${timestamp}] Skip salvataggio cloud (sync in corso)`);
        }
    } catch (error) {
        console.error('❌ Errore salvataggio localStorage:', error);
        showNotification('⚠️ Errore salvataggio dati locali', 'error');
    }
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
    if (!amount) return 'CHF 0.00';
    // Formatta con locale svizzero e aggiungi spazio sottile dopo l'apostrofo per leggibilità
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' })
        .format(amount)
        .replace(/'/g, "'\u202F"); // Spazio sottile dopo apostrofo
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
    // Debounce per ricerca (evita rendering continui)
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderClients(searchTerm);
        }, 300); // Attende 300ms dopo che l'utente smette di digitare
    });

    // Bottoni clienti
    document.getElementById('addClientBtn').addEventListener('click', openAddClientModal);
    document.getElementById('editClientBtn').addEventListener('click', openEditClientModal);
    document.getElementById('deleteClientBtn').addEventListener('click', deleteCurrentClient);
    document.getElementById('saveClientBtn').addEventListener('click', saveClient);
    
    // Bottone backup
    document.getElementById('backupBtn').addEventListener('click', () => openModal('backupModal'));

    // Bottoni documenti
    document.getElementById('addDocumentBtn').addEventListener('click', openAddDocumentModal);
    document.getElementById('saveDocumentBtn').addEventListener('click', saveDocument);
    document.getElementById('modalDocFileInput').addEventListener('change', handleDocFileSelect);

    // Bottoni note
    document.getElementById('addNoteBtn').addEventListener('click', openAddNoteModal);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);

    // Bottoni ordini
    document.getElementById('addOrderBtn').addEventListener('click', openAddOrderModal);
    document.getElementById('saveOrderBtn').addEventListener('click', saveOrder);
    
    // Calcolo margine in tempo reale
    document.getElementById('modalOrderAmount').addEventListener('input', calculateMargin);
    document.getElementById('modalOrderCost').addEventListener('input', calculateMargin);

    // Bottoni file
    document.getElementById('addFileBtn').addEventListener('click', openAddFileModal);
    document.getElementById('saveFileBtn').addEventListener('click', saveFile);
    document.getElementById('modalFileInput').addEventListener('change', handleFileSelect);

    // Bottoni dashboard e report
    document.getElementById('viewDashboardBtn').addEventListener('click', showDashboard);
    document.getElementById('viewReportsBtn').addEventListener('click', openReportView);
    document.getElementById('closeReportBtn').addEventListener('click', closeReportView);
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
        'orders': 'ordersTab',
        'documents': 'documentsTab',
        'files': 'filesTab',
        'notes': 'notesTab'
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

    // Ordina alfabeticamente per nome
    filteredClients.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));

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

    // Nascondi TUTTO tranne il client detail
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('reportView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('clientDetail').style.display = 'block';
    
    // Su mobile, nascondi la sidebar quando si apre un cliente
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('hidden-mobile');
        document.querySelector('.main-content').classList.add('fullscreen-mobile');
    }

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

function backToClientList() {
    // Mostra sidebar, nascondi dettagli (solo su mobile)
    document.querySelector('.sidebar').classList.remove('hidden-mobile');
    document.querySelector('.main-content').classList.remove('fullscreen-mobile');
    document.getElementById('clientDetail').style.display = 'none';
    document.getElementById('reportView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'none';
    
    if (state.clients.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
    } else {
        // Su mobile, torna semplicemente a mostrare la lista clienti
        // (la sidebar è già visibile)
    }
}

function openAddClientModal() {
    state.editMode = false;
    document.getElementById('modalClientTitle').textContent = 'Nuovo Cliente';
    document.getElementById('modalClientName').value = '';
    document.getElementById('modalClientAcquisitionDate').value = new Date().toISOString().split('T')[0]; // Data di oggi
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
    
    // Data acquisizione: usa acquisitionDate se esiste, altrimenti createdAt, altrimenti oggi
    const acquisitionDate = client.acquisitionDate || client.createdAt || new Date().toISOString();
    document.getElementById('modalClientAcquisitionDate').value = acquisitionDate.split('T')[0];
    
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

    if (state.editMode) {
        // Modifica cliente esistente - PRESERVA i dati esistenti!
        const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
        
        // Aggiorna SOLO i campi del form, mantieni tutto il resto
        state.clients[clientIndex].name = name;
        state.clients[clientIndex].acquisitionDate = document.getElementById('modalClientAcquisitionDate').value;
        state.clients[clientIndex].email = document.getElementById('modalClientEmail').value.trim();
        state.clients[clientIndex].phone = document.getElementById('modalClientPhone').value.trim();
        state.clients[clientIndex].address = document.getElementById('modalClientAddress').value.trim();
        state.clients[clientIndex].vat = document.getElementById('modalClientVat').value.trim();
        state.clients[clientIndex].updatedAt = new Date().toISOString();
        
        console.log('✅ Cliente aggiornato - dati preservati');
    } else {
        // Nuovo cliente - inizializza con array vuoti
        const newClient = {
            id: generateId(),
            name,
            acquisitionDate: document.getElementById('modalClientAcquisitionDate').value,
            email: document.getElementById('modalClientEmail').value.trim(),
            phone: document.getElementById('modalClientPhone').value.trim(),
            address: document.getElementById('modalClientAddress').value.trim(),
            vat: document.getElementById('modalClientVat').value.trim(),
            documents: [],
            files: [],
            notes: [],
            orders: [],
            createdAt: new Date().toISOString()
        };
        
        state.clients.push(newClient);
        state.currentClientId = newClient.id;
        
        console.log('✅ Nuovo cliente creato con data acquisizione: ' + newClient.acquisitionDate);
    }

    saveToStorage();
    renderClients();
    selectClient(state.currentClientId);
    closeModal('clientModal');
    
    // Notifica successo
    showNotification(state.editMode ? '✅ Cliente aggiornato' : '✅ Cliente creato', 'success');
}

function deleteCurrentClient() {
    if (!confirm('Sei sicuro di voler eliminare questo cliente? Tutti i dati associati verranno persi.')) {
        return;
    }

    state.clients = state.clients.filter(c => c.id !== state.currentClientId);
    state.currentClientId = null;
    
    saveToStorage();
    renderClients();
    
    // Notifica successo
    showNotification('🗑️ Cliente eliminato', 'success');
    
    // Mostra empty state o dashboard
    if (state.clients.length === 0) {
        document.getElementById('clientDetail').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    } else {
        showDashboard();
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
        <div class="document-card" ${doc.fileData ? 'onclick="downloadDocument(\'' + doc.id + '\')"' : ''} style="${doc.fileData ? 'cursor: pointer;' : ''}">
            <div class="document-card-header">
                <div class="document-type">${docIcons[doc.type]}</div>
                <button class="document-card-menu" onclick="event.stopPropagation(); deleteDocument('${doc.id}')">🗑️</button>
            </div>
            <div class="document-card-title">${docTypes[doc.type]}</div>
            <div class="document-card-number">${doc.number}</div>
            ${doc.fileName ? `<p style="font-size: 12px; color: var(--primary); margin-top: 6px;">📎 ${doc.fileName}</p>` : ''}
            ${doc.notes ? `<p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">${doc.notes}</p>` : ''}
            <div class="document-card-footer">
                <div class="document-card-amount">${formatCurrency(doc.amount)}</div>
                <div class="document-card-date">${formatDate(doc.date)}</div>
            </div>
            ${doc.fileData ? '<div style="position: absolute; top: 8px; right: 40px; background: var(--success); color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">FILE</div>' : ''}
        </div>
    `).join('');
}

function openAddDocumentModal() {
    state.editMode = false;
    state.selectedDocFile = null;
    document.getElementById('modalDocType').value = 'fattura';
    document.getElementById('modalDocNumber').value = '';
    document.getElementById('modalDocAmount').value = '';
    document.getElementById('modalDocDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalDocNotes').value = '';
    document.getElementById('modalDocFileInput').value = '';
    document.getElementById('docFileInputDisplay').classList.remove('has-file');
    document.getElementById('docFileInputDisplay').querySelector('.file-input-text').textContent = 'Carica PDF, Word, Excel o immagine';
    document.getElementById('docFileInfo').style.display = 'none';
    openModal('documentModal');
}

function handleDocFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Controllo dimensione (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Il file è troppo grande! Dimensione massima: 5MB');
        document.getElementById('modalDocFileInput').value = '';
        return;
    }

    state.selectedDocFile = file;

    // Aggiorna visualizzazione
    const display = document.getElementById('docFileInputDisplay');
    display.classList.add('has-file');
    display.querySelector('.file-input-text').textContent = `✓ ${file.name} selezionato`;

    // Mostra informazioni file
    document.getElementById('docFileInfoName').textContent = file.name;
    document.getElementById('docFileInfoSize').textContent = formatFileSize(file.size);
    document.getElementById('docFileInfo').style.display = 'block';
}

function saveDocument() {
    const number = document.getElementById('modalDocNumber').value.trim();
    
    if (!number) {
        alert('Il numero/riferimento del documento è obbligatorio');
        return;
    }

    const saveDocumentData = (fileData = null, fileName = null, fileSize = null, fileMimeType = null) => {
        const documentData = {
            id: generateId(),
            type: document.getElementById('modalDocType').value,
            number,
            amount: parseFloat(document.getElementById('modalDocAmount').value) || 0,
            date: document.getElementById('modalDocDate').value,
            notes: document.getElementById('modalDocNotes').value.trim(),
            fileData: fileData,
            fileName: fileName,
            fileSize: fileSize,
            fileMimeType: fileMimeType,
            createdAt: new Date().toISOString()
        };

        const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
        if (!state.clients[clientIndex].documents) {
            state.clients[clientIndex].documents = [];
        }
        state.clients[clientIndex].documents.push(documentData);

        saveToStorage();
        renderDocuments();
        closeModal('documentModal');
        
        state.selectedDocFile = null;
        
        // Notifica successo
        showNotification('✅ Documento aggiunto', 'success');
    };

    // Se c'è un file selezionato, caricalo
    if (state.selectedDocFile) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            saveDocumentData(
                e.target.result, 
                state.selectedDocFile.name,
                state.selectedDocFile.size,
                state.selectedDocFile.type
            );
        };

        reader.onerror = function() {
            alert('Errore durante la lettura del file');
        };

        reader.readAsDataURL(state.selectedDocFile);
    } else {
        // Nessun file, salva solo i dati del documento
        saveDocumentData();
    }
}

function downloadDocument(docId) {
    const client = state.clients.find(c => c.id === state.currentClientId);
    const doc = client.documents.find(d => d.id === docId);
    
    if (!doc || !doc.fileData) {
        alert('Nessun file associato a questo documento');
        return;
    }

    // Crea link per download
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    
    // Notifica successo
    showNotification(state.editMode ? '✅ Nota aggiornata' : '✅ Nota creata', 'success');
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
    
    const paymentLabels = {
        'pagato': '✅ Pagato',
        'non_pagato': '❌ Non Pagato',
        'parziale': '⏳ Parziale'
    };

    ordersList.innerHTML = client.orders.map(order => {
        const paymentStatus = order.paymentStatus || 'non_pagato';
        const paymentMethod = order.paymentMethod || '';
        const methodLabels = {
            'contanti': '💵',
            'bonifico': '🏦',
            'carta': '💳',
            'twint': '📱',
            'paypal': '🅿️',
            'altro': '📋'
        };
        
        // Badge scadenza
        let deadlineBadge = '';
        if (order.deadline) {
            const deadline = new Date(order.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            deadline.setHours(0, 0, 0, 0);
            
            const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                // Scaduto
                deadlineBadge = `<div style="margin-top: 8px; padding: 6px 10px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; font-size: 12px; color: #991b1b; font-weight: 600;">⚠️ Scaduto ${Math.abs(diffDays)} giorni fa!</div>`;
            } else if (diffDays === 0) {
                // Oggi
                deadlineBadge = `<div style="margin-top: 8px; padding: 6px 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 12px; color: #92400e; font-weight: 600;">🔥 Scadenza OGGI!</div>`;
            } else if (diffDays <= 3) {
                // Entro 3 giorni
                deadlineBadge = `<div style="margin-top: 8px; padding: 6px 10px; background: #fed7aa; border: 1px solid #f97316; border-radius: 6px; font-size: 12px; color: #9a3412; font-weight: 600;">⏰ Scade tra ${diffDays} giorni</div>`;
            } else if (diffDays <= 7) {
                // Entro 7 giorni
                deadlineBadge = `<div style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border: 1px solid #eab308; border-radius: 6px; font-size: 12px; color: #713f12; font-weight: 500;">📅 Scade tra ${diffDays} giorni</div>`;
            }
        }
        
        // Dettagli pagamento parziale
        let partialPaymentInfo = '';
        if (paymentStatus === 'parziale' && order.paidAmount) {
            const remaining = (order.amount || 0) - (order.paidAmount || 0);
            partialPaymentInfo = `
                <div style="margin-top: 8px; padding: 8px; background: rgba(156, 163, 175, 0.1); border-radius: 6px; font-size: 12px;">
                    <div>💰 Pagato: <strong>${formatCurrency(order.paidAmount)}</strong></div>
                    <div>⏳ Da saldare: <strong>${formatCurrency(remaining)}</strong></div>
                    ${order.expectedPaymentDate ? `<div>📅 Previsto: <strong>${formatDate(order.expectedPaymentDate)}</strong></div>` : ''}
                </div>
            `;
        }
        
        // Margine
        let marginInfo = '';
        if (order.margin !== undefined && order.margin !== null) {
            const marginColor = order.margin < 0 ? '#ef4444' : (order.margin < (order.amount * 0.2) ? '#f59e0b' : '#10b981');
            marginInfo = `<div style="margin-top: 8px; padding: 6px 10px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; font-size: 12px; color: ${marginColor}; font-weight: 500;">📊 Margine: ${formatCurrency(order.margin)} (${order.marginPercent}%)</div>`;
        }
        
        return `
        <div class="order-card" onclick="editOrder('${order.id}')" style="cursor: pointer;" title="Clicca per modificare l'ordine">
            <div class="order-card-header">
                <div class="order-card-info">
                    <h4>${order.number}</h4>
                    <div class="order-card-description">${order.description}</div>
                    ${deadlineBadge}
                    ${marginInfo}
                    ${partialPaymentInfo}
                </div>
                <div style="display: flex; gap: 8px; flex-direction: column; align-items: flex-end;">
                    <span class="order-status ${order.status}">${statusLabels[order.status]}</span>
                    <span class="payment-status ${paymentStatus}">${paymentLabels[paymentStatus]}${paymentMethod ? ' ' + methodLabels[paymentMethod] : ''}</span>
                </div>
            </div>
            <div class="order-card-footer">
                <div class="order-card-amount">${formatCurrency(order.amount)}</div>
                <div class="order-card-date">${formatDate(order.date)}</div>
                <div class="order-card-actions">
                    <button class="btn-small" onclick="event.stopPropagation(); editOrder('${order.id}')" style="padding: 4px 12px; font-size: 12px;">✏️</button>
                    <button class="btn-danger" onclick="event.stopPropagation(); deleteOrder('${order.id}')" style="padding: 4px 12px; font-size: 12px;">🗑️</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
    document.getElementById('modalOrderCost').value = '';
    document.getElementById('modalOrderDeadline').value = '';
    document.getElementById('modalOrderDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalOrderStatus').value = 'in_lavorazione';
    document.getElementById('modalOrderPaymentStatus').value = 'non_pagato';
    document.getElementById('modalOrderPaymentMethod').value = '';
    
    // Reset campi pagamento parziale
    document.getElementById('modalOrderPaidAmount').value = '';
    document.getElementById('modalOrderExpectedPaymentDate').value = '';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    // Nascondi margine display
    document.getElementById('marginDisplay').style.display = 'none';
    
    openModal('orderModal');
}

// Calcola margine in tempo reale
function calculateMargin() {
    const amount = parseFloat(document.getElementById('modalOrderAmount').value) || 0;
    const cost = parseFloat(document.getElementById('modalOrderCost').value) || 0;
    
    if (amount > 0 && cost >= 0) {
        const margin = amount - cost;
        const marginPercent = ((margin / amount) * 100).toFixed(1);
        
        document.getElementById('marginValue').textContent = formatCurrency(margin);
        document.getElementById('marginPercentage').textContent = `${marginPercent}% di margine`;
        document.getElementById('marginDisplay').style.display = 'block';
        
        // Cambia colore in base al margine
        const marginValueEl = document.getElementById('marginValue');
        const marginDisplayEl = document.getElementById('marginDisplay').querySelector('div');
        
        if (margin < 0) {
            marginValueEl.style.color = '#ef4444'; // Rosso
            marginDisplayEl.style.borderColor = '#ef4444';
        } else if (margin < amount * 0.2) {
            marginValueEl.style.color = '#f59e0b'; // Arancione
            marginDisplayEl.style.borderColor = '#f59e0b';
        } else {
            marginValueEl.style.color = '#10b981'; // Verde
            marginDisplayEl.style.borderColor = '#10b981';
        }
    } else {
        document.getElementById('marginDisplay').style.display = 'none';
    }
}

// Funzione per mostrare/nascondere campi pagamento parziale
function togglePartialPaymentFields() {
    const paymentStatus = document.getElementById('modalOrderPaymentStatus').value;
    const partialFields = document.getElementById('partialPaymentFields');
    
    if (paymentStatus === 'parziale') {
        partialFields.style.display = 'block';
    } else {
        partialFields.style.display = 'none';
    }
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
    document.getElementById('modalOrderCost').value = order.cost || 0;
    document.getElementById('modalOrderDeadline').value = order.deadline || '';
    document.getElementById('modalOrderDate').value = order.date;
    document.getElementById('modalOrderStatus').value = order.status;
    document.getElementById('modalOrderPaymentStatus').value = order.paymentStatus || 'non_pagato';
    document.getElementById('modalOrderPaymentMethod').value = order.paymentMethod || '';
    
    // Campi pagamento parziale
    document.getElementById('modalOrderPaidAmount').value = order.paidAmount || '';
    document.getElementById('modalOrderExpectedPaymentDate').value = order.expectedPaymentDate || '';
    
    // Mostra campi parziale se necessario
    if (order.paymentStatus === 'parziale') {
        document.getElementById('partialPaymentFields').style.display = 'block';
    } else {
        document.getElementById('partialPaymentFields').style.display = 'none';
    }
    
    // Calcola e mostra margine
    calculateMargin();
    
    openModal('orderModal');
}

function saveOrder() {
    const number = document.getElementById('modalOrderNumber').value.trim();
    const description = document.getElementById('modalOrderDescription').value.trim();
    const amount = parseFloat(document.getElementById('modalOrderAmount').value);
    const cost = parseFloat(document.getElementById('modalOrderCost').value);
    
    // Validazione campi obbligatori
    if (!number || !description) {
        alert('❌ Numero ordine e descrizione sono obbligatori');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('❌ Importo totale è obbligatorio e deve essere maggiore di 0');
        document.getElementById('modalOrderAmount').focus();
        return;
    }
    
    if (cost === undefined || cost === null || cost < 0) {
        alert('❌ Costo materiali è obbligatorio (può essere 0)');
        document.getElementById('modalOrderCost').focus();
        return;
    }

    const clientIndex = state.clients.findIndex(c => c.id === state.currentClientId);
    const paymentStatus = document.getElementById('modalOrderPaymentStatus').value;
    
    const margin = amount - cost;
    const marginPercent = amount > 0 ? ((margin / amount) * 100).toFixed(2) : 0;
    
    const orderData = {
        number,
        description,
        amount: amount,
        cost: cost,
        margin: margin,
        marginPercent: parseFloat(marginPercent),
        deadline: document.getElementById('modalOrderDeadline').value || null,
        date: document.getElementById('modalOrderDate').value,
        status: document.getElementById('modalOrderStatus').value,
        paymentStatus: paymentStatus,
        paymentMethod: document.getElementById('modalOrderPaymentMethod').value
    };
    
    // Aggiungi dati pagamento parziale se applicabile
    if (paymentStatus === 'parziale') {
        orderData.paidAmount = parseFloat(document.getElementById('modalOrderPaidAmount').value) || 0;
        orderData.expectedPaymentDate = document.getElementById('modalOrderExpectedPaymentDate').value || '';
    } else {
        // Rimuovi campi se non è parziale
        orderData.paidAmount = null;
        orderData.expectedPaymentDate = null;
    }
    
    if (state.editMode && state.editItemId) {
        // Modifica ordine esistente
        const orderIndex = state.clients[clientIndex].orders.findIndex(o => o.id === state.editItemId);
        state.clients[clientIndex].orders[orderIndex] = {
            ...state.clients[clientIndex].orders[orderIndex],
            ...orderData,
            updatedAt: new Date().toISOString()
        };
    } else {
        // Nuovo ordine
        const order = {
            id: generateId(),
            ...orderData,
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
    
    // Notifica successo
    showNotification(state.editMode ? '✅ Ordine aggiornato' : '✅ Ordine creato', 'success');
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

// Modifica ordine dal report
function editOrderFromReport(clientId, orderId) {
    // Imposta il cliente corrente
    state.currentClientId = clientId;
    
    // Trova il cliente e l'ordine
    const client = state.clients.find(c => c.id === clientId);
    if (!client) {
        alert('Cliente non trovato');
        return;
    }
    
    const order = client.orders ? client.orders.find(o => o.id === orderId) : null;
    if (!order) {
        alert('Ordine non trovato');
        return;
    }
    
    // Apri il modal di modifica
    editOrder(orderId);
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
        
        // Notifica successo
        showNotification('✅ File caricato', 'success');
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

// ===== DASHBOARD CHARTS =====
let ordersStatusChart = null;
let revenueChart = null;

function destroyCharts() {
    if (ordersStatusChart) {
        ordersStatusChart.destroy();
        ordersStatusChart = null;
    }
    if (revenueChart) {
        revenueChart.destroy();
        revenueChart = null;
    }
}

function createOrdersStatusChart(statusStats) {
    const ctx = document.getElementById('ordersStatusChart');
    if (!ctx) return;
    
    destroyCharts();
    
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#0f172a';
    const gridColor = isDark ? '#475569' : '#e2e8f0';
    
    ordersStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['🔨 In Lavorazione', '✅ Completato', '⏳ In Attesa'],
            datasets: [{
                data: [
                    statusStats.in_lavorazione.count,
                    statusStats.completato.count,
                    statusStats.in_attesa.count
                ],
                backgroundColor: [
                    'rgba(30, 64, 175, 0.8)',
                    'rgba(6, 95, 70, 0.8)',
                    'rgba(146, 64, 14, 0.8)'
                ],
                borderColor: [
                    '#1e40af',
                    '#065f46',
                    '#92400e'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} ordini (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Calcola fatturato ultimi 6 mesi
    const now = new Date();
    const monthsData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
        
        let revenue = 0;
        state.clients.forEach(client => {
            if (client.orders) {
                client.orders.forEach(order => {
                    if (order.date) {
                        const orderDate = new Date(order.date);
                        if (orderDate.getMonth() === date.getMonth() && 
                            orderDate.getFullYear() === date.getFullYear() &&
                            order.paymentStatus === 'pagato') {
                            revenue += (order.amount || 0);
                        }
                    }
                });
            }
        });
        
        monthsData.push({
            month: monthName,
            revenue: revenue
        });
    }
    
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#0f172a';
    const gridColor = isDark ? '#475569' : '#e2e8f0';
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthsData.map(d => d.month),
            datasets: [{
                label: 'Fatturato (Pagati)',
                data: monthsData.map(d => d.revenue),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return 'CHF ' + value.toLocaleString('de-CH');
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== DASHBOARD SYSTEM =====
function showDashboard() {
    // Nascondi tutto tranne la dashboard
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('clientDetail').style.display = 'none';
    document.getElementById('reportView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    
    // Su mobile, nascondi la sidebar e mostra fullscreen
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('hidden-mobile');
        document.querySelector('.main-content').classList.add('fullscreen-mobile');
    }
    
    // Deseleziona cliente corrente
    state.currentClientId = null;
    renderClients(); // Rimuove la selezione visiva
    
    // Popola la dashboard
    renderDashboard();
}

function renderDashboard() {
    // Calcola KPI generali
    const totalClients = state.clients.length;
    
    let totalOrders = 0;
    let totalOrdersAmount = 0;  // Importo totale di TUTTI gli ordini
    let totalRevenue = 0;        // Importo solo ordini pagati
    let inProgressOrders = 0;
    let completedOrders = 0;
    let waitingOrders = 0;
    let paidOrders = 0;
    let unpaidOrders = 0;
    
    const allOrders = [];
    const pendingPayments = [];
    
    state.clients.forEach(client => {
        if (client.orders && client.orders.length > 0) {
            totalOrders += client.orders.length;
            
            client.orders.forEach(order => {
                // Aggiungi info cliente all'ordine
                const orderWithClient = {
                    ...order,
                    clientId: client.id,
                    clientName: client.name
                };
                
                allOrders.push(orderWithClient);
                
                // Somma importo totale di TUTTI gli ordini
                totalOrdersAmount += (order.amount || 0);
                
                // Conteggi per stato
                if (order.status === 'in_lavorazione') inProgressOrders++;
                if (order.status === 'completato') completedOrders++;
                if (order.status === 'in_attesa') waitingOrders++;
                
                // Conteggi pagamenti
                const paymentStatus = order.paymentStatus || 'non_pagato';
                if (paymentStatus === 'pagato') {
                    paidOrders++;
                    totalRevenue += (order.amount || 0);
                }
                if (paymentStatus === 'non_pagato') unpaidOrders++;
                
                // Pagamenti in sospeso (non pagato o parziale)
                if (paymentStatus === 'non_pagato' || paymentStatus === 'parziale') {
                    pendingPayments.push(orderWithClient);
                }
            });
        }
    });
    
    // Aggiorna KPI
    document.getElementById('dashTotalClients').textContent = totalClients;
    document.getElementById('dashTotalOrders').textContent = totalOrders;
    document.getElementById('dashTotalOrdersAmount').textContent = formatCurrency(totalOrdersAmount);
    document.getElementById('dashTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('dashInProgress').textContent = inProgressOrders;
    document.getElementById('dashCompleted').textContent = completedOrders;
    document.getElementById('dashWaiting').textContent = waitingOrders;
    document.getElementById('dashPaid').textContent = paidOrders;
    document.getElementById('dashUnpaid').textContent = unpaidOrders;
    
    // Ordina ordini per data (più recenti prima)
    allOrders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    // Ultimi 5 ordini
    renderDashboardRecentOrders(allOrders.slice(0, 5));
    
    // Pagamenti in sospeso (massimo 5)
    renderDashboardPendingPayments(pendingPayments.slice(0, 5));
    
    // Clienti recenti (ultimi 5)
    const recentClients = [...state.clients].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    }).slice(0, 5);
    renderDashboardRecentClients(recentClients);
    
    // Crea grafici
    const statusStats = {
        'in_lavorazione': { count: inProgressOrders, amount: 0 },
        'completato': { count: completedOrders, amount: 0 },
        'in_attesa': { count: waitingOrders, amount: 0 }
    };
    
    createOrdersStatusChart(statusStats);
    createRevenueChart();
}

function renderDashboardRecentOrders(orders) {
    const container = document.getElementById('dashRecentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-section"><p>Nessun ordine</p></div>';
        return;
    }
    
    const statusColors = {
        'in_lavorazione': { bg: '#dbeafe', color: '#1e40af' },
        'completato': { bg: '#d1fae5', color: '#065f46' },
        'in_attesa': { bg: '#fef3c7', color: '#92400e' },
        'annullato': { bg: '#fee2e2', color: '#991b1b' }
    };
    
    const statusLabels = {
        'in_lavorazione': '🔨',
        'completato': '✅',
        'in_attesa': '⏳',
        'annullato': '❌'
    };
    
    container.innerHTML = orders.map(order => {
        const colors = statusColors[order.status] || { bg: '#e5e7eb', color: '#374151' };
        return `
            <div class="dashboard-item" onclick="editOrderFromReport('${order.clientId}', '${order.id}')">
                <div class="dashboard-item-header">
                    <div class="dashboard-item-title">${order.number}</div>
                    <span class="dashboard-item-badge" style="background: ${colors.bg}; color: ${colors.color};">${statusLabels[order.status]}</span>
                </div>
                <div class="dashboard-item-subtitle">${order.clientName} • ${formatDate(order.date)}</div>
                <div class="dashboard-item-amount">${formatCurrency(order.amount)}</div>
            </div>
        `;
    }).join('');
}

function renderDashboardPendingPayments(orders) {
    const container = document.getElementById('dashPendingPayments');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-section"><p>Tutto pagato! 🎉</p></div>';
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const paymentStatus = order.paymentStatus || 'non_pagato';
        const isParziale = paymentStatus === 'parziale';
        const remaining = isParziale ? (order.amount || 0) - (order.paidAmount || 0) : (order.amount || 0);
        
        return `
            <div class="dashboard-item" onclick="editOrderFromReport('${order.clientId}', '${order.id}')">
                <div class="dashboard-item-header">
                    <div class="dashboard-item-title">${order.number}</div>
                    <span class="dashboard-item-badge" style="background: ${isParziale ? '#fef3c7' : '#fee2e2'}; color: ${isParziale ? '#92400e' : '#991b1b'};">${isParziale ? '⏳' : '❌'}</span>
                </div>
                <div class="dashboard-item-subtitle">${order.clientName}</div>
                <div class="dashboard-item-amount" style="color: #ef4444;">${formatCurrency(remaining)} ${isParziale ? 'da saldare' : 'da pagare'}</div>
            </div>
        `;
    }).join('');
}

function renderDashboardRecentClients(clients) {
    const container = document.getElementById('dashRecentClients');
    
    if (clients.length === 0) {
        container.innerHTML = '<div class="empty-section"><p>Nessun cliente</p></div>';
        return;
    }
    
    container.innerHTML = clients.map(client => {
        const ordersCount = (client.orders || []).length;
        const totalValue = (client.orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
        
        return `
            <div class="dashboard-item" onclick="selectClient('${client.id}')">
                <div class="dashboard-item-header">
                    <div class="dashboard-item-title">${client.name}</div>
                    <span class="dashboard-item-badge" style="background: var(--bg-tertiary); color: var(--text-secondary);">${ordersCount} 📦</span>
                </div>
                <div class="dashboard-item-subtitle">${client.email || 'Nessuna email'}</div>
                ${totalValue > 0 ? `<div class="dashboard-item-amount">${formatCurrency(totalValue)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ===== REPORT SYSTEM =====
function openReportView() {
    // Nascondo TUTTO tranne il report
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('clientDetail').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('reportView').style.display = 'block';
    
    // Su mobile, nascondi la sidebar e mostra fullscreen
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('hidden-mobile');
        document.querySelector('.main-content').classList.add('fullscreen-mobile');
    }
    
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
    
    // GENERA AUTOMATICAMENTE IL REPORT
    generateReport();
}

function closeReportView() {
    document.getElementById('reportView').style.display = 'none';
    
    // Mostra la sidebar
    document.querySelector('.sidebar').classList.remove('hidden-mobile');
    document.querySelector('.main-content').classList.remove('fullscreen-mobile');
    
    if (state.clients.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
    } else if (state.currentClientId) {
        document.getElementById('clientDetail').style.display = 'block';
        // Su mobile, nascondi sidebar per fullscreen cliente
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.add('hidden-mobile');
            document.querySelector('.main-content').classList.add('fullscreen-mobile');
        }
    } else {
        // Torna alla dashboard
        showDashboard();
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
    
    // Rigenera automaticamente il report quando cambia il periodo
    generateReport();
}

// Filtra per stato cliccando sulle card
function filterByStatus(status) {
    const statusSelect = document.getElementById('reportStatus');
    
    // Se è già selezionato questo stato, torna a "tutti"
    if (statusSelect.value === status) {
        statusSelect.value = 'all';
    } else {
        statusSelect.value = status;
    }
    
    // Aggiorna classi active sulle card
    updateStatusCardsActive(statusSelect.value);
    
    // Rigenera il report con il nuovo filtro
    generateReport();
    
    // Scroll al report table
    document.getElementById('reportTable').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Aggiorna le classi active sulle status cards
function updateStatusCardsActive(selectedStatus) {
    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('active');
    });
    
    if (selectedStatus !== 'all') {
        const activeCard = document.querySelector(`.status-card.status-${selectedStatus}`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
    }
}

// Filtra per completati non pagati
function filterByCompletedUnpaid() {
    // Imposta entrambi i filtri
    document.getElementById('reportStatus').value = 'completato';
    
    // Genera il report base
    generateReport();
    
    // Poi filtra ulteriormente solo i non pagati
    const allOrders = state.reportData;
    const completedUnpaid = allOrders.filter(order => {
        return order.status === 'completato' && 
               (order.paymentStatus === 'non_pagato' || !order.paymentStatus);
    });
    
    // Aggiorna la tabella con solo questi ordini
    renderReportTable(completedUnpaid);
    
    // Aggiorna l'importo totale
    const totalAmount = completedUnpaid.reduce((sum, order) => sum + (order.amount || 0), 0);
    document.getElementById('totalRevenue').textContent = formatCurrency(totalAmount);
    document.getElementById('totalRevenueLabel').textContent = 'Importo Completati Non Pagati';
    document.getElementById('totalOrders').textContent = completedUnpaid.length;
    
    // Marca la card come attiva
    document.querySelectorAll('.status-card').forEach(card => card.classList.remove('active'));
    document.querySelector('.status-card.status-completato-non-pagato')?.classList.add('active');
    
    // Scroll al report table
    document.getElementById('reportTable').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getDateRange(period) {
    const now = new Date();
    let from, to;
    
    switch(period) {
        case 'week':
            // Inizio settimana (lunedì)
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            monday.setHours(0, 0, 0, 0);
            from = monday;
            to = new Date(now);
            to.setHours(23, 59, 59, 999);
            break;
            
        case 'month':
            // Primo giorno del mese corrente
            from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            to = new Date(now);
            to.setHours(23, 59, 59, 999);
            break;
            
        case 'quarter':
            // Primo giorno del trimestre corrente
            const quarter = Math.floor(now.getMonth() / 3);
            from = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
            to = new Date(now);
            to.setHours(23, 59, 59, 999);
            break;
            
        case 'year':
            // 1 Gennaio dell'anno corrente
            from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            to = new Date(now);
            to.setHours(23, 59, 59, 999);
            break;
            
        case 'custom':
            from = new Date(document.getElementById('reportDateFrom').value);
            from.setHours(0, 0, 0, 0);
            to = new Date(document.getElementById('reportDateTo').value);
            to.setHours(23, 59, 59, 999);
            break;
            
        case 'all':
        default:
            // Tutti i periodi
            from = new Date(2000, 0, 1, 0, 0, 0, 0);
            to = new Date(now);
            to.setHours(23, 59, 59, 999);
            break;
    }
    
    console.log(`📅 Range periodo '${period}': da ${from.toLocaleDateString('it-IT')} a ${to.toLocaleDateString('it-IT')}`);
    return { from, to };
}

function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const clientFilter = document.getElementById('reportClient').value;
    const statusFilter = document.getElementById('reportStatus').value;
    
    console.log('🔄 Generazione report...', { period, clientFilter, statusFilter });
    
    const dateRange = getDateRange(period);
    
    // ===== RACCOLTA ORDINI =====
    // Prima raccogliamo TUTTI gli ordini del periodo (per le statistiche)
    const allOrdersForStats = [];
    
    state.clients.forEach(client => {
        if (!client.orders || client.orders.length === 0) return;
        
        // Filtra per cliente se selezionato
        if (clientFilter !== 'all' && client.id !== clientFilter) return;
        
        client.orders.forEach(order => {
            if (!order.date) return;
            
            const orderDate = new Date(order.date);
            orderDate.setHours(12, 0, 0, 0); // Normalizza a mezzogiorno per evitare problemi timezone
            
            // Filtra per periodo
            if (orderDate >= dateRange.from && orderDate <= dateRange.to) {
                allOrdersForStats.push({
                    ...order,
                    clientId: client.id,
                    clientName: client.name
                });
            }
        });
    });
    
    // Poi filtriamo per stato (per la tabella)
    const filteredOrders = statusFilter === 'all' 
        ? [...allOrdersForStats]
        : allOrdersForStats.filter(order => order.status === statusFilter);
    
    // Ordina per data (più recenti prima)
    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    state.reportData = filteredOrders;
    
    console.log(`📦 Ordini totali: ${allOrdersForStats.length}, Filtrati: ${filteredOrders.length}`);
    
    // ===== RACCOLTA CLIENTI ACQUISITI =====
    const newClients = [];
    
    state.clients.forEach(client => {
        // Filtra per cliente se selezionato
        if (clientFilter !== 'all' && client.id !== clientFilter) return;
        
        // Usa la data del PRIMO ORDINE invece della data di registrazione
        if (!client.orders || client.orders.length === 0) {
            // Nessun ordine: usa data acquisizione come fallback
            const dateToUse = client.acquisitionDate || client.createdAt;
            
            if (dateToUse) {
                const clientDate = new Date(dateToUse);
                clientDate.setHours(12, 0, 0, 0);
                
                if (clientDate >= dateRange.from && clientDate <= dateRange.to) {
                    newClients.push(client);
                }
            }
            return;
        }
        
        // Trova il primo ordine (più vecchio)
        const firstOrder = client.orders.reduce((oldest, order) => {
            if (!order.date) return oldest;
            if (!oldest || new Date(order.date) < new Date(oldest.date)) {
                return order;
            }
            return oldest;
        }, null);
        
        if (firstOrder && firstOrder.date) {
            const firstOrderDate = new Date(firstOrder.date);
            firstOrderDate.setHours(12, 0, 0, 0);
            
            // Cliente appare nel periodo del primo ordine
            if (firstOrderDate >= dateRange.from && firstOrderDate <= dateRange.to) {
                newClients.push(client);
            }
        }
    });
    
    // Ordina per data del primo ordine (più recenti prima)
    newClients.sort((a, b) => {
        // Trova data del primo ordine per cliente A
        let dateA = new Date(a.acquisitionDate || a.createdAt);
        if (a.orders && a.orders.length > 0) {
            const firstOrderA = a.orders.reduce((oldest, order) => {
                if (!order.date) return oldest;
                if (!oldest || new Date(order.date) < new Date(oldest.date)) {
                    return order;
                }
                return oldest;
            }, null);
            if (firstOrderA && firstOrderA.date) {
                dateA = new Date(firstOrderA.date);
            }
        }
        
        // Trova data del primo ordine per cliente B
        let dateB = new Date(b.acquisitionDate || b.createdAt);
        if (b.orders && b.orders.length > 0) {
            const firstOrderB = b.orders.reduce((oldest, order) => {
                if (!order.date) return oldest;
                if (!oldest || new Date(order.date) < new Date(oldest.date)) {
                    return order;
                }
                return oldest;
            }, null);
            if (firstOrderB && firstOrderB.date) {
                dateB = new Date(firstOrderB.date);
            }
        }
        
        return dateB - dateA;
    });
    
    console.log(`👥 Clienti acquisiti trovati: ${newClients.length}`);
    
    // ===== CALCOLA STATISTICHE PER STATO =====
    // Le statistiche vengono calcolate su TUTTI gli ordini del periodo (non filtrati)
    const statusStats = {
        'in_lavorazione': { count: 0, amount: 0 },
        'completato': { count: 0, amount: 0 },
        'in_attesa': { count: 0, amount: 0 },
        'completato_non_pagato': { count: 0, amount: 0 }
    };
    
    allOrdersForStats.forEach(order => {
        const status = order.status || 'in_lavorazione';
        const paymentStatus = order.paymentStatus || 'non_pagato';
        
        // Conta per stato normale
        if (statusStats[status]) {
            statusStats[status].count++;
            statusStats[status].amount += (order.amount || 0);
        }
        
        // Conta separatamente i completati non pagati
        if (status === 'completato' && paymentStatus === 'non_pagato') {
            statusStats.completato_non_pagato.count++;
            statusStats.completato_non_pagato.amount += (order.amount || 0);
        }
    });
    
    // Aggiorna breakdown per stato
    document.getElementById('statusCountInLavorazione').textContent = statusStats.in_lavorazione.count;
    document.getElementById('statusAmountInLavorazione').textContent = formatCurrency(statusStats.in_lavorazione.amount);
    
    document.getElementById('statusCountCompletato').textContent = statusStats.completato.count;
    document.getElementById('statusAmountCompletato').textContent = formatCurrency(statusStats.completato.amount);
    
    document.getElementById('statusCountInAttesa').textContent = statusStats.in_attesa.count;
    document.getElementById('statusAmountInAttesa').textContent = formatCurrency(statusStats.in_attesa.amount);
    
    document.getElementById('statusCountCompletatoNonPagato').textContent = statusStats.completato_non_pagato.count;
    document.getElementById('statusAmountCompletatoNonPagato').textContent = formatCurrency(statusStats.completato_non_pagato.amount);
    
    // ===== CALCOLA IMPORTO TOTALE IN BASE AL FILTRO =====
    let totalRevenue = 0;
    let revenueLabelText = 'Importo Totale';
    
    if (statusFilter === 'all') {
        // Nessun filtro: mostra importo totale di TUTTI gli ordini
        totalRevenue = allOrdersForStats.reduce((sum, order) => sum + (order.amount || 0), 0);
        revenueLabelText = 'Importo Totale (Tutti)';
    } else {
        // Filtro stato selezionato: mostra solo importo di quel stato
        totalRevenue = statusStats[statusFilter].amount;
        const statusLabels = {
            'in_lavorazione': 'In Lavorazione',
            'completato': 'Completato',
            'in_attesa': 'In Attesa',
            'annullato': 'Annullato'
        };
        revenueLabelText = `Importo ${statusLabels[statusFilter]}`;
    }
    
    // ===== ALTRE STATISTICHE =====
    // Le statistiche dei summary cards mostrano i dati FILTRATI (quelli nella tabella)
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === 'completato').length;
    const totalNewClients = newClients.length;
    
    console.log('📊 Statistiche:', {
        totalNewClients,
        totalOrders,
        totalRevenue,
        completedOrders,
        statusFilter,
        statusStats
    });
    
    // Aggiorna summary
    document.getElementById('totalNewClients').textContent = totalNewClients;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalRevenueLabel').textContent = revenueLabelText;
    document.getElementById('completedOrders').textContent = completedOrders;
    
    // Renderizza tabelle
    renderClientsAcquiredTable(newClients, dateRange);
    renderReportTable(filteredOrders);
    
    // Aggiorna classi active sulle card
    updateStatusCardsActive(statusFilter);
    
    console.log('✅ Report generato!');
    console.log(`💰 Importo filtrato: ${formatCurrency(totalRevenue)}`);
}

function renderClientsAcquiredTable(clients, dateRange) {
    const tbody = document.getElementById('clientsAcquiredTableBody');
    
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-report">Nessun nuovo cliente in questo periodo</td></tr>';
        return;
    }
    
    tbody.innerHTML = clients.map(client => {
        // Conta ordini del cliente
        const ordersCount = client.orders ? client.orders.length : 0;
        
        // Calcola valore totale ordini
        const totalValue = client.orders ? client.orders.reduce((sum, o) => sum + (o.amount || 0), 0) : 0;
        
        // Contatti
        const contacts = [client.email, client.phone].filter(Boolean).join(' • ') || '-';
        
        // Usa la data del PRIMO ORDINE come data di visualizzazione
        let displayDate = client.acquisitionDate || client.createdAt;
        
        if (client.orders && client.orders.length > 0) {
            // Trova il primo ordine (più vecchio)
            const firstOrder = client.orders.reduce((oldest, order) => {
                if (!order.date) return oldest;
                if (!oldest || new Date(order.date) < new Date(oldest.date)) {
                    return order;
                }
                return oldest;
            }, null);
            
            if (firstOrder && firstOrder.date) {
                displayDate = firstOrder.date;
            }
        }
        
        // Determina colore in base allo stato pagamenti
        let paymentColor = '#6366f1'; // Default blu
        
        if (client.orders && client.orders.length > 0) {
            const paidOrders = client.orders.filter(o => o.paymentStatus === 'pagato').length;
            const unpaidOrders = client.orders.filter(o => o.paymentStatus === 'non_pagato').length;
            const partialOrders = client.orders.filter(o => o.paymentStatus === 'parziale').length;
            
            if (paidOrders === client.orders.length) {
                // Tutti pagati → Verde
                paymentColor = '#065f46';
            } else if (unpaidOrders === client.orders.length) {
                // Tutti non pagati → Rosso
                paymentColor = '#991b1b';
            } else {
                // Misto o parziale → Grigio
                paymentColor = '#374151';
            }
        }
        
        return `
            <tr onclick="selectClient('${client.id}'); closeReportView();" style="cursor: pointer;">
                <td><strong>${formatDate(displayDate)}</strong></td>
                <td><strong>${client.name}</strong></td>
                <td>${contacts}</td>
                <td>${ordersCount}</td>
                <td class="report-amount" style="color: ${paymentColor}; font-weight: 700;">${formatCurrency(totalValue)}</td>
            </tr>
        `;
    }).join('');
}

function renderReportTable(orders) {
    const tbody = document.getElementById('reportTableBody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-report">Nessun ordine trovato per i filtri selezionati</td></tr>';
        return;
    }
    
    const statusLabels = {
        'in_lavorazione': 'In Lavorazione',
        'completato': 'Completato',
        'in_attesa': 'In Attesa',
        'annullato': 'Annullato'
    };
    
    const paymentLabels = {
        'pagato': '✅ Pagato',
        'non_pagato': '❌ Non Pagato',
        'parziale': '⏳ Parziale'
    };
    
    tbody.innerHTML = orders.map(order => {
        const paymentStatus = order.paymentStatus || 'non_pagato';
        
        // Determina il colore di background per lo stato pagamento
        let paymentBgColor = '';
        let paymentTextColor = '';
        
        if (paymentStatus === 'pagato') {
            // Verde
            paymentBgColor = '#d1fae5';
            paymentTextColor = '#065f46';
        } else if (paymentStatus === 'non_pagato') {
            // Rosso
            paymentBgColor = '#fee2e2';
            paymentTextColor = '#991b1b';
        } else if (paymentStatus === 'parziale') {
            // Grigio
            paymentBgColor = '#e5e7eb';
            paymentTextColor = '#374151';
        }
        
        // Colore per importo (stesso del badge)
        let amountColor = paymentTextColor;
        
        return `
        <tr onclick="editOrderFromReport('${order.clientId}', '${order.id}')" style="cursor: pointer;" title="Clicca per modificare l'ordine">
            <td>${formatDate(order.date)}</td>
            <td><strong>${order.clientName}</strong></td>
            <td>${order.number}</td>
            <td>${order.description}</td>
            <td><span class="report-status-badge ${order.status}">${statusLabels[order.status]}</span></td>
            <td><span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${paymentBgColor}; color: ${paymentTextColor};">${paymentLabels[paymentStatus]}</span></td>
            <td class="report-amount" style="color: ${amountColor}; font-weight: 700;">${formatCurrency(order.amount)}</td>
        </tr>
        `;
    }).join('');
}

function exportToCSV() {
    if (state.reportData.length === 0) {
        alert('Genera prima un report per esportarlo');
        return;
    }
    
    const paymentLabels = {
        'pagato': 'Pagato',
        'non_pagato': 'Non Pagato',
        'parziale': 'Parziale'
    };
    
    // Intestazioni CSV
    let csv = 'Data,Cliente,N° Ordine,Descrizione,Stato,Stato Pagamento,Importo\n';
    
    // Righe dati
    state.reportData.forEach(order => {
        const paymentStatus = order.paymentStatus || 'non_pagato';
        const row = [
            formatDate(order.date),
            `"${order.clientName}"`,
            `"${order.number}"`,
            `"${order.description}"`,
            order.status,
            paymentLabels[paymentStatus],
            order.amount || 0
        ].join(',');
        csv += row + '\n';
    });
    
    // Aggiungi totali
    const totalRevenue = state.reportData.reduce((sum, o) => sum + (o.amount || 0), 0);
    csv += '\n';
    csv += `TOTALE ORDINI,${state.reportData.length},,,,,\n`;
    csv += `TOTALE FATTURATO,,,,,,${totalRevenue}\n`;
    
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
                .payment-paid { background: #d1fae5; color: #065f46; }
                .payment-unpaid { background: #fee2e2; color: #991b1b; }
                .payment-partial { background: #e5e7eb; color: #374151; }
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
                        <th>Pagamento</th>
                        <th>Importo</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.reportData.map(order => {
                        const paymentStatus = order.paymentStatus || 'non_pagato';
                        const paymentLabels = {
                            'pagato': 'Pagato',
                            'non_pagato': 'Non Pagato',
                            'parziale': 'Parziale'
                        };
                        
                        // Colori per pagamento
                        let paymentClass = '';
                        let amountColor = '#6366f1';
                        
                        if (paymentStatus === 'pagato') {
                            paymentClass = 'payment-paid';
                            amountColor = '#065f46';
                        } else if (paymentStatus === 'non_pagato') {
                            paymentClass = 'payment-unpaid';
                            amountColor = '#991b1b';
                        } else if (paymentStatus === 'parziale') {
                            paymentClass = 'payment-partial';
                            amountColor = '#374151';
                        }
                        
                        return `
                        <tr>
                            <td>${formatDate(order.date)}</td>
                            <td><strong>${order.clientName}</strong></td>
                            <td>${order.number}</td>
                            <td>${order.description}</td>
                            <td><span class="status-badge status-${order.status}">${statusLabels[order.status]}</span></td>
                            <td><span class="status-badge ${paymentClass}">${paymentLabels[paymentStatus]}</span></td>
                            <td><strong style="color: ${amountColor};">${formatCurrency(order.amount)}</strong></td>
                        </tr>
                        `;
                    }).join('')}
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

// ===== DEBUG HELPERS =====
// Funzione chiamabile dalla console per debug: window.debugState()
window.debugState = function() {
    console.log('🔍 ==== DEBUG STATE ====');
    console.log('📊 Clienti totali:', state.clients.length);
    console.log('🔢 Order counter:', state.orderCounter);
    console.log('☁️ Cloud sync:', cloudSyncEnabled ? 'ATTIVO' : 'DISATTIVO');
    console.log('🆔 User ID:', userId);
    console.log('🔄 Syncing from cloud:', state.isSyncingFromCloud);
    console.log('📂 Cliente corrente:', state.currentClientId);
    
    // Conta ordini totali
    let totalOrders = 0;
    state.clients.forEach(c => {
        if (c.orders) totalOrders += c.orders.length;
    });
    console.log('📦 Ordini totali:', totalOrders);
    
    // Mostra ultimo salvataggio
    const localData = localStorage.getItem('gestionale_data');
    if (localData) {
        const parsed = JSON.parse(localData);
        console.log('💾 LocalStorage: OK,', parsed.length, 'clienti');
    } else {
        console.log('💾 LocalStorage: VUOTO');
    }
    
    console.log('🔍 ==== FINE DEBUG ====');
    return state;
};

// Log automatico ogni 5 minuti per tracking
setInterval(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`⏰ [${timestamp}] Stato: ${state.clients.length} clienti, cloud: ${cloudSyncEnabled ? 'ON' : 'OFF'}`);
}, 300000); // 5 minuti

// ===== BACKUP & RESTORE =====
function exportBackup() {
    try {
        const backupData = {
            version: '2.1',
            timestamp: new Date().toISOString(),
            clients: state.clients,
            orderCounter: state.orderCounter
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        
        const date = new Date().toISOString().split('T')[0];
        link.download = `3dmakes-backup-${date}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        showNotification('✅ Backup scaricato con successo', 'success');
        console.log('💾 Backup esportato:', backupData);
    } catch (error) {
        console.error('❌ Errore esportazione backup:', error);
        showNotification('❌ Errore durante l\'esportazione', 'error');
    }
}

function importBackup() {
    const fileInput = document.getElementById('restoreFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Seleziona un file backup JSON');
        return;
    }
    
    if (!confirm('⚠️ ATTENZIONE: Importare questo backup sostituirà TUTTI i dati attuali. Sei sicuro di voler continuare?')) {
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            // Valida il formato
            if (!backupData.clients || !Array.isArray(backupData.clients)) {
                throw new Error('Formato backup non valido');
            }
            
            // Ripristina i dati
            state.clients = backupData.clients;
            state.orderCounter = backupData.orderCounter || 1;
            
            // Salva in localStorage e cloud
            saveToStorage();
            
            // Aggiorna l'interfaccia
            renderClients();
            state.currentClientId = null;
            
            if (state.clients.length > 0) {
                showDashboard();
            } else {
                document.getElementById('clientDetail').style.display = 'none';
                document.getElementById('dashboardView').style.display = 'none';
                document.getElementById('emptyState').style.display = 'block';
            }
            
            closeModal('backupModal');
            fileInput.value = ''; // Reset input
            
            showNotification(`✅ Backup ripristinato! ${state.clients.length} clienti importati`, 'success');
            console.log('📥 Backup importato:', backupData);
        } catch (error) {
            console.error('❌ Errore importazione backup:', error);
            showNotification('❌ Errore: file backup non valido', 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('❌ Errore lettura file', 'error');
    };
    
    reader.readAsText(file);
}

