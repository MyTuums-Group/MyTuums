import { WarningCircle } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/account/status")({
  component: AccountStatusPage,
});

function AccountStatusPage() {
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const state = currentAppUser.data;
  const accountStatus =
    state?.kind === "limited_account" ? state.accountStatus : null;
  const suspensionReason =
    state?.kind === "limited_account" ? state.suspensionPublicReason : null;

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <WarningCircle weight="bold" className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Account status
            </h1>
            <p className="text-sm text-muted-foreground">
              {accountStatus === "account_deleted"
                ? "This account has been deleted."
                : "This account is currently suspended."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            App access is limited while this status is active. Support and
            account closure remain available.
          </p>
          {suspensionReason ? (
            <p className="mt-3 text-sm font-medium">
              Public reason: {suspensionReason}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <a href="/contact">Contact support</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/support">Support center</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
