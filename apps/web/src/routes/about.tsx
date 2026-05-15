import { createFileRoute } from "@tanstack/react-router";
import { StaticPageView } from "./-static-page-view";
import { getStaticPage } from "./-static-pages";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return <StaticPageView page={getStaticPage("about")} />;
}
