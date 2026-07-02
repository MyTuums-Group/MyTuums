# MyTuums Legal Readiness And Internationalization PRD

## Status

Legal/i18n work remains open. Implementation, review, and launch-readiness follow-up is tracked through GitHub Issues; this PRD defines the target behavior and launch gates.

## Problem Statement

MyTuums needs launch-ready legal, privacy, safety, retention, and internationalization foundations before public signup can be enabled. The product is moving from an English-only MVP assumption to a France-based, EU/EEA/UK/Switzerland signup launch with worldwide logged-out read access, public user-generated content, moderation, and localized legal pages.

The current product scope already includes Terms, Privacy, Cookies, support/contact, accessibility, reporting, moderation, account deletion, and public previews, but the legal operating rules need to be explicit enough to draft pages, build acceptance flows, localize the app, and keep public launch blocked until the operating company and legal pages are real.

## Solution

Build a legal readiness and i18n layer for MyTuums v1:

- Add localized product and legal copy for launch locales `en`, `fr`, `de`, `es`, `it`, `nl`, `pt`, and `pl`.
- Treat French as the authoritative legal-page version when the operating company is France-based, with other locales as convenience translations unless counsel requires otherwise.
- Limit launch signup to the EU, EEA, UK, and Switzerland by self-declared supported-country selection and Terms, while allowing worldwide logged-out read access.
- Require 15+ confirmation and exclude under-15 users because v1 does not implement parental-consent collection or age-document verification.
- Add launch-ready Terms, Privacy Policy, Cookies Policy, Legal Notice, Accessibility, and Support/content-rules pages.
- Store versioned legal acceptance and notice records.
- Keep public signup gated until the operating company exists, launch legal pages are complete, owner/staff launch conditions are met, Resend/support mailboxes are configured, and required legal contact details are available.
- Keep v1 free, ad-free, and without monetization.
- Provide clear GDPR, content, moderation, IP, legal notice, accessibility, retention, and law-enforcement handling rules.

## User Stories

