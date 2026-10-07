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

The first release is content only. `acquisitionEnabled: false` in `seo/app/site.config.json` is passed explicitly to the shared header, page renderer and consent component. Public CTAs navigate to plan details, guides or the worksheet. There are no signup, free-test or App Store links or forms on the five new pages, including mobile navigation. Campaign attribution is not persisted and acquisition clicks are not emitted in this mode. The frontend worksheet submits no data. Enabling the flag later restores the reviewed acquisition components and requires separate acceptance and approval.

Preview isolation remains a release blocker. The existing root APIs can write leads, send Resend email and forward to a default CRM webhook when effective Preview credentials are available. Excluding API source from the static output does not prove Vercel will exclude root API functions. The Next child process uses an environment allowlist, but the parent dependency installation and API runtime can inherit Preview variables. Removing acquisition links does not isolate those paths.

Before authorizing this fork deployment, an administrator must confirm branch-specific Preview isolation: empty/absent SUPABASE_URL and SUPABASE_ANON_KEY, empty/absent RESEND_API_KEY, and explicitly empty GHL_WEBHOOK_URL (an absent variable falls back to the existing default webhook). SALES_EMAIL is unnecessary for these static pages. Do not alter Production or other branches. If branch-scoped isolation cannot be established, request separate authorization for a narrow Preview-only API guard; this PR leaves existing APIs untouched. No environment values were inspected or changed. Deployment, payments and real lead testing remain outside this change.

The six existing funnel rewrites are project-level settings recorded in `seo/shared/data/funnel-routing-contract.json`; they are not overwritten by the five new file rewrites in `vercel.json`. Local acceptance exercises fixtures for those six mappings. Actual remote routing, backend function discovery, lead persistence, analytics ingestion and payments still require an authorized staging acceptance run. No vendor funnel consent is inferred from the SEO consent choice.

Rollback: after a future merge, revert the integration commit (or its merge commit using the appropriate parent). An equivalent source rollback restores `package.json`, `vercel.json` and `.gitignore` from the reviewed base commit `7286051ee492214def8bf35f98cef96d1ca6ccbb`, and removes only this integration's added `seo/` tree. Remove generated `.seo-dist/` and `.seo-dist.building/` before a baseline rebuild. Preserve all other workflows and website files. Redeployment is a separate authorized action. A temporary local rollback restored all 501 captured baseline source hashes; 498 source files, including existing API sources, had remained unchanged before rollback.

Confirmed local acceptance: project checks, typecheck, lint, 85 tests in the related PSEO project, four shared behavior tests runnable in this checkout, fresh public build/verification, a build relocated to a temporary source folder with no absolute Mac paths, removal of four injected obsolete output artifacts, and 51 browser checks covering five routes at 320/390/768/1440, metadata, navigation, consent, UTM encoding and persistence, origin referrer, deduplication, storage failure and GPC. Generated Next build IDs are not claimed bit-identical between builds.


## Staging review before release

Review the five content pages at desktop/mobile widths, canonical host, sitemap and footer links, pricing features, worksheet validation and working editorial anchors. Confirm no forms or signup/onboarding links exist, including the expanded mobile menu, and no acquisition attribution is stored even after analytics consent. Confirm branch-scoped Preview isolation before approving Vercel. Existing website regression, remote API discovery and deployment authorization are separate checks. Historical 51-browser and 85-related-project results above concern the earlier acquisition-enabled source; they do not validate this content-only revision. Google indexing, analytics ingestion and SEO results are not established by local checks.
