import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { assertRegistry } from './registry-contract.mjs';

export { approvedPages, contentHash, landingPath, relatedPages } from './registry-contract.mjs';

/**
 * Reads and validates the landing registry. A record that breaks the contract
 * (missing editorial fields, duplicate slug or metadata, stale approval, a
 * referenced asset that does not exist) stops the build with every problem listed.
 *
 * @param {URL} sharedRoot file URL of seo/shared/ (with a trailing slash)
 * @param {{ websiteRoot?: string, registryFile?: string }} [options]
 */
export function readRegistry(sharedRoot, options = {}) {
  const file = options.registryFile ?? fileURLToPath(new URL('data/landing-pages.json', sharedRoot));
  const pages = JSON.parse(readFileSync(file, 'utf8'));
  const shared = fileURLToPath(sharedRoot);
  const assetExists = options.websiteRoot
    ? path => existsSync(join(options.websiteRoot, decodeURI(path))) || existsSync(join(shared, 'public', decodeURI(path)))
    : undefined;
  return assertRegistry(pages, { assetExists });
}