1. As a prospective user in a supported country, I want signup eligibility to be clear, so that I know whether I may create a MyTuums account.
2. As a prospective user, I want to select my signup country, so that MyTuums can apply supported-region launch rules.
3. As a prospective user, I want to confirm I am at least 15, so that MyTuums can enforce its France/EU-first minimum-age rule.
4. As an under-15 visitor, I want the product to explain that I cannot use MyTuums, so that the age rule is clear.
5. As a user, I want the interface in a supported language, so that I can understand core product actions.
6. As a user, I want MyTuums to default to my browser language when supported, so that the app feels localized immediately.
7. As a user, I want to change my locale in settings, so that country and language remain separate choices.
8. As a multilingual user, I want legal pages available by locale-specific routes, so that I can open the version I understand.
9. As a French user, I want French legal pages available, so that the legal terms are understandable from a France-based operator.
10. As a user, I want to know when a translated legal page is not the authoritative legal version, so that I understand which version controls.
11. As a user, I want to accept Terms at signup, so that the service contract is explicit.
12. As a user, I want to be shown the Privacy Policy and Cookies Policy at signup, so that I understand how MyTuums handles data and cookies.
13. As a user, I want Privacy and Cookies policies treated as notices rather than blanket consent, so that consent is not misrepresented.
14. As a user, I want material Terms changes to require reacceptance, so that I am not bound to important changes without a clear prompt.
15. As a beta user, I want my beta account and content to survive public launch, so that my early activity is not lost.
16. As a beta user, I want updated launch Terms to be presented before normal access, so that I can decide whether to continue under the public launch rules.
17. As a beta user who refuses updated launch Terms, I want my content hidden from public surfaces, so that it is not published under terms I did not accept.
18. As a logged-out visitor, I want public profile, post, and game previews to remain readable worldwide, so that shared links work outside the signup region.
19. As a user, I want MyTuums to tell me that public pages may be indexed, cached, copied, or shared, so that public posting expectations are clear.
20. As a user, I want to know that deletion cannot guarantee removal from search caches or third-party copies, so that I understand the limits of public content removal.
21. As a content author, I want to retain ownership of my content, so that posting does not transfer my rights to MyTuums.
22. As MyTuums, I want a user-content license broad enough to operate, secure, moderate, improve, and promote the service, so that public content can be displayed and maintained.
23. As MyTuums, I want organic promotion rights for public posts, so that the official MyTuums channels can feature public content.
24. As a user, I want paid ads, third-party campaigns, press kits, or spotlighted promotion to require separate permission, so that broad promotional reuse is limited.
25. As a user, I want MyTuums-controlled organic promotional uses removed on best-effort request after deletion, so that deleted content is not intentionally promoted forever.
26. As MyTuums, I want the Terms to explain that already-shared, cached, screenshotted, embedded, or third-party redistributed copies cannot be guaranteed removed, so that removal limits are honest.
27. As a user, I want clear prohibited-content rules, so that I know what cannot be posted.
28. As a reporter, I want to report posts, comments, and profiles, so that unsafe or illegal content can be reviewed.
29. As a copyright or IP complainant, I want to submit a complaint through contact, so that MyTuums can evaluate takedown requests.
30. As support staff, I want copyright/IP complaints to include the protected work, target URL/content, complainant contact details, and a good-faith/legal declaration, so that requests are actionable.
31. As a user, I want support and legal notices routed through `support@mytuums.com`, so that there is one clear general contact path.
32. As a user, I want privacy requests routed to `privacy@mytuums.com`, so that data-rights requests have a dedicated contact.
33. As a user, I want to exercise GDPR rights through `/contact`, so that I can request access, deletion, correction, objection, restriction, or portability without a dashboard.
34. As privacy staff, I want identity verification before acting on sensitive privacy requests, so that account data is not disclosed to the wrong person.
35. As privacy staff, I want to limit privacy requests where legal, safety, moderation, abuse-prevention, or dispute retention applies, so that compliance does not erase required internal evidence.
36. As a user, I want a manual data export process in v1, so that I can obtain eligible personal data even without a privacy dashboard.
37. As MyTuums, I want exports to exclude internal security signals, staff notes, abuse tooling, other users' personal data, and legally restricted data, so that exports do not compromise safety or others' rights.
38. As a user deleting my account, I want email and username holds to be clear and equal at 7 days, so that reuse behavior is predictable.
39. As a future claimant, I want deleted usernames released after 7 days, so that the namespace is not permanently exhausted.
40. As a deleted user, I want public profile, posts, comments, follows, and like counts removed promptly, so that my public presence disappears.
41. As MyTuums, I want account-deleted internal data retained only in defined buckets, so that retention is easier to justify.
42. As MyTuums, I want routine security and rate-limit logs retained for 12 months, so that abuse and security investigations remain possible.
43. As MyTuums, I want moderation cases, reports, and actions retained for 3 years after closure or account deletion unless legal hold applies, so that safety history and disputes can be handled.
44. As MyTuums, I want legal, IP, and privacy complaints retained while needed for the claim or dispute, so that legal obligations can be met.
45. As a user, I want strictly necessary cookies only in v1, so that MyTuums does not need non-essential tracking consent.
46. As a user, I want the Cookies Policy to explain auth, security, and essential preference cookies, so that cookie use is transparent.
47. As a user, I want no marketing or newsletter emails in v1, so that email is limited to service, security, and support.
48. As a user, I want no third-party ads, sponsored posts, affiliate links, paid promotions, or ad product in v1, so that the service remains non-monetized.
49. As a user, I want no paid features, subscriptions, donations, creator monetization, billing, refunds, payouts, or payment flows in v1, so that consumer payment terms are not needed.
50. As a user, I want accessibility commitments to be honest, so that MyTuums aims for WCAG 2.2 AA core flows without overstating full compliance.
51. As an accessibility user, I want to report accessibility issues through contact or support email, so that problems can be addressed.
52. As a user, I want MyTuums to disclaim endorsement and accuracy of user content and external links, so that responsibility boundaries are clear.
53. As MyTuums, I want the Terms to reserve the right to remove content and suspend access, so that severe or repeated violations can be enforced.
54. As a suspended user, I want support/contact and account deletion to remain available, so that I can understand or leave the platform.
55. As an under-15 user discovered after signup, I want normal access blocked and public content hidden, so that the minimum-age rule is enforced.
56. As support staff, I want age disputes handled manually without collecting identity documents in v1, so that v1 avoids document-verification workflows.
57. As staff, I want to proactively action content encountered through reports, legal notices, staff discovery, or operational review, so that MyTuums can respond without claiming to monitor everything.
58. As MyTuums, I want no automated or routine pre-publication review obligation, so that v1 remains a reactive moderation system.
59. As staff, I want suspected illegal content immediately removable or restrictable, so that urgent harm can be reduced.
60. As staff, I want suspected illegal content evidence preservable under legal hold, so that legal or safety escalations can be handled.
61. As staff, I want illegal content escalated to owner/admin and authorities or hotlines where required or strongly appropriate, so that MyTuums can respond responsibly.
62. As MyTuums, I want law-enforcement requests to require valid legal process unless an emergency applies, so that disclosure is controlled.
63. As a user, I want notification of government data requests when legally allowed and safe, so that transparency is preserved where possible.
64. As MyTuums, I want legal disclosures internally audited, so that data-sharing decisions are accountable.
65. As a user, I want the Legal Notice to identify the operating company and host, so that the publisher and hosting information are visible.
66. As a launch owner, I want public signup blocked until the operating company exists, so that legal pages can name a real operator.
67. As a launch owner, I want closed beta to be possible before company creation, so that nominative controlled testing can happen before public launch.
68. As a launch owner, I want beta access to remain controlled and not become public signup, so that pre-company risk is limited.
69. As a launch owner, I want Microsoft Azure named as hosting/infrastructure provider, so that the Legal Notice and Privacy Policy match production deployment.
70. As a user, I want Azure, Resend, Sentry, and GitHub identified as production vendors or subprocessors where relevant, so that data processing is transparent.
71. As a user, I want primary production data hosted in an EU Azure region, so that EU-first hosting expectations are clear.
72. As a user, I want limited vendor transfers outside the EU/EEA described with safeguards, so that international transfer handling is transparent.
73. As a user, I want French law to govern the Terms by default while preserving mandatory local rights, so that the contract is clear without waiving non-waivable protections.
74. As a consumer user, I want mediation and dispute-resolution information present or launch-blocked until finalized, so that consumer-law notices are not invented.
75. As a launch owner, I want placeholders for company details and mediation treated as launch blockers, so that placeholder legal pages cannot go public.
76. As a developer, I want legal copy managed through the localization system, so that content is not hardcoded in components.
77. As a developer, I want legal documents versioned, so that acceptance records can point to exact Terms, Privacy, and Cookies versions.
78. As a developer, I want material-change rules centralized, so that access blocking happens consistently.
79. As a developer, I want signup-country and locale modeled separately, so that multilingual countries are handled correctly.
80. As a developer, I want region expansion to require legal review and additional notices, so that global growth does not silently expand legal scope.

