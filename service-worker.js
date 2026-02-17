// Версия кэша для управления обновлениями
const CACHE_NAME = 'scaner-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './manifest.json',
    './images/icon.png',
    './js/app.js',
    './js/html5-qrcode.min.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Установка...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Кэширование файлов');
                return cache.addAll(urlsToCache);
            })
    );
    
    // Пропускаем ожидание активации для быстрого запуска
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Активация...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Удаляем старые версии кэша
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Удаление старого кэша', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Принимаем контроль над страницами сразу после активации
    self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', event => {
    console.log('Service Worker: Перехват запроса', event.request.url);
    
    // Проверяем, что запрос относится к нашему scope
    if (!event.request.url.includes('./')) {
        return;
    }
    
    event.respondWith(
        // Сначала пытаемся получить из кэша
        caches.match(event.request)
            .then(response => {
                // Если нашли в кэше - возвращаем его
                if (response) {
                    console.log('Service Worker: Загрузка из кэша', event.request.url);
                    return response;
                }
                
                // Если нет в кэше - делаем сетевой запрос
                console.log('Service Worker: Загрузка из сети', event.request.url);
                return fetch(event.request).then(
                    response => {
                        // Кэшируем успешные ответы
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        
                        return response;
                    }
                );
            })
            .catch(error => {
                console.log('Service Worker: Ошибка загрузки', error);
                
                // Возвращаем страницу ошибки или дефолтный контент
                if (event.request.url.includes('.html')) {
                    return caches.match('./index.html');
                }
            })
    );
});