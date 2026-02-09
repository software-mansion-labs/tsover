import { defineConfig } from "tsdown";

export default defineConfig({
  format: ["cjs", "esm"],
  entry: [
    "src/runtime/index.ts",
    "src/plugin/index.ts",
    "src/plugin/vite.ts",
    "src/plugin/webpack.ts",
    "src/plugin/rollup.ts",
    "src/plugin/esbuild.ts",
    "src/plugin/rspack.ts",
  ],
  platform: "neutral",
  external: ["../../lib/typescript.js"],
  alias: {
    typescript: "../../lib/typescript.js",
  },
});
