import { defineQuery } from 'next-sanity';

// Utility query to get all locales
export const LOCALES_QUERY = defineQuery(
  `*[_type == "locale"]|order(default, name asc){
    _id,
    tag,
    name,
    default,
    fallback->{tag}
  }`,
);

// Utility query to get default locale
export const DEFAULT_LOCALE_QUERY = defineQuery(
  `*[_type == "locale" && default == true][0].tag`,
);

// Utility query to get posts with fallback support - prioritizes current language, then falls back to English/default
export const POSTS_WITH_FALLBACK_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && (language == $language || language == "en" || !defined(language))] | order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  }
}`);

export const POSTS_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current)]|order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  }
}`);

// Get posts for specific language with English fallback - Ukrainian posts first
export const POSTS_BY_LANGUAGE_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && hideFromBlogList != true && (language == $language || !defined(language))] | order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  }
}`);

// Debug query for Ukrainian posts specifically
export const POSTS_UA_DEBUG_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && language == "uk"] | order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  }
}`);

// Debug query to see all posts with their languages
export const ALL_POSTS_DEBUG_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  language,
  "hasLanguage": defined(language)
}`);

export const POSTS_SLUGS_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && hideFromBlogList != true]{
  "slug": slug.current,
  language
}`);

export const POSTS_SLUGS_BY_LANGUAGE_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && language == $language]{
  "slug": slug.current,
  language
}`);

export const PAGE_SLUGS_QUERY =
  defineQuery(`*[_type == "page" && defined(slug.current)]{
  "slug": slug.current,
  language
}`);

export const POST_QUERY =
  defineQuery(`*[_type == "post" && slug.current == $slug][0]{
  _id,
  title,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  },
  relatedPosts[]{
    _key,
    ...@->{_id, title, slug, language, mainImage { ..., asset-> { _id, url, metadata { dimensions } }, alt }, publishedAt}
  },
  "seo": {
  "title": coalesce(seo.title, title, ""),
    "description": coalesce(seo.description,  ""),
    "image": seo.image,
    "noIndex": seo.noIndex == true
   },
}`);

// Get single post by language with English fallback - prioritizes exact language match
export const POST_BY_LANGUAGE_QUERY =
  defineQuery(`*[_type == "post" && slug.current == $slug && (language == $language || !defined(language))][0]{
  _id,
  title,
  body,
  hideFromBlogList,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "slug": slug.current,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  },
  relatedPosts[]{
    _key,
    ...@->{_id, title, slug, language, mainImage { ..., asset-> { _id, url, metadata { dimensions } }, alt }, publishedAt}
  },
  "seo": {
  "title": coalesce(seo.title, title, ""),
    "description": coalesce(seo.description,  ""),
    "image": seo.image,
    "noIndex": seo.noIndex == true
   },
  "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
    "slug": slug.current,
    language
  },
}`);

// Get posts with English fallback - separate query for fallback logic
export const POSTS_EN_FALLBACK_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && (language == "en" || !defined(language))] | order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  }
}`);

// Get single post with English fallback
export const POST_WITH_FALLBACK_QUERY =
  defineQuery(`*[_type == "post" && slug.current == $slug && (language == "en" || !defined(language))][0]{
  _id,
  title,
  body,
  mainImage {
    ...,
    asset-> { _id, url, metadata { dimensions } },
    alt
  },
  publishedAt,
  language,
  "categories": coalesce(
    categories[]->{
      _id,
      slug,
      title
    },
    []
  ),
  author->{
    name,
    image
  },
  relatedPosts[]{
    _key,
    ...@->{_id, title, slug, language, mainImage { ..., asset-> { _id, url, metadata { dimensions } }, alt }, publishedAt}
  },
  "seo": {
  "title": coalesce(seo.title, title, ""),
    "description": coalesce(seo.description,  ""),
    "image": seo.image,
    "noIndex": seo.noIndex == true
   },
}`);

