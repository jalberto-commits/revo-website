# Five-page source integration

This source integration adds five reviewed landing pages to the existing static website. It is proposed as a draft PR; merging and deployment are separate decisions. `seo/shared/data/landing-pages.json` is the single registry for content, page paths, pricing variants, navigation and the manually reviewed release status. `seo/shared/components/LandingPageTemplate.tsx` renders both modes; the review wrapper supplies its explicitly simulated form. The public app imports the shared component directly and supplies no form. No JSX is transformed during the build.

Run from the website root with existing installed dependencies:

```
npm run seo:test
npm run seo:build
npm run seo:verify
```

On a fresh checkout, install the locked app dependencies first with `npm --prefix seo/app ci`. That installation was not run during local acceptance. The root `build` script contains that normal clean-checkout step. This PR does not create a GitHub Actions workflow: the current OAuth session lacks the `workflow` permission. Tests and build verification can be run manually with the commands above. A maintainer can add CI separately using read-only repository permissions and no production secrets; do not use a production-secret-bearing pull_request_target job.

`seo/app/site.config.json` uses relative paths. The builder cleans generated app output and `.seo-dist`, copies the allowlisted existing website assets, exports the five approved routes, and adds their navigation and sitemap entries to generated output only. Source `index.html`, `sitemap.xml`, API functions and existing marketing assets remain unchanged. The release manifest stays in `seo/app/.release`, outside the static output. Internal SQL, Markdown, API sources and SEO source modules are excluded from `.seo-dist`.

The public pages use the existing `/free-test` destination and its five UTM parameters, with native origin-only referrer navigation. Explicit safe query UTMs travel in the link even when analytics consent is denied; session persistence and `seo_funnel_click` require the existing `revo-consent=granted` choice and no GPC. Campaigns replace prior campaigns when a fresh campaign arrives. Denial clears the campaign and lead attribution session keys. The existing GA4 property is used, but nonproduction origins only queue events without loading the analytics script. No email/query/referrer values are sent in the click payload.

The six existing funnel rewrites are project-level settings recorded in `seo/shared/data/funnel-routing-contract.json`; they are not overwritten by the five new file rewrites in `vercel.json`. Local acceptance exercises fixtures for those six mappings. Actual remote routing, backend function discovery, lead persistence, analytics ingestion and payments still require an authorized staging acceptance run. No vendor funnel consent is inferred from the SEO consent choice.

Rollback: after a future merge, revert the integration commit (or its merge commit using the appropriate parent). An equivalent source rollback restores `package.json`, `vercel.json` and `.gitignore` from the reviewed base commit `7286051ee492214def8bf35f98cef96d1ca6ccbb`, and removes only this integration's added `seo/` tree. Remove generated `.seo-dist/` and `.seo-dist.building/` before a baseline rebuild. Preserve all other workflows and website files. Redeployment is a separate authorized action. A temporary local rollback restored all 501 captured baseline source hashes; 498 source files, including existing API sources, had remained unchanged before rollback.

Confirmed local acceptance: project checks, typecheck, lint, 85 tests in the related PSEO project, four shared behavior tests runnable in this checkout, fresh public build/verification, a build relocated to a temporary source folder with no absolute Mac paths, removal of four injected obsolete output artifacts, and 51 browser checks covering five routes at 320/390/768/1440, metadata, navigation, consent, UTM encoding and persistence, origin referrer, deduplication, storage failure and GPC. Generated Next build IDs are not claimed bit-identical between builds.


## Staging review before release

Verify the five pages at desktop and mobile widths, canonical host, generated sitemap and footer links, intent-specific pricing and worksheet input validation. Confirm the existing six project-level funnel rewrites against their recorded contract, and the discovery of the existing website API functions. Test the free-test transition with and without safe encoded UTMs and grant/decline/revocation; confirm exactly one `seo_funnel_click` per action after consent. Use synthetic details for a separately authorized backend acceptance run. Confirm actual GA4 ingestion and consent behavior on the intended production origin. Payments, Google indexing and SEO outcomes were not established by local fixtures. The 51 browser checks and broader 85-test suite were executed before handoff; private QA fixtures, local evidence files and the PSEO backend are not part of this PR.
