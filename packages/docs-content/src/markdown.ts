import { createHeadingIdFactory } from "./slug.js";
import type { DocsHeading } from "./types.js";

export interface MarkdownLinkCandidate {
  text: string;
  href: string;
}

export interface MarkdownSearchSection {
  headingId: string | null;
  headingText: string | null;
  text: string;
}

export interface MarkdownAnalysis {
  headings: DocsHeading[];
  links: MarkdownLinkCandidate[];
  sections: MarkdownSearchSection[];
  text: string;
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
const FENCE_PATTERN = /^(\s*)(`{3,}|~{3,})/u;
const INLINE_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
const IMAGE_LINK_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/gu;
const STANDARD_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/gu;
const INLINE_CODE_PATTERN = /`([^`]+)`/gu;

export function analyzeMarkdown(markdown: string): MarkdownAnalysis {
  const headings: DocsHeading[] = [];
  const links: MarkdownLinkCandidate[] = [];
  const sections: MarkdownSearchSection[] = [];
  const createHeadingId = createHeadingIdFactory();

  let currentSection: MarkdownSearchSection = {
    headingId: null,
    headingText: null,
    text: "",
  };
  let inFence = false;
  let activeFenceMarker: string | null = null;

  const lines = markdown.split(/\r?\n/u);

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch !== null) {
      const fenceMarker = fenceMatch[2] ?? null;
      if (fenceMarker === null) {
        continue;
      }

      if (!inFence) {
        inFence = true;
        activeFenceMarker = fenceMarker;
      } else if (activeFenceMarker === fenceMarker) {
        inFence = false;
        activeFenceMarker = null;
      }

      appendSectionText(currentSection, stripMarkdownLine(line));
      continue;
    }

    if (!inFence) {
      const headingMatch = line.match(HEADING_PATTERN);
      if (headingMatch !== null) {
        const headingMarker = headingMatch[1] ?? null;
        const rawHeadingText = headingMatch[2] ?? null;
        if (headingMarker === null || rawHeadingText === null) {
          continue;
        }

        if (currentSection.text.length > 0 || currentSection.headingId !== null) {
          sections.push(currentSection);
        }

        const headingText = stripMarkdownLine(rawHeadingText);
        const heading: DocsHeading = {
          id: createHeadingId(headingText),
          text: headingText,
          level: headingMarker.length,
        };

        headings.push(heading);
        currentSection = {
          headingId: heading.id,
          headingText: heading.text,
          text: "",
        };
        continue;
      }

      for (const link of extractInlineLinks(line)) {
        links.push(link);
      }
    }

    appendSectionText(currentSection, stripMarkdownLine(line));
  }

  if (currentSection.text.length > 0 || currentSection.headingId !== null) {
    sections.push(currentSection);
  }

  return {
    headings,
    links,
    sections,
    text: sections.map((section) => section.text).filter(Boolean).join("\n\n"),
  };
}

function appendSectionText(section: MarkdownSearchSection, text: string): void {
  if (text.length === 0) {
    return;
  }

  section.text = section.text.length === 0 ? text : `${section.text}\n${text}`;
}

function extractInlineLinks(line: string): MarkdownLinkCandidate[] {
  const links: MarkdownLinkCandidate[] = [];

  for (const match of line.matchAll(INLINE_LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > 0 && line[start - 1] === "!") {
      continue;
    }

    const linkText = match[1];
    const href = match[2];

    if (linkText === undefined || href === undefined) {
      continue;
    }

    links.push({
      text: stripMarkdownLine(linkText),
      href: href.trim(),
    });
  }

  return links;
}

function stripMarkdownLine(line: string): string {
  return line
    .replace(IMAGE_LINK_PATTERN, "$1")
    .replace(STANDARD_LINK_PATTERN, "$1")
    .replace(INLINE_CODE_PATTERN, "$1")
    .replace(/^>\s?/u, "")
    .replace(/^\s*#{1,6}\s+/u, "")
    .replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/u, "")
    .replace(/[*_~]/gu, "")
    .replace(/\|/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
