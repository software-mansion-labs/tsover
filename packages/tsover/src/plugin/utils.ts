/**
 * Utility functions for the plugin
 */

import ts from "tsover";

/**
 * Generate a unique identifier for the tsover import
 * Avoids conflicts with existing identifiers in the file
 */
export function generateUniqueIdentifier(sourceFile: ts.SourceFile, baseName: string): string {
  const usedNames = new Set<string>();

  // Collect all identifiers in the file
  function visit(node: ts.Node) {
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
export function hasNamespaceImport(
  sourceFile: ts.SourceFile,
  moduleName: string,
): ts.ImportDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName &&
      statement.importClause?.namedBindings?.kind === ts.SyntaxKind.NamespaceImport
    ) {
      return statement;
    }
  }
  return undefined;
}

/**
 * Get the identifier name from an import declaration
 */
export function getImportIdentifier(importDecl: ts.ImportDeclaration): string | undefined {
  if (!importDecl.importClause) return undefined;

  const namedBindings = importDecl.importClause.namedBindings;
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    return namedBindings.name.text;
  }

  return undefined;
}

export const opToRuntimeFn = {
  [ts.SyntaxKind.PlusToken]: "add",
  [ts.SyntaxKind.PlusEqualsToken]: "add",
  [ts.SyntaxKind.MinusToken]: "sub",
  [ts.SyntaxKind.MinusEqualsToken]: "sub",
  [ts.SyntaxKind.AsteriskToken]: "mul",
  [ts.SyntaxKind.AsteriskEqualsToken]: "mul",
  [ts.SyntaxKind.SlashToken]: "div",
  [ts.SyntaxKind.SlashEqualsToken]: "div",
};

export const assignmentOps = [
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
];