## Implementation Decisions

- Build a Legal Policy module that exposes current legal document versions, supported locales, authoritative locale metadata, material-change rules, and launch readiness checks behind a small interface.
- Build a Legal Acceptance module that records Terms acceptance as contract acceptance and Privacy/Cookies versions as notice evidence. Records include document versions, timestamp, displayed locale, and self-declared signup country.
- Material Terms changes include user content license or marketing reuse changes, prohibited content or enforcement changes, account suspension or termination changes, paid-feature changes, governing law or dispute changes, age or eligibility changes, public visibility or indexing changes, and beta-to-public launch transition changes.
- Material Terms changes block normal app access until accepted. Privacy or Cookies changes notify users and block only when legally or product-wise necessary.
- Build an I18n module for product and legal copy with launch locales `en`, `fr`, `de`, `es`, `it`, `nl`, `pt`, and `pl`.
- Locale defaults from browser language when supported, can be changed in settings, and is separate from signup country.
- Legal pages use locale-specific routes such as `/fr/terms` and `/en/terms`.
- French is the authoritative legal-page version when the operator is France-based; other locale versions are convenience translations unless counsel requires otherwise.
- Add signup country selection for supported signup countries in the EU, EEA, UK, and Switzerland.
- Signup eligibility is self-declared by country selection and Terms, not hard IP geoblocking. Legal copy must avoid promising perfect territorial enforcement.
- Keep worldwide logged-out read access for public profile, post, and game previews.
- Broader signup expansion requires region-specific legal review and any required privacy or consumer notices.
- Replace 13+ launch assumptions with 15+ minimum-age confirmation. V1 does not collect birthdates, parental consent, or identity documents for age verification.
- Confirmed under-15 users are suspended indefinitely with public reason `underage`, normal app access blocked, public content hidden, support/contact and account deletion still available, and reinstatement handled manually.
- Add `/legal-notice` to static routes and public allowlists.
- Legal Notice identifies operating company, legal form, registration number, registered office, publication director, hosting/provider information, and legal contact details once the company exists.
- Launch-ready Terms, Privacy, Cookies, Legal Notice, Accessibility, and Support/content-rules pages are required before public signup.
- Placeholder company and mediation details are allowed only in drafts and must block public launch.
- The future operating company is the sole GDPR controller for account, profile, user content, moderation, support, and operational log data.
- Production legal pages list Microsoft Azure as host/infrastructure provider and Azure, Resend, Sentry, and GitHub as relevant vendors or subprocessors. Local-only tools are not production vendors.
- Primary production data hosting should be in an EU Azure region.
- Limited vendor processing or transfers outside the EU/EEA may occur only with appropriate safeguards such as adequacy decisions, SCCs, or equivalent mechanisms where required.
- GDPR lawful bases are split by purpose: contract for core account and social-platform service delivery; legitimate interest for safety, moderation, abuse prevention, security logs, rate limits, fraud prevention, and service integrity; legal obligation for required compliance handling; consent only for optional marketing or non-essential cookies.
- V1 uses strictly necessary cookies only, such as authentication/session, security, and essential preference cookies. No cookie consent banner is required unless non-essential analytics, advertising, or tracking cookies are added later.
- V1 sends only service, security, and support emails. Marketing or newsletter email is out of scope unless later added with opt-in consent, unsubscribe support, and consent records.
- `privacy@mytuums.com` is the privacy contact. V1 does not claim to have a DPO unless one is formally appointed later.
- `support@mytuums.com` handles general support, moderation questions, account access, copyright/IP complaints, and general legal notices.
- Copyright/IP complaints are handled through `/contact` in v1 rather than a separate portal. The flow must capture protected work, allegedly infringing MyTuums URL or content, complainant contact details, and a good-faith/legal declaration.
- GDPR and privacy-rights requests are handled through `/contact` with category `privacy_or_data`.
- MyTuums may verify requester identity before acting on privacy requests.
- Manual data exports in v1 may include account/profile data, user-authored posts/comments, basic social graph data, and relevant moderation/account-status data where disclosure is allowed. Exports exclude internal security signals, staff notes, abuse tooling, other users' personal data, and data restricted for legal or safety reasons.
- Account deletion holds deleted email and username for 7 days, then releases them for reuse.
- Account deletion removes public social edges and visibility synchronously, while blob cleanup remains scheduled.
- Account-deleted internal rows are retained only under defined retention buckets, with direct PII minimized after the 7-day hold window.
- Contact submissions are retained for 180 days before deletion or anonymization.
- Routine security and rate-limit logs are retained for 12 months.
- Moderation cases, reports, and actions are retained for 3 years after case closure or account deletion unless a legal hold applies.
- Legal, IP, and privacy complaints are retained while needed for the claim or dispute, then deleted or minimized.
- User content remains owned by the user.
- Posting grants MyTuums a non-exclusive license broad enough to operate the service and reuse public user content for organic MyTuums-owned promotion.
- Paid advertising, third-party campaigns, press kits, or promotional uses that strongly spotlight one user require separate permission.
- When a user deletes content or an account, MyTuums makes best-effort removals from MyTuums-controlled organic promotional surfaces after request, but cannot guarantee removal from already-shared, cached, embedded, screenshotted, or third-party redistributed copies.
- Public profile, post, and game preview pages may be indexable by search engines. Legal copy must explain that public content can be viewed by logged-out visitors, indexed, shared, cached, or copied by others.
- V1 Terms prohibit at least sexual or exploitative content involving minors, non-consensual intimate content, doxxing or private personal data exposure, threats, targeted harassment, hate or dehumanizing abuse, instructions or facilitation for serious harm or illegal acts, malware, phishing, scams, spam, IP-infringing content, impersonation, and graphic violence or sexual content deemed inappropriate for MyTuums v1.
- V1 has no automated or routine pre-publication review and MyTuums does not undertake to monitor all content.
- Staff may proactively remove content or suspend accounts they encounter through reports, legal notices, staff discovery, or operational review.
- Users may contact support if they believe a moderation or suspension action was mistaken. V1 has no formal appeal workflow, and support contact does not automatically pause, reverse, or stay enforcement.
- Terms may reserve MyTuums' right to terminate access for severe or repeated violations, but v1 implements staff account enforcement as suspension rather than staff-initiated hard deletion.
- When staff believe content is illegal rather than only Terms-violating, MyTuums may remove or restrict it immediately, preserve necessary evidence under legal hold, escalate internally to owner/admin, and report to competent authorities or hotlines where legally required or strongly appropriate.
- Law-enforcement or government data requests require valid legal process unless an emergency/safety exception applies. MyTuums reviews requests before disclosure, discloses only what is legally required or necessary, audits disclosures internally, and notifies affected users only when legally allowed and safe.
- Terms use French law as default governing law because the operating company is expected to be France-based, while preserving users' non-waivable mandatory rights under applicable local consumer, privacy, and platform laws.
- Terms or Legal Notice reserves a section for French/EU consumer mediation and dispute-resolution information, finalized with counsel before public launch.
- V1 is free to use and has no paid features, subscriptions, donations, ads, creator monetization, billing, refunds, payouts, or payment-provider flows.
- V1 has no third-party ads, sponsored posts, affiliate links, paid promotions, or advertising product.
- `/accessibility` states that MyTuums aims to follow WCAG 2.2 AA for core user flows, uses automated and manual checks, and accepts accessibility reports through `/contact` or `support@mytuums.com`, without claiming full compliance unless verified.

