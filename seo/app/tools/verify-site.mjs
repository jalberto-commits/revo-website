// Verifies a built release (.seo-dist) against the approved registry, by
// invariant rather than fixed counts, so a new batch needs no edits here.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';
import assert from 'node:assert/strict';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(app, 'site.config.json'), 'utf8'));
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const website = resolve(app, option('--website', config.websiteRoot));
const shared = resolve(app, option('--shared', config.sharedRoot));
const output = resolve(website, option('--output', config.outputDirectory));

const { readRegistry, landingPath, approvedPages } = await import(pathToFileURL(join(shared, 'lib/landing-registry.mjs')));
const { LIMITS } = await import(pathToFileURL(join(shared, 'lib/registry-contract.mjs')));
const { publicRoutes, seoRewrites, currentSeoRewrites } = await import(pathToFileURL(join(app, 'tools/routes.mjs')));

const registry = readRegistry(pathToFileURL(shared + '/'), { websiteRoot: website });
const pages = approvedPages(registry);
const unpublished = registry.filter(page => page.publicationStatus !== 'approved');
const routes = publicRoutes(registry, config);
const origin = config.publicOrigin;
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const html = async route => readFile(join(output, route.slice(1) + '.html'), 'utf8');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...await walk(join(dir, entry.name)));
    else if (entry.isFile()) out.push(join(dir, entry.name));
  }
  return out;
}

// 1. The release manifest names exactly the approved pages and public routes.
const manifest = JSON.parse(await readFile(join(app, '.release/manifest.json'), 'utf8'));
assert.deepEqual(manifest.pages, pages.map(landingPath), 'Manifest pages differ from the approved registry');
assert.deepEqual(manifest.routes, routes, 'Manifest routes differ from the approved registry');

// 2. Output is exactly what was built; sources and original images are untouched.
const actual = (await walk(output)).map(file => relative(output, file)).sort();
assert.deepEqual(actual, Object.keys(manifest.outputHashes).sort(), 'Output files differ from the manifest');
for (const [file, hash] of Object.entries(manifest.outputHashes)) assert.equal(await sha256(join(output, file)), hash, file);
for (const [file, hash] of Object.entries(manifest.sourceHashes)) assert.equal(await sha256(join(website, file)), hash, file);
// Checked independently of the manifest, so an image the build silently skips still fails.
for (const source of (await walk(join(website, 'images'))).filter(file => /\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(file))) {
  const file = relative(website, source);
  assert.ok(actual.includes(file), 'Original image missing from release: ' + file);
  assert.equal(await sha256(join(output, file)), await sha256(source), 'Original image changed: ' + file);
}
assert.ok(!actual.some(file => /\.(sql|md|env)$/i.test(file) || file.startsWith('api/') || file.startsWith('seo/')), 'Internal source leaked into the public output');

// 3. Every public route: indexable, canonical on production, content-only.
for (const route of routes) {
  const body = await html(route);
  assert.ok(body.includes('index, follow'), 'Not indexable: ' + route);
  assert.ok(body.includes(`rel="canonical" href="${origin}${route}"`), 'Wrong canonical: ' + route);
  assert.ok(!body.includes('<form'), 'Form on ' + route);
  if (config.acquisitionEnabled !== true) assert.ok(!/href="[^"]*(?:free-test|signup|apps\.apple\.com|\/api\/)/i.test(body), 'Acquisition link on ' + route);
  assert.ok(!body.includes('Private editorial review'), 'Review-only text on ' + route);
}

// 4. Sitemap: every public route once, no duplicates, nothing unpublished.
const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(locs).size, locs.length, 'Duplicate sitemap URLs');
const seoLocs = locs.filter(loc => loc === origin + '/ai-answering-service' || loc.startsWith(origin + '/ai-answering-service/'));
assert.deepEqual([...seoLocs].sort(), routes.map(route => origin + route).sort(), 'Sitemap guide URLs differ from the approved routes');

