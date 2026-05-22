#!/usr/bin/env node
/**
 * Import .md SEO articles into Sanity as localized blog post pairs (UA + RU)
 * linked via @sanity/document-internationalization, AND upsert a
 * `collectionSeo` mapping doc per manifest entry.
 *
 * Mirrors scripts/import-seo-blog.mjs (which ingests .docx) but:
 *   - swaps mammoth for `marked` (markdown → HTML)
 *   - adds an in-file MANIFEST (no directory scan)
 *   - emits a `collectionSeo` upsert per file
 *   - adds a `--migrate-legacy` flag that upserts 6 collectionSeo docs
 *     referencing existing imported-seo-*-ua post IDs (no post re-creation)
 *
 * Usage:
 *   node scripts/import-seo-md.mjs --dry             # preview (no writes)
 *   node scripts/import-seo-md.mjs                   # live write of MANIFEST entries
 *   node scripts/import-seo-md.mjs --clean-old       # delete prior imported-seo-md-* + imported-collection-seo-* docs first
 *   node scripts/import-seo-md.mjs --migrate-legacy  # upsert ONLY the 6 legacy collectionSeo mappings
 *
 * Each .md file MUST contain exactly two `# H1` blocks: first = UA, second = RU.
 * The first paragraph (a bare URL or [url](url) link) is captured as `sourceUrl`
 * and stripped from the body (mirrors .docx flow).
 *
 * Hard rules (see 22-RESEARCH.md pitfalls):
 *   - post.language is 'ua' or 'ru' (NEVER 'uk').
 *   - hideFromBlogList: true on every imported post.
 *   - ID prefix `imported-seo-md-*` for posts/meta; `imported-collection-seo-*` for the mapping doc.
 */
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import { htmlToBlocks } from '@portabletext/block-tools';
import { createClient } from '@sanity/client';
import { Schema } from '@sanity/schema';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env' });
loadEnv({ path: '.env.server' });

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const CLEAN_OLD = args.has('--clean-old');
const MIGRATE_LEGACY = args.has('--migrate-legacy');

// ─── Sanity client (lazy — only required when running as CLI) ───────────────
function makeClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ru43j1ro';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'development';
  const token = process.env.SANITY_API_TOKEN || process.env.SANITY_API_READ_TOKEN;
  if (!token && !DRY) {
    throw new Error('Missing SANITY_API_TOKEN / SANITY_API_READ_TOKEN (required for non-dry runs)');
  }
  return createClient({
    projectId,
    dataset,
    apiVersion: '2025-10-19',
    token,
    useCdn: false,
  });
}

