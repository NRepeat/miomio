import { CollectionGrid } from '@features/collection/ui/CollectionGrid';
import { CollectionGridSkeleton } from '@features/collection/ui/CollectionGridSkeleton';
import { locales } from '@shared/i18n/routing';
import { Suspense } from 'react';
import { Metadata } from 'next';
import {
  getCollection,
  getCollectionSlugs,
} from '@entities/collection/api/getCollection';
import {
  resolveCollectionHandle,
  detectGenderFromHandle,
} from '@entities/collection/lib/resolve-handle';
import { generateCollectionMetadata } from '@shared/lib/seo/generateMetadata';
import { stripInvisible } from '@shared/lib/seo/generateMetadata';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { sanityFetch } from '@shared/sanity/lib/sanityFetch';
import { COLLECTION_IS_BRAND_QUERY } from '@shared/sanity/lib/query';
import { redirect, notFound } from 'next/navigation';
import { isDevEmail, isDevOnlyHandle } from '@shared/lib/dev-access';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/ui/breadcrumb';
import { EnableScrollHide } from '@shared/ui/EnableScrollHide';
import { CollectionSeoContent } from '@widgets/collection-seo-content';

export type SearchParams = { [key: string]: string | string[] | undefined };

export type Props = {
  params: Promise<{ locale: string; slug: string; gender: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale, gender } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const allSlugs = await getCollectionSlugs();
  const resolvedHandle = resolveCollectionHandle(
    decodedSlug,
    gender,
    new Set(allSlugs),
  );

  const [{ collection, alternateHandle }, sanityCollection] =
    await Promise.all([
      getCollection({
        handle: resolvedHandle,
        locale,
        first: 1,
      }),
      sanityFetch({
        query: COLLECTION_IS_BRAND_QUERY,
        params: { handle: resolvedHandle },
        tags: [`collection:${resolvedHandle}`],
      }),
    ]);

  if (!collection.collection?.id) {
    notFound();
  }

  const displayTitle =
    sanityCollection?.customTitle?.[locale as 'uk' | 'ru'] ||
    collection.collection.title;

  return generateCollectionMetadata(
    {
      ...collection.collection,
      title: displayTitle,
    },
    locale,
    slug,
    gender,
    alternateHandle,
  );
}

const genders = ['woman', 'man'];

export async function generateStaticParams() {
  try {
    const collectionSlugs = await getCollectionSlugs();
    const params = [];

    for (const locale of locales) {
      for (const gender of genders) {
        for (const slug of collectionSlugs) {
          params.push({ locale, gender, slug });
        }
      }
    }

    return params;
  } catch (error) {
    console.error('Failed to generate static params for collections:', error);
    return [];
  }
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale, slug, gender } = await params;
  setRequestLocale(locale);

  const allowedGenders = ['man', 'woman'];
  if (allowedGenders.includes(slug) && slug === gender) {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);
  const allSlugs = await getCollectionSlugs();
  const resolvedHandle = resolveCollectionHandle(
    decodedSlug,
    gender,
    new Set(allSlugs),
  );

  if (isDevOnlyHandle(resolvedHandle) && !(await isDevEmail())) {
    notFound();
  }
  const [sanityCollection, { collection }, t] = await Promise.all([
    sanityFetch({
      query: COLLECTION_IS_BRAND_QUERY,
      params: { handle: resolvedHandle },
      tags: [`collection:${resolvedHandle}`],
    }),
    getCollection({ handle: resolvedHandle, first: 1, locale }),
    getTranslations('Header'),
  ]);

  if (sanityCollection?.isBrand) {
    redirect(`/${locale}/brand/${resolvedHandle}`);
  }

  const canonicalHandle = collection.collection?.handle;

  if (canonicalHandle && resolvedHandle !== canonicalHandle) {
    redirect(`/${locale}/${gender}/${canonicalHandle}`);
  }

  if (canonicalHandle) {
    const collectionGender = detectGenderFromHandle(canonicalHandle);
    if (collectionGender && collectionGender !== gender) {
      redirect(`/${locale}/${collectionGender}/${canonicalHandle}`);
    }
  }

  const displayTitle = stripInvisible(
    sanityCollection?.customTitle?.[locale as 'uk' | 'ru'] ||
      collection.collection?.title ||
      '',
  );

  return (
    <div className="container mb-10">
      <div className="flex flex-col mt-8">
        <Breadcrumb className="mb-4 md:mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${locale}`}>
                {t('nav.home')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${locale}/${gender}`}>
                {gender === 'man' ? t('nav.man') : t('nav.woman')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{displayTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <EnableScrollHide />

        {displayTitle && (
          <h1 className="text-2xl font-bold mb-4">{displayTitle}</h1>
        )}

        <Suspense fallback={<CollectionGridSkeleton />}>
          <CollectionGrid
            params={params}
            searchParams={searchParams}
            displayTitle={displayTitle}
          />
        </Suspense>

        <CollectionSeoContent
          surface="gender"
          gender={gender}
          handle={resolvedHandle}
          locale={locale}
        />
      </div>
    </div>
  );
}
