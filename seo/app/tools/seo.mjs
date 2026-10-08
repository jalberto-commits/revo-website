// Maintainer CLI for the SEO page registry. Run from the website root:
//
//   npm run seo -- validate
//   npm run seo -- status
//   npm run seo -- import <generator-export.json> --batch-id 2026-10-09-name --source-ref "<where it came from>" [--mapping <file>]
//   npm run seo -- apply seo/shared/data/batches/<batchId>.json
//   npm run seo -- approve <slug> --reviewer "<name>" [--note "..."] [--reinstate]
//   npm run seo -- record-release --sha <commit> --deployment dpl_... --batch <batchId> [--batch ...]
//
// Nothing here schedules work, calls a generator or a database, or approves
// content by itself.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { approvedPages, landingPath, readRegistry } from '../../shared/lib/landing-registry.mjs';
import { contentHash, registryErrors } from '../../shared/lib/registry-contract.mjs';
import { applyBatch, approvePage, batchErrors, logBatch, recordRelease } from './batch.mjs';
import { importGeneratorExport } from './generator-adapter.mjs';
import { publicRoutes } from './routes.mjs';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(app, 'site.config.json'), 'utf8'));
const website = resolve(app, config.websiteRoot);
const shared = resolve(app, config.sharedRoot);
const data = join(shared, 'data');
const files = {
  registry: join(data, 'landing-pages.json'),
  batchLog: join(data, 'batch-log.json'),
  releases: join(data, 'releases.json'),
  batches: join(data, 'batches'),
  mapping: join(data, 'generator-mapping.json'),
};

const [command, ...rest] = process.argv.slice(2);
const flags = { _: [] };
for (let i = 0; i < rest.length; i += 1) {
  const arg = rest[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    flags[key] = key in flags ? [].concat(flags[key], value) : value;
  } else flags._.push(arg);
}
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const registry = () => readJson(files.registry, []);
const validated = () => readRegistry(pathToFileURL(shared + '/'), { websiteRoot: website });

const commands = {
  validate() {
    const pages = validated();
    console.log(`PASS registry: ${pages.length} records, ${approvedPages(pages).length} approved; fields, uniqueness, review hashes and assets valid`);
  },

  status() {
    const pages = registry();
    const errors = registryErrors(pages);
    for (const page of pages) {
      const reviewed = page.review ? `${page.review.reviewer} ${page.review.reviewedAt}${page.review.contentHash === contentHash(page) ? '' : ' (STALE: content changed after review)'}` : '-';
      console.log(`${page.publicationStatus.padEnd(9)} ${landingPath(page).padEnd(56)} review: ${reviewed}`);
    }
    console.log(`\npublic routes: ${publicRoutes(pages, config).join(', ')}`);
    if (errors.length) { console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`); process.exitCode = 1; }
  },

  import() {
    const [exportFile] = flags._;
    if (!exportFile || typeof flags['batch-id'] !== 'string' || typeof flags['source-ref'] !== 'string') {
      throw new Error('usage: import <export.json> --batch-id YYYY-MM-DD-name --source-ref "<origin>" [--mapping <file>]');
    }
    const mapping = readJson(typeof flags.mapping === 'string' ? flags.mapping : files.mapping, null);
    if (!mapping) throw new Error('No generator mapping found (seo/shared/data/generator-mapping.json)');
    const batch = importGeneratorExport(readJson(exportFile, null), mapping, registry(), {
      batchId: flags['batch-id'], sourceKind: mapping.sourceKind ?? 'generator', sourceReference: flags['source-ref'],
    });
    mkdirSync(files.batches, { recursive: true });
    const out = join(files.batches, `${batch.batchId}.json`);
    if (existsSync(out)) throw new Error(`${out} already exists; batches are immutable once written`);
    writeJson(out, batch);
    console.log(`Wrote ${out}: ${batch.operations.map(op => `${op.op} ${op.slug ?? op.record.slug}`).join(', ')}. Nothing applied yet.`);
  },

  apply() {
    const [batchFile] = flags._;
    if (!batchFile) throw new Error('usage: apply <batch.json>');
    const batch = readJson(batchFile, null);
    const errors = batchErrors(batch);
    if (errors.length) throw new Error(`Batch is invalid:\n- ${errors.join('\n- ')}`);
    const { registry: next, changes } = applyBatch(registry(), batch);
    const log = logBatch(readJson(files.batchLog, []), batch, changes);
    if (changes.length) writeJson(files.registry, next);
    writeJson(files.batchLog, log);
    validated();
    console.log(changes.length ? `Applied ${batch.batchId}:\n- ${changes.join('\n- ')}\nRun \`npm run seo:routes\` if approvals change.` : `${batch.batchId} is already applied; nothing changed`);
  },

  approve() {
    const [slug] = flags._;
    if (!slug) throw new Error('usage: approve <slug> --reviewer "<name>"');
    const next = approvePage(registry(), slug, {
      reviewer: typeof flags.reviewer === 'string' ? flags.reviewer : undefined,
      note: typeof flags.note === 'string' ? flags.note : undefined,
      reinstate: flags.reinstate === true,
    });
    writeJson(files.registry, next);
    validated();
    console.log(`Approved ${slug} (${contentHash(next.find(page => page.slug === slug))}). Now run \`npm run seo:routes\` and commit.`);
  },

  'record-release'() {
    const batchIds = [].concat(flags.batch ?? []).filter(id => typeof id === 'string');
    const releases = recordRelease(readJson(files.releases, []), {
      sha: flags.sha, deploymentId: flags.deployment, batchIds, routes: publicRoutes(validated(), config),
    });
    writeJson(files.releases, releases);
    console.log(`Recorded ${flags.sha} -> ${flags.deployment} (${batchIds.join(', ')})`);
  },
};

if (!commands[command]) {
  console.error(`usage: seo <${Object.keys(commands).join('|')}> ...`);
  process.exit(2);
}
try {
  commands[command]();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
