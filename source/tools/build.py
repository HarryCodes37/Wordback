import os, glob, json
from PIL import Image, ImageDraw, ImageFont
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=os.path.join(root,'src'); dist=os.path.join(root,'dist'); os.makedirs(dist,exist_ok=True)
css=open(os.path.join(src,'styles.css')).read()
js='\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(src,'0*.js'))))
body='<div id="app"></div><div id="sheet"></div>\n<script>\n'+js+'\n</script>\n'
head_common='<title>Wordback</title>\n<meta name="description" content="Wordback: Incident Management Dashboard">\n<meta name="theme-color" content="#0b0c0e">\n<style>\n'+css+'\n</style>\n'
full='''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Wordback">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
'''+head_common+'</head>\n<body>\n'+body+'</body>\n</html>\n'
open(os.path.join(dist,'index.html'),'w').write(full)
# artifact flavour: no doctype/head wrapper
art='<meta name="claude:viewport-fit-sides" content="cover">\n'+head_common+body
open(os.path.join(root,'artifact.html'),'w').write(art)
man={"name":"Wordback: Incident Management Dashboard","short_name":"Wordback","start_url":"./","scope":"./","display":"standalone","orientation":"any","background_color":"#141618","theme_color":"#0b0c0e","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
json.dump(man,open(os.path.join(dist,'manifest.webmanifest'),'w'),indent=1)
ver=str(int(os.path.getmtime(os.path.join(dist,'index.html'))))
sw='''const C='wordback-%s';
const FILES=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(FILES.map(f=>c.add(new Request(f,{mode:f.startsWith('http')?'cors':'same-origin'})).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>{const net=fetch(e.request).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));}return res;}).catch(()=>r);return r||net;}));});
'''%ver
open(os.path.join(dist,'sw.js'),'w').write(sw)
def icon(n):
  im=Image.new('RGB',(n,n),(20,22,24)); d=ImageDraw.Draw(im)
  r=int(n*0.36); cx=cy=n//2
  d.rounded_rectangle([n*0.12,n*0.12,n*0.88,n*0.88],radius=int(n*0.14),outline=(232,54,46),width=max(2,n//24))
  try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',int(n*0.46))
  except: f=ImageFont.load_default()
  d.text((cx,cy),'W',font=f,fill=(244,246,247),anchor='mm')
  d.rectangle([n*0.3,n*0.74,n*0.7,n*0.77],fill=(232,54,46))
  return im
for n in (180,192,512): icon(n).save(os.path.join(dist,'icon-%d.png'%n))
print('built', len(full)//1024,'KB')
