import landingPages from "@/data/landing-pages.json";
// Shared curated landing registry. Database/AI publication approval is a separate contract.
export interface ReviewSection { title: string; paragraphs: string[]; items: string[] }
export type PageMode = "review" | "public";
export type PricingVariant = "full" | "missed-calls" | "voicemail" | "receptionist" | "worksheet";
export type PublicationStatus = "draft" | "approved" | "withdrawn";
export interface ReviewRecord { reviewer: string; reviewedAt: string; contentHash: string; note?: string }
export interface ReviewPage { pricingVariant:PricingVariant; navigationLabel:string; publicationStatus:PublicationStatus; source?:{kind:string;reference:string}; review?:ReviewRecord; withdrawal?:{reason:string;at:string}; related?:string[]; image?:string; slug: string; title: string; description: string; eyebrow: string; lead: string; intro: string; sourcePaths: string[]; sections: ReviewSection[]; faqs: {q:string;a:string}[]; takeaway:string; calculator?:boolean; comparison?:{left:string;right:string;rows:string[][]} }
export const REVIEW_PAGES: ReviewPage[] = landingPages as ReviewPage[];
export const REVIEW_INDEX = "/ai-answering-service/review";
export function reviewPath(slug:string) { return `/ai-answering-service/${slug}`; }
export function getReviewPage(slug:string) { return REVIEW_PAGES.find(page=>page.slug===slug); }
/** At most this many "Continue exploring" links per page (seo/shared/lib/registry-contract.mjs LIMITS.related). */
export const RELATED_LIMIT = 4;
/** Related guides: the page's explicit `related` list, else the nearest approved pages in registry order. */
export function relatedPagesFor(page:ReviewPage, mode:PageMode = "public"):ReviewPage[] {
 const pool = REVIEW_PAGES.filter(other => other.slug !== page.slug && (mode === "review" ? other.publicationStatus !== "withdrawn" : other.publicationStatus === "approved"));
 const picked = page.related?.length ? page.related.map(slug => pool.find(other => other.slug === slug)).filter((other):other is ReviewPage => Boolean(other)) : pool;
 return picked.slice(0, RELATED_LIMIT);
}
export const CURRENT_REVIEW_PLANS = [{"name": "Solo", "launch": 87.5, "list": 175, "minutes": 100}, {"name": "Crew", "launch": 175, "list": 350, "minutes": 200}, {"name": "Fleet", "launch": 350, "list": 700, "minutes": 400}];
export const REVIEW_PRICE_SOURCE = "https://www.revoapp.ai/pricing.html";
export function scenarioValue(inquiries:number,probability:number,value:number) {
 if (![inquiries,probability,value].every(Number.isFinite) || inquiries<0 || !Number.isInteger(inquiries) || probability<0 || probability>100 || value<0) throw new Error("Invalid scenario inputs");
 const result=inquiries*(probability/100)*value;
 if(!Number.isFinite(result)) throw new Error("Scenario exceeds supported range");
 return result;
}
