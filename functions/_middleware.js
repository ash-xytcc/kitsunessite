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
        const response=await fetch("/assets/hero-clean.webp.b64?v=direct-1",{cache:"no-store"});
        if(!response.ok)throw new Error("Hero source missing: "+response.status);
        const encoded=(await response.text()).trim();
        const binary=atob(encoded);
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

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache, no-store, must-revalidate");
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");

  return new Response(html, { status: response.status, headers });
}