export const PAGE_QUERY =
  defineQuery(`*[_type == "page" && slug == $slug && language == $language][0]{
  ...,
  "seo": {
  "title": coalesce(seo.title, title, ""),
    "description": coalesce(seo.description,  ""),
    "image": seo.image,
    "noIndex": seo.noIndex == true
   },
  content[]{
    ...,
    _type == "contentPageBlock" => {
      body[]{
        ...,
        markDefs[]{
          ...,
          _type == "link" => {
            ...,
            "href": string(@.href)
          }
        }
      }
    },
    _type == "similarProducts" => {
      collection -> {
        _id,
        title,
        store{
         imageUrl,
         isDeleted,
         slug{
         current
         },
         title
        }
      }
    },
    _type == "sliderBlock" => {
      slides[]{
         ...,
        _key,
        link[]{
         ...,
         reference->{
           _id,
           _type,
           title,
           "slug": select(
             _type == "product" => store.slug.current,
             _type == "collection" => store.slug.current,
             _type == "page" => slug.current
           )
         }
       },
        backgroundImage{
          asset->{
            _id,
            url,
            metadata{dimensions}
          },
          "alt": coalesce(alt[$language], alt.uk, alt.ru)
        }
      }
    },
    _type == "productCarousel" => {
      products[]->{
        _id,
        store{
          title,
          isDeleted,
          previewImageUrl,
          priceRange{
          maxVariantPrice,
          minVariantPrice
          },
          productType
        }
      },
      collection -> {
        _id,
        title,
        store{
         imageUrl,
         isDeleted,
         slug{
         current
         },
         title
        }
      }
    },
    _type == "collectionsCarousel" => {
      collections[]->{
        _id,
        title,
        store{
         imageUrl,
         isDeleted,
         slug{
         current
         },
         title
        },
        "image": { 
          "url": coalesce(image.asset->url, store.imageUrl),
          "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
        }
      }
    },
    _type == "splitImage" => {
      ...,
      image{
        asset->{
          _id,
          url,
          metadata{dimensions}
        },
        "alt": coalesce(alt[$language], alt.uk, alt.ru)
      },
      link[]{
        ...,
        reference->{
          _id,
          _type,
          title,
          "slug": select(
            _type == "product" => store.slug.current,
            _type == "collection" => store.slug.current,
            _type == "page" => slug.current
          )
        }
      }
    },
    _type == "faqs" => {
      ...,
      items[]{ _key, icon, label }
    }
  }
}`);
export const HOME_PAGE =
  defineQuery(`*[_type == "page" && slug == $slug  && language == $language][0]{
    ...,
    "_translations": *[_type == "translation.metadata" && references(^._id)].translations[].value->{
      title,
      slug,
      language
    },
    "seo": {
    "title": coalesce(seo.title, title, ""),
      "description": coalesce(seo.description,  ""),
      "image": seo.image,
      "noIndex": seo.noIndex == true
     },
    content[]{
      ...,
      _type == "mainCollectionGrid" => {
           ...,
           "title": coalesce(title[$language], title.uk, title.ru),
           "collections": collections[]->{
             title,
             "handle": store.slug.current,
             "id": store.id,
             handles,
             titles,
             "image": { 
               "url": coalesce(image.asset->url, store.imageUrl),
               "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
             }
           }
        },
        _type == "productCarousel" => {
             ...,
             "title": coalesce(title[$language], title.uk, title.ru),
             "collection": collection->{
               title,
               "handle": store.slug.current,
               "id": store.id,
               handles,
               titles
             }
          },
          _type == "popularPosts" => {
            ...,
            "title": coalesce(title[$language], title.uk, title.ru),
            "posts": posts[]->{
              _id,
              title,
              slug,
              mainImage {
                ...,
                asset-> { _id, url, metadata { dimensions } },
                "alt": coalesce(alt, ^.title)
              },
              publishedAt,
              language,
              "categories": coalesce(categories[]->{_id, slug, title}, []),
              author->{ name, image },
              "localizedVersion": *[_type == "translation.metadata" && references(^._id)][0].translations[_key == $language][0].value->{
                _id,
                title,
                slug,
                mainImage {
                  ...,
                  asset-> { _id, url, metadata { dimensions } },
                  "alt": coalesce(alt, ^.title)
                },
                publishedAt,
                language
              }
            }
          },
          _type == "splitImage" => {
               ...,
               "title": coalesce(title[$language], title.uk, title.ru),
               image {
                 asset->{
                   _id,
                   url,
                   metadata{dimensions}
                 },
                 "alt": coalesce(alt[$language], alt.uk, alt.ru)
               },
               "collection": collection->{
                 title,
                 "handle": store.slug.current,
                 "id": store.id,
                 handles,
                 titles
               }
            },
            _type == "features" => {
              _key,
              _type,
              "features": features[] {
                _key,
                _type,
                "title": coalesce(title[$language], title.uk, title.ru),
                "text": coalesce(text[$language], text.uk, text.ru),
              }
            },
            _type == "collectionsWithPreviews" => {
              _key,
              _type,
              "title": coalesce(title[$language], title.uk, title.ru),
              previews,
              "collections": collections[]{
                _key,
                customTitle,
                "collection": collection->{
                  _id,
                  store{ slug{ current }, title },
                  handles,
                  titles
                }
              }
            },
        _type == "brandGridBlock" => {
  ...,
  "title": coalesce(title[$language], title.uk, title.ru),
  "barnds": barnds[]{
      ...,
    "alt": coalesce(alt[$language], alt.uk, alt.ru),
    "collectionData": collection-> {
       title,
                "handle": store.slug.current,
                "id": store.id,
                handles,
                titles,
                "image": { "url": store.imageUrl }
        }
  }
},
            _type == "collectionsCarousel" => {
              ...,
              "title": coalesce(title[$language], title.uk, title.ru),
              "action_text": coalesce(action_text[$language], action_text.uk, action_text.ru),
               "collections": collections[]->{
             title,
             "handle": store.slug.current,
             "id": store.id,
             handles,
             titles,
             "image": { 
               "url": coalesce(image.asset->url, store.imageUrl),
               "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
             }
           }
            },
            _type == "sliderBlock" => {
              ...,
              slides[]{
                ...,
                "title": coalesce(title[$language], title.uk, title.ru),
                backgroundImage{
                  asset->{
                    _id,
                    url,
                    metadata{dimensions}
                  },
                  "alt": coalesce(alt[$language], alt.uk, alt.ru)
                }
              }
            },
            _type == "heroSlider" => {
              _type,
              _key,
              title,
              description,
              "videoFile": videoFile.asset->url,
              "videoFileWebm": videoFileWebm.asset->url,
              "videoPoster": videoPoster.asset->url,
              videoUrl,
              videoTitle,
              videoDescription,
              "videoTextPosition": videoTextPosition,
              "videoTitleColor": videoTitleColor.hex,
              "videoDescriptionColor": videoDescriptionColor.hex,
              videoLinkUrl,
              "videoCollection": videoCollection->{
                "handle": coalesce(handles[$language], handles.uk, store.slug.current),
                handles
              },
              videoOverlay {
                opacity,
                color { hex }
              },
              slides[]{
                ...,
                "titleColor": titleColor.hex,
                "descriptionColor": descriptionColor.hex,
                overlay { opacity, color { hex } },
                textBackground { opacity, color { hex }, padding, rounded },
                "imageAlt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru),
                "mobileImageAlt": coalesce(mobileImage.alt[$language], mobileImage.alt.uk, mobileImage.alt.ru),
                "collection": collection->{
                  title,
                  "handle": store.slug.current,
                  "id": store.id,
                  handles,
                  titles
                },
                buttons[]{
                  ...,
                  "collection": collection->{
                    title,
                    "handle": store.slug.current,
                    "id": store.id,
                    handles,
                    titles
                  }
                }
              }
            },
            _type == "faqs" => {
              ...,
              faqs[]->{
                _id,
                title,
                body,
                "text": pt::text(body)
              }
            },
            _type == "similarProducts" => {
              ...,
              collection->{
                 title,
          "slug": store.slug.current,
          "pageHandle": slug,
          "id": store.id,
          handles,
          titles
              }
            },
            _type == "sharedSectionRef" => {
              _key,
              _type,
              section->{
                _id,
                internalTitle,
                content[]{
                  ...,
                  _type == "popularPosts" => {
                    ...,
                    "title": coalesce(title[$language], title.uk, title.ru),
                    "posts": posts[]->{
                      _id,
                      title,
                      slug,
                      mainImage {
                        ...,
                        asset-> { _id, url, metadata { dimensions } },
                        "alt": coalesce(alt, ^.title)
                      },
                      publishedAt,
                      language,
                      "categories": coalesce(categories[]->{_id, slug, title}, []),
                      author->{ name, image },
                      "localizedVersion": *[_type == "translation.metadata" && references(^._id)][0].translations[_key == $language][0].value->{
                        _id,
                        title,
                        slug,
                        mainImage {
                          ...,
                          asset-> { _id, url, metadata { dimensions } },
                          "alt": coalesce(alt, ^.title)
                        },
                        publishedAt,
                        language
                      }
                    }
                  },
                  _type == "collectionsWithPreviews" => {
                    _key,
                    _type,
                    "title": coalesce(title[$language], title.uk, title.ru),
                    previews,
                    "collections": collections[]{
                      _key,
                      customTitle,
                      "collection": collection->{
                        _id,
                        store{ slug{ current }, title },
                        handles,
                        titles
                      }
                    }
                  },
                  _type == "brandGridBlock" => {
                    ...,
                    "title": coalesce(title[$language], title.uk, title.ru),
                    "barnds": barnds[]{
                      ...,
                      "alt": coalesce(alt[$language], alt.uk, alt.ru),
                      "collectionData": collection->{ _id, store{ slug{ current }, title } }
                    }
                  },
                  _type == "splitImage" => {
                    ...,
                    "title": coalesce(title[$language], title.uk, title.ru),
                    image {
                      asset->{
                        _id,
                        url,
                        metadata{dimensions}
                      },
                      "alt": coalesce(alt[$language], alt.uk, alt.ru)
                    },
                    "collection": collection->{
                      title,
                      "handle": store.slug.current,
                      "id": store.id,
                      handles,
                      titles
                    }
                  },
                  _type == "features" => {
                    _key,
                    _type,
                    "features": features[]{
                      _key,
                      _type,
                      "title": coalesce(title[$language], title.uk, title.ru),
                      "text": coalesce(text[$language], text.uk, text.ru)
                    }
                  },
                  _type == "collectionsCarousel" => {
                    ...,
                    "title": coalesce(title[$language], title.uk, title.ru),
                    "action_text": coalesce(action_text[$language], action_text.uk, action_text.ru),
                    "collections": collections[]->{
                      title,
                      "handle": store.slug.current,
                      "id": store.id,
                      handles,
                      titles,
                      "image": {
                        "url": coalesce(image.asset->url, store.imageUrl),
                        "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
                      }
                    }
                  },
                  _type == "collectionBannerGrid" => {
                    _key,
                    _type,
                    "banners": banners[]{
                      _key,
                      "title": coalesce(title[$language], title.uk, title.ru),
                      customUrl,
                      image{
                        asset->{ _id, url, metadata{ dimensions } },
                        "alt": coalesce(alt[$language], alt.uk, alt.ru),
                        hotspot,
                        crop
                      },
                      "collection": collection->{
                        title,
                        "handle": store.slug.current,
                        "id": store.id,
                        handles,
                        titles
                      }
                    }
                  }
                }
              }
            },
            _type == "collectionBannerGrid" => {
              _key,
              _type,
              "banners": banners[]{
                _key,
                "title": coalesce(title[$language], title.uk, title.ru),
                customUrl,
                image{
                  asset->{ _id, url, metadata{ dimensions } },
                  "alt": coalesce(alt[$language], alt.uk, alt.ru),
                  hotspot,
                  crop
                },
                "collection": collection->{
                  title,
                  "handle": store.slug.current,
                  "id": store.id,
                  handles,
                  titles
                }
              }
            }
    }
  }`);