// ─── Block-content schema (mirrors postType.body in src/shared/sanity) ──────
const defaultSchema = Schema.compile({
  name: 'default',
  types: [
    {
      type: 'object',
      name: 'post',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                { title: 'Normal', value: 'normal' },
                { title: 'H1', value: 'h1' },
                { title: 'H2', value: 'h2' },
                { title: 'H3', value: 'h3' },
                { title: 'H4', value: 'h4' },
                { title: 'Quote', value: 'blockquote' },
              ],
              lists: [{ title: 'Bullet', value: 'bullet' }],
              marks: {
                decorators: [
                  { title: 'Strong', value: 'strong' },
                  { title: 'Emphasis', value: 'em' },
                ],
                annotations: [
                  {
                    name: 'link',
                    type: 'object',
                    fields: [{ name: 'href', type: 'url' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
});

const blockContentType = defaultSchema
  .get('post')
  .fields.find((f) => f.name === 'body').type;

// ─── MANIFEST (CONTEXT D-16) ────────────────────────────────────────────────
// 7 new SEO articles. surface=brand (6) + surface=gender/woman (1).
const MANIFEST = [
  {
    filePath: '/Users/mnmac/Downloads/Сумки і рюкзаки Bikkembergs.md',
    surface: 'brand',
    collectionHandle: 'bikkembergs',
    title: 'Bikkembergs (brand)',
  },
  {
    filePath: '/Users/mnmac/Downloads/Взуття Premiata.md',
    surface: 'brand',
    collectionHandle: 'premiata',
    title: 'Premiata (brand)',
  },
  {
    filePath: '/Users/mnmac/Downloads/Взуття Barracuda.md',
    surface: 'brand',
    collectionHandle: 'barracuda',
    title: 'Barracuda (brand)',
  },
  {
    filePath: '/Users/mnmac/Downloads/Взуття Voile Blanche.md',
    surface: 'brand',
    collectionHandle: 'voile-blanche',
    title: 'Voile Blanche (brand)',
  },
  {
    filePath: '/Users/mnmac/Downloads/Взуття Bogner.md',
    surface: 'brand',
    collectionHandle: 'bogner',
    title: 'Bogner (brand)',
  },
  {
    // Source filename spells "Scoretti" but the Shopify brand handle is
    // `helena-soretti` (single 'c'), verified against live storefront 200/404
    // probe + collections_export.csv. Brand name on store: "Helena Soretti".
    filePath: '/Users/mnmac/Downloads/Взуття Helena Scoretti.md',
    surface: 'brand',
    collectionHandle: 'helena-soretti',
    title: 'Helena Soretti (brand)',
  },
  {
    // RESEARCH Open Q1: transliterated guess `zhinochi-baletky-ta-mokasyny`
    // is NOT the live Shopify handle. Verified canonical handle is
    // `baletky-ta-mokasyny` (no `zhinochi-` prefix — gender is owned by the
    // URL segment, not the handle). Pattern matches `krosivky-ta-kedy`,
    // `oksfordy-ta-lofery` etc. which are also shared across genders.
    filePath: '/Users/mnmac/Downloads/Жіночі балетки і мокасини.md',
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'baletky-ta-mokasyny',
    title: 'Жіночі балетки і мокасини (woman)',
  },
];

// ─── LEGACY_MIGRATION (CONTEXT D-14) ────────────────────────────────────────
// 6 existing UA posts already in Sanity from import-seo-blog.mjs.
// --migrate-legacy ONLY upserts collectionSeo mapping docs; it does NOT
// recreate the post pairs.
const LEGACY_MIGRATION = [
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'zhinoche-vzuttya',
    postId: 'imported-seo-zhinoche-vzuttia-ua',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'krosivky-ta-kedy',
    postId: 'imported-seo-zhinochi-krosivky-ta-kedy-ua',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'oksfordy-ta-lofery',
    postId: 'imported-seo-zhinochi-oksfordy-ta-lofery-ua',
  },
  {
    surface: 'gender',
    gender: 'woman',
    collectionHandle: 'sabo-ta-myuli',
    postId: 'imported-seo-zhinochi-sabo-ta-miuli-ua',
  },
  {
    surface: 'gender',
    gender: 'man',
    collectionHandle: 'choloviche-vzuttya',
    postId: 'imported-seo-choloviche-vzuttia-ua',
  },
  {
    surface: 'gender',
    gender: 'man',
    collectionHandle: 'krosivky-ta-kedy',
    postId: 'imported-seo-cholovichi-krosivky-ta-kedy-ua',
  },
];

// ─── Helpers (copied verbatim from import-seo-blog.mjs) ─────────────────────

function slugify(input, map) {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function transliterateUk(input) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie',
    ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l',
    м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
    ю: 'iu', я: 'ia',
  };
  return slugify(input, map);
}

function transliterateRu(input) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e',
    ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return slugify(input, map);
}

/** Pull a section from `startEl` (inclusive) up to but not including `stopEl`. */
function extractSectionHTML(doc, startEl, stopEl) {
  const wrap = doc.createElement('div');
  let node = startEl;
  while (node && node !== stopEl) {
    const next = node.nextSibling;
    wrap.appendChild(node);
    node = next;
  }
  // Strip empty word-anchors (artifact from converters).
  wrap.querySelectorAll('a[id^="_"]').forEach((a) => {
    if (!a.textContent?.trim()) a.remove();
  });
  return wrap.innerHTML;
}

function firstParagraphText(html) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const p = dom.window.document.querySelector('p');
  return p?.textContent?.trim() ?? '';
}

function htmlToPortableBlocks(html) {
  const blocks = htmlToBlocks(html, blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
  });
  // Pitfall 2 (22-RESEARCH): marked emits whitespace text nodes that can
  // produce empty `_type:'block'` entries. Filter them out.
  return blocks.filter(
    (b) => b._type !== 'block' || b.children?.some((c) => c.text?.trim()),
  );
}

function truncate(s, n = 160) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 3).replace(/\s+\S*$/, '') + '…';
}

