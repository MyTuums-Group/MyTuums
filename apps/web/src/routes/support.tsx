import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/support")({
  component: SupportPage,
});

function SupportPage() {
  return <StaticPageView page={getStaticPage("support")} />;
}
