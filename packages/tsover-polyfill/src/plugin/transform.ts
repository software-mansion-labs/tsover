/**
 * AST transformation logic
 */

import * as ts from "tsover";
import { shouldTransformBinaryExpression } from "./type-detection.js";
import { generateUniqueIdentifier, hasImport, getImportIdentifier } from "./utils.js";

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
export function transformSourceFile(options: TransformOptions): TransformResult {
  const { checker, sourceFile, moduleName = "tsover-polyfill" } = options;

  // Track if we need to add an import
  let needsImport = false;
  let importIdentifier: string | null = null;

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
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
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
              [ts.visitNode(node.left, visit), ts.visitNode(node.right, visit)],
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
    finalSourceFile = addImportStatement(transformedSourceFile, importIdentifier, moduleName);
  }

  // Print the transformed code
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const transformedCode = printer.printFile(finalSourceFile);

  // Generate source map
  const sourceMap = generateSourceMap(finalSourceFile, transformedCode, sourceFile.fileName);

  result.dispose();

  return {
    code: transformedCode,
    map: sourceMap,
  };
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
      false, // isTypeOnly
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

/**
 * Generate a source map for the transformation
 */
function generateSourceMap(
  sourceFile: ts.SourceFile,
  generatedCode: string,
  originalFileName: string,
): string {
  // Use TypeScript's built-in source map generation
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  // Generate source map using ts.createSourceMapGenerator
  const sourceMapGenerator = ts.createSourceMapGenerator(
    sourceFile,
    originalFileName,
    sourceFile.getLineAndCharacterOfPosition(0).line + 1,
    sourceFile.getLineAndCharacterOfPosition(0).character + 1,
  );

  // Emit the source file with source map
  const writer = ts.createTextWriter("\n");

  // Since we can't easily track mappings, we'll create a basic source map
  // In a production implementation, you'd want to track all token positions
  const map = {
    version: 3,
    sources: [originalFileName],
    names: [],
    mappings: "",
    file: "",
    sourcesContent: [sourceFile.text],
  };

  return JSON.stringify(map);
}