// ─── Markdown adapter (replaces mammoth) ────────────────────────────────────

/** Read a .md file from disk and emit HTML via `marked`. */
async function mdFileToHtml(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  // marked v15 is synchronous by default; gfm:true is safe for the source files.
  return marked.parse(raw, { async: false, gfm: true, breaks: false });
}

// ─── Sanity doc builders ────────────────────────────────────────────────────

function buildPost({
  language,
  title,
  slug,
  description,
  blocks,
  publishedAt,
  imageAssetId,
  imageAlt,
}) {
  const doc = {
    _id: `imported-seo-md-${slug}-${language}`,
    _type: 'post',
    title,
    language, // 'ua' or 'ru' — never 'uk' (Pitfall 1)
    slug: { _type: 'slug', current: slug },
    publishedAt,
    body: blocks,
    // Hidden from /blog list — only used as embedded SEO copy via CollectionSeoContent.
    hideFromBlogList: true,
    seo: {
      title: `${title} | MioMio`,
      description,
      noIndex: false,
    },
  };
  if (imageAssetId) {
    doc.mainImage = {
      _type: 'image',
      asset: { _type: 'reference', _ref: imageAssetId },
      alt: imageAlt || title,
    };
  }
  return doc;
}

function buildTranslationMeta(uaDocId, ruDocId, baseSlug) {
  return {
    _id: `imported-seo-md-meta-${baseSlug}`,
    _type: 'translation.metadata',
    schemaTypes: ['post'],
    translations: [
      {
        _key: 'ua',
        _type: 'internationalizedArrayReferenceValue',
        value: {
          _type: 'reference',
          _ref: uaDocId,
          _weak: true,
          _strengthenOnPublish: { type: 'post' },
        },
      },
      {
        _key: 'ru',
        _type: 'internationalizedArrayReferenceValue',
        value: {
          _type: 'reference',
          _ref: ruDocId,
          _weak: true,
          _strengthenOnPublish: { type: 'post' },
        },
      },
    ],
  };
}

/**
 * Build a `collectionSeo` mapping doc. Schema (22-02):
 *   { _type: 'collectionSeo', title, surface, gender?, collectionHandle, post }
 * Weak reference + `_strengthenOnPublish` matches existing translation.metadata
 * pattern and tolerates ordering inside a single transaction.
 */
function buildCollectionSeo({ surface, gender, collectionHandle, postId, title }) {
  const id = `imported-collection-seo-${surface}${gender ? `-${gender}` : ''}-${collectionHandle}`;
  return {
    _id: id,
    _type: 'collectionSeo',
    title,
    surface,
    ...(gender ? { gender } : {}),
    collectionHandle,
    post: {
      _type: 'reference',
      _ref: postId,
      _weak: true,
      _strengthenOnPublish: { type: 'post' },
    },
  };
}

// ─── Per-file processing ────────────────────────────────────────────────────

/**
 * Parse a single .md file → extract UA and RU sections (split on the second # H1).
 * Returns { uk: {...}, ru: {...}, sourceUrl } shaped like `import-seo-blog.mjs#processFile`.
 */
