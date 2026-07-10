const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const now=()=>new Date().toISOString();
const slug=s=>String(s||"comic").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"comic";
const ext=t=>({"image/jpeg":"jpg","image/png":"png","image/gif":"gif","image/webp":"webp","image/heic":"heic","image/heif":"heif"}[t]||"bin");
const origin=(env,r)=>String(env.PUBLIC_SITE_URL||new URL(r.url).origin).replace(/\/+$/,"");
const keyFrom=(r,f)=>String(r.headers.get("authorization")||"").replace(/^Bearer\s+/i,"")||String(f.get("key")||"");
const okay=(a,b)=>{a=String(a||"");b=String(b||"");if(!a||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0};
async function mediaCount(env,id){const r=await env.DB.prepare("SELECT COUNT(*) n FROM comic_media WHERE comic_id=?").bind(id).first();return Number(r?.n||0)}
async function publish(env,c){if(!await mediaCount(env,c.id))throw Error("The draft has no comic pages.");const title=String(c.title||"").trim()||"Untitled comic",s=c.slug||`${slug(title)}-${c.id.slice(0,6)}`,t=now();await env.DB.prepare("UPDATE comics SET title=?,slug=?,status='published',published_at=?,updated_at=? WHERE id=?").bind(title,s,t,t,c.id).run();return s}
export async function onRequestPost({request,env}){
 if(!env.DB||!env.MEDIA||!env.PUBLISH_SECRET)return json({error:"Publishing is not configured yet."},503);
 let f;try{f=await request.formData()}catch{return json({error:"Expected a form submission."},400)}
 if(!okay(keyFrom(request,f),env.PUBLISH_SECRET))return json({error:"That private publishing link is not authorized."},403);
 const action=String(f.get("action")||"upload");
 try{
  if(action==="upload"){
   const files=f.getAll("images").filter(x=>x&&typeof x.arrayBuffer==="function"&&x.size>0);
   if(!files.length)return json({error:"Attach at least one comic image."},400);
   if(files.length>24)return json({error:"A comic can contain at most 24 images."},400);
   const id=crypto.randomUUID(),token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll("-",""),t=now(),title=String(f.get("title")||"").trim(),caption=String(f.get("caption")||"").trim();
   await env.DB.prepare("INSERT INTO comics(id,preview_token,title,caption,status,source_id,created_at,updated_at) VALUES(?,?,?,?,'draft','web',?,?)").bind(id,token,title,caption,t,t).run();
   let order=0;
   try{
    for(const file of files){
     const type=String(file.type||"");if(!type.startsWith("image/"))throw Error(`${file.name||"A file"} is not an image.`);if(file.size>20*1024*1024)throw Error(`${file.name||"An image"} is larger than 20 MB.`);
     const objectKey=`comics/${id}/${String(order).padStart(3,"0")}.${ext(type)}`;await env.MEDIA.put(objectKey,await file.arrayBuffer(),{httpMetadata:{contentType:type}});
     await env.DB.prepare("INSERT INTO comic_media(id,comic_id,object_key,content_type,sort_order,alt_text,created_at) VALUES(?,?,?,?,?,'',?)").bind(crypto.randomUUID(),id,objectKey,type,order,t).run();order++;
    }
   }catch(e){const stored=await env.DB.prepare("SELECT object_key FROM comic_media WHERE comic_id=?").bind(id).all();for(const x of stored.results||[])await env.MEDIA.delete(x.object_key);await env.DB.prepare("DELETE FROM comics WHERE id=?").bind(id).run();throw e}
   const base=origin(env,request),preview=`${base}/preview/${token}`;
   if(String(f.get("publish_now")||"")==="true"){const c=await env.DB.prepare("SELECT * FROM comics WHERE id=?").bind(id).first(),s=await publish(env,c);return json({ok:true,published:true,url:`${base}/comic/${s}`,preview})}
   return json({ok:true,published:false,preview,token,title:title||"Untitled comic",pages:order});
  }
  if(action==="publish"){
   const token=String(f.get("token")||"");const c=await env.DB.prepare("SELECT * FROM comics WHERE preview_token=? AND status IN ('draft','unpublished') LIMIT 1").bind(token).first();if(!c)return json({error:"Draft not found or already published."},404);const s=await publish(env,c);return json({ok:true,published:true,url:`${origin(env,request)}/comic/${s}`});
  }
  if(action==="cancel"){
   const token=String(f.get("token")||"");const c=await env.DB.prepare("SELECT * FROM comics WHERE preview_token=? AND status='draft' LIMIT 1").bind(token).first();if(!c)return json({error:"Draft not found."},404);const m=await env.DB.prepare("SELECT object_key FROM comic_media WHERE comic_id=?").bind(c.id).all();for(const x of m.results||[])await env.MEDIA.delete(x.object_key);await env.DB.prepare("DELETE FROM comics WHERE id=?").bind(c.id).run();return json({ok:true,cancelled:true});
  }
  if(action==="undo"){
   const c=await env.DB.prepare("SELECT * FROM comics WHERE status='published' ORDER BY published_at DESC LIMIT 1").first();if(!c)return json({error:"There is no published comic to unpublish."},404);await env.DB.prepare("UPDATE comics SET status='unpublished',updated_at=? WHERE id=?").bind(now(),c.id).run();return json({ok:true,preview:`${origin(env,request)}/preview/${c.preview_token}`,title:c.title});
  }
  return json({error:"Unknown publishing action."},400);
 }catch(e){console.error(e);return json({error:e.message||"Publishing failed. Nothing was made public."},500)}
}
export const onRequestGet=()=>json({error:"POST only"},405);
