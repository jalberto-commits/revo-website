// The publication contract for SEO/AEO landing pages.
//
// One registry (seo/shared/data/landing-pages.json) is the only source the
// build publishes from. A record is public only when it is `approved` AND its
// review is bound to the exact content that was reviewed: `review.contentHash`
// must equal the hash of the record's editorial fields. Editing an approved
// record without re-review therefore fails validation instead of silently
// publishing unreviewed text.
//
// Plain JavaScript (no TypeScript) so the build tools, CI and tests share it.

import { createHash } from 'node:crypto';

export const STATUSES = ['draft', 'approved', 'withdrawn'];
export const PRICING_VARIANTS = ['full', 'missed-calls', 'voicemail', 'receptionist', 'worksheet'];
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
export const ROUTE_PREFIX = '/ai-answering-service/';

/** Metadata limits: the title is published as "<title> | Revo". */
export const LIMITS = {
  title: [10, 62],
  description: [50, 160],
  navigationLabel: [3, 32],
  eyebrow: [2, 40],
  slugSegments: 3,
  related: 4,
};

/** Fields that make up the reviewed content. Status, review, withdrawal and provenance are not content. */
const NON_EDITORIAL = new Set(['publicationStatus', 'review', 'source', 'withdrawal']);

/** Stable JSON: object keys sorted at every level, so the hash ignores key order. */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/** sha256 of a record's editorial fields, as `sha256:<hex>`. */
export function contentHash(record) {
  const editorial = Object.fromEntries(Object.entries(record).filter(([key]) => !NON_EDITORIAL.has(key)));
  return 'sha256:' + createHash('sha256').update(canonical(editorial)).digest('hex');
}

export const landingPath = page => ROUTE_PREFIX + page.slug;

const isText = (value, [min, max]) => typeof value === 'string' && value.trim() === value && value.length >= min && value.length <= max;
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

/** Asset paths a record references: its `image` and any site path inside its text. */
export function referencedAssets(record) {
  const found = new Set();
  if (typeof record.image === 'string') found.add(record.image);
  const text = JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => !NON_EDITORIAL.has(key))));
  for (const match of text.matchAll(/\/(?:images|ai-answering-service\/assets)\/[A-Za-z0-9._%\/-]+\.(?:png|jpe?g|webp|avif|gif|svg)/g)) found.add(match[0]);
  return [...found];
}

/**
 * Every problem with the registry, as readable strings (empty when valid).
 *
 * @param {object[]} pages the registry records, in publication order
 * @param {{ assetExists?: (path: string) => boolean }} [options] `assetExists`
 *   answers whether a site path (`/images/x.webp`) exists in the published tree
 */
