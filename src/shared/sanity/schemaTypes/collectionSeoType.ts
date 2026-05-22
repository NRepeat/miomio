import { LinkIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const collectionSeoType = defineType({
  name: 'collectionSeo',
  title: 'Collection SEO mapping',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      description: 'e.g. "Bikkembergs (brand)" — for Studio listing only.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'surface',
      type: 'string',
      options: {
        list: [
          { title: 'Brand page', value: 'brand' },
          { title: 'Gender collection page', value: 'gender' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'gender',
      type: 'string',
      options: {
        list: [
          { title: 'Woman', value: 'woman' },
          { title: 'Man', value: 'man' },
          { title: 'Kids', value: 'kids' },
        ],
        layout: 'radio',
      },
      description: 'Required when surface = "gender". "kids" reserved for future use.',
      hidden: ({ parent }) => parent?.surface !== 'gender',
      validation: (r) =>
        r.custom((val, ctx) => {
          const surface = (ctx.parent as { surface?: string })?.surface;
          if (surface === 'gender' && !val) return 'Gender is required when surface is "gender"';
          return true;
        }),
    }),
    defineField({
      name: 'collectionHandle',
      type: 'string',
      description: 'Shopify collection handle (e.g. "bikkembergs", "zhinochi-baletky-ta-mokasyny").',
      validation: (r) =>
        r.required().regex(/^[a-z0-9-]+$/, { name: 'handle', invert: false }),
    }),
    defineField({
      name: 'post',
      type: 'reference',
      to: [{ type: 'post' }],
      weak: true,
      description: 'UA copy by convention. RU sibling resolved via translation.metadata.',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      surface: 'surface',
      gender: 'gender',
      handle: 'collectionHandle',
    },
    prepare({ title, surface, gender, handle }) {
      const tag = surface === 'gender' ? `${gender}/${handle}` : `brand/${handle}`;
      return { title, subtitle: tag };
    },
  },
});
