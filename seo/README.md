# SEO/AEO guides: publication workflow

The `/ai-answering-service/...` guides are static pages built into the existing site. The build exports every approved page with Next.js (`output: 'export'`), copies the original website unchanged into `.seo-dist`, and adds only the guides, their routes and sitemap URLs; the original homepage and its navigation are preserved byte-for-byte. No server, form or lead capture is added. `acquisitionEnabled: false` in `seo/app/site.config.json` keeps the guides content-only: no signup, free-test or App Store links, and no form.

## Daily runbook

Each batch is one branch and one pull request. Merging and publishing stay with a maintainer.

1. **Branch from main.** The branch name must start with `seo/`, for example `seo/2026-10-09-weekend-guides`. Vercel deploys `seo/` branches into the isolated `seo-review` environment.
2. **Bring in reviewed content.**
   - From the generator: `npm run seo -- import <export.json> --batch-id 2026-10-09-name --source-ref "<where it came from>"`. This writes `seo/shared/data/batches/<batchId>.json`.
   - By hand: write that batch file yourself, with `add`, `update` and `withdraw` operations.
   - Then `npm run seo -- apply seo/shared/data/batches/<batchId>.json`. Added and changed pages become **drafts**. Applying the same batch again changes nothing.
3. **Editorial review and approval, on the branch.** Editors read the drafts in the batch file or the registry diff. For each page they accept, run `npm run seo -- approve <slug> --reviewer "<name>"`. Approval records the reviewer, the date and the hash of the exact content. Any later edit makes the page fail validation until it is approved again. Drafts never appear on any build. Approved pages appear on this branch's Preview for a final visual check, and reach production only when a maintainer merges.
4. **Routes.** Run `npm run seo:routes`. It regenerates the guide rewrites in `vercel.json` from the approved pages and keeps every other route. No guide navigation is injected into Home. Commit everything.
5. **Pull request into main.** Two checks must pass:
   - The required `seo-ci` check: validate, route check, build, tests, verify and the fixture end-to-end run.
   - The Vercel Preview, built in `seo-review`.
6. **Preview review.** Open the Preview, logged in to Vercel. Check the new pages on desktop and mobile with GET only: never submit a form there.
7. **Maintainer merges.** Use a merge commit. Vercel builds production from main with Production variables.
8. **Verify production.** Check the new URLs, sitemap, homepage, Pricing, Services and funnels on www.revoapp.ai. Then record the release with `npm run seo -- record-release --sha <merge sha> --deployment <dpl_...> --batch <batchId>` in a follow-up commit.

The Vercel build itself runs, in order, and stops on the first failure:

1. Isolation probe
2. `npm ci`
3. Registry validation
4. Route check
5. Static build
6. Tests
7. Verification

## The contract

The registry is `seo/shared/data/landing-pages.json`. It is the only source the build publishes from, and `seo/shared/lib/registry-contract.mjs` defines the contract.

- **Required fields:** `slug`, `title` (10–62 characters, published as "<title> | Revo"), `description` (50–160), `navigationLabel`, `eyebrow`, `lead`, `intro`, `sections`, `faqs`, `takeaway`, `pricingVariant`, `sourcePaths` (where the content came from) and `publicationStatus`.
- **Statuses:**
  - `draft` is never public.
  - `approved` is public. It needs `source` and `review { reviewer, reviewedAt, contentHash }` that matches the content.
  - `withdrawn` is removed from the output and needs `withdrawal { reason, at }`. The record stays for history.
- **Uniqueness:** slugs are unique. Titles, descriptions and navigation labels are unique among pages that are not withdrawn.
- **Assets:** every image the record names (`image`, or a site path inside its text) must exist in the site.
- **Related links:** each page shows at most 4 related guides, from its own `related` list or the nearest approved pages.
- **Original navigation:** Home and Pricing are copied unchanged. Guides retain Services, the original Industry destinations and Pricing, without acquisition buttons when disabled. Related links stay in guide bodies; the guide index is exported when the catalog outgrows `navigationLimit`, 6 by default.
- **Records:** `seo/shared/data/batches/` holds the applied batches. `batch-log.json` holds the applied batch ids and their hashes. `releases.json` maps each published commit to its deployment.

The generator, including any Supabase table it uses, is **not connected** and has no schedule here. `seo/shared/data/generator-mapping.json` names which export column feeds which field, and starts as an identity mapping. Confirm it against a real export before the first import. Imports never carry an approval.

## Previews and isolation

- **Branch routing.** Branches starting with `seo/` deploy into the Vercel custom environment `seo-review`. Its only variables are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY` and `GHL_WEBHOOK_URL`, all set to empty strings. `GHL_WEBHOOK_URL` must stay explicitly empty, because when it is absent the API falls back to its default webhook.
- **Isolation probe.** It prints `set`, `empty` or `unset` for each of those variables at the start of every build, never a value. A `seo-review` build with one of them set fails.
- **Fork pull requests** keep Vercel's fork protection: a maintainer authorizes them, or copies the commits to an internal `seo/` branch.
- **Not isolated by variables:** the dashboard rule that rewrites `/api/leads` to the external funnel app (`revo-free-account.vercel.app`). Project-level rules run before the deployment's routes on every host, Previews included. Previews are behind Vercel Authentication and the guides contain no form. Still, never POST to `/api/leads` on a Preview. Restricting that rule to the production hosts is a separate decision for the owner of the funnel app.

## Checks

- `npm run seo:validate`: the registry contract.
- `npm run seo:routes:check`: whether `vercel.json` matches the approved pages. CI fails on drift, because Vercel reads routes from the committed file.
- `npm run seo:test`: unit and rendering tests.
- `npm run seo:verify`: checks a built `.seo-dist` by invariant:
  - output hashes, and original images unchanged;
  - canonical and indexability;
  - the sitemap equals the approved set, and original public files (except the sitemap) remain byte-identical;
  - drafts and withdrawn pages are absent;
  - every internal link and anchor resolves;
  - related links are capped;
  - none of the 10 dashboard rules (`seo/shared/data/funnel-routing-contract.json`) shadows a route or file.
- `npm run seo:fixtures`: runs the whole workflow in a throwaway copy of the site. It covers a sixth approved page, a draft that stays out, the index appearing on growth while the original homepage is preserved, and a withdrawal that cleans the output. Fixtures live in `seo/shared/fixtures` and are never published.

`.github/workflows/seo-ci.yml` runs these on every pull request into main. It uses `pull_request` (not `pull_request_target`), a read-only token and no secrets. Branch protection on main requires the `seo-ci` check.

## Rollback

In Vercel, use **Instant Rollback** to the previous production deployment. The release log in `releases.json` lists deployments by commit. Then revert the merge on main (`git revert -m 1 <merge sha>`) and let main build again.

After an Instant Rollback, Vercel stops assigning production domains to new deployments until the rollback is undone. Check that the next merge reaches www.revoapp.ai, and promote it if it does not.

The first release (#44, commit `ccaf022`, deployment `dpl_9afD8wBeKWWZXN47DRL4vptu3miY`) replaced `dpl_8LoNEotLoTmH6j7chCGr5DLarfos` (commit `0df203c`).
