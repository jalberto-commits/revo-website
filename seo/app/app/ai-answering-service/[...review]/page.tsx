import type {Metadata} from 'next';
import config from '../../../site.config.json';
import {notFound} from 'next/navigation';
import {REVIEW_PAGES,getReviewPage,reviewPath} from '@/lib/review-cohort';
import {LandingPageTemplate} from '@/components/LandingPageTemplate';
export const dynamicParams=false;
export function generateStaticParams(){return REVIEW_PAGES.filter(page=>page.publicationStatus === "approved").map(page=>({review:page.slug.split('/')}));}
type Params={params:Promise<{review:string[]}>};
export async function generateMetadata({params}:Params):Promise<Metadata>{const {review}=await params;const p=getReviewPage(review.join('/'));if(!p)notFound();const canonical='https://www.revoapp.ai'+reviewPath(p.slug);return {title:{absolute:p.title+' | Revo'},description:p.description,robots:{index:true,follow:true},alternates:{canonical},openGraph:{title:p.title,description:p.description,url:canonical,type:'website',locale:'en_US'},twitter:{card:'summary',title:p.title,description:p.description}};}
export default async function Page({params}:Params){const {review}=await params;const page=getReviewPage(review.join('/'));if(!page || page.publicationStatus !== "approved")notFound();const schema={'@context':'https://schema.org','@type':'WebPage',name:page.title,description:page.description,url:'https://www.revoapp.ai'+reviewPath(page.slug),inLanguage:'en-US'};return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><LandingPageTemplate page={page} mode="public" acquisitionEnabled={config.acquisitionEnabled}/></>;}
