import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { contentHash, registryErrors, relatedPages, approvedPages } from '../lib/registry-contract.mjs';
import { applyBatch, approvePage, logBatch, recordRelease } from '../../app/tools/batch.mjs';
import { homeNavigation, publicRoutes, seoRewrites, withSeoRewrites, INDEX_PATH } from '../../app/tools/routes.mjs';
import { importGeneratorExport } from '../../app/tools/generator-adapter.mjs';

const REGISTRY = JSON.parse(readFileSync(new URL('../data/landing-pages.json', import.meta.url), 'utf8'));
const CONFIG = { navigationLimit: 6 };
const strip = ({ publicationStatus, review, withdrawal, ...record }) => record;

/** A new, valid editorial record based on an existing one. */
function draftRecord(slug, n) {
  const base = strip(structuredClone(REGISTRY[1]));
  return {
    ...base,
    slug,
    title: `Fixture guide number ${n} for call handling`,
    description: `A fixture description for guide number ${n}, long enough to satisfy the metadata contract.`,
    navigationLabel: `Fixture guide ${n}`,
    sourcePaths: [`fixtures/${slug}`],
    source: { kind: 'fixture', reference: 'registry-contract.test.mjs' },
  };
}
const batch = (batchId, operations) => ({ batchId, source: { kind: 'fixture', reference: 'test' }, operations });

test('the committed registry satisfies the contract', () => {
  assert.deepEqual(registryErrors(REGISTRY), []);
  for (const page of approvedPages(REGISTRY)) assert.equal(page.review.contentHash, contentHash(page));
});

test('duplicates are rejected: slug, title, description and navigation label', () => {
  const copy = { ...REGISTRY[0] };
  assert.ok(registryErrors([...REGISTRY, copy]).some(e => e.includes('duplicate slug')));
  const sameTitle = { ...draftRecord('fixture-dup', 9), title: REGISTRY[0].title, publicationStatus: 'draft' };
  assert.ok(registryErrors([...REGISTRY, sameTitle]).some(e => e.includes('duplicate title')));
  const sameLabel = { ...draftRecord('fixture-dup2', 10), navigationLabel: REGISTRY[2].navigationLabel, publicationStatus: 'draft' };
  assert.ok(registryErrors([...REGISTRY, sameLabel]).some(e => e.includes('duplicate navigationLabel')));
});

test('invalid metadata is rejected with a readable reason', () => {
  const bad = (patch, needle) => {
    const errors = registryErrors([...REGISTRY, { ...draftRecord('fixture-bad', 11), publicationStatus: 'draft', ...patch }]);
    assert.ok(errors.some(e => e.includes(needle)), `${needle}: ${errors.join(' | ')}`);
  };
  bad({ title: 'x'.repeat(80) }, 'title must be');
  bad({ title: 'Short' }, 'title must be');
  bad({ description: 'Too short.' }, 'description must be');
  bad({ description: ' leading space and otherwise a perfectly long enough description for the page.' }, 'description must be');
  bad({ slug: 'Bad Slug' }, 'slug must be');
  bad({ slug: 'a/b/c/d' }, 'segments');
  bad({ publicationStatus: 'published' }, 'publicationStatus must be');
  bad({ pricingVariant: 'gold' }, 'pricingVariant');
  bad({ sections: [] }, 'sections');
  bad({ faqs: [{ q: 'Question?' }] }, 'faqs');
  bad({ sourcePaths: [] }, 'sourcePaths');
  bad({ related: ['does-not-exist'] }, 'does not exist');
  bad({ related: REGISTRY.slice(0, 5).map(p => p.slug) }, 'at most');
});

test('an approval is bound to the reviewed content: editing it afterwards fails', () => {
  const edited = REGISTRY.map((page, i) => (i === 0 ? { ...page, lead: page.lead + ' Edited after review.' } : page));
  assert.ok(registryErrors(edited).some(e => e.includes('content changed after review')));
  const editedH1 = REGISTRY.map((page, i) => i === 0 ? { ...page, h1: 'An unreviewed changed heading' } : page);
  assert.ok(registryErrors(editedH1).some(e => e.includes('content changed after review')));
  const unreviewed = REGISTRY.map((page, i) => (i === 0 ? strip(page) : page)).map((page, i) => (i === 0 ? { ...page, publicationStatus: 'approved' } : page));
  assert.ok(registryErrors(unreviewed).some(e => e.includes('needs review')));
});

