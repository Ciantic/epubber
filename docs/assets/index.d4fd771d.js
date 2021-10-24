import{t as S,d as F,c as w,i as $,a as y,b as L,S as C,Z as O,B as D,T as x,r as M}from"./vendor.f18f0a3f.js";const N=function(){const d=document.createElement("link").relList;if(d&&d.supports&&d.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))l(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const f of n.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&l(f)}).observe(document,{childList:!0,subtree:!0});function c(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerpolicy&&(n.referrerPolicy=t.referrerpolicy),t.crossorigin==="use-credentials"?n.credentials="include":t.crossorigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function l(t){if(t.ep)return;t.ep=!0;const n=c(t);fetch(t.href,n)}};N();const A=S('<div><h1>Concats all the epub HTML files and shows in the sandboxed iframe</h1><h2>Select epub file</h2><input type="file" name=""><h2>Or type fetchable URL</h2><input type="text" placeholder="URL"> <button type="button">Fetch</button><br></div>'),v=S("<div></div>"),_=async a=>{const c=await new O(new D(a)).getEntries(),l=c.filter(e=>e.filename.endsWith(".opf"));if(l.length!==1)throw new Error("OPF confusion");const n=await l[0].getData?.(new x),r=[...new DOMParser().parseFromString(n,"text/xml").querySelectorAll("manifest item")].filter(e=>e.getAttribute("media-type")?.match(/html/)).map(e=>e.getAttribute("href")||"\u2705").map(e=>c.filter(o=>o.filename.endsWith(`/${e}`)?!0:o.filename===e)[0]).filter(e=>e),m=(await Promise.all(r.map(e=>e.getData?.(new x)))).map(e=>{let o=new DOMParser().parseFromString(e,"application/xhtml+xml");return o.querySelector("parsererror")&&(o=new DOMParser().parseFromString(e,"text/html")),o.querySelectorAll("a").forEach(b=>{b.hasAttribute("href")&&(b.href="#"+b.href)}),o.body.childNodes}),s=document.implementation.createDocument(null,"html"),u=s.createElement("html"),g=s.createElement("head"),p=s.createElement("body");return m.forEach(e=>{const o=s.createElement("div");o.classList.add("html-page"),o.append(...e),p.appendChild(o)}),u.appendChild(g),u.appendChild(p),s.documentElement.append(u),s.documentElement.outerHTML},H=()=>{let a;const[d,c]=w(""),[l,t]=w("");async function n(){if(!a)return;const i=a.files?.[0];if(i){const r=await _(i);t(r)}}async function f(i){try{const r=await fetch(i),h=await _(await r.blob());t(h)}catch(r){r instanceof TypeError?c(r.name+": "+r.message):c("Unable to fetch")}}function E(){return(()=>{const i=A.cloneNode(!0),r=i.firstChild,h=r.nextSibling,m=h.nextSibling,s=m.nextSibling,u=s.nextSibling,g=u.nextSibling,p=g.nextSibling;p.nextSibling,m.$$input=n;const e=a;return typeof e=="function"?e(m):a=m,p.$$click=o=>{o.target.previousElementSibling instanceof HTMLInputElement&&f(o.target.previousElementSibling.value)},$(i,d,null),i})()}return(()=>{const i=v.cloneNode(!0);return $(i,y(C,{get when(){return l()},fallback:()=>y(E,{}),get children(){const r=v.cloneNode(!0);return L(()=>r.innerHTML=l()),r}})),i})()};F(["input","click"]);M(()=>y(H,{}),document.getElementById("root"));