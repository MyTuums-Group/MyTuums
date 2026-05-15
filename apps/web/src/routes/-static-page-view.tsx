import type { StaticPage } from "./-static-pages";
import type { ReactNode } from "react";

export function StaticPageView({
  children,
  page,
}: {
  children?: ReactNode;
  page: StaticPage;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="border-b border-border/70 pb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {page.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {page.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {page.summary}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated: {page.updatedAt}
        </p>
      </header>

      {children ? <div className="mt-8">{children}</div> : null}

      <div className="mt-8 space-y-8">
        {page.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-7 text-muted-foreground sm:text-base"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