async function processFile(filePath) {
  const html = await mdFileToHtml(filePath);
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const doc = dom.window.document;
  const body = doc.body;

  // First <p> commonly holds the source URL ([url](url)) — capture and drop.
  const firstP = body.querySelector('p');
  let sourceUrl = null;
  if (firstP) {
    const txt = firstP.textContent?.trim() ?? '';
    const a = firstP.querySelector('a');
    if (/^https?:/i.test(txt)) {
      sourceUrl = a?.getAttribute('href') ?? txt;
      firstP.remove();
    }
  }

  const h1s = Array.from(body.querySelectorAll('h1'));
  if (h1s.length !== 2) {
    throw new Error(
      `Expected exactly 2 H1s in ${filePath}, got ${h1s.length}`,
    );
  }
  const [ukH1, ruH1] = h1s;
  const ukTitle = ukH1.textContent?.trim() ?? '';
  const ruTitle = ruH1.textContent?.trim() ?? '';
  if (!ukTitle || !ruTitle) {
    throw new Error(`Empty title in one section of ${filePath}`);
  }

  const ukHTML = extractSectionHTML(doc, ukH1.nextSibling, ruH1);
  const ruHTML = extractSectionHTML(doc, ruH1.nextSibling, null);

  return {
    sourceUrl,
    uk: {
      title: ukTitle,
      slug: transliterateUk(ukTitle),
      description: truncate(firstParagraphText(ukHTML)),
      blocks: htmlToPortableBlocks(ukHTML),
    },
    ru: {
      title: ruTitle,
      slug: transliterateRu(ruTitle),
      description: truncate(firstParagraphText(ruHTML)),
      blocks: htmlToPortableBlocks(ruHTML),
    },
  };
}

// ─── og:image helpers (parity with import-seo-blog.mjs) ─────────────────────

