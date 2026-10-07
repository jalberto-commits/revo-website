/* Original marketing illustrations are decorative; they are not customer evidence. */
/* eslint-disable @next/next/no-img-element */
import type {ReviewPage, PageMode} from "@/lib/review-cohort";
import {REVIEW_PAGES, reviewPath} from "@/lib/review-cohort";
import {ReviewScenarioCalculator} from "./ReviewScenarioCalculator";
import {FunnelCTA} from "./FunnelCTA";
import {OfficialPricing, PricingSummary} from "./OfficialPricing";

const accents: Record<string, string> = {
  "after-hours": "After-hours answering",
  "missed-calls": "missed business calls",
  "compare/ai-vs-voicemail": "AI answering vs voicemail",
  "compare/ai-vs-live-receptionist": "live receptionist",
  "cost-of-missed-calls": "potential value",
};

function PageTitle({page}: {page: ReviewPage}) {
  const accent = accents[page.slug];
  const position = accent ? page.title.indexOf(accent) : -1;
  if (position < 0) return <h1>{page.title}</h1>;
  return <h1>{page.title.slice(0, position)}<span className="revo-accent">{accent}</span>{page.title.slice(position + accent.length)}</h1>;
}



export function LandingPageTemplate({page,mode="review",reviewForm}: {page: ReviewPage;mode?:PageMode;reviewForm?:React.ReactNode}) {
  const pricingContext = page.pricingVariant === "full" ? "missed-calls" : page.pricingVariant;

  return <main id="revo-main" className="revo-review-page">
    <section className="revo-hero"><div className="revo-container"><span className="revo-eyebrow">{page.eyebrow}</span><PageTitle page={page} /><p className="revo-hero-lead">{page.lead}</p><p>{page.intro}</p><div className="revo-actions"><FunnelCTA mode={mode} placement={page.slug + "-hero"} className="revo-button">{mode === "review" ? "Preview test flow" : "Get Started"}</FunnelCTA><a className="revo-button revo-button-glass" href={page.calculator ? "#worksheet" : "#read"}>{page.calculator ? "Explore the worksheet" : "Explore the details"}</a></div></div></section>
    {page.calculator ? <section className="revo-section revo-light" id="worksheet"><div className="revo-container"><ReviewScenarioCalculator /></div></section> : null}
    {page.comparison ? <section className="revo-section revo-light"><div className="revo-container"><div className="revo-section-heading"><span className="revo-eyebrow">Side by side</span><h2>Compare what each option asks of your business.</h2></div><div className="revo-table-wrap" tabIndex={0} role="region" aria-label="Scrollable comparison"><table><caption>General operating considerations; not a performance test of a specific provider.</caption><thead><tr><th scope="col">Consideration</th><th scope="col">{page.comparison.left}</th><th scope="col">{page.comparison.right}</th></tr></thead><tbody>{page.comparison.rows.map(row => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div></div></section> : null}
    {page.sections.map((section, index) => <section id={index === 0 ? "read" : undefined} key={section.title} className={`revo-section ${index % 2 ? "revo-light" : "revo-dark"}`}>
      <div className={`revo-container revo-editorial ${index === 0 ? "revo-editorial-visual" : ""}`}>
        <div className="revo-editorial-copy"><span className="revo-eyebrow">{String(index + 1).padStart(2, "0")} / {page.eyebrow}</span><h2>{section.title}</h2><div className={section.items.length || index === 0 ? undefined : "revo-prose-columns"}>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></div>
        {index === 0 ? <div className="revo-editorial-media"><img src="/ai-answering-service/assets/review/answering-headset.png" alt="" width="600" height="600" loading="lazy" /></div> : null}
        {section.items.length ? <ul className="revo-checklist">{section.items.map((item, number) => <li key={item}><span className="revo-step-number" aria-hidden="true">{String(number + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ul> : null}
      </div>
    </section>)}
    {page.pricingVariant === "full" ? <OfficialPricing mode={mode} /> : !page.calculator ? <PricingSummary context={pricingContext} /> : null}
    <section className="revo-section revo-faq" id="faq"><div className="revo-container revo-faq-grid"><div><h2>Questions worth asking.</h2><p>Review the details before choosing how your business handles calls.</p><a className="revo-button" href="#contact">Check the next step</a></div><div className="revo-accordion">{page.faqs.map(faq => <details key={faq.q}><summary>{faq.q}<span className="revo-chevron" aria-hidden="true" /></summary><p>{faq.a}</p></details>)}</div></div></section>
    {page.calculator ? <PricingSummary context={pricingContext} /> : null}
    <section className="revo-section revo-gradient"><div className="revo-container"><h2>{mode === "review" ? <>Review the flow before<br className="revo-desktop-break" /> routing real calls.</> : <>Choose the next step<br className="revo-desktop-break" /> for your calls.</>}</h2><p>{mode === "review" ? "Use the local test flow to review navigation. It does not activate an account, send a real lead or take a payment." : "Explore Revo’s current setup flow and confirm the call-handling plan that fits your business."}</p><FunnelCTA mode={mode} placement={page.slug + "-footer"} className="revo-button">{mode === "review" ? "Preview test flow" : "Get Started"}</FunnelCTA></div></section>
    <section className="revo-section revo-dark" id="contact"><div className={"revo-container" + (mode === "review" ? " revo-contact" : "")}><div><span className="revo-eyebrow">{mode === "review" ? "Local form test" : "Get started"}</span><h2>{mode === "review" ? <>Check the<br className="revo-desktop-break" /> next step.</> : "Plan your next step."}</h2><p>{mode === "review" ? "This preview uses simulated storage. Please use fictional details for testing; no message reaches Revo." : "Use Revo’s existing setup flow to explore the service."}</p>{mode === "public" ? <FunnelCTA mode={mode} placement={page.slug+"-next-step"} className="revo-button">Get Started</FunnelCTA> : null}</div>{mode === "review" ? reviewForm : null}</div></section>
    <section className="revo-section revo-dark revo-related-section"><div className="revo-container"><h2>Continue exploring.</h2><nav className="revo-related" aria-label="Related review pages">{REVIEW_PAGES.filter(related => related.slug !== page.slug && (mode === "review" || related.publicationStatus === "approved")).map(related => <a key={related.slug} href={reviewPath(related.slug)}><span>{related.title}</span><span aria-hidden="true">↗</span></a>)}</nav><p className="revo-review-note">{mode === "review" ? "Editorial draft adapted from the original project. " : ""}Prices: <a href="https://www.revoapp.ai/pricing.html">Revo’s current pricing page</a>. Examples and operating suggestions are not customer evidence.</p></div></section>
  </main>;
}
