export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;

  let html=await response.text();
  const start=html.indexOf("async function loadHeroImage(img)");
  const end=html.indexOf("\nasync function latest()",start);
  if(start!==-1&&end!==-1){
    const loader=`async function loadHeroImage(img){
      try{
        const names=[
          "hero-clean.0.hex","hero-clean.1.hex","hero-clean.2.hex",
          "hero-sharp.3a.hex","hero-sharp.3b.hex",
          "hero-sharp.4a.hex","hero-sharp.4b.hex",
          "hero-sharp.5a.hex","hero-sharp.5b.hex"
        ];
        const parts=await Promise.all(names.map(async name=>{
          const r=await fetch("/assets/"+name+"?v=restored-1");
          if(!r.ok)throw new Error("Missing hero image data");
          return (await r.text()).trim();
        }));
        const hex=parts.join("");
        if(hex.slice(0,8)!=="52494646"||hex.slice(16,24)!=="57454250")throw new Error("Invalid hero image data");
        const bytes=new Uint8Array(hex.length/2);
        for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
        const url=URL.createObjectURL(new Blob([bytes],{type:"image/webp"}));
        img.onload=()=>{img.classList.add("ready");URL.revokeObjectURL(url)};
        img.onerror=()=>console.error("Hero image failed to decode");
        img.src=url;
      }catch(error){console.error(error)}
    }`;
    html=html.slice(0,start)+loader+html.slice(end);
  }

  const headers=new Headers(response.headers);
  headers.set("content-type","text/html; charset=utf-8");
  headers.set("cache-control","no-cache");
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  return new Response(html,{status:response.status,headers});
}
