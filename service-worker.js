// Service Worker per 3DMAKES Gestionale
// Versione 2.1

const CACHE_NAME = '3dmakes-gestionale-v3.15';
const urlsToCache = [
  '/',
  '/index.html',
  '/3dmakes-theme.css',
  '/genera-preventivo.html',
  '/storico-preventivi.html',
  '/calcolatore-prezzi.html',
  '/calcolatore.html',
  '/migrazione-preventivi.html',
  '/app.js',
  '/style.css',
  '/firebase-config.js',
  '/firestore-init.js',
  '/logo.png'
];

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

