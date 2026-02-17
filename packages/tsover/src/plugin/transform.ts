/**
 * AST transformation logic
 */

import ts from 'tsover';
import { shouldTransformBinaryExpression } from './type-detection.js';
import { opToRuntimeFn, assignmentOps } from './utils.js';

export interface TransformResult {
  code: string;
  map?: string;
}

export interface TransformOptions {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
}

/**
 * Transform a source file to replace + operators with __tsover_add() calls
 */
export function transformSourceFile(options: TransformOptions): TransformResult {
  const { checker, sourceFile } = options;

  // Create a transformer that visits all binary expressions
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (sourceFile) => {
      function visit(node: ts.Node): ts.Node {
        // Check if this is a binary expression
        if (ts.isBinaryExpression(node)) {
          const runtimeFn = opToRuntimeFn[node.operatorToken.kind as keyof typeof opToRuntimeFn];

          // Check if either operand has operator overloading
          if (shouldTransformBinaryExpression(node, checker) && runtimeFn) {
            const left = ts.visitNode(node.left, visit) as ts.Expression;
            const right = ts.visitNode(node.right, visit) as ts.Expression;
            const callExpression = ts.factory.createCallExpression(
              ts.factory.createIdentifier(`__tsover_${runtimeFn}`),
              undefined, // type arguments
              [left, right],
            );
            if (assignmentOps.includes(node.operatorToken.kind)) {
              // Replace a += b with a = __tsover_add(a, b), and so on
              return ts.factory.createAssignment(left, callExpression);
            } else {
              // Replace a + b with __tsover_add(a, b), and so on
              return callExpression;
            }
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

  // Print the transformed code
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const transformedCode = printer.printFile(transformedSourceFile);
  result.dispose();

  return { code: transformedCode };
}
