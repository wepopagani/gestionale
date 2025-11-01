// ===== STATO DELL'APPLICAZIONE =====
let state = {
    clients: [],
    currentClientId: null,
    editMode: false,
    editItemId: null
};

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    renderClients();
    setupEventListeners();
    
    // Se ci sono clienti, seleziona il primo
    if (state.clients.length > 0) {
        selectClient(state.clients[0].id);
    }
});

// ===== STORAGE =====
function saveToStorage() {
    localStorage.setItem('gestionale_data', JSON.stringify(state.clients));
}

function loadFromStorage() {
    const data = localStorage.getItem('gestionale_data');
    if (data) {
        state.clients = JSON.parse(data);
    }
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
    document.getElementById('modalOrderNumber').value = '';
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
    document.getElementById('modalOrderNumber').value = order.number;
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

