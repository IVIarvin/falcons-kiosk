const CACHE='falcons-public-v4';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html'))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('falcons-public-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('/offline.html')));return;}
 if(/^\/audio\/piller\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/.test(url.pathname)){if(req.headers.has('range'))return;event.respondWith((async()=>{let cache;try{cache=await caches.open(CACHE);const cached=await cache.match(req);if(cached)return cached;}catch{}const response=await fetch(req);if(cache&&response.status===200&&response.headers.get('content-type')?.startsWith('audio/mpeg')){try{await cache.put(req,response.clone());}catch{}}return response;})());return;}
 if(['/brand/','/products/','/icons/','/_next/static/'].some(prefix=>url.pathname.startsWith(prefix))){event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(req);if(cached)return cached;const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}));}
});
