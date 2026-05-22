/**
 * Extract a FAQ block from a PortableText body and serialise it as a FAQPage
 * JSON-LD object suitable for Google rich-result eligibility.
 *
 * Convention in the source .md articles:
 *   H2 with text matching FAQ heuristic (FAQ / Часті запитання / Часто задаваемые вопросы / Frequently asked questions)
 *   followed by a flat list of normal-style blocks where:
 *     - blocks ending with "?" are questions
 *     - every block between two questions (or between the last question and the
 *       next H2 / end of body) joins to form the answer
 *
 * Returns null when no FAQ section is found or it has no Q/A pairs.
 */

type PortableTextChild = {
  _type?: string;
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  children?: PortableTextChild[];
};

type FaqEntry = { question: string; answer: string };

const FAQ_HEADING_PATTERNS: RegExp[] = [
  /^\s*faq\s*$/i,
  /^\s*часті\s+запитання\s*$/i,
  /^\s*часто\s+задаваемые\s+вопросы\s*$/i,
  /^\s*frequently\s+asked\s+questions\s*$/i,
  /^\s*вопросы\s+и\s+ответы\s*$/i,
  /^\s*питання\s+та\s+відповіді\s*$/i,
];

function blockText(block: PortableTextBlock | undefined): string {
  if (!block || block._type !== 'block') return '';
  return (block.children ?? [])
    .map((c) => (typeof c.text === 'string' ? c.text : ''))
    .join('')
    .replace(/[​-‏⁠﻿‪-‮]/g, '')
    .trim();
}

function isFaqHeading(block: PortableTextBlock | undefined): boolean {
  if (!block || block._type !== 'block') return false;
  if (block.style !== 'h2' && block.style !== 'h3') return false;
  const text = blockText(block);
  return FAQ_HEADING_PATTERNS.some((re) => re.test(text));
}

function isQuestion(text: string): boolean {
  return /[?？]\s*$/.test(text);
}

export function extractFaqEntries(
  body: PortableTextBlock[] | null | undefined,
): FaqEntry[] {
  if (!Array.isArray(body)) return [];

  const startIdx = body.findIndex(isFaqHeading);
  if (startIdx === -1) return [];

  // Collect blocks until next H1/H2 or end.
  const blocks: PortableTextBlock[] = [];
  for (let i = startIdx + 1; i < body.length; i += 1) {
    const b = body[i];
    if (
      b?._type === 'block' &&
      (b.style === 'h1' || b.style === 'h2')
    ) {
      break;
    }
    blocks.push(b);
  }

  // Walk: collect questions and concatenate following non-question blocks
  // until the next question or end.
  const entries: FaqEntry[] = [];
  let current: FaqEntry | null = null;
  for (const b of blocks) {
    const text = blockText(b);
    if (!text) continue;
    if (isQuestion(text)) {
      if (current && current.answer) entries.push(current);
      current = { question: text, answer: '' };
    } else if (current) {
      current.answer = current.answer
        ? `${current.answer}\n\n${text}`
        : text;
    }
  }
  if (current && current.answer) entries.push(current);

  return entries;
}

export function buildFaqJsonLd(entries: FaqEntry[]): Record<string, unknown> | null {
  if (!entries.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  };
}