export const HOME_PAGE_QUERY = defineQuery(`*[_id == "siteSettings" ][0]{
    homePageMan->{
      ...,
      content[]{
        ...,
        _id,
        _type == "sliderBlock" => {
          slides[]{
             ...,
            _key,
            link[]{
             ...,
             reference->{
               _id,
               _type,
               title,
               "slug": select(
                 _type == "product" => store.slug.current,
                 _type == "collection" => store.slug.current,
                 _type == "page" => slug.current
               )
             }
           },
            backgroundImage{
              asset->{
                _id,
                url,
                metadata{dimensions}
              },
              "alt": coalesce(alt[$language], alt.uk, alt.ru)
            }
          }
        },
        _type == "productCarousel" => {
          products[]->{
            _id,
            store{
              title,
              isDeleted,
              previewImageUrl,
              priceRange{
              maxVariantPrice,
              minVariantPrice
              },
              productType
            }
          },
          collection -> {
            _id,
            title,
            store{
             imageUrl,
             isDeleted,
             slug{
             current
             },
             title
            }
          }
        },
        _type == "collectionsCarousel" => {
          collections[]->{
            _id,
            title,
            store{
             imageUrl,
             isDeleted,
             slug{
             current
             },
             title
            },
            "image": { 
              "url": coalesce(image.asset->url, store.imageUrl),
              "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
            }
          }
        },
        _type == "splitImage" => {
          ...,
          image {
            asset->{
              _id,
              url,
              metadata{dimensions}
            },
            "alt": coalesce(alt[$language], alt.uk, alt.ru)
          },
          description,
          link[]{
            ...,
            reference->{
              _id,
              _type,
              title,
              "slug": select(
                _type == "product" => store.slug.current,
                _type == "collection" => store.slug.current,
                _type == "page" => slug.current
              )
            }
          }
        },
        _type == "collectionsWithPreviews" => {
          ...,
          collections[]{
            ...,
            collection->{
              _id,
              store{ slug{ current }, title },
              handles,
              titles
            }
          }
        },
        _type == "faqs" => {
          ...,
          faqs[]->{
            _id,
            title,
            body,
            "text": pt::text(body)
          }
        },
        _type == "sharedSectionRef" => {
          section->{
            _id,
            internalTitle,
            content[]{
              ...,
              _type == "brandGridBlock" => {
                barnds[]{
                  ...,
                  asset->{ _id, url, metadata{dimensions} },
                  "alt": coalesce(alt[$language], alt.uk, alt.ru),
                  collection->{ _id, store{ slug{ current }, title } }
                }
              }
            }
          }
        }
      }
    },
    homePageWoman->{
      ...,
      content[]{
        ...,
        _id,
        _type == "sliderBlock" => {
          slides[]{
             ...,
            _key,
            link[]{
             ...,
             reference->{
               _id,
               _type,
               title,
               "slug": select(
                 _type == "product" => store.slug.current,
                 _type == "collection" => store.slug.current,
                 _type == "page" => slug.current
               )
             }
           },
            backgroundImage{
              asset->{
                _id,
                url,
                metadata{dimensions}
              },
              "alt": coalesce(alt[$language], alt.uk, alt.ru)
            }
          }
        },
        _type == "productCarousel" => {
          products[]->{
            _id,
            store{
              title,
              isDeleted,
              previewImageUrl,
              priceRange{
              maxVariantPrice,
              minVariantPrice
              },
              productType
            }
          },
          collection -> {
            _id,
            title,
            store{
             imageUrl,
             isDeleted,
             slug{
             current
             },
             title
            }
          }
        },
        _type == "collectionsCarousel" => {
          collections[]->{
            _id,
            title,
            store{
             imageUrl,
             isDeleted,
             slug{
             current
             },
             title
            },
            "image": { 
              "url": coalesce(image.asset->url, store.imageUrl),
              "alt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru)
            }
          }
        },
        _type == "splitImage" => {
          ...,
          image {
            asset->{
              _id,
              url,
              metadata{dimensions}
            },
            "alt": coalesce(alt[$language], alt.uk, alt.ru)
          },
          description,
          link[]{
            ...,
            reference->{
              _id,
              _type,
              title,
              "slug": select(
                _type == "product" => store.slug.current,
                _type == "collection" => store.slug.current,
                _type == "page" => slug.current
              )
            }
          }
        },
        _type == "collectionsWithPreviews" => {
          ...,
          collections[]{
            ...,
            collection->{
              _id,
              store{ slug{ current }, title },
              handles,
              titles
            }
          }
        },
        _type == "faqs" => {
          ...,
          faqs[]->{
            _id,
            title,
            body,
            "text": pt::text(body)
          }
        },
        _type == "sharedSectionRef" => {
          section->{
            _id,
            internalTitle,
            content[]{
              ...,
              _type == "brandGridBlock" => {
                barnds[]{
                  ...,
                  asset->{ _id, url, metadata{dimensions} },
                  "alt": coalesce(alt[$language], alt.uk, alt.ru),
                  collection->{ _id, store{ slug{ current }, title } }
                }
              }
            }
          }
        }
      }
    }
  }`);
