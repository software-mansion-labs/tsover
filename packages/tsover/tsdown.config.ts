import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/plugin/index.ts"],
  platform: "neutral",
  alias: {
    tsover: "./dist/index.mjs",
  },
});
