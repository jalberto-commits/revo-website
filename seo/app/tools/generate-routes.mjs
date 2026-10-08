// Regenerates vercel.json's SEO rewrites from the approved registry, before a
// deployment exists (Vercel reads routes from the committed vercel.json, so
// generating them during the build would be too late).
//
//   node tools/generate-routes.mjs           rewrite vercel.json
//   node tools/generate-routes.mjs --check   exit 1 when vercel.json is stale (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readRegistry } from '../../shared/lib/landing-registry.mjs';
import { currentSeoRewrites, seoRewrites, serializeVercel, withSeoRewrites } from './routes.mjs';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(app, 'site.config.json'), 'utf8'));
const website = resolve(app, config.websiteRoot);
const shared = resolve(app, config.sharedRoot);
const vercelFile = join(website, 'vercel.json');

const pages = readRegistry(pathToFileURL(shared + '/'), { websiteRoot: website });
const before = readFileSync(vercelFile, 'utf8');
const after = serializeVercel(withSeoRewrites(JSON.parse(before), pages, config));

if (process.argv.includes('--check')) {
  if (before !== after) {
    const have = currentSeoRewrites(JSON.parse(before)).map(r => r.source);
    const want = seoRewrites(pages, config).map(r => r.source);
    console.error('vercel.json is out of date with the approved registry. Run `npm run seo:routes` and commit the result.');
    console.error('  missing:', want.filter(s => !have.includes(s)).join(', ') || 'none');
    console.error('  extra:  ', have.filter(s => !want.includes(s)).join(', ') || 'none');
    process.exit(1);
  }
  console.log(`PASS vercel.json routes match the approved registry (${seoRewrites(pages, config).length} SEO rewrites)`);
} else if (before === after) {
  console.log('vercel.json already matches the approved registry');
} else {
  writeFileSync(vercelFile, after);
  console.log(`vercel.json updated: ${seoRewrites(pages, config).length} SEO rewrites`);
}
