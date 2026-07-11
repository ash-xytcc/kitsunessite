const MOBILE_NAV_FIX = `
<style id="mobile-nav-fix">
@media (max-width:650px){
  header{
    display:grid!important;
    grid-template-columns:2.4rem minmax(0,1fr)!important;
    align-items:center!important;
    gap:.45rem!important;
  }
  header .brand{
    width:2.4rem!important;
    min-width:2.4rem!important;
    max-width:2.4rem!important;
    overflow:hidden!important;
    position:relative!important;
    z-index:1!important;
  }
  header nav{
    width:100%!important;
    min-width:0!important;
    display:grid!important;
    grid-auto-flow:column!important;
    grid-auto-columns:minmax(0,1fr)!important;
    gap:.1rem!important;
    position:relative!important;
    z-index:20!important;
  }
  header nav a{
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    min-width:0!important;
    min-height:44px!important;
    padding:.25rem .1rem!important;
    white-space:nowrap!important;
    position:relative!important;
    z-index:21!important;
    touch-action:manipulation!important;
  }
}
</style>
<script id="mobile-nav-routing-fix">
(()=>{
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("header nav a");
    if(!link)return;
    const href=link.getAttribute("href");
    if(href!=="/archive"&&href!=="/about")return;
    event.preventDefault();
    event.stopPropagation();
    location.assign(href+"/");
  },true);
})();
</script>`;

export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;

  let html=await response.text();
  if(!html.includes('id="mobile-nav-fix"')){
    html=html.includes("</head>")
      ? html.replace("</head>",MOBILE_NAV_FIX+"\n</head>")
      : MOBILE_NAV_FIX+html;
  }

  const headers=new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
