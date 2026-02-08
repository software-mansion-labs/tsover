/**
 * esbuild plugin for TypeScript operator overloading
 */

import { unplugin } from "./index.js";

export const esbuildPlugin = unplugin.esbuild;
export default esbuildPlugin;
