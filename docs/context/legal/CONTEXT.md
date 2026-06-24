# Legal Context

Read this document when changing signup, onboarding, locale behavior, legal pages, support/contact flows, moderation/legal handling, account deletion, public previews, retention, or vendor/compliance disclosures.

## Status

Legal/i18n is target v1 behavior, not fully implemented behavior yet. Remaining implementation, review, and launch-readiness tasks are tracked through GitHub Issues.

## Launch Posture

- MyTuums v1 is France/EU-first for legal policy and launch-readiness decisions.
- Users must confirm they are at least 15 years old; v1 does not implement parental-consent onboarding or birthdate collection.
- Signup is limited to the EU, EEA, UK, and Switzerland by self-declared country selection plus Terms acceptance.
- Logged-out public read access may remain worldwide.
- Public signup and media uploads stay disabled until the operating company exists, launch legal pages are complete, support/resend/staff launch conditions are met, and the documented launch-readiness gates are satisfied.

## Legal Documents And I18n

- Launch locales are `en`, `fr`, `de`, `es`, `it`, `nl`, `pt`, and `pl`.
- French is the authoritative legal version when the operator is France-based; other locales are convenience translations unless counsel requires otherwise.
- Legal pages use locale-specific routes such as `/fr/terms` and `/en/terms`.
- Acceptance records store document versions, acceptance timestamp, displayed locale, and signup country.
- Terms acceptance is contractual; Privacy and Cookies versions are notice evidence unless optional consent features are added later.
- Material Terms changes block normal app access until accepted.

## Content, Support, And Privacy Handling

- Public content may be viewed by logged-out users, indexed, shared, cached, or copied by third parties, and legal copy must describe that honestly.
- Users retain ownership of their content, while MyTuums receives the operating license needed to host, moderate, and organically promote public content.
- Paid promotion, third-party campaigns, and strongly spotlighted reuse require separate permission.
- Support, general legal notices, and IP/copyright complaints route through `/contact` and `support@mytuums.com`.
- Privacy and data-rights requests route through `/contact` using the `privacy_or_data` category and through `privacy@mytuums.com`.
- Contact submissions store minimal support/audit data, disallow attachments, and are retained for 180 days before deletion or anonymization.
- V1 has no cookie banner because only strictly necessary cookies are allowed at launch.

## Retention And Vendor Rules

- Routine security and rate-limit logs are retained for 12 months.
- Moderation cases, reports, and actions are retained for 3 years after closure or account deletion unless legal hold applies.
- Legal, IP, and privacy complaints are retained while the claim or dispute requires, then deleted or minimized.
- Production legal pages should disclose Azure, Resend, Sentry, and GitHub as relevant vendors or subprocessors.
- Primary production hosting should be in an EU Azure region.

## Companion References

- `docs/prd/legal-i18n-prd.md`
- `docs/prd/v1-scope.md`
- `docs/adr/0001-release-deleted-usernames-after-30-days.md`