test('referenced assets must exist', () => {
  const withImage = { ...draftRecord('fixture-image', 12), publicationStatus: 'draft', image: '/images/does-not-exist.webp' };
  const assetExists = path => path === '/images/logo.webp';
  assert.ok(registryErrors([...REGISTRY, withImage], { assetExists }).some(e => e.includes('asset /images/does-not-exist.webp does not exist')));
  assert.deepEqual(registryErrors([...REGISTRY, { ...withImage, image: '/images/logo.webp' }], { assetExists }), []);
  const inText = { ...draftRecord('fixture-text-asset', 13), publicationStatus: 'draft', intro: 'See /ai-answering-service/assets/review/missing.png for details.' };
  assert.ok(registryErrors([...REGISTRY, inText], { assetExists }).some(e => e.includes('missing.png')));
});

test('batches: add lands as draft, re-applying is a no-op, approval is a separate human step', () => {
  const sixth = draftRecord('weekend-calls', 6);
  const b = batch('2026-10-09-fixture', [{ op: 'add', record: sixth }]);
  const first = applyBatch(REGISTRY, b, { date: '2026-10-09' });
  assert.deepEqual(first.changes, ['added weekend-calls as draft']);
  assert.equal(first.registry.at(-1).publicationStatus, 'draft');
  assert.deepEqual(applyBatch(first.registry, b).changes, [], 'idempotent');
  assert.ok(!approvedPages(first.registry).some(p => p.slug === 'weekend-calls'), 'a batch never publishes');

  assert.throws(() => approvePage(first.registry, 'weekend-calls', {}), /reviewer/);
  const approved = approvePage(first.registry, 'weekend-calls', { reviewer: 'Fixture Reviewer', date: '2026-10-09' });
  const page = approved.find(p => p.slug === 'weekend-calls');
  assert.equal(page.publicationStatus, 'approved');
  assert.equal(page.review.contentHash, contentHash(page));
  assert.deepEqual(registryErrors(approved), []);
});

test('batches cannot approve, update resets review, withdraw keeps history', () => {
  assert.throws(() => applyBatch(REGISTRY, batch('2026-10-09-sneaky', [{ op: 'add', record: { ...draftRecord('sneaky', 14), publicationStatus: 'approved' } }])), /cannot set publicationStatus/);
  assert.throws(() => applyBatch(REGISTRY, batch('2026-10-09-twice', [{ op: 'add', record: draftRecord('twice', 15) }, { op: 'withdraw', slug: 'twice', reason: 'x' }])), /each slug once/);
  assert.throws(() => applyBatch(REGISTRY, batch('2026-10-09-clash', [{ op: 'add', record: { ...strip(REGISTRY[0]), lead: 'Different' } }])), /already exists with other content/);

  const update = batch('2026-10-09-update', [{ op: 'update', slug: REGISTRY[0].slug, record: { ...strip(REGISTRY[0]), takeaway: REGISTRY[0].takeaway + ' Updated.' } }]);
  const updated = applyBatch(REGISTRY, update).registry[0];
  assert.equal(updated.publicationStatus, 'draft');
  assert.equal(updated.review, undefined);

  const withdraw = batch('2026-10-09-withdraw', [{ op: 'withdraw', slug: REGISTRY[1].slug, reason: 'Superseded' }]);
  const { registry: withdrawn } = applyBatch(REGISTRY, withdraw, { date: '2026-10-09' });
  assert.equal(withdrawn[1].publicationStatus, 'withdrawn');
  assert.deepEqual(withdrawn[1].withdrawal, { reason: 'Superseded', at: '2026-10-09', batchId: '2026-10-09-withdraw' });
  assert.deepEqual(applyBatch(withdrawn, withdraw).changes, []);
  assert.throws(() => approvePage(withdrawn, REGISTRY[1].slug, { reviewer: 'R' }), /reinstate/);
  assert.equal(approvePage(withdrawn, REGISTRY[1].slug, { reviewer: 'R', reinstate: true })[1].publicationStatus, 'approved');
});

