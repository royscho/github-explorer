export type LinkRel = 'next' | 'prev' | 'first' | 'last';

const LINK_SEGMENT_PATTERN = /<([^>]+)>;\s*rel="([^"]+)"/;

export function parseLinkHeader(
  header: string | null,
): Partial<Record<LinkRel, string>> {
  if (!header) {
    return {};
  }

  const links: Partial<Record<LinkRel, string>> = {};

  for (const segment of header.split(',')) {
    const match = LINK_SEGMENT_PATTERN.exec(segment.trim());
    if (!match) {
      continue;
    }

    const [, url, rel] = match;
    if (rel === 'next' || rel === 'prev' || rel === 'first' || rel === 'last') {
      links[rel] = url;
    }
  }

  return links;
}
