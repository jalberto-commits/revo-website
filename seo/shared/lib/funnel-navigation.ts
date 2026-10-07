// Contract verified against the existing /free-test public source: five UTMs,
// up to 256 characters, and native document.referrer -> referrer_origin.
export const CAMPAIGN_KEY = "revo_attribution";
export const CONSENT_KEY = "revo-consent";
export const UTM_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
export type Campaign = Partial<Record<typeof UTM_KEYS[number],string>>;
type StorageLike = Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function safeCampaign(value: unknown): Campaign {
 const result: Campaign = {};
 if(!value || typeof value!=="object" || Array.isArray(value))return result;
 for(const key of UTM_KEYS){const v=(value as Record<string,unknown>)[key];if(typeof v!=="string" || !v || v.length>256 || v.includes("\uFFFD") || /[@\r\n\u0000-\u001f]|:\/\/|\d{7,}/.test(v))continue;result[key]=v;}
 return result;
}
export function campaignFromSearch(search:string):Campaign {
 const params=new URLSearchParams(search),candidate:Record<string,string>={};
 for(const key of UTM_KEYS){const values=params.getAll(key);if(values.length===1)candidate[key]=values[0];}
 return safeCampaign(candidate);
}
export function captureCampaign(search:string,storage:StorageLike,consented:boolean):Campaign {
 const fresh=campaignFromSearch(search);
 try{if(!consented){storage.removeItem(CAMPAIGN_KEY);return fresh;}if(Object.keys(fresh).length){storage.setItem(CAMPAIGN_KEY,JSON.stringify(fresh));return fresh;}return safeCampaign(JSON.parse(storage.getItem(CAMPAIGN_KEY)||"{}"));}catch{return fresh;}
}
export function funnelNavigationUrl(destination:string,search:string,storage:StorageLike,consented:boolean):string {
 const url=new URL(destination);if(url.origin!=="https://www.revoapp.ai" || url.pathname!=="/free-test" || url.search || url.hash || url.username || url.password)throw Error("Unexpected funnel destination");
 const campaign=captureCampaign(search,storage,consented);for(const key of UTM_KEYS)if(campaign[key])url.searchParams.set(key,campaign[key]!);
 return url.toString();
}
// Deduplicate a browser event and immediate double-clicks, not all future visits.
export function clickRecorder(emit:(event:string,payload:Record<string,unknown>)=>void){
 const events=new WeakSet<object>();let lastKey="",lastAt=-Infinity;
 return (event:object,key:string,payload:Record<string,unknown>,now:number)=>{if(events.has(event) || key===lastKey && now-lastAt<800)return false;events.add(event);lastKey=key;lastAt=now;emit("seo_funnel_click",payload);return true;};
}
declare global {interface Window {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;}}
