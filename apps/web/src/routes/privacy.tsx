import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return <StaticPageView page={getStaticPage("privacy")} />;
}
