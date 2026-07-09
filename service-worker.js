// Service Worker per 3DMAKES Gestionale
// Versione 2.3.2 — refactor completo scritture per-path, counter transazionale,
// listener real-time granulare. Fix per formato cloud misto (array legacy +
// frammenti da migrazione parziale): riconciliazione automatica con merge
// dei nodi fantasma per evitare perdite di ordini.

const CACHE_NAME = '3dmakes-gestionale-v3.29';
const urlsToCache = [
  '/',
  '/index.html',
  '/3dmakes-theme.css',
  '/genera-preventivo.html',
  '/preventivo-config-servizi.js',
  '/storico-preventivi.html',
  '/calcolatore-prezzi.html',
  '/calcolatore.html',
  '/migrazione-preventivi.html',
  '/recupero.html',
  '/style.css',
  '/logo.png'
];

// File che cambiano spesso (auth, config): non metterli in cache install.
const NETWORK_ONLY_PATTERNS = [
  'firebase-config.js',
  'auth-staff.js',
  'app.js',
  'firestore-init.js',
  'staff-auth.css'
];

function isNetworkOnlyRequest(url) {
  return NETWORK_ONLY_PATTERNS.some(function (p) { return url.includes(p); });
}

// Installazione - Caching dei file statici
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installazione in corso...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: File cached');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Errore caching:', error);
      })
  );
  self.skipWaiting();
});

// Attivazione - Pulizia cache vecchie
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Attivazione');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Rimozione cache vecchia', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - Strategia: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora richieste Firebase
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Auth/config: sempre rete, mai cache (evita login bloccato su JS vecchio)
  if (isNetworkOnlyRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se la richiesta ha successo, aggiorna la cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se offline, usa la cache
        return caches.match(event.request).then((response) => {
          return response || caches.match('/index.html');
        });
      })
  );
});

// Messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

