export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;

  let html=await response.text();
  const start=html.indexOf("async function loadHeroImage(img)");
  const end=html.indexOf("\nasync function latest()",start);
  if(start!==-1&&end!==-1){
    const loader='function loadHeroImage(img){img.onload=()=>img.classList.add("ready");img.onerror=()=>console.error("Hero image missing");img.src="/hero-clean.webp?v=sharp-4"}';
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
