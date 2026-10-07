import type {ReviewPage} from "@/lib/review-cohort";
import {REVIEW_PAGES,reviewPath} from "@/lib/review-cohort";
import {ContactForm} from "./ContactForm";
import {OfficialPricing} from "./OfficialPricing";
import {LandingPageTemplate} from "./LandingPageTemplate";
export function ReviewPricing(){return <OfficialPricing mode="review" />;}
export function ReviewIndex() {
  return <main id="revo-main" className="revo-review-page"><section className="revo-hero revo-index-hero"><div className="revo-container"><span className="revo-eyebrow">Private review for Jorge</span><h1>Five pages.<br /><span className="revo-accent">One clearer call strategy.</span></h1><p>Four pages prepared from the original project, plus a distinct scenario worksheet. These are local drafts, not published pages or verified customer results.</p></div></section><section className="revo-section revo-dark"><div className="revo-container revo-index-grid">{REVIEW_PAGES.map((page, index) => <article key={page.slug}><span className="revo-eyebrow">{String(index + 1).padStart(2, "0")} / {page.eyebrow}</span><h2>{page.title}</h2><p>{page.description}</p><a className="revo-button" href={reviewPath(page.slug)}>Review page <span aria-hidden="true">↗</span></a></article>)}</div></section></main>;
}

export function ReviewPageTemplate({page}:{page:ReviewPage}){return <LandingPageTemplate page={page} mode="review" reviewForm={<ContactForm reviewOnly />} />;}
