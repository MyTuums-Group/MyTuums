import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/legal-notice")({
  component: LegalNoticePage,
});

function LegalNoticePage() {
  return <StaticPageView page={getStaticPage("legal-notice")} />;
}
