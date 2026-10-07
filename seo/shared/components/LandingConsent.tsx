"use client";
import {useEffect,useState} from "react";
import {CAMPAIGN_KEY,CONSENT_KEY,captureCampaign} from "@/lib/funnel-navigation";
import {ATTRIBUTION_KEY,safePagePath} from "@/lib/lead-attribution";
function isGPC(){return (navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl===true;}
function initializeAnalytics(gaId:string){
 if(!/^G-[A-Z0-9]+$/.test(gaId))return;
 window.dataLayer=window.dataLayer||[];
 if(!window.gtag)window.gtag=function(){window.dataLayer!.push(arguments);};
 const page_location=window.location.origin+(safePagePath(window.location.pathname)??"/");
 window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
 window.gtag("consent","update",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
 if(document.querySelector("[data-revo-analytics]"))return;
 const marker=document.createElement("script");marker.dataset.revoAnalytics=gaId;marker.async=true;
 // QA/staging queue events without sending them to production analytics.
 if(window.location.origin==="https://www.revoapp.ai")marker.src="https://www.googletagmanager.com/gtag/js?id="+gaId;
 document.head.appendChild(marker);
 window.gtag("js",new Date());
 window.gtag("config",gaId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location,page_referrer:""});
 window.gtag("event","page_view",{page_location,page_referrer:""});
}
function applyChoice(choice:string|null,gaId:string){
 const allowed=choice==="granted"&&!isGPC();
 try{captureCampaign(window.location.search,sessionStorage,allowed);if(!allowed){sessionStorage.removeItem(CAMPAIGN_KEY);sessionStorage.removeItem(ATTRIBUTION_KEY);}}catch{/* Storage is optional. */}
 if(allowed)initializeAnalytics(gaId);
 else window.gtag?.("consent","update",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
}
export function LandingConsent({gaId}:{gaId:string}){
 const [choice,setChoice]=useState<string|null>("pending"),[settings,setSettings]=useState(false);
 useEffect(()=>{let saved:string|null=null;try{saved=localStorage.getItem(CONSENT_KEY);}catch{/* Ask; do not assume. */}if(isGPC())saved="denied";setChoice(saved);applyChoice(saved,gaId);const open=()=>setSettings(true);const sync=()=>{let value:string|null=null;try{value=localStorage.getItem(CONSENT_KEY);}catch{}setChoice(value);applyChoice(value,gaId);window.dispatchEvent(new Event("revo-consent-change"));};window.addEventListener("revo-consent-open",open);window.addEventListener("storage",sync);return()=>{window.removeEventListener("revo-consent-open",open);window.removeEventListener("storage",sync);};},[gaId]);
 const decide=(value:"granted"|"denied")=>{if(isGPC())value="denied";try{localStorage.setItem(CONSENT_KEY,value);}catch{value="denied";}setChoice(value);setSettings(false);applyChoice(value,gaId);window.dispatchEvent(new Event("revo-consent-change"));};
 if(choice!==null&&!settings)return null;
 return <aside className="revo-consent" aria-label="Analytics choices"><p>We use analytics cookies to understand site use. <a href="/privacy-policy.html">Privacy policy</a></p><div><button onClick={()=>decide("denied")}>Decline</button><button onClick={()=>decide("granted")}>Accept</button></div></aside>;
}
