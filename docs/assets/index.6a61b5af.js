import{t as E,d as C,c as x,i as v,a as w,b as L,S as N,s as O,Z as A,B as D,T as _,r as M}from"./vendor.da65c12b.js";const P=function(){const d=document.createElement("link").relList;if(d&&d.supports&&d.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const m of n.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&i(m)}).observe(document,{childList:!0,subtree:!0});function a(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerpolicy&&(n.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?n.credentials="include":e.crossorigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(e){if(e.ep)return;e.ep=!0;const n=a(e);fetch(e.href,n)}};P();const q=E('<div><h1>Concats all the epub HTML files and shows in the sandboxed iframe</h1><h2>Select epub file</h2><input type="file" name=""><h2>Or type fetchable URL</h2><input type="text" placeholder="URL"> <button type="button">Fetch</button><br></div>'),H=E('<iframe class="sandbox" sandbox=""></iframe>'),T=E("<div></div>"),F=async c=>{const a=await new A(new D(c)).getEntries(),i=a.filter(t=>t.filename.endsWith(".opf"));if(i.length!==1)throw new Error("OPF confusion");const n=await i[0].getData?.(new _),r=[...new DOMParser().parseFromString(n,"text/xml").querySelectorAll("manifest item")].filter(t=>t.getAttribute("media-type")?.match(/html/)).map(t=>t.getAttribute("href")||"\u2705").map(t=>a.filter(l=>l.filename.endsWith(`/${t}`)?!0:l.filename===t)[0]).filter(t=>t),u=(await Promise.all(r.map(t=>t.getData?.(new _)))).map(t=>{let l=new DOMParser().parseFromString(t,"application/xhtml+xml");return l.querySelector("parsererror")&&(l=new DOMParser().parseFromString(t,"text/html")),l.querySelectorAll("a").forEach(S=>{S.hasAttribute("href")&&(S.href="#"+S.href)}),l.body.childNodes}),s=document.implementation.createDocument(null,"html"),f=s.createElement("html"),p=s.createElement("head"),h=s.createElement("body"),g=document.querySelector("link[rel='stylesheet']"),b=document.querySelector("style");return g?p.appendChild(g.cloneNode(!0)):b&&p.appendChild(b.cloneNode(!0)),u.forEach(t=>{const l=s.createElement("div");l.classList.add("html-page"),l.append(...t),h.appendChild(l)}),f.appendChild(p),f.appendChild(h),s.documentElement.append(f),s.documentElement.outerHTML},B=()=>{let c;const[d,a]=x(""),[i,e]=x("");async function n(){if(!c)return;const o=c.files?.[0];if(o){const r=await F(o);e(r)}}async function m(o){try{const r=await fetch(o),y=await F(await r.blob());e(y)}catch(r){r instanceof TypeError?a(r.name+": "+r.message):a("Unable to fetch")}}function $(){return(()=>{const o=q.cloneNode(!0),r=o.firstChild,y=r.nextSibling,u=y.nextSibling,s=u.nextSibling,f=s.nextSibling,p=f.nextSibling,h=p.nextSibling;h.nextSibling,u.$$input=n;const g=c;return typeof g=="function"?g(u):c=u,h.$$click=b=>{b.target.previousElementSibling instanceof HTMLInputElement&&m(b.target.previousElementSibling.value)},v(o,d,null),o})()}return(()=>{const o=T.cloneNode(!0);return v(o,w(N,{get when(){return i()},fallback:()=>w($,{}),get children(){const r=H.cloneNode(!0);return L(()=>O(r,"srcdoc",i())),r}})),o})()};C(["input","click"]);M(()=>w(B,{}),document.getElementById("root"));
