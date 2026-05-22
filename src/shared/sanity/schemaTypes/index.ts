import { elegantEaseType } from './blocks/elegantEaseType';
import { productCommentsType } from './blocks/productCommentsType';
import { sharedSectionType } from './sharedSectionType';
import { sharedSectionRef } from './blocks/sharedSectionRefType';
import { type SchemaTypeDefinition } from 'sanity';
import { contentBlocksType } from './contentBlocksType';
import { blockCatalogType } from './blockCatalogType';

import { blockContentType } from './blockContentType';
import { categoryType } from './categoryType';
import { postType } from './postType';
import { authorType } from './authorType';
import { faqsType } from './blocks/faqsType';
import { faqType } from './blocks/faqType';
import { featuresType } from './blocks/featuresType';
import { heroType } from './blocks/heroType';
import { splitImageType } from './blocks/splitImageType';
import { pageBuilderType } from './pageBuilderType';
import { pageType } from './pageType';
import { siteSettingsType } from './siteSettingsType';
import { seoType } from './seoType';
import { redirectType } from './redirectType';
import { socialType } from './socialType';
import { localeType } from './localeType';
import simpleBlockContent from './simpleBlockContent';
import { shopifySchemaTypes } from './shopify/shemas';
import { productCarousel } from './blocks/productCarousel';
import { collectionsCarousel } from './blocks/collectionsCarouselWithActionButton';
import { localizedString } from './localizedStringType';
import { localizedText } from './localizedText';
import { localizedBlockContent } from './localizedBlockContentType';
import { localizedSimpleBlockContent } from './localizedSimpleBlockContentType';
import { sliderBlock } from './blocks/slider';
import { similarProducts } from './blocks/similarProducts';
import { contentPageBlock } from './blocks/contentPageBlock';
import { mainCollectionGrid } from './blocks/mainCollectionGrid';
import { topicType } from './blocks/topicType';
import { productDetailsType } from './blocks/productDetailsType';
import { heroSlide, heroSlideButton, heroSlider } from './blocks/heroSlider';
import { infoBar } from './blocks/info-bar';
import { headerType } from './headerType';
import { brandGridBlock } from './blocks/brendGrid';
import { collectionsWithPreviews } from './blocks/collection-with-images';
import { popularPosts } from './blocks/popularPosts';
import { brandsNavigation } from './blocks/brandsNavigation';
import { navImageItem } from './blocks/navImageItem';
import { navDropdownImages } from './blocks/navDropdownImages';
import { footerSettings } from './shopify/shemas/objects/global/footer';
import { promotionBannerType } from './blocks/promotionBannerType';
import { collectionBannerGrid } from './blocks/collectionBannerGrid';
import { collectionSeoType } from './collectionSeoType';

// const blocks = [heroSlider, heroSlide, mainCollectionGrid];

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Reusable block types
    sharedSectionType,
    sharedSectionRef,
    contentBlocksType,
    blockCatalogType,

    collectionsWithPreviews,
    brandsNavigation,
    navImageItem,
    navDropdownImages,
    footerSettings,
    brandGridBlock,
    infoBar,
    headerType,
    ...shopifySchemaTypes,
    localizedText,
    localizedBlockContent,
    localizedSimpleBlockContent,
    sliderBlock,
    collectionsCarousel,
    productCarousel,
    simpleBlockContent,
    localeType,
    localizedString,
    socialType,
    blockContentType,
    redirectType,
    categoryType,
    siteSettingsType,
    seoType,
    postType,
    authorType,
    pageType,
    pageBuilderType,
    faqType,
    faqsType,
    featuresType,
    heroType,
    splitImageType,
    similarProducts,
    contentPageBlock,
    topicType,
    productDetailsType,
    elegantEaseType,
    productCommentsType,
    heroSlideButton,
    heroSlide,
    heroSlider,
    mainCollectionGrid,
    popularPosts,
    promotionBannerType,
    collectionBannerGrid,
    collectionSeoType,
  ],
};
