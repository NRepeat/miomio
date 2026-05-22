import { PortableText } from 'next-sanity';
import { sanityFetch } from '@shared/sanity/lib/sanityFetch';
import { COLLECTION_SEO_QUERY } from '@shared/sanity/lib/query';
import { normalizeLocaleForSanity } from '@shared/lib/locale';
import { components } from '@shared/sanity/components/portableText';
import { SeoCurtain } from './SeoCurtain';

type Props = {
  surface: 'brand' | 'gender';
  gender?: string;
  handle: string;
  locale: string;
};

type TranslationEntry = {
  _id?: string;
  title?: string;
  body?: unknown;
  language?: string;
};
type PostShape = {
  _id?: string;
  title?: string;
  body?: unknown;
  language?: string;
  translations?: TranslationEntry[] | null;
};

export async function CollectionSeoContent({
  surface,
  gender,
  handle,
  locale,
}: Props) {
  const result = (await sanityFetch({
    query: COLLECTION_SEO_QUERY,
    params: { surface, gender: gender ?? '', handle },
    revalidate: 3600,
    tags: [`collectionSeo:${surface}:${handle}`, 'collectionSeo'],
  })) as { post: PostShape | null } | null;

  if (!result?.post) return null;

  const sanityLocaleRaw = normalizeLocaleForSanity(locale);
  const sanityLocale = (await Promise.resolve(sanityLocaleRaw)) as 'ua' | 'ru';

  const canonical = result.post;
  const sibling = canonical.translations?.find(
    (t: TranslationEntry) => t?.language === sanityLocale,
  );
  const chosen: PostShape = sibling && sibling.body ? sibling : canonical;
  if (!chosen?.body) return null;

  const isUk = locale === 'uk';
  const showLabel = isUk ? 'Показати більше' : 'Показать больше';
  const hideLabel = isUk ? 'Згорнути' : 'Свернуть';

  return (
    <section
      aria-label="SEO description"
      className="mx-auto mt-12 max-w-4xl border-t border-foreground/10 pt-10 md:mt-16 md:pt-12"
    >
      <SeoCurtain
        showLabel={showLabel}
        hideLabel={hideLabel}
        collapsedHeight={280}
      >
        {chosen.title ? (
          <h2 className="mb-6 text-balance text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.15] text-foreground">
            {chosen.title}
          </h2>
        ) : null}
        <div className="prose-none">
          <PortableText
            value={chosen.body as never}
            components={components as never}
          />
        </div>
      </SeoCurtain>
    </section>
  );
}
