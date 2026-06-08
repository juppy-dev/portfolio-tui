// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

export default defineConfig({
  site: 'https://juppy.dev',
  integrations: [
    react(),
    markdoc(),
    sitemap(),
    ...(process.env.SKIP_KEYSTATIC ? [] : [keystatic()]),
  ],
});
