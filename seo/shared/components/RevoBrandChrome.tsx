"use client";
/* Cross-application marketing links require a full navigation. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import {useEffect, useState} from "react";
import {FunnelCTA} from "./FunnelCTA";
import type {PageMode} from "@/lib/review-cohort";
import {REVIEW_INDEX, REVIEW_PAGES, reviewPath} from "@/lib/review-cohort";

const links = [["Services", "/services.html"], ["Industry", "/industries.html"], ["Pricing", "/pricing.html"]];
const logo = "/ai-answering-service/assets/review/logo.webp";

export function RevoBrandHeader({mode="review"}:{mode?:PageMode}={}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return <>
    <a className="revo-skip-link" href="#revo-main">Skip to content</a>
    <header className="revo-brand-header"><div className="revo-header-inner">
      <a href="/" aria-label="Revo home"><img src={logo} width="75" height="19" alt="Revo" /></a>
      <nav aria-label="Main navigation" className="revo-desktop-nav">{links.map(([text, url]) => <a key={url} href={url}>{text}</a>)}</nav>
      <div className="revo-header-actions"><FunnelCTA mode={mode} placement="header" className="revo-button">Get Started</FunnelCTA><a className="revo-button revo-button-glass" href={mode === "public" ? "https://apps.apple.com/us/app/revo-ai-receptionist/id6768915591" : "/free-test?preview-intent=iphone"}>Download for iPhone</a></div>
      <button className="revo-menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="revo-mobile-navigation" onClick={() => setOpen(value => !value)}><span aria-hidden="true">{open ? "×" : <><i /><i /><i /></>}</span></button>
    </div></header>
    {open ? <nav id="revo-mobile-navigation" className="revo-mobile-nav" aria-label="Mobile navigation">{links.map(([text, url]) => <a key={url} href={url} onClick={() => setOpen(false)}>{text}</a>)}<FunnelCTA mode={mode} placement="header" className="revo-button">Get Started</FunnelCTA><a className="revo-button revo-button-glass" href={mode === "public" ? "https://apps.apple.com/us/app/revo-ai-receptionist/id6768915591" : "/free-test?preview-intent=iphone"}>Download for iPhone</a></nav> : null}
    {mode === "review" ? <aside className="revo-review-status" aria-label="Private preview controls"><span>Private editorial review · Not published · Local test flows only</span><a href={REVIEW_INDEX}>All five drafts ↗</a></aside> : null}
  </>;
}

export function RevoBrandFooter({mode="review"}:{mode?:PageMode}={}) {
  return <footer className="revo-brand-footer"><div className="revo-container">
    <div className="revo-footer-top"><div className="revo-footer-brand"><a href="/" aria-label="Revo home"><img src={logo} width="82" height="21" alt="Revo" /></a><p>AI phone answering for home service businesses.</p></div>
      <nav aria-label="Explore Revo"><h2>Explore</h2>{links.map(([text, url]) => <a key={url} href={url}>{text}</a>)}</nav>
      <nav aria-label="Call planning"><h2>Call planning</h2>{REVIEW_PAGES.filter(page=>mode === "review" || page.publicationStatus === "approved").map(page => <a key={page.slug} href={reviewPath(page.slug)}>{page.comparison ? `AI vs ${page.comparison.left === "Voicemail" ? "voicemail" : "a receptionist"}` : page.eyebrow}</a>)}</nav>
    </div>
    <div className="revo-footer-bottom"><p>© 2026 Revo. All communication rights reserved.</p><nav aria-label="Legal navigation"><a href="/privacy-policy.html">Privacy policy</a><a href="/terms-of-service.html">Terms of service</a>{mode === "public" ? <button onClick={()=>window.dispatchEvent(new Event("revo-consent-open"))}>Cookie settings</button> : null}</nav></div>
  </div></footer>;
}
