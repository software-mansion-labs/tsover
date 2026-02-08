import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/plugin/index.ts",
    "src/plugin/vite.ts",
    "src/plugin/webpack.ts",
    "src/plugin/rollup.ts",
    "src/plugin/esbuild.ts",
    "src/plugin/rspack.ts",
  ],
  platform: "neutral",
  alias: {
    tsover: "./dist/index.mjs",
  },
});
