"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {PageMode} from "@/lib/review-cohort";
import {seoFunnelUrl,clickAnalyticsPayload} from "@/lib/funnel-config";
import {CONSENT_KEY,funnelNavigationUrl,clickRecorder} from "@/lib/funnel-navigation";
function permitted(){try{return localStorage.getItem(CONSENT_KEY)==="granted" && (navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl!==true;}catch{return false;}}
function publicHref(){try{return funnelNavigationUrl(seoFunnelUrl(),window.location.search,sessionStorage,permitted());}catch{return seoFunnelUrl();}}
export function FunnelCTA({placement,className,children="Try Revo →",mode,acquisitionEnabled=false,informationalHref="/ai-answering-service/after-hours#plans",informationalLabel="Explore the plans"}:{placement:string;className?:string;children?:ReactNode;mode?:PageMode;acquisitionEnabled?:boolean;informationalHref?:string;informationalLabel?:ReactNode}){
 const base=mode==="public" ? seoFunnelUrl() : process.env.NEXT_PUBLIC_REVO_WEB_INTEGRATION === "true" || mode==="review" ? "/free-test" : seoFunnelUrl(process.env.NEXT_PUBLIC_SEO_FUNNEL_URL);
 const [href,setHref]=useState(base);
 const record=useRef(clickRecorder((event,payload)=>window.gtag?.("event",event,payload)));
 useEffect(()=>{if(mode!=="public" || !acquisitionEnabled)return;const update=()=>setHref(publicHref());update();window.addEventListener("revo-consent-change",update);window.addEventListener("popstate",update);return()=>{window.removeEventListener("revo-consent-change",update);window.removeEventListener("popstate",update);};},[mode,acquisitionEnabled]);
 if(mode==="public" && !acquisitionEnabled)return <a href={informationalHref} className={`inline-flex items-center justify-center ${className??""}`}>{informationalLabel}</a>;
 return <a href={href} referrerPolicy="origin" className={`inline-flex items-center justify-center ${className??""}`} onClick={event=>{
  const destination=mode==="public"?publicHref():base;if(mode==="public")event.currentTarget.href=destination;
  try{if(permitted()){const payload=clickAnalyticsPayload(window.location.href,placement,new URL(destination,window.location.origin).toString());record.current(event.nativeEvent,window.location.pathname+":"+placement,payload,Date.now());}}catch{/* Navigation is independent of analytics/storage. */}
 }}>{children}</a>;
}
