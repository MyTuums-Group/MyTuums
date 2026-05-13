import type {
  DocsArtifact,
  DocsBuildMetadata,
  DocsPage,
  DocsSection,
} from "@workspace/docs-content";
import type { AccountLifecycleSnapshot } from "../account-status/index.js";

export interface DocsViewer {
  session:
    | {
        user: {
          id: string;
          emailVerified?: boolean | null;
        };
      }
    | null;
  account: AccountLifecycleSnapshot | null;
}

export interface DocsPageInput {
  sectionSlug: string;
  pageSlug: string;
}

export interface DocsArtifactAdapter {
  readArtifact(): Promise<DocsArtifact>;
}

export interface DocsPageResult {
  page: DocsPage;
  build: DocsBuildMetadata;
}

export interface DocsService {
  getNavigation(viewer: DocsViewer): Promise<DocsSection[]>;
  getPage(viewer: DocsViewer, input: DocsPageInput): Promise<DocsPageResult>;
}

export class DocsAccessError extends Error {
  readonly kind:
    | "unauthenticated"
    | "inactive_account"
    | "unverified_account"
    | "forbidden_role";

  constructor(kind: DocsAccessError["kind"]) {
    const message =
      kind === "unauthenticated"
        ? "Authentication required"
        : kind === "inactive_account"
          ? "Active accounts only"
          : kind === "unverified_account"
            ? "Verified email required"
            : "Admin or owner access required";

    super(message);
    this.name = "DocsAccessError";
    this.kind = kind;
  }
}

export class DocsPageNotFoundError extends Error {
  readonly sectionSlug: string;
  readonly pageSlug: string;

  constructor(sectionSlug: string, pageSlug: string) {
    super(`Document not found for ${sectionSlug}/${pageSlug}`);
    this.name = "DocsPageNotFoundError";
    this.sectionSlug = sectionSlug;
    this.pageSlug = pageSlug;
  }
}

export function assertCanReadDocs(viewer: DocsViewer): void {
  if (!viewer.session) {
    throw new DocsAccessError("unauthenticated");
  }

  if (!viewer.account || viewer.account.status !== "active") {
    throw new DocsAccessError("inactive_account");
  }

  if (viewer.session.user.emailVerified !== true) {
    throw new DocsAccessError("unverified_account");
  }

  if (viewer.account.role !== "admin" && viewer.account.role !== "owner") {
    throw new DocsAccessError("forbidden_role");
  }
}

export function createDocsService(adapter: DocsArtifactAdapter): DocsService {
  return {
    async getNavigation(viewer) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      return artifact.sections;
    },

    async getPage(viewer, input) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      const page = artifact.pages.find(
        (candidate) =>
          candidate.sectionId === input.sectionSlug &&
          candidate.slug === input.pageSlug,
      );

      if (!page) {
        throw new DocsPageNotFoundError(input.sectionSlug, input.pageSlug);
      }

      return {
        page,
        build: artifact.build,
      };
    },
  };
}

export function createInMemoryDocsService(artifact: DocsArtifact): DocsService {
  return createDocsService({
    readArtifact() {
      return Promise.resolve(artifact);
    },
  });
}
