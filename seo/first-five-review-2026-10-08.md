# First five guides — proposed keyword/content map

Prepared 2026-10-08 for user review in an isolated Preview. This map is proposed, not approved by the user. Existing URLs are retained. Main baseline: `d5b067a841101a2ebef9eccf9bfe3ec42783647e`. No Home/Services rewrite or additional landing is included; PR46's second batch is separate.

The keyword figures below were supplied in the task as Semrush US observations dated 2026-10-08. They were not independently retrieved in this work and are not traffic forecasts. A dash means no KD supplied.

| Existing path under `/ai-answering-service/` | Proposed primary query | Supplied monthly volume / KD | Page role and H1 |
| --- | --- | --- | --- |
| `after-hours` | after hours answering service | 2,400 / 11 | Commercial service guide: **After-Hours Answering Service for Home Service Businesses** |
| `missed-calls` | how to stop missing business calls | 90 / 4 | Practical home service guide: **How to Stop Missing Business Calls** |
| `compare/ai-vs-voicemail` | ai receptionist vs voicemail | 10 / — | Supporting comparison: **AI Receptionist vs Voicemail for Home Service Businesses** |
| `compare/ai-vs-live-receptionist` | ai receptionist vs human receptionist | 90 / — | Commercial comparison: **AI Receptionist vs Human Receptionist for Home Services** |
| `cost-of-missed-calls` | cost of missed calls; missed call calculator | 10; 20 / — | Supporting tool: **Cost of Missed Calls: A Potential Revenue Calculator** |

The calculator title deliberately qualifies the result. The existing formula is inquiry count × assumed booking probability ÷ 100 × assumed gross job value. It cannot establish an actual cost, lost revenue, savings, profit or ROI. All four inputs start blank; the period is explicit, and there is no annualization or recurrence assumption. The 40 × 25% × $200 example is labeled illustrative and never prefilled.

## Content sources and limits

- Repository `services.html`, read 2026-10-08: 24/7 answering, scheduling/booking, routing/escalation and follow-up descriptions.
- Repository `pricing.html`, read 2026-10-08, and `seo/shared/lib/official-pricing.ts` (its snapshot is dated 2026-10-06): appointments, own script/hours/rules, SMS follow-up and call dashboard summaries; team transfers in Crew/Fleet, excluded from Solo.
- Public source links remain [Services](https://www.revoapp.ai/services.html) and [Pricing](https://www.revoapp.ai/pricing.html). Current offer/eligibility and duration must be checked there. No official pricing values or conditions are changed.
- SMS follow-up does not establish automatic missed-call text-back. Appointment booking does not establish immediate dispatch or completed work. Examples are illustrative operating scenarios, not customer evidence.
- Low-volume comparisons/tools support the user journey; no organic-traffic promise is made. Specific guide intent is retained instead of assigning the generic AI receptionist query to every page.
- Home → AI receptionist and Services → AI answering service are a separate ownership proposal, not implemented here. `/ai-answering-service` can be a guide index; it is not made into a new pillar landing in this change.

## Navigation change

Home/Pricing headers and every original public source file stay untouched. The build stops injecting Call planning into the original Home footer, and verification requires original public output files to match their sources (except the sitemap additions). Guide headers retain Services, an Industry disclosure with the same 16 destinations/icons as the original mega menu, and Pricing. With acquisition disabled they show no replacement guide/worksheet header CTAs and no acquisition CTAs. Guide links remain in body-related links and the existing generated index behavior. The guide footer no longer adds a Call planning menu.

The Industry control is a native accessible disclosure rather than a copy of the original site's hover JavaScript. Its visual layout and destinations are reviewed on the isolated Preview. Original site navigation behavior is not changed.

## Publication boundary

The new immutable update batch is `2026-10-08-first-five-rewrite`; log and exact content hashes record editorial review for the Preview. Mutually related records are approved atomically to avoid an invalid intermediate state. This does not approve the keyword map on the user's behalf and does not authorize merge/Production. User review and Juan's merge remain separate steps.