async function fetchOgImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MioMioImporter/1.0)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const metaSel = [
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
    ];
    for (const s of metaSel) {
      const el = doc.querySelector(s);
      const c = el?.getAttribute('content');
      if (!c) continue;
      const abs = new URL(c, url).toString();
      if (/\/og-image\.(jpg|png|webp)/i.test(abs)) break;
      return abs;
    }
    // Fallback: first product image (Shopify CDN), normalized to width=1200.
    const re = /https:\/\/cdn\.shopify\.com\/s\/files\/[^"'\s]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/gi;
    const seen = new Set();
    let m;
    while ((m = re.exec(html)) !== null) {
      const raw = m[0].replace(/&amp;/gi, '&');
      const base = raw.split('?')[0];
      if (seen.has(base)) continue;
      seen.add(base);
      if (/logo|favicon|placeholder/i.test(base)) continue;
      const u = new URL(raw);
      u.searchParams.set('width', '1200');
      u.searchParams.set('quality', '85');
      u.searchParams.delete('format');
      return u.toString();
    }
    return null;
  } catch (e) {
    console.warn(`  og fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

async function uploadImageFromUrl(client, url, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const filename = `${label}.${ext.length <= 4 ? ext : 'jpg'}`;
  const asset = await client.assets.upload('image', buf, { filename });
  return asset._id;
}

// ─── Flag handlers ──────────────────────────────────────────────────────────

async function cleanOld(client) {
  // Targets both imported-seo-md-* posts/meta and imported-collection-seo-* mapping docs.
  const ids = await client.fetch(
    `*[_id match "imported-seo-md-*" || _id match "imported-collection-seo-*"]._id`,
  );
  if (!ids.length) {
    console.log('Nothing to clean.');
    return;
  }
  console.log(`Cleaning ${ids.length} prior md/collection-seo docs…`);
  if (DRY) return;
  const tx = client.transaction();
  for (const id of ids) tx.delete(id);
  await tx.commit();
  console.log('Cleaned.');
}

async function migrateLegacy(client) {
  console.log(`Migrating ${LEGACY_MIGRATION.length} legacy collectionSeo mappings…`);
  const tx = client.transaction();
  for (const entry of LEGACY_MIGRATION) {
    const seo = buildCollectionSeo({
      surface: entry.surface,
      gender: entry.gender,
      collectionHandle: entry.collectionHandle,
      postId: entry.postId,
      title: `${entry.surface}/${entry.gender}/${entry.collectionHandle} (legacy)`,
    });
    console.log(`  • ${seo._id} → ${entry.postId}`);
    if (!DRY) tx.createOrReplace(seo);
  }
  if (!DRY) {
    const res = await tx.commit();
    console.log(`✓ committed ${res.results.length} mutations`);
  } else {
    console.log('(dry — no mutations committed)');
  }
}

async function processEntry(client, entry, publishedAt) {
  const fileName = path.basename(entry.filePath);
  try {
    const { uk, ru, sourceUrl } = await processFile(entry.filePath);

    let imageAssetId = null;
    const imageAlt = uk.title;
    if (sourceUrl && !DRY) {
      const ogUrl = await fetchOgImage(sourceUrl);
      if (ogUrl) {
        try {
          imageAssetId = await uploadImageFromUrl(client, ogUrl, `seo-md-${uk.slug}`);
          console.log(`  og: ${ogUrl} → ${imageAssetId}`);
        } catch (e) {
          console.warn(`  og upload failed: ${e.message}`);
        }
      } else {
        console.warn(`  og: not found at ${sourceUrl}`);
      }
    }

    const uaDoc = buildPost({
      ...uk,
      language: 'ua',
      publishedAt,
      imageAssetId,
      imageAlt,
    });
    const ruDoc = buildPost({
      ...ru,
      language: 'ru',
      publishedAt,
      imageAssetId,
      imageAlt: ru.title,
    });
    const meta = buildTranslationMeta(uaDoc._id, ruDoc._id, uk.slug);
    const seo = buildCollectionSeo({
      surface: entry.surface,
      gender: entry.gender,
      collectionHandle: entry.collectionHandle,
      postId: uaDoc._id,
      title: entry.title,
    });

    console.log(
      `\n• ${fileName}  publishedAt=${publishedAt}\n  ua: "${uk.title}" → ${uk.slug}  blocks=${uk.blocks.length}\n  ru: "${ru.title}" → ${ru.slug}  blocks=${ru.blocks.length}\n  meta: ${meta._id}\n  seo:  ${seo._id} (${entry.surface}${entry.gender ? `/${entry.gender}` : ''}/${entry.collectionHandle})`,
    );

    if (DRY) return;

    const tx = client.transaction();
    tx.createOrReplace(uaDoc);
    tx.createOrReplace(ruDoc);
    tx.createOrReplace(meta);
    tx.createOrReplace(seo);
    const res = await tx.commit();
    console.log(`  ✓ committed ${res.results.length} mutations`);
  } catch (err) {
    console.error(`  ✗ ${fileName}: ${err.message}`);
    throw err;
  }
}

// ─── Main (only invoked when run as a CLI, not when imported by tests) ──────

async function main() {
  console.log(
    `import-seo-md: dry=${DRY} clean-old=${CLEAN_OLD} migrate-legacy=${MIGRATE_LEGACY}`,
  );
  const client = makeClient();

  if (CLEAN_OLD) await cleanOld(client);

  if (MIGRATE_LEGACY) {
    await migrateLegacy(client);
    return;
  }

  const now = Date.now();
  const STEP_MS = 60 * 60 * 1000; // 1h between posts
  for (let i = 0; i < MANIFEST.length; i++) {
    const entry = MANIFEST[i];
    const publishedAt = new Date(now - i * STEP_MS).toISOString();
    try {
      await processEntry(client, entry, publishedAt);
    } catch {
      // already logged inside processEntry; continue to next file
    }
  }

  console.log('\nDone.');
}

// ESM CLI guard: only run main() when invoked directly, not when imported.
const isCli =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith('import-seo-md.mjs'));

if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// ─── Exports for unit tests ────────────────────────────────────────────────
export {
  MANIFEST,
  LEGACY_MIGRATION,
  buildCollectionSeo,
  buildPost,
  buildTranslationMeta,
  mdFileToHtml,
  htmlToPortableBlocks,
  processFile,
  transliterateUk,
  transliterateRu,
};
