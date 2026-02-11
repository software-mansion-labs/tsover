import { defineConfig } from "vite";
import tsover from "tsover/plugin/vite";

export default defineConfig({
  plugins: [tsover()],
});
