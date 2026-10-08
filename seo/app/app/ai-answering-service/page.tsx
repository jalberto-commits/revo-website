import type {Metadata} from 'next';
import {REVIEW_PAGES, reviewPath} from '@/lib/review-cohort';

// The guide index. Next always exports it; tools/build-site.mjs publishes it
// (output, rewrite, sitemap, homepage link) only once the approved catalog
// outgrows the homepage navigation (site.config.json navigationLimit).

const canonical = 'https://www.revoapp.ai/ai-answering-service';
const title = 'Call handling guides';
const description = 'Practical guides for home service businesses on after-hours calls, missed calls and how AI answering compares to the alternatives.';

export const metadata: Metadata = {
  title: {absolute: title + ' | Revo'},
  description,
  robots: {index: true, follow: true},
  alternates: {canonical},
  openGraph: {title, description, url: canonical, type: 'website', locale: 'en_US'},
  twitter: {card: 'summary', title, description},
};

export default function GuideIndex() {
  const guides = REVIEW_PAGES.filter(page => page.publicationStatus === 'approved');
  return (
    <main id="revo-main">
      <section className="revo-hero">
        <div className="revo-container">
          <span className="revo-eyebrow">Guides</span>
          <h1>{title}</h1>
          <p className="revo-hero-lead">{description}</p>
        </div>
      </section>
      <section className="revo-section revo-dark revo-related-section">
        <div className="revo-container">
          <nav className="revo-related" aria-label="All call guides">
            {guides.map(guide => (
              <a key={guide.slug} href={reviewPath(guide.slug)}>
                <span>{guide.title}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
