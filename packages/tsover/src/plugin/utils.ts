/**
 * Utility functions for the plugin
 */

import ts from "./tsover";
import type TS from 'typescript';

/**
 * Generate a unique identifier for the tsover import
 * Avoids conflicts with existing identifiers in the file
 */
export function generateUniqueIdentifier(sourceFile: TS.SourceFile, baseName: string): string {
  const usedNames = new Set<string>();

  // Collect all identifiers in the file
  function visit(node: TS.Node) {
    if (ts.isIdentifier(node)) {
      usedNames.add(node.text);
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  // Find a unique name
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (usedNames.has(`${baseName}$${counter}`)) {
    counter++;
  }

  return `${baseName}$${counter}`;
}

/**
 * Check if an import for the given module already exists
 */
export function hasImport(
  sourceFile: TS.SourceFile,
  moduleName: string,
): TS.ImportDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName
    ) {
      return statement;
    }
  }
  return undefined;
}

/**
 * Get the identifier name from an import declaration
 */
export function getImportIdentifier(importDecl: TS.ImportDeclaration): string | undefined {
  if (!importDecl.importClause) return undefined;

  const namedBindings = importDecl.importClause.namedBindings;
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    return namedBindings.name.text;
  }

  return undefined;
}