// 5. Every original public file is preserved, except the sitemap's added guide URLs.
for (const [file, hash] of Object.entries(manifest.sourceHashes)) {
  if (file !== 'sitemap.xml') assert.equal(await sha256(join(output, file)), hash, 'Original public file changed in output: ' + file);
}
const home = await readFile(join(output, 'index.html'), 'utf8');
assert.ok(!home.includes('data-revo-call-planning'), 'Generated guide navigation leaked into original homepage');
const homeLinks = [...home.matchAll(/href="([^"#]+)"/g)].map(match => match[1]);

// 6. Draft and withdrawn records are nowhere: no file, no sitemap URL, no link.
for (const page of unpublished) {
  const path = landingPath(page);
  for (const suffix of ['.html', '.txt']) assert.ok(!existsSync(join(output, path.slice(1) + suffix)), `Unpublished page in output (${page.publicationStatus}): ${path}`);
  assert.ok(!locs.includes(origin + path), 'Unpublished page in sitemap: ' + path);
  for (const route of routes) assert.ok(!(await html(route)).includes(`href="${path}"`), `Unpublished page ${path} linked from ${route}`);
  assert.ok(!homeLinks.includes(path), 'Unpublished page in homepage navigation: ' + path);
}

// 7. Links: related guides capped; every internal link and anchor resolves.
const vercel = JSON.parse(await readFile(join(website, 'vercel.json'), 'utf8'));
const contract = JSON.parse(await readFile(join(shared, 'data/funnel-routing-contract.json'), 'utf8'));
assert.ok(Array.isArray(contract.rules) && contract.rules.length > 0, 'Routing contract has no rules');
assert.equal(new Set(contract.rules.map(rule => rule.id)).size, contract.rules.length, 'Duplicate routing rule id');
const ruleRegexes = contract.rules.map(rule => {
  assert.ok(rule.id && rule.match && rule.type, 'Malformed routing rule ' + JSON.stringify(rule));
  assert.ok(/^https:\/\//.test(rule.destination), 'Routing rule destination must be absolute https: ' + rule.id);
  return { id: rule.id, re: new RegExp(rule.match) };
});
const shadowedBy = path => ruleRegexes.filter(rule => rule.re.test(path)).map(rule => rule.id);
const redirectSources = new Set((vercel.redirects ?? []).map(redirect => redirect.source));
const resolves = path =>
  path === '/' || routes.includes(path) || redirectSources.has(path) || shadowedBy(path).length > 0 ||
  actual.includes(path.slice(1)) || actual.includes(path.slice(1) + '.html') || actual.includes(join(path.slice(1), 'index.html'));
let checkedLinks = 0;
for (const route of routes) {
  const body = await html(route);
  const related = body.match(/<nav class="revo-related"[^>]*>(.*?)<\/nav>/s);
  if (related && route !== '/ai-answering-service') {
    const relatedLinks = [...related[1].matchAll(/<a [^>]*href="([^"]+)"/g)].map(match => match[1]);
    assert.ok(relatedLinks.length <= LIMITS.related, `More than ${LIMITS.related} related links on ${route}`);
    for (const link of relatedLinks) assert.ok(routes.includes(link), `Related link to a non-public page on ${route}: ${link}`);
  }
  for (const [, raw] of body.matchAll(/href="([^"]+)"/g)) {
    const href = raw.replaceAll('&amp;', '&');
    if (/^(mailto:|tel:|javascript:)/.test(href)) continue;
    let url;
    try { url = new URL(href, origin + route); } catch { assert.fail(`Unparseable link on ${route}: ${href}`); }
    if (url.origin !== origin) continue; // external sites are out of scope
    const path = decodeURIComponent(url.pathname);
    if (path.startsWith('/_next/') || path.startsWith('/ai-answering-service/assets/')) { assert.ok(actual.includes(path.slice(1)), `Missing asset on ${route}: ${path}`); continue; }
    assert.ok(resolves(path), `Broken internal link on ${route}: ${href}`);
    if (url.hash && url.hash.length > 1) {
      const target = path === route ? body : routes.includes(path) ? await html(path) : null;
      if (target !== null) assert.ok(target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing anchor ${url.hash} for link on ${route}: ${href}`);
    }
    checkedLinks += 1;
  }
}

// 8. Routes: vercel.json carries exactly the generated SEO rewrites; nothing is shadowed by a dashboard rule.
assert.equal(vercel.outputDirectory, config.outputDirectory, 'vercel.json outputDirectory differs from site.config.json');
assert.deepEqual(currentSeoRewrites(vercel), seoRewrites(registry, config), 'vercel.json SEO rewrites differ from the approved registry: run `npm run seo:routes`');
for (const route of routes) assert.deepEqual(shadowedBy(route), [], 'Public route shadowed by a project routing rule: ' + route);
for (const rule of [...(vercel.rewrites ?? []), ...(vercel.redirects ?? [])]) assert.deepEqual(shadowedBy(rule.source), [], 'vercel.json route shadowed by a project routing rule: ' + rule.source);
for (const file of actual) assert.deepEqual(shadowedBy('/' + file), [], 'Public file shadowed by a project routing rule: ' + file);

console.log(
  `PASS release output hashes, ${pages.length} approved pages / ${routes.length} public routes, ` +
  `${unpublished.length} unpublished records absent, sitemap from registry, original public files and navigation preserved, ` +
  `${checkedLinks} internal links resolved, ${contract.rules.length} project routing rules unshadowed (contract version ${contract.versionId})`,
);
