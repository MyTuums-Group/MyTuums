import * as Sentry from "@sentry/react";

type ViteSentryEnv = {
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_RELEASE?: string;
  MODE?: string;
};

let initialized = false;

export function initFrontendMonitoring() {
  const env = getSentryEnv();
  if (!env.VITE_SENTRY_DSN || initialized) return;

  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.MODE,
    release: env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    beforeSend(event) {
      scrubEvent(event);
      return event;
    },
  });
  initialized = true;
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;

function getSentryEnv(): ViteSentryEnv {
  try {
    return (import.meta as unknown as { env: ViteSentryEnv }).env;
  } catch {
    return {};
  }
}

function scrubEvent(event: Sentry.Event): void {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers["set-cookie"];
    }
  }
}