## Testing Decisions

- Tests should focus on externally observable behavior: eligibility gates, locale routing, acceptance blocking, public visibility, deletion retention dates, contact categories, and launch readiness outcomes.
- Legal Acceptance tests should cover first signup acceptance, beta-to-launch reacceptance, refusal blocking, material Terms changes, non-material policy updates, and locale/version recording.
- Signup Eligibility tests should cover 15+ confirmation, supported-country selection, unsupported-country rejection, and the separation of locale from country.
- Account Status tests should cover under-15 indefinite suspension behavior, suspended-user allowed actions, and unchanged account deletion availability.
- Account Deletion tests should cover 7-day username/email hold windows, public visibility removal, social-edge removal, and internal ID preservation after username reuse.
- I18n tests should cover browser-language defaulting, settings override, unsupported-language fallback, locale-specific legal routes, and legal footer links.
- Static Route tests should cover logged-out access to localized legal, support, contact, accessibility, about, profile preview, post preview, and game preview routes while feed browsing remains blocked.
- Contact Submission tests should cover `privacy_or_data`, copyright/IP complaint payload requirements, support routing, rate limits, and retention metadata.
- Moderation tests should cover prohibited-content categories, underage suspension, proactive staff action, illegal-content legal hold, and user-facing support path.
- Privacy Export tests should cover manual export scope and exclusion of staff notes, other users' data, and internal security signals.
- Cookie tests should verify strictly necessary cookie documentation and absence of non-essential tracking consent flows in v1.
- Launch Readiness tests should verify public signup remains disabled until owner bootstrap, at least one additional moderator/admin, Resend sender/domain setup, support mailbox routing, operating company details, and launch-ready legal pages are all configured.
- Accessibility tests should continue using axe smoke checks plus manual keyboard/focus review for complex flows, while avoiding tests that assert impossible full-compliance claims.
- Prior art exists in account-status tests for centralized account lifecycle decisions and should be extended for hold windows, suspension permissions, and deletion behavior.
- Prior art exists in route guards, contact categories, moderation reasons, and shared constants; tests should exercise those seams rather than duplicating UI implementation details.

