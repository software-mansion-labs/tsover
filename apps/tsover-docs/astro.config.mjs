// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
			title: 'tsover',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/software-mansion-labs/tsover' }],
			sidebar: [
          {
              label: 'Guides',
              items: [
                  // Each item here is one entry in the navigation menu.
                  { label: 'Getting Started', slug: 'guides/getting-started' },
              ],
          },
          {
              label: 'Reference',
              autogenerate: { directory: 'reference' },
          },
			],
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
