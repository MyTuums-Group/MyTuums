import { createFileRoute } from "@tanstack/react-router";
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  type ContactCategory,
} from "@workspace/types";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  return (
    <StaticPageView page={getStaticPage("contact")}>
      <ContactForm />
    </StaticPageView>
  );
}

const CONTACT_CATEGORY_OPTIONS = [
  { value: "account_access", label: "Account access" },
  { value: "moderation_or_safety", label: "Moderation or safety" },
  { value: "privacy_or_data", label: "Privacy or data" },
  { value: "bug_report", label: "Bug report" },
  { value: "general_support", label: "General support" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: ContactCategory; label: string }[];

function ContactForm() {
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const submitContact = trpc.contact.submit.useMutation();
  const [messageLength, setMessageLength] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const isLoggedIn =
    !!currentAppUser.data && currentAppUser.data.kind !== "unauthenticated";
  const isEmailRequired = !isLoggedIn;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Send a message</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(false);
            const form = new FormData(event.currentTarget);
            const email = getFormString(form, "email").trim();
            const message = getFormString(form, "message");
            const category = getFormString(form, "category") as ContactCategory;

            submitContact.mutate(
              {
                email: email || undefined,
                category,
                message,
              },
              {
                onSuccess: () => {
                  event.currentTarget.reset();
                  setMessageLength(0);
                  setSubmitted(true);
                },
              },
            );
          }}
        >
          {submitted ? (
            <Alert>
              <AlertDescription>
                Your message was sent to MyTuums support.
              </AlertDescription>
            </Alert>
          ) : null}

          {submitContact.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitContact.error.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-email">
                Email{isEmailRequired ? "" : " (optional)"}
              </Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={CONTACT_EMAIL_MAX_LENGTH}
                required={isEmailRequired}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-category">Category</Label>
              <select
                id="contact-category"
                name="category"
                required
                defaultValue="general_support"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {CONTACT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="contact-message">Message</Label>
              <span className="text-xs text-muted-foreground">
                {messageLength}/{CONTACT_MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="contact-message"
              name="message"
              required
              maxLength={CONTACT_MESSAGE_MAX_LENGTH}
              className="min-h-40"
              onChange={(event) => {
                setMessageLength(event.currentTarget.value.length);
              }}
            />
          </div>

          <Button type="submit" disabled={submitContact.isPending}>
            {submitContact.isPending ? "Sending..." : "Send message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function getFormString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
