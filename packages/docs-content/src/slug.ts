export const SEMANTIC_PATH_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u;

const DIAGRAM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isValidSemanticPath(value: string): boolean {
  return SEMANTIC_PATH_PATTERN.test(value);
}

export function isValidDiagramId(value: string): boolean {
  return DIAGRAM_ID_PATTERN.test(value);
}

export function createHeadingIdFactory(): (text: string) => string {
  const seen = new Map<string, number>();

  return (text: string): string => {
    const base = slugifyHeading(text);
    const duplicateCount = seen.get(base) ?? 0;
    seen.set(base, duplicateCount + 1);

    if (duplicateCount === 0) {
      return base;
    }

    return `${base}-${duplicateCount}`;
  };
}

export function slugifyHeading(text: string): string {
  const normalized = text
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\- ]+/gu, "")
    .trim()
    .replace(/ /gu, "-")
    .replace(/^-+|-+$/gu, "");

  return normalized.length > 0 ? normalized : "section";
}

