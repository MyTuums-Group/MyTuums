import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  USERNAME_REGEX,
} from "@workspace/types";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const mutation = trpc.profile.submitOnboarding.useMutation({
    onSuccess: () => {
      void navigate({ to: "/" });
    },
  });

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function validate(): string | null {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < USERNAME_MIN_LENGTH) {
      return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    }
    if (trimmed.length > USERNAME_MAX_LENGTH) {
      return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      return "Username must start with a letter and contain only lowercase letters, numbers, and underscores.";
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    mutation.mutate({
      username: username.trim().toLowerCase(),
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
    });
  }

  const errorMessage = localError ?? mutation.error?.message;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose your username</CardTitle>
          <CardDescription>
            This will be your permanent handle on MyTuums.
            Choose wisely — it cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="your_handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={USERNAME_MAX_LENGTH}
                required
              />
              <p className="text-xs text-muted-foreground">
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} chars, lowercase
                letters, numbers, and underscores only.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Display name (optional)</Label>
              <Input
                id="displayName"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell other gamers about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating profile..." : "Create profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
