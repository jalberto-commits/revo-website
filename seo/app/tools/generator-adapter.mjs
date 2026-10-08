// Explicit adapter from a content generator's export (for example rows read
// out of Supabase by a person) to a batch of the registry contract.
//
// It does not connect to the generator or the database, does not schedule
// anything, and never carries over an approval: every row becomes an `add` or
// `update` operation, and the registry keeps the page as a draft until a named
// reviewer approves it. Which export column feeds which contract field is
// written down in seo/shared/data/generator-mapping.json, so a change in the
// generator's schema fails loudly here instead of publishing partial pages.

const REQUIRED = ['slug', 'title', 'description', 'eyebrow', 'lead', 'intro', 'takeaway', 'navigationLabel', 'pricingVariant', 'sourcePaths', 'sections', 'faqs'];
const OPTIONAL = ['calculator', 'comparison', 'related', 'image'];

const pick = (row, path) => String(path).split('.').reduce((value, key) => (value == null ? undefined : value[key]), row);

export function importGeneratorExport(exported, mapping, registry, { batchId, sourceKind, sourceReference }) {
  if (!mapping || typeof mapping.fields !== 'object') throw new Error('The mapping needs a "fields" object: contract field -> export column');
  const unknown = Object.keys(mapping.fields).filter(field => !REQUIRED.includes(field) && !OPTIONAL.includes(field));
  if (unknown.length) throw new Error(`The mapping names fields the contract does not have: ${unknown.join(', ')}`);

  const rows = mapping.rows ? pick(exported, mapping.rows) : exported;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`The export has no rows${mapping.rows ? ` under "${mapping.rows}"` : ''}`);

  const problems = [];
  const operations = rows.map((row, i) => {
    const record = {};
    for (const field of [...REQUIRED, ...OPTIONAL]) {
      const column = mapping.fields[field];
      const value = column === undefined ? undefined : pick(row, column);
      const fallback = mapping.defaults?.[field];
      if (value !== undefined && value !== null && value !== '') record[field] = value;
      else if (fallback !== undefined) record[field] = fallback;
    }
    const missing = REQUIRED.filter(field => record[field] === undefined);
    if (missing.length) problems.push(`row ${i + 1}${record.slug ? ` (${record.slug})` : ''}: missing ${missing.join(', ')}`);
    const exists = registry.some(page => page.slug === record.slug);
    return exists ? { op: 'update', slug: record.slug, record } : { op: 'add', record };
  });
  if (problems.length) throw new Error(`The export does not satisfy the contract:\n- ${problems.join('\n- ')}`);

  return { batchId, source: { kind: sourceKind, reference: sourceReference }, operations };
}
