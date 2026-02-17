// @ts-check

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath: '/tsover',
  serverExternalPackages: ['typescript', 'twoslash'],
  reactStrictMode: true,
};

export default withMDX(config);