export function registryErrors(pages, options = {}) {
  const errors = [];
  if (!Array.isArray(pages)) return ['The registry must be a JSON array of page records'];
  const seen = { slug: new Map(), title: new Map(), description: new Map(), navigationLabel: new Map() };
  const bySlug = new Map(pages.filter(p => p && typeof p.slug === 'string').map(p => [p.slug, p]));

  pages.forEach((page, index) => {
    const where = `record ${index + 1}${page && page.slug ? ` (${page.slug})` : ''}`;
    const fail = message => errors.push(`${where}: ${message}`);
    if (!page || typeof page !== 'object' || Array.isArray(page)) return fail('is not an object');

    if (typeof page.slug !== 'string' || !SLUG_PATTERN.test(page.slug)) fail('slug must be lowercase words joined by "-", optionally nested with "/"');
    else if (page.slug.split('/').length > LIMITS.slugSegments) fail(`slug has more than ${LIMITS.slugSegments} segments`);

    if (!STATUSES.includes(page.publicationStatus)) fail(`publicationStatus must be one of ${STATUSES.join(', ')}`);
    if (!PRICING_VARIANTS.includes(page.pricingVariant)) fail(`pricingVariant must be one of ${PRICING_VARIANTS.join(', ')}`);
    if (!isText(page.title, LIMITS.title)) fail(`title must be ${LIMITS.title[0]}-${LIMITS.title[1]} characters, without outer spaces`);
    if (page.h1 !== undefined && !isText(page.h1, [10, 120])) fail('h1 must be 10-120 characters without outer spaces');
    if (!isText(page.description, LIMITS.description)) fail(`description must be ${LIMITS.description[0]}-${LIMITS.description[1]} characters, without outer spaces`);
    if (!isText(page.navigationLabel, LIMITS.navigationLabel)) fail(`navigationLabel must be ${LIMITS.navigationLabel[0]}-${LIMITS.navigationLabel[1]} characters`);
    if (!isText(page.eyebrow, LIMITS.eyebrow)) fail(`eyebrow must be ${LIMITS.eyebrow[0]}-${LIMITS.eyebrow[1]} characters`);
    for (const field of ['lead', 'intro', 'takeaway']) if (!nonEmpty(page[field])) fail(`${field} is required`);
    if (!Array.isArray(page.sourcePaths) || page.sourcePaths.length === 0 || !page.sourcePaths.every(nonEmpty)) fail('sourcePaths must list where the content came from');
    if (!Array.isArray(page.sections) || page.sections.length === 0) fail('sections must contain at least one section');
    else page.sections.forEach((section, i) => {
      if (!nonEmpty(section?.title)) fail(`section ${i + 1} needs a title`);
      if (!Array.isArray(section?.paragraphs) || !Array.isArray(section?.items) || ![...section.paragraphs, ...section.items].every(nonEmpty) || section.paragraphs.length + section.items.length === 0) fail(`section ${i + 1} needs non-empty paragraphs or items`);
    });
    if (!Array.isArray(page.faqs) || !page.faqs.every(faq => nonEmpty(faq?.q) && nonEmpty(faq?.a))) fail('faqs must be a list of { q, a } with text');
    if (page.calculator !== undefined && typeof page.calculator !== 'boolean') fail('calculator must be true or false');
    if (page.image !== undefined && (typeof page.image !== 'string' || !page.image.startsWith('/'))) fail('image must be a site path such as /images/example.webp');

    if (page.related !== undefined) {
      if (!Array.isArray(page.related) || page.related.length > LIMITS.related) fail(`related must list at most ${LIMITS.related} slugs`);
      else for (const slug of page.related) {
        const target = bySlug.get(slug);
        if (slug === page.slug) fail('related must not list the page itself');
        else if (!target) fail(`related page "${slug}" does not exist`);
        else if (page.publicationStatus === 'approved' && target.publicationStatus !== 'approved') fail(`related page "${slug}" is not approved`);
      }
    }

    if (page.source !== undefined && (!page.source || !nonEmpty(page.source.kind) || !nonEmpty(page.source.reference))) fail('source must be { kind, reference }');
    if (page.publicationStatus === 'approved') {
      if (!page.source) fail('an approved page must record its source { kind, reference }');
      const review = page.review;
      if (!review || !nonEmpty(review.reviewer) || typeof review.reviewedAt !== 'string' || !ISO_DATE.test(review.reviewedAt) || !nonEmpty(review.contentHash)) {
        fail('an approved page needs review { reviewer, reviewedAt (ISO date), contentHash }');
      } else if (review.contentHash !== contentHash(page)) {
        fail(`content changed after review: reviewed ${review.contentHash}, now ${contentHash(page)}; re-review and re-approve it`);
      }
    }
    if (page.publicationStatus === 'withdrawn' && (!page.withdrawal || !nonEmpty(page.withdrawal.reason) || !ISO_DATE.test(String(page.withdrawal.at)))) {
      fail('a withdrawn page needs withdrawal { reason, at (ISO date) }');
    }

    if (options.assetExists && page.publicationStatus !== 'withdrawn') {
      for (const asset of referencedAssets(page)) if (!options.assetExists(asset)) fail(`asset ${asset} does not exist in the published site`);
    }

    // Uniqueness: slugs always; public-facing metadata among pages that can be published.
    const track = (key, value) => {
      if (typeof value !== 'string') return;
      const other = seen[key].get(value);
      if (other !== undefined) fail(`duplicate ${key} (also record ${other + 1})`);
      else seen[key].set(value, index);
    };
    track('slug', page.slug);
    if (page.publicationStatus !== 'withdrawn') {
      track('title', page.title);
      track('description', page.description);
      track('navigationLabel', page.navigationLabel);
    }
  });
  return errors;
}

/** Throws one error listing every problem, or returns the records. */
export function assertRegistry(pages, options) {
  const errors = registryErrors(pages, options);
  if (errors.length) throw new Error(`Landing registry is invalid:\n- ${errors.join('\n- ')}`);
  return pages;
}

/** The records the build publishes, in registry order. */
export const approvedPages = pages => pages.filter(page => page.publicationStatus === 'approved');

/**
 * Related guides for a page: its explicit `related` list, else the nearest
 * approved pages in registry order, capped at `limit`.
 */
export function relatedPages(page, pages, limit = LIMITS.related) {
  const approved = approvedPages(pages).filter(other => other.slug !== page.slug);
  if (Array.isArray(page.related) && page.related.length) {
    return page.related.map(slug => approved.find(other => other.slug === slug)).filter(Boolean).slice(0, limit);
  }
  return approved.slice(0, limit);
}