export const REDIRECTS_QUERY = defineQuery(`
  *[_type == "redirect" && isEnabled == true] {
      source,
      destination,
      permanent
  }
`);

export const OG_IMAGE_QUERY = defineQuery(`
  *[_id == $id][0]{
    title,
    "image": mainImage.asset->{
      url,
      metadata {
        palette
      }
    }
  }
`);

export const SITE_LOGO_QUERY = defineQuery(`
  *[_type == 'siteSettings'][0]{
    "logo": header.icon.asset->{
      url
    },
    "logoAlt": coalesce(header.icon.alt[$language], header.icon.alt.uk, header.icon.alt.ru)
  }
`);
export const SITEMAP_QUERY = defineQuery(`
*[_type in ["page", "post"] && defined(slug.current)] {
    "href": select(
      _type == "page" => "/" + slug.current,
      _type == "post" => select(
        defined(language) => "/" + language + "/posts/" + slug.current,
        "/posts/" + slug.current
      ),
      slug.current
    ),
    _updatedAt,
    language
}
`);

export const HEADER_QUERY = defineQuery(`
  *[_type == 'siteSettings'][0]{
    infoBar {
      ...,
      telephone,
      viberPhone,
      "text": coalesce(text[$locale], text.uk, text.ru, ""),
      link {
        ...,
        "collectionData": reference-> {
          title,
          "handle": store.slug.current,
          "pageHandle": slug,
          "id": store.id,
          handles,
          titles
        }
      }
    },
    header {
      ...,
      categoryLinks[]{
        _key,
        "title": coalesce(title[$locale], title.uk, title.ru, ""),
        "collectionData": reference-> {
          title,
          "slug": store.slug.current,
          "pageHandle": slug,
          "id": store.id,
          handles,
          titles
        }
      },
      mainCategory[]{
        _key,
        "title": coalesce(title[$locale], title.uk, title.ru, ""),
        "collectionData": reference-> {
          title,
          "slug": store.slug.current,
          "pageHandle": slug,
          "id": store.id,
          handles,
          titles
        }
      }
    },
    brandsNavigation {
      "tabTitle": coalesce(tabTitle[$locale], tabTitle.uk, tabTitle.ru, ""),
      topBrandsWoman,
      topBrandsMan,
      collections[]{
        _key,
        "title": coalesce(title[$locale], title.uk, title.ru, ""),
        "collectionData": reference-> {
          title,
          "slug": store.slug.current,
          "pageHandle": slug,
          "id": store.id,
          handles,
          titles
        }
      }
    },
    navDropdowns {
      woman[]{
        _key,
        isBrandsTab,
        topBrands[]->{
          _id,
          "title": coalesce(titles[$locale], titles.uk, store.title, ""),
          "handle": coalesce(handles[$locale], handles.uk, store.slug.current),
        },
        "tabTitle": coalesce(tabTitle[$locale], tabTitle.uk, tabTitle.ru, tabCollection->titles[$locale], tabCollection->titles.uk, tabCollection->store.title, ""),
        "tabUrl": coalesce(tabUrl, tabCollection->handles[$locale], tabCollection->handles.uk, tabCollection->store.slug.current),
        tabImage {
          url,
          imageTitle,
          imageButtonLabel,
          imageButtonUrl,
          brandSlug,
          "imageUrl": image.asset->url,
          "imageWidth": image.asset->metadata.dimensions.width,
          "imageHeight": image.asset->metadata.dimensions.height,
          "alt": coalesce(image.alt[$locale], image.alt.uk, image.alt.ru),
          "collectionHandle": collection->store.slug.current,
          "collectionTitle": collection->store.title,
          "imageButtonCollectionHandle": imageButtonCollection->store.slug.current,
        },
        columns[]{
          _key,
          "title": coalesce(title[$locale], title.uk, title.ru, collection->titles[$locale], collection->titles.uk, collection->store.title, ""),
          "url": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
          items[]->{
            _id,
            "title": coalesce(navTitle[$locale], navTitle.uk, navTitle.ru, titles[$locale], titles.uk, store.title, ""),
            "handle": coalesce(handles[$locale], handles.uk, handles.ru, store.slug.current),
            "navTitleColor": navTitleColor
          },
          "outletLink": outletLink {
            "label": coalesce(label[$locale], label.uk, label.ru, ""),
            "collectionHandle": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
            url
          },
          "actionButton": actionButton {
            "label": coalesce(label[$locale], label.uk, label.ru, ""),
            "collectionHandle": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
            url
          }
        }
      },
      man[]{
        _key,
        isBrandsTab,
        topBrands[]->{
          _id,
          "title": coalesce(titles[$locale], titles.uk, store.title, ""),
          "handle": coalesce(handles[$locale], handles.uk, store.slug.current),
        },
        "tabTitle": coalesce(tabTitle[$locale], tabTitle.uk, tabTitle.ru, tabCollection->titles[$locale], tabCollection->titles.uk, tabCollection->store.title, ""),
        "tabUrl": coalesce(tabUrl, tabCollection->handles[$locale], tabCollection->handles.uk, tabCollection->store.slug.current),
        tabImage {
          url,
          imageTitle,
          imageButtonLabel,
          imageButtonUrl,
          brandSlug,
          "imageUrl": image.asset->url,
          "imageWidth": image.asset->metadata.dimensions.width,
          "imageHeight": image.asset->metadata.dimensions.height,
          "alt": coalesce(image.alt[$locale], image.alt.uk, image.alt.ru),
          "collectionHandle": collection->store.slug.current,
          "collectionTitle": collection->store.title,
          "imageButtonCollectionHandle": imageButtonCollection->store.slug.current,
        },
        columns[]{
          _key,
          "title": coalesce(title[$locale], title.uk, title.ru, collection->titles[$locale], collection->titles.uk, collection->store.title, ""),
          "url": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
          items[]->{
            _id,
            "title": coalesce(navTitle[$locale], navTitle.uk, navTitle.ru, titles[$locale], titles.uk, store.title, ""),
            "handle": coalesce(handles[$locale], handles.uk, handles.ru, store.slug.current),
            "navTitleColor": navTitleColor
          },
          "outletLink": outletLink {
            "label": coalesce(label[$locale], label.uk, label.ru, ""),
            "collectionHandle": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
            url
          },
          "actionButton": actionButton {
            "label": coalesce(label[$locale], label.uk, label.ru, ""),
            "collectionHandle": coalesce(collection->handles[$locale], collection->handles.uk, collection->store.slug.current),
            url
          }
        }
      }
    }
  }
`);

