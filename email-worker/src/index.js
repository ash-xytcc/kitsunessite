import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";

const now=()=>new Date().toISOString();
const slug=s=>String(s||"comic").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"comic";
const ext=t=>({"image/jpeg":"jpg","image/png":"png","image/gif":"gif","image/webp":"webp","image/heic":"heic","image/heif":"heif"}[t]||"bin");
const source=s=>`email:${String(s||"").trim().toLowerCase()}`;
const cleanSubject=s=>String(s||"").replace(/^(re|fwd?):\s*/i,"").replace(/[\r\n]+/g," ").trim();
const cleanBody=s=>String(s||"").split(/\n(?:On .+wrote:|From: .+|>)/i)[0].trim();
const base=env=>String(env.PUBLIC_SITE_URL||"").replace(/\/+$/,"");
async function active(env,id,status="draft"){return env.DB.prepare("SELECT * FROM comics WHERE source_phone=? AND status=? ORDER BY updated_at DESC LIMIT 1").bind(id,status).first()}
async function count(env,id){const r=await env.DB.prepare("SELECT COUNT(*) n FROM comic_media WHERE comic_id=?").bind(id).first();return Number(r?.n||0)}
async function publish(env,c){if(!await count(env,c.id))throw Error("The draft has no pages.");const title=String(c.title||"").trim()||"Untitled comic",s=c.slug||`${slug(title)}-${c.id.slice(0,6)}`,t=now();await env.DB.prepare("UPDATE comics SET title=?,slug=?,status='published',published_at=?,updated_at=? WHERE id=?").bind(title,s,t,t,c.id).run();return s}
function replyRaw(message,text){const subject=cleanSubject(message.headers.get("subject")||"")||"Kitsune Comics",mid=String(message.headers.get("message-id")||"").replace(/[\r\n]/g,"");let raw=`From: ${message.to}\r\nTo: ${message.from}\r\nSubject: Re: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n`;if(mid)raw+=`In-Reply-To: ${mid}\r\nReferences: ${mid}\r\n`;raw+=`\r\n${text}\r\n`;return message.reply(new EmailMessage(message.to,message.from,raw))}
async function safeReply(message,text){try{await replyRaw(message,text)}catch(e){console.error("Could not send email reply",e)}}

export default {
 async email(message,env){
  if(!env.DB||!env.MEDIA||!env.ALLOWED_EMAIL||!env.PUBLIC_SITE_URL){message.setReject("Publisher is not configured");return}
  if(String(message.from||"").trim().toLowerCase()!==String(env.ALLOWED_EMAIL).trim().toLowerCase()){message.setReject("Sender not authorized");return}
  try{
   const mail=await PostalMime.parse(message.raw),from=source(message.from),text=cleanBody(mail.text||""),command=(text.split(/\r?\n/)[0]||"").trim().toUpperCase();
   if(command==="HELP"){await safeReply(message,"Attach comic pages to a new email. Put the comic title in the subject and the caption in the message. I will reply with a private preview. Reply PUBLISH when it looks right. Commands: PUBLISH, CANCEL, UNDO, HELP.");return}
   if(command==="PUBLISH"){
    const d=await active(env,from);if(!d){await safeReply(message,"There is no draft waiting to publish.");return}const s=await publish(env,d);await safeReply(message,`Published: ${base(env)}/comic/${s}\n\nReply UNDO if it should come down.`);return
   }
   if(command==="UNDO"){
    const c=await active(env,from,"published");if(!c){await safeReply(message,"There is no published comic to undo.");return}await env.DB.prepare("UPDATE comics SET status='unpublished',updated_at=? WHERE id=?").bind(now(),c.id).run();await safeReply(message,`Unpublished “${c.title||"Untitled comic"}”.\n\nPrivate preview: ${base(env)}/preview/${c.preview_token}\nReply PUBLISH to restore it.`);return
   }
   if(command==="CANCEL"){
    const d=await active(env,from);if(!d){await safeReply(message,"There is no draft to cancel.");return}const m=await env.DB.prepare("SELECT object_key FROM comic_media WHERE comic_id=?").bind(d.id).all();for(const x of m.results||[])await env.MEDIA.delete(x.object_key);await env.DB.prepare("DELETE FROM comics WHERE id=?").bind(d.id).run();await safeReply(message,"Draft cancelled. Nothing was published.");return
   }
   const images=(mail.attachments||[]).filter(a=>String(a.mimeType||"").startsWith("image/"));
   if(images.length){
    if(images.length>24)throw Error("A comic can contain at most 24 attached images.");const id=crypto.randomUUID(),token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll("-",""),t=now(),title=cleanSubject(mail.subject)||"Untitled comic";
    await env.DB.prepare("INSERT INTO comics(id,preview_token,title,caption,status,source_phone,created_at,updated_at) VALUES(?,?,?,?,'draft',?,?,?)").bind(id,token,title,text,from,t,t).run();
    let order=0;for(const image of images){const type=String(image.mimeType||"");if(image.content.byteLength>20*1024*1024)throw Error(`${image.filename||"An image"} is larger than 20 MB.`);const key=`comics/${id}/${String(order).padStart(3,"0")}.${ext(type)}`;await env.MEDIA.put(key,image.content,{httpMetadata:{contentType:type}});await env.DB.prepare("INSERT INTO comic_media(id,comic_id,object_key,content_type,sort_order,alt_text,created_at) VALUES(?,?,?,?,?,'',?)").bind(crypto.randomUUID(),id,key,type,order,t).run();order++}
    await safeReply(message,`Draft received: “${title}”\n${order} page${order===1?"":"s"}\n\nPrivate preview: ${base(env)}/preview/${token}\n\nReply PUBLISH when it looks right, or CANCEL to discard it.`);return
   }
   const d=await active(env,from);if(d&&(mail.subject||text)){const title=cleanSubject(mail.subject)||d.title,caption=text||d.caption;await env.DB.prepare("UPDATE comics SET title=?,caption=?,updated_at=? WHERE id=?").bind(title,caption,now(),d.id).run();await safeReply(message,`Draft updated.\n\nPrivate preview: ${base(env)}/preview/${d.preview_token}\nReply PUBLISH when it looks right.`);return}
   await safeReply(message,"Attach one or more comic images. Put the title in the subject and the caption in the message. Send HELP for instructions.");
  }catch(e){console.error(e);await safeReply(message,`I could not save that email. Nothing was published. ${e.message||""}`)}
 }
};