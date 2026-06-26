// ============================================
// QuizLearn - Service Worker
// ============================================

const CACHE_NAME = 'quizlearn-v1.0.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/src/css/components.css',
    '/src/js/app.js',
    '/src/js/utils/toast.js',
    '/src/js/utils/storage.js',
    '/src/js/utils/validator.js',
    '/src/js/utils/api.js',
    '/src/js/modules/auth.js',
    '/src/js/modules/flashcard.js',
    '/src/js/modules/learn.js',
    '/src/js/modules/test.js',
    '/src/js/modules/dashboard.js',
    '/src/js/modules/navigation.js',
    '/manifest.json',
    '/memes/correct/1.gif',
    '/memes/correct/2.gif',
    '/memes/correct/3.gif',
    '/memes/correct/4.gif',
    '/memes/correct/5.gif',
    '/memes/incorrect/1.gif',
    '/memes/incorrect/2.gif',
    '/memes/incorrect/3.gif',
    '/memes/incorrect/4.gif',
    '/memes/incorrect/5.gif'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API requests
    if (event.request.url.includes('/api/')) return;

    // Skip external requests (except CDN)
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('cdnjs.cloudflare.com') &&
        !event.request.url.includes('cdn.jsdelivr.net')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response and update cache in background
                    event.waitUntil(
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => cache.put(event.request, networkResponse.clone()));
                                }
                            })
                            .catch(() => {})
                    );
                    return cachedResponse;
                }

                // No cache, fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(event.request, responseClone));
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Push notifications (future)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: data.url
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.notification.data) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});
