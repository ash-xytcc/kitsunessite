export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  let html = await response.text();
  const start = html.indexOf("async function loadHeroImage(img)");
  const end = html.indexOf("\nasync function latest()", start);

  if (start !== -1 && end !== -1) {
    const loader = `async function loadHeroImage(img){
      try{
        const parts=await Promise.all([0,1,2,3,4,5].map(async i=>{
          const response=await fetch("/assets/hero."+i+".txt?v=stable-1",{cache:"no-store"});
          if(!response.ok)throw new Error("Hero part missing: "+i+" ("+response.status+")");
          return (await response.text()).trim();
        }));
        const binary=atob(parts.join(""));
        const bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        const url=URL.createObjectURL(new Blob([bytes],{type:"image/webp"}));
        img.onload=()=>{img.classList.add("ready");URL.revokeObjectURL(url)};
        img.onerror=()=>console.error("Hero image failed to decode");
        img.src=url;
      }catch(error){console.error(error)}
    }`;
    html = html.slice(0, start) + loader + html.slice(end);
  }

  html = html.replace("</style>", `.scroll-cue{background:#101214;padding:.52rem .9rem;border-radius:.35rem;box-shadow:0 0 18px 16px #101214}</style>`);

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache, no-store, must-revalidate");
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  return new Response(html, { status: response.status, headers });
}
