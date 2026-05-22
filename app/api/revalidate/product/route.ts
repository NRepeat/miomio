import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.INTERNAL_API_SECRET ?? '';

const PRODUCT_TAGS_FOR_HANDLE = (handle: string) => [
  `product:${handle}`,
  handle,
  'product',
  'products',
  'inventory',
];

async function readHandles(req: NextRequest): Promise<string[]> {
  const url = req.nextUrl;
  const fromQuery = url.searchParams.getAll('handle').flatMap((v) => v.split(','));
  const handles = new Set(fromQuery.map((s) => s.trim()).filter(Boolean));

  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const body = (await req.json()) as { handle?: string | string[]; handles?: string[] };
      if (typeof body.handle === 'string') handles.add(body.handle.trim());
      if (Array.isArray(body.handle)) body.handle.forEach((h) => handles.add(h.trim()));
      if (Array.isArray(body.handles)) body.handles.forEach((h) => handles.add(h.trim()));
    } catch {}
  }
  return [...handles].filter(Boolean);
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-revalidate-secret');
  if (!SECRET || secret !== SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const handles = await readHandles(req);
  const revalidatedTags: string[] = [];

  for (const handle of handles) {
    for (const tag of PRODUCT_TAGS_FOR_HANDLE(handle)) {
      revalidateTag(tag, 'max');
      revalidatedTags.push(tag);
    }
  }

  if (handles.length === 0) {
    revalidateTag('product', 'max');
    revalidateTag('products', 'max');
    revalidateTag('inventory', 'max');
    revalidatedTags.push('product', 'products', 'inventory');
  }

  console.log('[Revalidate/product]', { handles, revalidatedTags });

  return NextResponse.json({
    revalidated: true,
    handles,
    tags: revalidatedTags,
    now: Date.now(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
