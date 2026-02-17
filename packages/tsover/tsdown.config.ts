import { defineConfig } from 'tsdown';

export default defineConfig({
  format: ['cjs'],
  entry: {
    plugin: 'src/plugin/index.ts',
    'plugin/vite': 'src/plugin/vite.ts',
    'plugin/webpack': 'src/plugin/webpack.ts',
    'plugin/rollup': 'src/plugin/rollup.ts',
    'plugin/esbuild': 'src/plugin/esbuild.ts',
    'plugin/rspack': 'src/plugin/rspack.ts',
  },
  platform: 'node',
  external: ['tsover'],
});
