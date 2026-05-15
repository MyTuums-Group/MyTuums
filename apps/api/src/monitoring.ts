import type { FastifyInstance, FastifyRequest } from "fastify";
import * as Sentry from "@sentry/node";
import { env } from "@workspace/config";

let initialized = false;

export function initApiMonitoring(): void {
  if (!env.SENTRY_DSN || initialized) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    sendDefaultPii: false,
    beforeSend(event) {
      scrubEvent(event);
      return event;
    },
  });
  initialized = true;
}

export function registerApiMonitoring(app: FastifyInstance): void {
  app.addHook("onError", async (request, _reply, error) => {
    captureApiException(error, request);
  });
}

export function captureApiException(error: unknown, request?: FastifyRequest): void {
  if (!env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    scope.setTag("environment", env.NODE_ENV);
    if (env.SENTRY_RELEASE) scope.setTag("release", env.SENTRY_RELEASE);
    if (request) {
      scope.setContext("request", {
        method: request.method,
        url: request.url,
        route: request.routeOptions.url,
      });
    }
    Sentry.captureException(error);
  });
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
