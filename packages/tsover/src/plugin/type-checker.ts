/**
 * TypeScript program manager with caching
 */

import ts from "tsover";
import * as path from "path";

const cachedProgram: ts.Program | null = null;
const cachedConfigPath: string | null = null;

export interface ProgramManagerOptions {
  tsconfigPath?: string;
}

export class ProgramManager {
  private program: ts.Program | null = null;
  private configPath: string;
  private options: ts.CompilerOptions;
  private host: ts.CompilerHost;

  constructor(options: ProgramManagerOptions = {}) {
    this.configPath = this.resolveConfigPath(options.tsconfigPath);
    this.host = ts.createCompilerHost({});
    this.options = this.loadCompilerOptions();
    this.program = this.createProgram();
  }

  private resolveConfigPath(tsconfigPath?: string): string {
    if (tsconfigPath) {
      return path.resolve(tsconfigPath);
    }

    const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");

    if (!configPath) {
      throw new Error(
        "Could not find tsconfig.json. Please ensure you have a tsconfig.json in your project root " +
          "or specify a custom path via the tsconfigPath option.",
      );
    }

    return configPath;
  }

  private loadCompilerOptions(): ts.CompilerOptions {
    const configFile = ts.readConfigFile(this.configPath, ts.sys.readFile);

    if (configFile.error) {
      const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
      throw new Error(`Failed to read tsconfig.json at ${this.configPath}:\n${message}`);
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(this.configPath),
    );

    if (parsedConfig.errors.length > 0) {
      const errors = parsedConfig.errors
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
        .join("\n");
      throw new Error(`Failed to parse tsconfig.json at ${this.configPath}:\n${errors}`);
    }

    return parsedConfig.options;
  }

  private createProgram(): ts.Program {
    // Get all source files from the configuration
    const configFile = ts.readConfigFile(this.configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(this.configPath),
    );

    const program = ts.createProgram(parsedConfig.fileNames, this.options, this.host);

    // Check for diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
              diagnostic.start,
            );
            return `  at ${diagnostic.file.fileName}:${line + 1}:${character + 1}\n    ${message}`;
          }
          return `  ${message}`;
        })
        .join("\n\n");

      throw new Error(
        `Type checking failed for project at ${this.configPath}:\n\n${errorMessages}`,
      );
    }

    return program;
  }

  getProgram(): ts.Program {
    if (!this.program) {
      throw new Error("Program has been destroyed");
    }
    return this.program;
  }

  getTypeChecker(): ts.TypeChecker {
    return this.getProgram().getTypeChecker();
  }

  getSourceFile(fileName: string): ts.SourceFile | undefined {
    return this.getProgram().getSourceFile(fileName);
  }

  destroy(): void {
    this.program = null;
  }
}

/**
 * Get or create a cached program manager
 */
export function getProgramManager(options?: ProgramManagerOptions): ProgramManager {
  // For now, we create a new manager each time since we're caching indefinitely
  // within each manager instance
  return new ProgramManager(options);
}
