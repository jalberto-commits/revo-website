// Pure registry operations for daily batches. No file or network access here:
// tools/seo.mjs reads and writes the files; tests call these directly.
//
// A batch never approves anything. `add` and changed `update` records land as
// drafts; only `approve` (a named human reviewer) makes a record public, and
// that approval is bound to the record's content hash.

import { createHash } from 'node:crypto';

import { contentHash, registryErrors } from '../../shared/lib/registry-contract.mjs';

export const BATCH_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPS = ['add', 'update', 'withdraw'];
const PUBLICATION_FIELDS = ['publicationStatus', 'review', 'withdrawal'];
const today = () => new Date().toISOString().slice(0, 10);
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;

/** sha256 of a batch file's operations, so a reused batch id with other content is caught. */
export const batchHash = batch => 'sha256:' + createHash('sha256').update(JSON.stringify(batch.operations)).digest('hex');

export function batchErrors(batch) {
  const errors = [];
  if (!batch || typeof batch !== 'object') return ['A batch must be a JSON object'];
  if (typeof batch.batchId !== 'string' || !BATCH_ID.test(batch.batchId)) errors.push('batchId must look like 2026-10-09-short-name');
  if (!batch.source || !nonEmpty(batch.source.kind) || !nonEmpty(batch.source.reference)) errors.push('source must be { kind, reference }');
  if (!Array.isArray(batch.operations) || batch.operations.length === 0) errors.push('operations must be a non-empty list');
  else batch.operations.forEach((operation, i) => {
    const where = `operation ${i + 1}`;
    if (!OPS.includes(operation?.op)) return errors.push(`${where}: op must be one of ${OPS.join(', ')}`);
    if (operation.op === 'withdraw') {
      if (!nonEmpty(operation.slug)) errors.push(`${where}: withdraw needs a slug`);
      if (!nonEmpty(operation.reason)) errors.push(`${where}: withdraw needs a reason`);
    } else {
      if (!operation.record || typeof operation.record !== 'object') return errors.push(`${where}: ${operation.op} needs a record`);
      for (const field of PUBLICATION_FIELDS) if (field in operation.record) errors.push(`${where}: a batch cannot set ${field}; approval is a separate, human step`);
      if (operation.op === 'update' && operation.slug !== undefined && operation.slug !== operation.record.slug) errors.push(`${where}: update slug and record.slug differ`);
    }
  });
  const slugs = (batch.operations ?? []).map(operation => operation?.slug ?? operation?.record?.slug).filter(Boolean);
  const repeated = slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
  if (repeated.length) errors.push(`a batch may touch each slug once; repeated: ${[...new Set(repeated)].join(', ')}`);
  return errors;
}

/**
 * Applies a batch. Idempotent: applying the same batch again changes nothing.
 *
 * @returns {{ registry: object[], changes: string[] }} the new registry and what changed
 */
export function applyBatch(registry, batch, { date = today() } = {}) {
  const errors = batchErrors(batch);
  if (errors.length) throw new Error(`Batch is invalid:\n- ${errors.join('\n- ')}`);
  const next = registry.map(record => ({ ...record }));
  const changes = [];
  const find = slug => next.findIndex(record => record.slug === slug);

  for (const operation of batch.operations) {
    if (operation.op === 'withdraw') {
      const i = find(operation.slug);
      if (i < 0) throw new Error(`withdraw: no page "${operation.slug}"`);
      if (next[i].publicationStatus === 'withdrawn') continue;
      next[i] = { ...next[i], publicationStatus: 'withdrawn', withdrawal: { reason: operation.reason, at: date, batchId: batch.batchId } };
      changes.push(`withdrew ${operation.slug}`);
      continue;
    }

    const incoming = { ...operation.record, source: operation.record.source ?? { kind: batch.source.kind, reference: `${batch.source.reference} (batch ${batch.batchId})` } };
    const i = find(incoming.slug);
    if (operation.op === 'add') {
      if (i >= 0) {
        if (contentHash(next[i]) === contentHash(incoming)) continue; // already applied
        throw new Error(`add: "${incoming.slug}" already exists with other content; use an update operation`);
      }
      next.push({ ...incoming, publicationStatus: 'draft' });
      changes.push(`added ${incoming.slug} as draft`);
    } else {
      if (i < 0) throw new Error(`update: no page "${incoming.slug}"`);
      if (contentHash(next[i]) === contentHash(incoming)) continue; // already applied
      // The update replaces the content entirely. New content needs a new review:
      // the page drops back to draft until approved again.
      next[i] = { ...incoming, publicationStatus: 'draft' };
      changes.push(`updated ${incoming.slug}; back to draft until re-approved`);
    }
  }

  const problems = registryErrors(next);
  if (problems.length) throw new Error(`The batch would leave the registry invalid:\n- ${problems.join('\n- ')}`);
  return { registry: next, changes };
}

/** A named reviewer approves the record's current content. */
export function approvePage(registry, slug, { reviewer, date = today(), note, reinstate = false } = {}) {
  if (!nonEmpty(reviewer)) throw new Error('approve needs --reviewer "<name>": approval is a human editorial decision');
  const i = registry.findIndex(record => record.slug === slug);
  if (i < 0) throw new Error(`approve: no page "${slug}"`);
  const record = registry[i];
  if (record.publicationStatus === 'withdrawn' && !reinstate) throw new Error(`"${slug}" is withdrawn; pass --reinstate to publish it again`);
  const { withdrawal, ...rest } = record;
  void withdrawal;
  const approved = { ...rest, publicationStatus: 'approved' };
  approved.review = { reviewer, reviewedAt: date, contentHash: contentHash(approved), ...(note ? { note } : {}) };
  const next = registry.map((other, j) => (j === i ? approved : other));
  const problems = registryErrors(next);
  if (problems.length) throw new Error(`Cannot approve "${slug}":\n- ${problems.join('\n- ')}`);
  return next;
}

/** Appends a batch to the applied-batch log once; a reused id with other content is an error. */
export function logBatch(log, batch, changes, { date = today() } = {}) {
  const hash = batchHash(batch);
  const existing = log.find(entry => entry.batchId === batch.batchId);
  if (existing) {
    if (existing.batchHash !== hash) throw new Error(`batch id ${batch.batchId} was already applied with different operations`);
    return log;
  }
  return [...log, { batchId: batch.batchId, batchHash: hash, source: batch.source, appliedAt: date, changes }];
}

/** Records which commit and deployment published which batches; idempotent per commit. */
export function recordRelease(releases, { sha, deploymentId, batchIds, routes, date = today() }) {
  if (!/^[0-9a-f]{7,40}$/.test(String(sha))) throw new Error('record-release needs --sha <commit>');
  if (!/^dpl_[A-Za-z0-9]+$/.test(String(deploymentId))) throw new Error('record-release needs --deployment dpl_...');
  if (!Array.isArray(batchIds) || batchIds.length === 0) throw new Error('record-release needs --batch <id> (repeatable)');
  const existing = releases.find(release => release.sha === sha);
  if (existing) {
    if (existing.deploymentId !== deploymentId) throw new Error(`commit ${sha} is already recorded with ${existing.deploymentId}`);
    return releases;
  }
  return [...releases, { sha, deploymentId, publishedAt: date, batchIds, routes }];
}
