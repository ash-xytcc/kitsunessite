const SITE_NAME="Kitsune";
const SERIES_NAME="The River Has Teeth";

const xmlEscape=value=>String(value??"")
 .replaceAll("&","&amp;")
 .replaceAll("<","&lt;")
 .replaceAll(">","&gt;")
 .replaceAll('"',"&quot;")
 .replaceAll("'","&apos;");

const cdata=value=>String(value??"").replaceAll("]]>","]]]]><![CDATA[>");
const absolute=(base,path)=>new URL(path,base).toString();

export async function onRequestGet({request,env}){
 if(!env.DB)return new Response("RSS feed is not configured.",{status:503,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});

 const requestOrigin=new URL(request.url).origin;
 const base=String(env.PUBLIC_SITE_URL||requestOrigin).replace(/\/+$/ ,"")+"/";
 const site=absolute(base,"/");
 const feed=absolute(base,"/feed.xml");
 const icon=absolute(base,"/favicon.svg");
 const rows=await env.DB.prepare(
  "SELECT id,title,slug,caption,published_at FROM comics WHERE status='published' ORDER BY published_at DESC LIMIT 50"
 ).all();

 const items=[];
 for(const comic of rows.results||[]){
  const media=await env.DB.prepare(
   "SELECT object_key,content_type,alt_text FROM comic_media WHERE comic_id=? ORDER BY sort_order ASC LIMIT 1"
  ).bind(comic.id).first();
  const link=absolute(base,"/comic/"+encodeURIComponent(comic.slug||""));
  const image=media?.object_key?absolute(base,"/api?action=media&key="+encodeURIComponent(media.object_key)):"";
  const caption=String(comic.caption||"").trim();
  const installmentTitle=String(comic.title||"").trim()||"Untitled installment";
  const feedTitle=`${SERIES_NAME}: ${installmentTitle}`;
  const imageHtml=image?`<p><a href="${xmlEscape(link)}"><img src="${xmlEscape(image)}" alt="${xmlEscape(media?.alt_text||`First page of ${installmentTitle}`)}" style="max-width:100%;height:auto"></a></p>`:"";
  const captionHtml=caption?`<p>${xmlEscape(caption).replaceAll("\n","<br>")}</p>`:"";
  const content=`<p><strong>${xmlEscape(SERIES_NAME)}</strong></p>${imageHtml}${captionHtml}<p><a href="${xmlEscape(link)}">Read the full installment →</a></p>`;
  const pubDate=comic.published_at?new Date(comic.published_at).toUTCString():new Date().toUTCString();
  items.push(`<item>
<title>${xmlEscape(feedTitle)}</title>
<link>${xmlEscape(link)}</link>
<guid isPermaLink="true">${xmlEscape(link)}</guid>
<category>${xmlEscape(SERIES_NAME)}</category>
<pubDate>${xmlEscape(pubDate)}</pubDate>
<description><![CDATA[${cdata(content)}]]></description>
<content:encoded><![CDATA[${cdata(content)}]]></content:encoded>
${image?`<enclosure url="${xmlEscape(image)}" type="${xmlEscape(media?.content_type||"image/jpeg")}"/>`:""}
</item>`);
 }

 const lastDate=(rows.results||[])[0]?.published_at;
 const xml=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:webfeeds="http://webfeeds.org/rss/1.0">
<channel>
<title>${SITE_NAME}</title>
<link>${xmlEscape(site)}</link>
<description>A tiny enchanted library of comics, drawings, writing, and other work by Kitsune. Currently featuring The River Has Teeth.</description>
<language>en-us</language>
<atom:link href="${xmlEscape(feed)}" rel="self" type="application/rss+xml"/>
<image>
<url>${xmlEscape(icon)}</url>
<title>${SITE_NAME}</title>
<link>${xmlEscape(site)}</link>
<width>144</width>
<height>144</height>
</image>
<webfeeds:icon>${xmlEscape(icon)}</webfeeds:icon>
<webfeeds:logo>${xmlEscape(icon)}</webfeeds:logo>
<webfeeds:accentColor>d35d3e</webfeeds:accentColor>
<lastBuildDate>${xmlEscape(lastDate?new Date(lastDate).toUTCString():new Date().toUTCString())}</lastBuildDate>
<generator>${SITE_NAME}</generator>
${items.join("\n")}
</channel>
</rss>`;

 return new Response(xml,{headers:{
  "content-type":"application/rss+xml; charset=utf-8",
  "cache-control":"public, max-age=300",
  "x-content-type-options":"nosniff"
 }});
}