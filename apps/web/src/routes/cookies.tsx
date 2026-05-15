import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
});

function CookiesPage() {
  return <StaticPageView page={getStaticPage("cookies")} />;
}
