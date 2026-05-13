export type LinkifiedPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":"]);

export function linkifyText(text: string): LinkifiedPart[] {
  const parts: LinkifiedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawMatch = match[0];
    const matchIndex = match.index ?? 0;
    const trimmed = trimTrailingPunctuation(rawMatch);

    if (matchIndex > lastIndex) {
      parts.push({
        type: "text",
        text: text.slice(lastIndex, matchIndex),
      });
    }

    if (isSafeHttpUrl(trimmed.core)) {
      parts.push({
        type: "link",
        text: trimmed.core,
        href: trimmed.core,
      });
      if (trimmed.trailing.length > 0) {
        parts.push({
          type: "text",
          text: trimmed.trailing,
        });
      }
    } else {
      parts.push({
        type: "text",
        text: rawMatch,
      });
    }

    lastIndex = matchIndex + rawMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return parts;
}

function isSafeHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function trimTrailingPunctuation(input: string): {
  core: string;
  trailing: string;
} {
  let core = input;

  while (core.length > 0) {
    const lastChar = core.at(-1);
    if (!lastChar) break;

    if (TRAILING_PUNCTUATION.has(lastChar)) {
      core = core.slice(0, -1);
      continue;
    }

    if (lastChar === ")" && hasUnmatchedClosingParen(core)) {
      core = core.slice(0, -1);
      continue;
    }

    break;
  }

  return {
    core,
    trailing: input.slice(core.length),
  };
}

function hasUnmatchedClosingParen(text: string): boolean {
  const opens = (text.match(/\(/g) ?? []).length;
  const closes = (text.match(/\)/g) ?? []).length;
  return closes > opens;
}
