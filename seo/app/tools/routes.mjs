// Routes derived from the approved registry: the vercel.json rewrites, the
// optional guide index and the homepage navigation. One function per fact, so
// the generator, the build and the verifier cannot disagree.

import { approvedPages, landingPath } from '../../shared/lib/registry-contract.mjs';

export const INDEX_PATH = '/ai-answering-service';
const SEO_PREFIX = '/ai-answering-service';
export const DEFAULT_NAVIGATION_LIMIT = 6;

/** How many guides the homepage links before it links the index instead. */
export const navigationLimit = config => {
  const limit = config.navigationLimit ?? DEFAULT_NAVIGATION_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) throw new Error('site.config.json navigationLimit must be a positive integer');
  return limit;
};

/** The guide index exists only once the catalog outgrows the homepage navigation. */
export const hasIndex = (pages, config) => approvedPages(pages).length > navigationLimit(config);

/** Public routes, in order: every approved page, then the index when it exists. */
export function publicRoutes(pages, config) {
  const routes = approvedPages(pages).map(landingPath);
  if (hasIndex(pages, config)) routes.push(INDEX_PATH);
  return routes;
}

/** The rewrites the SEO pages need: extensionless path to its exported .html file. */
export const seoRewrites = (pages, config) => publicRoutes(pages, config).map(route => ({ source: route, destination: route + '.html' }));

const isSeoRewrite = rewrite => rewrite.source === SEO_PREFIX || String(rewrite.source).startsWith(SEO_PREFIX + '/');

/**
 * vercel.json with its SEO rewrites regenerated from the registry. Every other
 * key, redirect and non-SEO rewrite is kept as it is, in place.
 */
export function withSeoRewrites(vercel, pages, config) {
  const others = (vercel.rewrites ?? []).filter(rewrite => !isSeoRewrite(rewrite));
  const rewrites = [...others, ...seoRewrites(pages, config)];
  const next = { ...vercel };
  if (rewrites.length) next.rewrites = rewrites;
  else delete next.rewrites;
  return next;
}

/** vercel.json's SEO rewrites as they are now. */
export const currentSeoRewrites = vercel => (vercel.rewrites ?? []).filter(isSeoRewrite);

/** Homepage navigation: the first `limit` guides, plus the index when there are more. */
export function homeNavigation(pages, config) {
  const approved = approvedPages(pages);
  const limit = navigationLimit(config);
  const links = approved.slice(0, limit).map(page => ({ href: landingPath(page), label: page.navigationLabel }));
  if (approved.length > limit) links.push({ href: INDEX_PATH, label: 'All call guides' });
  return links;
}

export const serializeVercel = vercel => JSON.stringify(vercel, null, 2) + '\n';
