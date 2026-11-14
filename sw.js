// Keeps a copy of the page so it opens at once, and with no connection. The copy is shown straight away
// while the server is asked, in the background, whether there is a newer one; if there is, it is kept for
// next time and the page is told, so it can offer a reload.
const CACHE="sonoscope-v1";
self.addEventListener("install",e=>{
  self.skipWaiting();
  // the page that put this here, from the browser's own cache when it has it
  e.waitUntil(caches.open(CACHE).then(c=>c.add(new Request("./index.html",{cache:"default"}))).catch(()=>{}));
});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
const ver=r=> r&&(r.headers.get("etag")||r.headers.get("last-modified")||"");
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET"||r.headers.has("range")) return;
  const u=new URL(r.url);
  if(u.origin!==location.origin||u.pathname.endsWith("/sw.js")) return;
  if(u.pathname.endsWith("/prototype.html")) return;   // a local test page: always fresh, never kept
  const key=u.origin+u.pathname.replace(/\/$/,"/index.html");
  e.respondWith((async()=>{
    const c=await caches.open(CACHE), hit=await c.match(key);
    const net=fetch(u.origin+u.pathname+u.search,{cache:"no-cache",credentials:"same-origin"}).then(async res=>{
      if(res.ok&&res.type==="basic"){
        const was=ver(hit), now=ver(res);
        await c.put(key,res.clone());
        if(hit&&was&&now&&was!==now){
          for(const cl of await self.clients.matchAll({type:"window"})) cl.postMessage({type:"sonoscope-updated"});
        }
      }
      return res;
    });
    if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
    return net;
  })());
});
