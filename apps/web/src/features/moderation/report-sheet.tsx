import { useState } from "react";
import { Flag } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { trpc } from "@/lib/trpc";

type ReportTarget =
  | { type: "post"; publicId: string }
  | { type: "comment"; commentId: string }
  | { type: "profile"; username: string };

const REPORT_REASONS = [
  { value: "self_harm", label: "Self-harm" },
  { value: "illegal_or_dangerous", label: "Illegal or dangerous" },
  { value: "privacy", label: "Privacy" },
  { value: "underage_or_safety", label: "Underage or safety" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
] as const;

export function ReportSheet({
  buttonClassName,
  target,
}: {
  buttonClassName?: string;
  target: ReportTarget;
}) {
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] =
    useState<(typeof REPORT_REASONS)[number]["value"]>("spam");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = trpc.moderation.submitReport.useMutation({
    onSuccess() {
      setSubmitted(true);
      setNotes("");
    },
  });

  const canReport =
    currentAppUser.data &&
    currentAppUser.data.kind !== "unauthenticated" &&
    currentAppUser.data.kind !== "limited_account";

  if (!canReport) return null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSubmitted(false);
          mutation.reset();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={buttonClassName}
        >
          <Flag weight="bold" />
          Report
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/70">
          <SheetTitle>Report</SheetTitle>
          <SheetDescription>
            Choose a reason and add details for the moderation team.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex flex-1 flex-col gap-4 px-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending) return;
            mutation.mutate({
              target,
              reason,
              notes: notes.trim() ? notes.trim() : null,
            });
          }}
        >
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as typeof reason)
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Notes
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              placeholder="Optional details"
              className="min-h-32"
            />
          </label>

          {mutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          )}

          {submitted && (
            <Alert>
              <AlertDescription>Report submitted.</AlertDescription>
            </Alert>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={mutation.isPending || submitted}>
              {mutation.isPending ? "Submitting..." : "Submit report"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
