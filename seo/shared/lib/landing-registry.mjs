import {readFileSync} from 'node:fs';
export function readRegistry(sharedRoot){const pages=JSON.parse(readFileSync(new URL('data/landing-pages.json',sharedRoot),'utf8'));const slugs=new Set();for(const p of pages){if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(p.slug)||slugs.has(p.slug))throw Error('Invalid/duplicate landing slug');slugs.add(p.slug);if(!['full','missed-calls','voicemail','receptionist','worksheet'].includes(p.pricingVariant))throw Error('Unknown pricing variant');}return pages;}
export const landingPath=page=>'/ai-answering-service/'+page.slug;
