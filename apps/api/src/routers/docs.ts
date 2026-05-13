import { z } from "zod";
import {
  DocsAccessError,
  DocsPageNotFoundError,
} from "../services/docs/index.js";
import { docsService } from "../services/docs/production.js";
import { mapDocsAccessErrorToTRPC, mapDocsPageErrorToTRPC } from "../transport/docs-errors.js";
import { protectedProcedure, router } from "../trpc.js";

export const docsRouter = router({
  navigation: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await docsService.getNavigation({
        session: ctx.session,
        account: ctx.accountLifecycle,
      });
    } catch (error) {
      rethrowDocsError(error);
    }
  }),

  page: protectedProcedure
    .input(
      z.object({
        sectionSlug: z.string().min(1),
        pageSlug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await docsService.getPage(
          {
            session: ctx.session,
            account: ctx.accountLifecycle,
          },
          input,
        );
      } catch (error) {
        rethrowDocsError(error);
      }
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().max(200),
        limit: z.number().int().min(1).max(25).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await docsService.search(
          {
            session: ctx.session,
            account: ctx.accountLifecycle,
          },
          input,
        );
      } catch (error) {
        rethrowDocsError(error);
      }
    }),
});

function rethrowDocsError(error: unknown): never {
  if (error instanceof DocsAccessError) {
    throw mapDocsAccessErrorToTRPC(error);
  }

  if (error instanceof DocsPageNotFoundError) {
    throw mapDocsPageErrorToTRPC(error);
  }

  throw error;
}
