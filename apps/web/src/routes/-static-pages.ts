export const STATIC_PAGE_SLUGS = [
  "terms",
  "privacy",
  "cookies",
  "legal-notice",
  "accessibility",
  "support",
  "contact",
  "about",
] as const;

export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];

export type StaticPage = {
  slug: StaticPageSlug;
  title: string;
  eyebrow: string;
  summary: string;
  updatedAt: string;
  sections: StaticPageSection[];
};

export type StaticPageSection = {
  heading: string;
  paragraphs: string[];
};

export const STATIC_PAGE_PATHS = STATIC_PAGE_SLUGS.map((slug) => `/${slug}`);

export const FOOTER_STATIC_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/legal-notice", label: "Legal notice" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
] as const satisfies readonly { href: `/${StaticPageSlug}`; label: string }[];

const UPDATED_AT = "May 15, 2026";

const STATIC_PAGES: Record<StaticPageSlug, StaticPage> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    eyebrow: "Legal",
    updatedAt: UPDATED_AT,
    summary:
      "These Terms explain who may use MyTuums, what people can post, how public gaming content works, and how MyTuums may moderate the service.",
    sections: [
      {
        heading: "Who may use MyTuums",
        paragraphs: [
          "MyTuums is a focused social space for gaming conversation. You may create and use an account only if you are at least 15 years old and allowed to use online services under the laws that apply to you. Public signup is limited to supported European launch countries, while logged-out public profile and post pages may be viewed more broadly.",
          "You are responsible for keeping your account details accurate and secure. You must not share your password, impersonate another person, create accounts to evade moderation, or use automated access in a way that harms the service or other users.",
        ],
      },
      {
        heading: "Your content and public visibility",
        paragraphs: [
          "You keep ownership of the text, images, videos, profile details, and other content you submit. By posting public content, you give MyTuums a non-exclusive license to host, store, display, moderate, secure, back up, and operate that content as part of the service.",
          "MyTuums may also feature public posts through MyTuums-owned organic channels, such as product surfaces or official social posts. Paid advertising, third-party campaigns, press kits, or promotion that strongly spotlights one user requires separate permission.",
          "Public content can be viewed by logged-out visitors, indexed by search engines, cached, copied, screenshotted, embedded, or shared outside MyTuums. Deleting content removes it from MyTuums-controlled public surfaces, but MyTuums cannot guarantee removal from copies already made by others.",
        ],
      },
      {
        heading: "Community rules",
        paragraphs: [
          "Do not post sexual or exploitative content involving minors, non-consensual intimate content, doxxing, threats, targeted harassment, hate or dehumanizing abuse, instructions for serious harm, malware, phishing, scams, spam, impersonation, or content that infringes another person's rights.",
          "Gaming clips, screenshots, links, jokes, and opinions are welcome when they remain lawful and respectful of other people. MyTuums does not undertake to pre-review every post, but staff may act on reports, legal notices, operational review, or content they otherwise encounter.",
        ],
      },
      {
        heading: "Moderation and account limits",
        paragraphs: [
          "MyTuums may remove content, restrict visibility, suspend accounts, preserve evidence where required, or contact authorities or hotlines where illegal content or urgent safety risk is involved. Staff decisions are based on the available information and may be corrected when new information is reviewed.",
          "Suspended users may still use support and account-deletion paths where available. A support message does not automatically pause, reverse, or stay enforcement, but it gives MyTuums a route to review mistakes or safety-sensitive context.",
        ],
      },
      {
        heading: "Service changes and law",
        paragraphs: [
          "MyTuums is provided free of charge in v1. There are no paid features, subscriptions, donations, creator monetization, ads, sponsored posts, affiliate links, billing, refunds, or payout flows.",
          "These Terms are governed by French law, while preserving any mandatory rights that apply to you as a consumer or platform user. If a dispute arises, contact support first so MyTuums can try to resolve it directly.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Privacy",
    updatedAt: UPDATED_AT,
    summary:
      "This Privacy Policy explains what MyTuums collects, why it is used, how long it is kept, and which providers help operate the service.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "MyTuums collects account details such as email address, password authentication data handled through Better Auth, age confirmation, username, profile details, posts, comments, follows, likes, reports, moderation history, and support/contact messages that you choose to submit.",
          "The service also processes technical data needed to run safely, such as session cookies, IP-derived abuse signals, device or browser user agent, server logs, rate-limit records, upload metadata, and error information. MyTuums does not run a general analytics pipeline in v1.",
        ],
      },
      {
        heading: "Why we use data",
        paragraphs: [
          "Core account, profile, posting, comment, media, and support features are processed to provide the service contract. Safety, moderation, security logs, rate limits, fraud prevention, and service integrity are processed under legitimate interests. Legal requests and required compliance handling are processed where MyTuums has a legal obligation.",
          "Marketing email, advertising cookies, sponsored-post targeting, behavioral analytics, session replay, and payment processing are not part of v1. If optional features that require consent are added later, MyTuums will ask for that consent separately.",
        ],
      },
      {
        heading: "Providers and hosting",
        paragraphs: [
          "Production infrastructure is expected to run primarily in an EU Azure region. Microsoft Azure hosts the web, API, PostgreSQL database, and Blob Storage used for uploaded media and game covers.",
          "Resend provides transactional email delivery for account, verification, reset, and contact flows. Sentry provides frontend and backend error monitoring with environment and release tags, PII scrubbing, and no session replay. GitHub provides repository, CI/CD, deployment, and scheduled maintenance workflow services.",
          "Providers may process limited data outside the EU or EEA only with appropriate transfer safeguards such as adequacy decisions, standard contractual clauses, or equivalent protections where required.",
        ],
      },
      {
        heading: "Retention",
        paragraphs: [
          "Contact submissions are retained for 180 days before deletion or anonymization unless a legal claim or safety dispute requires longer retention. Routine security and rate-limit logs are retained for 12 months.",
          "Moderation cases, reports, and staff actions are retained for 3 years after closure or account deletion unless legal hold applies. Deleted usernames and emails are held for 7 days before reuse. Account-deleted public content is hidden promptly, while media cleanup runs through scheduled maintenance.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on where you live, you may request access, correction, deletion, restriction, portability, objection, or withdrawal of consent where consent applies. Use /contact with the privacy_or_data category or email privacy@mytuums.com.",
          "MyTuums may verify your identity before acting on sensitive requests and may limit requests where safety, moderation, abuse prevention, legal obligation, dispute handling, or another person's rights require continued retention.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    eyebrow: "Privacy",
    updatedAt: UPDATED_AT,
    summary:
      "MyTuums v1 uses only strictly necessary cookies and similar storage needed for login, security, preferences, and service operation.",
    sections: [
      {
        heading: "Strictly necessary cookies",
        paragraphs: [
          "MyTuums uses authentication and session cookies so you can log in, stay signed in, verify email flows, and make credentialed requests to the API. These cookies are necessary for account security and cannot be switched off inside the service.",
          "Security and rate-limit protections may use cookies, request metadata, or server-side records to detect repeated abuse, protect account flows, and keep public support/contact paths usable.",
        ],
      },
      {
        heading: "Preference storage",
        paragraphs: [
          "The web app may store essential preferences such as theme choice or interface state so the product remains usable across visits. Preference storage is limited to product operation and is not used for advertising.",
          "MyTuums does not use marketing cookies, behavioral advertising cookies, affiliate tracking cookies, cross-site ad pixels, session replay, or non-essential analytics cookies in v1.",
        ],
      },
      {
        heading: "Why there is no banner",
        paragraphs: [
          "Because v1 is limited to strictly necessary cookies and essential preference storage, MyTuums does not show a cookie consent banner at launch. If non-essential analytics, advertising, or tracking cookies are added later, MyTuums will update this policy and request consent where required.",
          "Blocking all cookies in your browser may prevent login, email verification, account protection, posting, support submission, and other core features from working correctly.",
        ],
      },
    ],
  },
  "legal-notice": {
    slug: "legal-notice",
    title: "Legal Notice",
    eyebrow: "Legal",
    updatedAt: UPDATED_AT,
    summary:
      "This notice identifies the MyTuums publication, hosting, and contact channels used for legal and operational notices.",
    sections: [
      {
        heading: "Publisher",
        paragraphs: [
          "MyTuums is the publication name for the MyTuums gaming social platform. Public signup remains disabled until the operating company, legal form, registration number, registered office, publication director, and required consumer-mediation details are finalized for launch.",
          "Until those company details are finalized, MyTuums may operate only controlled development or beta access. This notice will be updated before public signup is opened so users can identify the legal operator clearly.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Production hosting is planned on Microsoft Azure, including Azure Static Web Apps for the web client, Azure App Service for the API, Azure Database for PostgreSQL Flexible Server, and Azure Blob Storage for media and game-cover storage.",
          "The primary production region should be in the European Union. Runtime logs are written by the API to stdout and stderr for collection by Azure App Service infrastructure.",
        ],
      },
      {
        heading: "Legal contact",
        paragraphs: [
          "General support, copyright or IP complaints, moderation questions, and legal notices may be sent through /contact or support@mytuums.com. Privacy and data-rights requests may be sent through /contact with the privacy_or_data category or privacy@mytuums.com.",
          "Copyright and IP complaints should include the protected work, the MyTuums URL or content at issue, complainant contact details, and a good-faith statement that the report is accurate and authorized.",
        ],
      },
    ],
  },
  accessibility: {
    slug: "accessibility",
    title: "Accessibility Statement",
    eyebrow: "Accessibility",
    updatedAt: UPDATED_AT,
    summary:
      "MyTuums aims to make the core web experience usable by keyboard, screen reader, and assistive technology users.",
    sections: [
      {
        heading: "Commitment",
        paragraphs: [
          "MyTuums aims to follow WCAG 2.2 AA for core user flows where practical. The interface is built with semantic HTML, visible focus states, labeled form controls, accessible names for icon buttons, and component primitives designed for keyboard operation.",
          "The product avoids claiming full compliance until the relevant flows have been manually and automatically verified. Complex account, moderation, media, and support flows still require keyboard and assistive-technology review as the product matures.",
        ],
      },
      {
        heading: "Current support",
        paragraphs: [
          "Core navigation, authentication, static legal pages, public profile and post previews, forms, dialogs, menus, and sheets are expected to be keyboard accessible. Media uses native browser controls where possible, and image labels are provided based on context.",
          "CI includes accessibility smoke checks for representative unauthenticated and authenticated routes. Automated checks do not catch every issue, so manual testing remains part of release readiness.",
        ],
      },
      {
        heading: "Report a barrier",
        paragraphs: [
          "If you encounter an accessibility barrier, use /contact with the general_support category or email support@mytuums.com. Include the page, browser, assistive technology if relevant, what you expected to happen, and what blocked you.",
          "MyTuums prioritizes issues that block account access, safety, legal notices, privacy requests, posting, reporting, or support submission.",
        ],
      },
    ],
  },
  support: {
    slug: "support",
    title: "Support",
    eyebrow: "Help",
    updatedAt: UPDATED_AT,
    summary:
      "Support explains how to get help with account access, moderation, privacy, bugs, copyright/IP complaints, and safety concerns.",
    sections: [
      {
        heading: "How to contact us",
        paragraphs: [
          "Use /contact for account access, moderation or safety questions, privacy or data requests, bug reports, general support, copyright/IP complaints, and other requests. General support and legal notices may also be sent to support@mytuums.com.",
          "Privacy and data-rights requests can use the privacy_or_data category or privacy@mytuums.com. MyTuums may need to verify your identity before disclosing or changing account data.",
        ],
      },
      {
        heading: "Safety and moderation",
        paragraphs: [
          "Report posts, comments, or profiles that appear unsafe, illegal, abusive, harassing, impersonating someone, infringing rights, or otherwise violating the Terms. Staff may remove content, suspend accounts, preserve evidence, or escalate urgent illegal content where required.",
          "If you believe a moderation or suspension action was mistaken, contact support with the account email or username, the affected content URL if available, and a concise explanation. Support review does not automatically pause enforcement.",
        ],
      },
      {
        heading: "Account and technical help",
        paragraphs: [
          "For login, verification, password reset, and account access problems, include the email address on the account and the step that failed. Do not send passwords, verification codes, or private authentication tokens.",
          "For bugs, include the page, browser, device type, what you tried, what happened, and whether the issue repeats. Attachments are not accepted in the v1 contact form, so describe the issue in the message body.",
        ],
      },
    ],
  },
  contact: {
    slug: "contact",
    title: "Contact MyTuums",
    eyebrow: "Support",
    updatedAt: UPDATED_AT,
    summary:
      "The contact form is the public route for support, moderation, privacy, bug, legal, and general messages to MyTuums.",
    sections: [
      {
        heading: "When to use contact",
        paragraphs: [
          "Use the contact form for account access, moderation or safety, privacy or data requests, bug reports, general support, copyright/IP complaints, and other requests. Logged-out users must provide an email address so MyTuums can respond.",
          "Logged-in users can submit without adding an email address because the request is linked to their userId. Adding a reply email can still help when your account email is inaccessible.",
        ],
      },
      {
        heading: "What we store",
        paragraphs: [
          "Contact submissions store the selected category, message, optional email, linked userId when available, minimal request metadata for abuse prevention, and email delivery status. Messages are retained for 180 days before deletion or anonymization unless a legal claim, privacy request, or safety dispute requires longer handling.",
          "The form accepts text only. Do not include passwords, payment information, government identity documents, private authentication tokens, or sensitive data that is not needed for the request.",
        ],
      },
      {
        heading: "Response expectations",
        paragraphs: [
          "Contact submissions are not support tickets and do not create a user-facing ticket status. MyTuums reviews messages through internal support processes and may prioritize safety, privacy, account access, and legal issues.",
          "For urgent danger or emergency services, contact local emergency services first. MyTuums support is not an emergency response channel.",
        ],
      },
    ],
  },
  about: {
    slug: "about",
    title: "About MyTuums",
    eyebrow: "Company",
    updatedAt: UPDATED_AT,
    summary:
      "MyTuums is a focused social platform for gamers who want readable posts, public profiles, and lightweight discovery without a noisy content firehose.",
    sections: [
      {
        heading: "What MyTuums is",
        paragraphs: [
          "MyTuums is built for short gaming posts, clips, screenshots, profiles, comments, likes, follows, and game-tagged discovery. The v1 product favors chronological feeds, clear identity, and public gaming conversation over recommendation-heavy or creator-monetization systems.",
          "The platform is web-first and free to use in v1. Messaging, live streaming, subscriptions, advertising, payments, native mobile apps, and algorithmic creator analytics are outside the first release.",
        ],
      },
      {
        heading: "How the product works",
        paragraphs: [
          "Users create an account, verify email, choose a handle-first profile, post short gaming content, optionally attach one image or video, tag a game where relevant, and browse public posts through home, discover, profile, and post routes.",
          "Logged-out visitors can view allowed public profile and post previews. Account features such as posting, commenting, liking, following, reporting, and uploading require a verified, active account and the launch gates described in the legal pages.",
        ],
      },
      {
        heading: "Launch posture",
        paragraphs: [
          "MyTuums v1 is France/EU-first for legal and hosting decisions. Public signup and media uploads remain gated until legal pages, operator details, staff readiness, support email routing, Resend email setup, Sentry monitoring, and required CI/CD checks are ready.",
          "The goal is a small, understandable social product for gaming communities, with safety and privacy rules visible before launch rather than hidden behind later cleanup work.",
        ],
      },
    ],
  },
};

export function getStaticPage(slug: StaticPageSlug): StaticPage {
  return STATIC_PAGES[slug];
}
