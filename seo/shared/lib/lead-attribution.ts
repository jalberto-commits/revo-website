import { acceptedLeadResponse } from "./lead-capture";
export const ATTRIBUTION_KEY="revo-attribution-v1";
export type Attribution = { version: 1; consent: "granted"; landing_page: string; submission_page: string; referrer: string; campaign: Record<string,never> };
export function safePagePath(value: unknown): string | null {
 if(typeof value!=="string")return null;
 const path=value.split(/[?#]/)[0];
 return path.length<=500 && /^\/[a-z0-9/-]*$/i.test(path) && !path.startsWith('//') && !/\d{7}/.test(path) ? path : null;
}
export function referrerCategory(value: string, origin: string): string {
 if(!value)return 'direct';
 try {const u=new URL(value);if(!['http:','https:'].includes(u.protocol) || u.username || u.password)return 'other_external';
 if(u.origin===origin)return 'internal';
 const h=u.hostname.toLowerCase();
 if(/^(www\.)?google\.(com|co\.uk|ca)$/.test(h))return 'google';
 if(/^(www\.)?bing\.com$/.test(h))return 'bing';
 if(/^(www\.)?duckduckgo\.com$/.test(h))return 'duckduckgo';
 return 'other_external';}catch{return 'other_external';}
}
export function validateAttribution(value: unknown): Attribution | null {
 if(!value || typeof value!=='object' || Array.isArray(value))return null;
 const p=value as Record<string,unknown>;
 if(Object.keys(p).sort().join(',')!=='campaign,consent,landing_page,referrer,submission_page,version' || p.version!==1 || p.consent!=='granted' || typeof p.landing_page!=='string' || safePagePath(p.landing_page)!==p.landing_page || typeof p.submission_page!=='string' || safePagePath(p.submission_page)!==p.submission_page || typeof p.referrer!=='string' || !['direct','internal','google','bing','duckduckgo','other_external'].includes(p.referrer) || !p.campaign || typeof p.campaign!=='object' || Array.isArray(p.campaign) || Object.keys(p.campaign).length)return null;
 return p as Attribution;
}
type Storage = Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
export function captureAttribution(storage: Storage, location: {pathname:string;origin:string}, referrer: string): Attribution | null {
 try {
  if(storage.getItem('revo-consent')!=='granted'){storage.removeItem(ATTRIBUTION_KEY);return null;}
  const path=safePagePath(location.pathname);if(path===null)return null;
  const raw=storage.getItem(ATTRIBUTION_KEY);let prior:Attribution|null=null;
  if(raw){try{prior=validateAttribution(JSON.parse(raw));}catch{/* corrupt session falls back to current page */}}
  const a:Attribution=prior?{...prior,submission_page:path}:{version:1,consent:'granted',landing_page:path,submission_page:path,referrer:referrerCategory(referrer,location.origin),campaign:{}};
  storage.setItem(ATTRIBUTION_KEY,JSON.stringify(a));return a;
 }catch{return null;}
}
export function conversionEmitter(emit: (name:string,payload:Record<string,unknown>)=>void) {
 const sent=new Set<string>();
 return (response:unknown, attribution:Attribution|null, currentConsent:()=>boolean, origin:string) => {
  try {
   if(!acceptedLeadResponse(response) || !currentConsent() || !attribution)return;
   const receipt=(response as {receipt:string}).receipt;if(sent.has(receipt))return;
   const a=validateAttribution(attribution);if(!a)return;
   const u=new URL(origin);if(!['http:','https:'].includes(u.protocol) || u.username || u.password)return;
   // Receipt is a local dedup key only. No IDs, query, raw referrer or form fields reach GA.
   const payload={landing_page:a.landing_page,submission_page:a.submission_page,referrer_category:a.referrer,page_location:u.origin+a.submission_page,page_referrer:''};
   sent.add(receipt);emit('generate_lead',payload);
  }catch{/* Analytics cannot reject a durable acceptance. */}
 };
}
export async function submitLeadRequest(body: unknown, fetcher: typeof fetch, onAccepted: (response:unknown)=>void): Promise<unknown> {
 const res=await fetcher(process.env.NEXT_PUBLIC_REVO_WEB_INTEGRATION === 'true' ? '/ai-answering-service/api/leads' : '/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const response:unknown=await res.json();
 if(!res.ok || !acceptedLeadResponse(response))throw new Error('Receipt not confirmed');
 try{onAccepted(response);}catch{/* Optional analytics cannot affect receipt success. */}
 return response;
}
