import { createFileRoute } from "@tanstack/react-router"
import { DocsMarkdownReader } from "@/components/markdown-reader"
import { createTrpcClient } from "@/lib/trpc"

const docsClient = createTrpcClient()

export const Route = createFileRoute("/docs/$sectionSlug/$pageSlug")({
  loader: ({ params }) =>
    docsClient.docs.page.query({
      sectionSlug: params.sectionSlug,
      pageSlug: params.pageSlug,
    }),
  component: DocsPage,
})

function DocsPage() {
  const pageRead = Route.useLoaderData()

  return <DocsMarkdownReader build={pageRead.build} page={pageRead.page} />
}
