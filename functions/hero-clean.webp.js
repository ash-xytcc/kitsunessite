const PARTS=[
"hero-clean.0.hex",
"hero-clean.1.hex",
"hero-clean.2.hex",
"hero-sharp.3a.hex",
"hero-sharp.3b.hex",
"hero-sharp.4a.hex",
"hero-sharp.4b.hex",
"hero-sharp.5a.hex",
"hero-sharp.5b.hex"
];

let builtHero;

async function buildHero(){
  if(!builtHero){
    builtHero=(async()=>{
      const base="https://raw.githubusercontent.com/ash-xytcc/kitsunessite/main/assets/";
      const chunks=await Promise.all(PARTS.map(async name=>{
        const response=await fetch(base+name,{cf:{cacheEverything:true,cacheTtl:86400}});
        if(!response.ok)throw new Error(`Missing hero source: ${name}`);
        return response.text();
      }));
      const hex=chunks.join("").trim();
      const bytes=new Uint8Array(hex.length/2);
      for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
      if(String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")throw new Error("Invalid hero WebP");
      return bytes;
    })();
  }
  return builtHero;
}

export async function onRequestGet(){
  try{
    const bytes=await buildHero();
    return new Response(bytes,{headers:{
      "content-type":"image/webp",
      "cache-control":"public, max-age=31536000, immutable"
    }});
  }catch(error){
    return new Response("Hero image unavailable",{status:500,headers:{"content-type":"text/plain"}});
  }
}
