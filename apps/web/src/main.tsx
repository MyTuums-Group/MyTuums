import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import {
  initFrontendMonitoring,
  SentryErrorBoundary,
} from "@/lib/sentry";
import { routeTree } from "./routeTree.gen";

initFrontendMonitoring();

const queryClient = new QueryClient();
const trpcClient = createTrpcClient();

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SentryErrorBoundary
            fallback={
              <div role="alert" className="p-6 text-sm">
                MyTuums hit an unexpected error.
              </div>
            }
          >
            <RouterProvider router={router} />
          </SentryErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