export const FOOTER_QUERY = defineQuery(`
  *[_type == 'siteSettings'][0]{
    footerSettings {
      socialLinks[] {
        platform,
        url
      },
      workingHours {
        uk,
        ru
      },
      address {
        uk,
        ru
      },
      paymentMethods
    }
  }
`);

export const PROMOTION_BANNER_QUERY = defineQuery(
  `*[_type == "promotionBanner" && (enabled == true || _id in path("drafts.**"))][0]{
    _id,
    enabled,
    image,
    "imageAlt": coalesce(image.alt[$language], image.alt.uk, image.alt.ru),
    desktopImage,
    "desktopImageAlt": coalesce(desktopImage.alt[$language], desktopImage.alt.uk, desktopImage.alt.ru),
    "title": coalesce(title[$language], title.uk, title.ru),
    "description": coalesce(description[$language], description.uk, description.ru)[],
    discountCode,
    actionButton {
      "label": coalesce(label[$language], label.uk, label.ru),
      url,
      womanUrl,
      manUrl,
      "womanCollection": womanCollection->{
        title,
        "handle": store.slug.current,
        handles,
        titles
      },
      "manCollection": manCollection->{
        title,
        "handle": store.slug.current,
        handles,
        titles
      }
    },
    behavior {
      trigger,
      delaySeconds,
      scrollPercent,
      cooldownHours,
      showOnce,
      resetToken
    }
  }`
);

export const COLLECTION_IS_BRAND_QUERY = defineQuery(
  `*[_type == "collection" && (store.slug.current == $handle || handles.uk == $handle || handles.ru == $handle)][0]{
    isBrand,
    customTitle,
    handles,
    titles,
    "handle": store.slug.current
  }`
);

// Look up a collectionSeo mapping by composite key (surface, gender?, collectionHandle)
// and resolve the referenced post plus all its translations (UA/RU siblings via
// translation.metadata) in a single round trip. The widget picks the locale-matching
// translation at render time. For `surface == "brand"` the gender check short-circuits;
// callers MUST still pass `gender: ""` (never undefined) because defineQuery validates
// param presence.
export const COLLECTION_SEO_QUERY = defineQuery(`
  *[_type == "collectionSeo"
    && surface == $surface
    && collectionHandle == $handle
    && ($surface == "brand" || gender == $gender)
  ][0]{
    _id,
    surface,
    gender,
    collectionHandle,
    "post": post->{
      _id,
      title,
      body,
      language,
      "slug": slug.current,
      "translations": *[_type == "translation.metadata" && references(^._id)][0]
        .translations[].value->{
          _id,
          title,
          body,
          language,
          "slug": slug.current
        }
    }
  }
`);