test('batch log and release record are idempotent', () => {
  const b = batch('2026-10-09-log', [{ op: 'add', record: draftRecord('logged', 16) }]);
  const log = logBatch([], b, ['added logged as draft'], { date: '2026-10-09' });
  assert.equal(logBatch(log, b, []).length, 1);
  assert.throws(() => logBatch(log, batch('2026-10-09-log', [{ op: 'withdraw', slug: 'x', reason: 'y' }]), []), /different operations/);

  const entry = { sha: 'abc1234', deploymentId: 'dpl_Example1', batchIds: ['2026-10-09-log'], routes: [] };
  const releases = recordRelease([], entry);
  assert.equal(recordRelease(releases, entry).length, 1);
  assert.throws(() => recordRelease(releases, { ...entry, deploymentId: 'dpl_Other2' }), /already recorded/);
});

test('routes, sitemap set and navigation come from the approved records only', () => {
  const sixth = { ...draftRecord('weekend-calls', 6), publicationStatus: 'draft' };
  const withDraft = [...REGISTRY, sixth];
  assert.deepEqual(publicRoutes(withDraft, CONFIG), publicRoutes(REGISTRY, CONFIG), 'a draft adds no route');

  const sixApproved = approvePage(withDraft, 'weekend-calls', { reviewer: 'R', date: '2026-10-09' });
  assert.ok(publicRoutes(sixApproved, CONFIG).includes('/ai-answering-service/weekend-calls'));
  assert.equal(homeNavigation(sixApproved, CONFIG).length, 6);
  assert.ok(!publicRoutes(sixApproved, CONFIG).includes(INDEX_PATH), 'no index while the navigation holds every guide');

  const small = { navigationLimit: 5 };
  assert.ok(publicRoutes(sixApproved, small).includes(INDEX_PATH), 'index once the catalog outgrows the navigation');
  assert.deepEqual(homeNavigation(sixApproved, small).map(l => l.href).slice(-1), [INDEX_PATH]);
  assert.equal(homeNavigation(sixApproved, small).length, 6, 'five guides plus the index link');

  const vercel = { outputDirectory: '.seo-dist', redirects: [{ source: '/a', destination: '/b', permanent: true }], rewrites: [{ source: '/other', destination: '/x.html' }, { source: '/ai-answering-service/stale', destination: '/ai-answering-service/stale.html' }] };
  const next = withSeoRewrites(vercel, sixApproved, CONFIG);
  assert.deepEqual(next.redirects, vercel.redirects, 'redirects preserved');
  assert.deepEqual(next.rewrites[0], { source: '/other', destination: '/x.html' }, 'non-SEO rewrites preserved');
  assert.deepEqual(next.rewrites.slice(1), seoRewrites(sixApproved, CONFIG), 'SEO rewrites regenerated');
  assert.ok(!next.rewrites.some(r => r.source.endsWith('/stale')), 'stale rewrite removed');
});

test('related guides are capped and never point at unpublished pages', () => {
  const sixApproved = approvePage([...REGISTRY, { ...draftRecord('weekend-calls', 6), publicationStatus: 'draft' }], 'weekend-calls', { reviewer: 'R' });
  for (const page of approvedPages(sixApproved)) {
    const related = relatedPages(page, sixApproved);
    assert.ok(related.length <= 4);
    assert.ok(related.every(other => other.publicationStatus === 'approved' && other.slug !== page.slug));
  }
});

test('the generator adapter maps columns explicitly and never carries approval', () => {
  const mapping = JSON.parse(readFileSync(new URL('../data/generator-mapping.json', import.meta.url), 'utf8'));
  const row = { ...draftRecord('generated-page', 17), publicationStatus: 'approved', review: { reviewer: 'bot' } };
  const out = importGeneratorExport([row, strip(REGISTRY[0])], mapping, REGISTRY, { batchId: '2026-10-09-import', sourceKind: 'generator', sourceReference: 'export.json' });
  assert.deepEqual(out.operations.map(op => op.op), ['add', 'update']);
  assert.ok(!('publicationStatus' in out.operations[0].record) && !('review' in out.operations[0].record));
  const { registry } = applyBatch(REGISTRY, out);
  assert.equal(registry.find(p => p.slug === 'generated-page').publicationStatus, 'draft');
  assert.throws(() => importGeneratorExport([{ slug: 'x' }], mapping, REGISTRY, { batchId: '2026-10-09-bad', sourceKind: 'g', sourceReference: 'r' }), /missing title/);
  assert.throws(() => importGeneratorExport([row], { fields: { seoTitle: 'title' } }, REGISTRY, { batchId: '2026-10-09-bad', sourceKind: 'g', sourceReference: 'r' }), /contract does not have/);
});
