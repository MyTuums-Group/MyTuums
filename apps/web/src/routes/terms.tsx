import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return <StaticPageView page={getStaticPage("terms")} />;
}