## Out of Scope

- Drafting lawyer-approved final legal advice. All legal copy remains a product/legal draft until reviewed by counsel.
- Hard IP geoblocking for signup.
- Signup outside the EU, EEA, UK, and Switzerland.
- Parental-consent collection or verification.
- Birthdate collection.
- Identity-document collection for age verification.
- A formal appeal workflow.
- A privacy dashboard or self-serve data export dashboard.
- Non-essential analytics cookies, advertising cookies, tracking pixels, session replay, behavioral analytics, or marketing attribution.
- Marketing/newsletter emails.
- Paid features, subscriptions, donations, creator monetization, billing, refunds, payouts, tax handling, or payment-provider integrations.
- Third-party ads, sponsored posts, affiliate links, or paid promotions.
- Media upload support, automated media scanning, malware scanning, CSAM scanning, nudity scanning, or pre-publication review.
- Separate legal mailbox in v1; legal/IP uses support.
- Separate copyright portal in v1.
- DPO appointment unless the company formally appoints one later.
- Full localization into every official language or country-locale variant across the supported region.
- Full native mobile parity, PWA/offline/push notifications, or app-store legal materials beyond the targeted Flutter Android/iOS MVP.

## Further Notes

- Public signup must remain disabled until launch legal readiness is complete.
- Company details, publication director, registration number, registered office, host disclosure, and mediation details cannot remain placeholders at public launch.
- French legal pages are authoritative if the operating company is France-based; translations should clearly describe their status.
- This PRD updates the earlier English-only assumption: v1 now includes i18n for the selected launch locales.
- ADR 0001 now governs 7-day deleted username and email release.
- Media upload legal readiness remains part of the v1 launch gate because public media upload is in v1 scope.
- This PRD is an implementation/product readiness document, not legal advice.
