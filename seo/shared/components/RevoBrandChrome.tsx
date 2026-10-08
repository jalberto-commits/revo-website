"use client";
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import {useEffect, useState} from "react";
import {FunnelCTA} from "./FunnelCTA";
import type {PageMode} from "@/lib/review-cohort";
import {REVIEW_INDEX} from "@/lib/review-cohort";
import industries from "@/data/industry-navigation.json";
const links = [["Services", "/services.html"], ["Industry", "/industries.html"], ["Pricing", "/pricing.html"]];
const logo = "/ai-answering-service/assets/review/logo.webp";
function IndustryLinks() {
  const groups = [{heading:"Home Service Pros",items:industries.homeServices},{heading:"Professional Businesses",items:industries.professionalBusinesses}];
  return <div className="revo-industry-grid">{groups.map(group => <div key={group.heading}><p className="revo-industry-heading">{group.heading}</p>{group.items.map(item=><a key={item.href} href={item.href}><img src={item.icon} alt="" width="24" height="24"/><span>{item.label}</span></a>)}</div>)}<a className="revo-industry-all" href="/industries.html">See More Industries <span aria-hidden="true">↗</span></a></div>;
}
export function RevoBrandHeader({mode="review",acquisitionEnabled=false}:{mode?:PageMode;acquisitionEnabled?:boolean}={}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{function close(event:KeyboardEvent){if(event.key==="Escape")setOpen(false);}window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[]);
  const actions=acquisitionEnabled ? <div className="revo-header-actions"><FunnelCTA mode={mode} acquisitionEnabled={acquisitionEnabled} placement="header" className="revo-button">Get Started</FunnelCTA><a className="revo-button revo-button-glass" href={mode === "public" ? "https://apps.apple.com/us/app/revo-ai-receptionist/id6768915591" : "/free-test?preview-intent=iphone"}>Download for iPhone</a></div>:null;
  return <>
    <a className="revo-skip-link" href="#revo-main">Skip to content</a>
    <header className="revo-brand-header"><div className="revo-header-inner">
      <a href="/" aria-label="Revo home"><img src={logo} width="75" height="19" alt="Revo"/></a>
      <nav aria-label="Main navigation" className="revo-desktop-nav"><a href="/services.html">Services</a><details className="revo-industry-menu"><summary>Industry<span className="revo-chevron" aria-hidden="true"/></summary><IndustryLinks/></details><a href="/pricing.html">Pricing</a></nav>
      {actions}<button className="revo-menu-toggle" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="revo-mobile-navigation" onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">{open?"×":<><i/><i/><i/></>}</span></button>
    </div></header>
    {open?<nav id="revo-mobile-navigation" className="revo-mobile-nav" aria-label="Mobile navigation"><a href="/services.html">Services</a><details className="revo-industry-menu"><summary>Industry<span className="revo-chevron" aria-hidden="true"/></summary><IndustryLinks/></details><a href="/pricing.html">Pricing</a>{actions}</nav>:null}
    {mode === "review"?<aside className="revo-review-status" aria-label="Private preview controls"><span>Private editorial review · Not published · Local test flows only</span><a href={REVIEW_INDEX}>All five drafts ↗</a></aside>:null}
  </>;
}
export function RevoBrandFooter({mode="review"}:{mode?:PageMode}={}) {
  return <footer className="revo-brand-footer"><div className="revo-container"><div className="revo-footer-top"><div className="revo-footer-brand"><a href="/" aria-label="Revo home"><img src={logo} width="82" height="21" alt="Revo"/></a><p>AI phone answering for home service businesses.</p></div><nav aria-label="Explore Revo"><h2>Explore</h2>{links.map(([text,url])=><a key={url} href={url}>{text}</a>)}</nav></div><div className="revo-footer-bottom"><p>© 2026 Revo. All communication rights reserved.</p><nav aria-label="Legal navigation"><a href="/privacy-policy.html">Privacy policy</a><a href="/terms-of-service.html">Terms of service</a>{mode === "public"?<button onClick={()=>window.dispatchEvent(new Event("revo-consent-open"))}>Cookie settings</button>:null}</nav></div></div></footer>;
}
