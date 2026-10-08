/* Replicates pricing.html's plan block. Only heading levels and CTA actions differ. */
import Link from "next/link";
import {OFFICIAL_PRICING} from "@/lib/official-pricing";
import type {PageMode} from "@/lib/review-cohort";
import {FunnelCTA} from "./FunnelCTA";

function FeatureIcon({enabled}: {enabled: boolean}) {
  return <svg className={"pricing-feature-icon " + (enabled ? "on" : "off")} viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />{enabled ? <path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}</svg>;
}

export function OfficialPricing({mode="review",acquisitionEnabled=false}:{mode?:PageMode;acquisitionEnabled?:boolean}={}) {
  return <section id="plans" className="pricing-page revo-official-pricing revo-pricing" aria-labelledby="revo-official-pricing-heading">
    <div className="pricing-bg-how" aria-hidden="true"><div className="background-layer"><video className="how-it-works-spline-viewer" autoPlay muted loop playsInline preload="metadata"><source src="/ai-answering-service/assets/review/pricing/how-it-works-background.webm" type="video/webm" /></video></div></div>
    <div className="pricing-page-container">
      <header className="pricing-header"><span className="pricing-section-eyebrow">{OFFICIAL_PRICING.eyebrow}</span><h2 className="pricing-heading" id="revo-official-pricing-heading"><span className="pricing-brand">Revo</span> that grows with your business</h2><p className="pricing-header-lead">{OFFICIAL_PRICING.lead}</p></header>
      <div className="pricing-cards">{OFFICIAL_PRICING.plans.map(plan => <article className={"pricing-card" + (plan.popular ? " is-popular" : "")} key={plan.name}>
        {plan.popular ? <span className="pricing-card-badge">Popular</span> : null}
        <div className="pricing-card-hero"><div className="pricing-card-hero-main"><div className="pricing-card-top"><h3 className="pricing-card-name">{plan.name}</h3><p className="pricing-card-tag">{plan.tag}</p></div><div className="pricing-card-price-block"><div className="pricing-card-price"><span className="pricing-card-amount">{plan.amount}</span><span className="pricing-card-period">{plan.period}</span></div><div className="pricing-card-compare"><span className="pricing-card-was">{plan.was}</span><span className="pricing-card-save">{plan.save}</span></div></div></div><div className="pricing-card-hero-aside"><span className="pricing-card-minutes">{plan.minutes}</span></div></div>
        <FunnelCTA mode={mode} acquisitionEnabled={acquisitionEnabled} informationalHref={"#plan-"+plan.name.toLowerCase()} informationalLabel={"Read "+plan.name+" features"} placement={"official-pricing-"+plan.name.toLowerCase()} className="btn-primary pricing-card-cta">{plan.cta}</FunnelCTA>
        <ul id={"plan-"+plan.name.toLowerCase()} className="pricing-card-features">{plan.features.map(feature => <li className={"pricing-feature" + (feature.enabled ? "" : " is-off")} key={feature.label} aria-label={feature.enabled ? undefined : "Not included: " + feature.label}><span className="pricing-feature-label">{feature.label}{feature.isNew ? <> <span className="pricing-feature-new">New</span></> : null}</span><FeatureIcon enabled={feature.enabled} /></li>)}</ul>
      </article>)}</div>
    </div>
  </section>;
}

export type PricingContext = "missed-calls" | "voicemail" | "receptionist" | "worksheet";
const summaryCopy: Record<PricingContext, {title: string; note: string}> = {
  "missed-calls": {title: "Choose a plan for the calls you need to handle.", note: "Compare included minutes and plan features against your call-handling needs."},
  voicemail: {title: "Compare the plan cost with your voicemail workflow.", note: "Use your actual voicemail or phone-service charges and the time your team spends returning calls. No competitor price or savings estimate is assumed here."},
  receptionist: {title: "Compare costs for the coverage you need.", note: "For a receptionist or answering service, use your actual quote, coverage hours, included calls or minutes, and additional charges. No salary, competitor price or savings estimate is assumed here."},
  worksheet: {title: "Review the plan cost separately from the scenario.", note: "The worksheet estimates potential job value from your inputs. It is not measured recovered revenue or a promise of return on a plan."},
};
export function PricingSummary({context}: {context: PricingContext}) {
  const copy = summaryCopy[context];
  return <section id="plans" data-pricing-variant={context} className="pricing-page revo-official-pricing revo-pricing revo-pricing-summary" aria-labelledby="revo-pricing-summary-heading"><div className="pricing-page-container">
    <header className="pricing-header"><span className="pricing-section-eyebrow">Pricing</span><h2 className="pricing-heading" id="revo-pricing-summary-heading">{copy.title}</h2><p className="pricing-header-lead">{copy.note}</p></header>
    <div className="pricing-cards">{OFFICIAL_PRICING.plans.map(plan => <article className={"pricing-card" + (plan.popular ? " is-popular" : "")} key={plan.name}>{plan.popular ? <span className="pricing-card-badge">Popular</span> : null}<div className="pricing-card-hero"><div className="pricing-card-hero-main"><h3 className="pricing-card-name">{plan.name}</h3><p className="pricing-card-tag">{plan.tag}</p><div className="pricing-card-price-block"><div className="pricing-card-price"><span className="pricing-card-amount">{plan.amount}</span><span className="pricing-card-period">{plan.period}</span></div><div className="pricing-card-compare"><span className="pricing-card-was">{plan.was}</span><span className="pricing-card-save">{plan.save}</span></div></div></div><span className="pricing-card-minutes">{plan.minutes}</span></div></article>)}</div>
    <div className="revo-summary-links"><a className="btn-primary" href={OFFICIAL_PRICING.source}>View official plans and terms <span aria-hidden="true">↗</span></a><Link href="/ai-answering-service/after-hours#plans" prefetch={false}>Compare all plan features</Link></div>
  </div></section>;
}
