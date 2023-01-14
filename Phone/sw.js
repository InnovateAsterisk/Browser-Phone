const cacheID = "v0";
const ASSETS = [
    "index.html",

    "favicon.ico",

    "avatars/default.0.webp",
    "avatars/default.1.webp",
    "avatars/default.2.webp",
    "avatars/default.3.webp",
    "avatars/default.4.webp",
    "avatars/default.5.webp",
    "avatars/default.6.webp",
    "avatars/default.7.webp",
    "avatars/default.8.webp",

    "wallpaper.dark.webp",
    "wallpaper.light.webp",

    "phone.js",
    "phone.css",
    "phone.light.css",
    "phone.dark.css"
];

self.addEventListener('install', function(event){
    console.log("Service Worker: Install");
    event.waitUntil(
        async function(){
            const cache = await caches.open(cacheID);
            await cache.addAll(ASSETS);
            self.skipWaiting();
        }
    );
});
self.addEventListener('activate', function(event){
    console.log("Service Worker: Activate");
    event.waitUntil(
        async function(){
            clients.claim();
        }
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then(function(response){
            if (response) return response;
            return fetch(event.request).then(function(response){
                return response;
            }).catch(function(error) {
                console.error(`Fetching failed: ${error}`);
                throw error;
            });
        })
    );
});
