/**
 * Unplugin for TypeScript operator overloading
 */

import { createUnplugin, type UnpluginFactory } from "unplugin";
import { ProgramManager } from "./type-checker.js";
import { transformSourceFile } from "./transform.js";

export interface TsOverPluginOptions {
  /**
   * Path to tsconfig.json. If not provided, will search for it in the project root.
   */
  tsconfigPath?: string;

  /**
   * Module name to import the runtime from. Defaults to 'tsover'.
   */
  moduleName?: string;

  /**
   * Include patterns for files to transform. Defaults to all TypeScript files.
   */
  include?: string | string[];

  /**
   * Exclude patterns for files to skip. Defaults to node_modules.
   */
  exclude?: string | string[];
}

/**
 * Factory function for creating the tsover unplugin
 */
export const unpluginFactory: UnpluginFactory<TsOverPluginOptions | undefined> = (
  options = {},
) => {
  const {
    tsconfigPath,
    moduleName = "tsover",
    include,
    exclude = "node_modules/**",
  } = options;

  // Initialize the TypeScript program manager (cached indefinitely)
  let programManager: ProgramManager;

  // Compile include/exclude patterns
  const includePatterns = include
    ? Array.isArray(include)
      ? include
      : [include]
    : ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];

  const excludePatterns = exclude
    ? Array.isArray(exclude)
      ? exclude
      : [exclude]
    : ["node_modules/**"];

  return {
    name: "tsover",
    enforce: "pre", // Run before other transforms

    buildStart() {
      // Initialize the program manager at build start
      try {
        programManager = new ProgramManager({ tsconfigPath });
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`[tsover] Failed to initialize: ${error.message}`, {
            cause: error,
          });
        }
        throw error;
      }
    },

    transformInclude(id: string) {
      // Only process TypeScript files
      return shouldTransform(id, includePatterns, excludePatterns);
    },

    transform(code: string, id: string) {
      try {
        // Get the source file from the program
        const sourceFile = programManager.getSourceFile(id);

        if (!sourceFile) {
          // File is not part of the TypeScript program, create a temporary source file
          // This might happen for virtual files or files not included in tsconfig
          return null;
        }

        // Get the type checker
        const checker = programManager.getTypeChecker();

        // Transform the file
        const result = transformSourceFile({
          checker,
          sourceFile,
          moduleName,
        });

        // If no changes were made, return null
        if (result.code === code) {
          return null;
        }

        // Return the transformed code with source map
        return {
          code: result.code,
          map: result.map,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(
            `[tsover] Failed to transform ${id}:\n${error.message}`,
            {
              cause: error,
            },
          );
        }
        throw error;
      }
    },

    buildEnd() {
      // Clean up the program manager
      if (programManager) {
        programManager.destroy();
      }
    },
  };
};

/**
 * Create the unplugin instance
 */
export const unplugin = createUnplugin(unpluginFactory);

/**
 * Vite plugin - for backward compatibility and convenience
 * @deprecated Use `unplugin.vite` instead
 */
export const vitePlugin = unplugin.vite;

/**
 * Webpack plugin
 */
export const webpackPlugin = unplugin.webpack;

/**
 * Rollup plugin
 */
export const rollupPlugin = unplugin.rollup;

/**
 * esbuild plugin
 */
export const esbuildPlugin = unplugin.esbuild;

/**
 * Rspack plugin
 */
export const rspackPlugin = unplugin.rspack;

/**
 * Check if a file should be transformed based on include/exclude patterns
 */
function shouldTransform(
  id: string,
  include: string[],
  exclude: string[],
): boolean {
  const { minimatch } = require("minimatch");

  // Check exclude patterns first
  for (const pattern of exclude) {
    if (minimatch(id, pattern) || minimatch(id, pattern, { matchBase: true })) {
      return false;
    }
  }

  // Check include patterns
  for (const pattern of include) {
    if (minimatch(id, pattern) || minimatch(id, pattern, { matchBase: true })) {
      return true;
    }
  }

  return false;
}
