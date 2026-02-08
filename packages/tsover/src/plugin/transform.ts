/**
 * AST transformation logic
 */

import ts from "./tsover.js";
import { shouldTransformBinaryExpression } from "./type-detection.js";
import {
  generateUniqueIdentifier,
  hasImport,
  getImportIdentifier,
} from "./utils.js";

export interface TransformResult {
  code: string;
  map?: string;
}

export interface TransformOptions {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  moduleName?: string;
}

/**
 * Transform a source file to replace + operators with tsover.plus() calls
 */
export function transformSourceFile(
  options: TransformOptions,
): TransformResult {
  const { checker, sourceFile, moduleName = "tsover" } = options;

  // Track if we need to add an import
  let needsImport = false;
  let importIdentifier: string | undefined = undefined;

  // Check for existing import
  const existingImport = hasImport(sourceFile, moduleName);
  if (existingImport) {
    importIdentifier = getImportIdentifier(existingImport);
  }

  // Create a transformer that visits all binary expressions
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (sourceFile) => {
      function visit(node: ts.Node): ts.Node {
        // Check if this is a binary expression with + operator
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.PlusToken
        ) {
          // Check if either operand has operator overloading
          if (shouldTransformBinaryExpression(node, checker)) {
            needsImport = true;

            // Generate unique identifier if we haven't already
            if (!importIdentifier) {
              importIdentifier = generateUniqueIdentifier(sourceFile, "tso");
            }

            // Replace a + b with tsover.plus(a, b)
            return ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier(importIdentifier!),
                "plus",
              ),
              undefined, // type arguments
              [
                ts.visitNode(node.left, visit) as ts.Expression,
                ts.visitNode(node.right, visit) as ts.Expression,
              ],
            );
          }
        }

        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  };

  // Apply the transformation
  const result = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = result.transformed[0];

  // Add import statement if needed
  let finalSourceFile = transformedSourceFile;
  if (needsImport && !existingImport && importIdentifier) {
    finalSourceFile = addImportStatement(
      transformedSourceFile,
      importIdentifier,
      moduleName,
    );
  }

  // Print the transformed code
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const transformedCode = printer.printFile(finalSourceFile);
  result.dispose();

  return { code: transformedCode };
}

/**
 * Add an import statement for the tsover module
 */
function addImportStatement(
  sourceFile: ts.SourceFile,
  identifier: string,
  moduleName: string,
): ts.SourceFile {
  // Create import * as identifier from 'moduleName'
  const importDecl = ts.factory.createImportDeclaration(
    undefined, // decorators
    ts.factory.createImportClause(
      undefined, // phaseModifier (import type, import defer, ...)
      undefined, // name (default import)
      ts.factory.createNamespaceImport(ts.factory.createIdentifier(identifier)),
    ),
    ts.factory.createStringLiteral(moduleName),
  );

  // Add to the beginning of the file
  return ts.factory.updateSourceFile(
    sourceFile,
    [importDecl, ...sourceFile.statements],
    sourceFile.isDeclarationFile,
    sourceFile.referencedFiles,
    sourceFile.typeReferenceDirectives,
    sourceFile.hasNoDefaultLib,
    sourceFile.libReferenceDirectives,
  );
}
