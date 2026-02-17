/**
 * Type checking utilities
 */

import type ts from 'tsover';

/**
 * Check if either operand of a binary expression has operator overloading
 */
export function shouldTransformBinaryExpression(
  node: ts.BinaryExpression,
  checker: ts.TypeChecker,
): boolean {
  if (checker.__tsover__isInUseGpuScope(node)) {
    // Only transforming if inside 'use tsover' directive, but NOT inside 'use gpu' directive.
    // This is because unplugin-typegpu handles that transformation on it's own.
    return false;
  }

  const overloadedType = checker.__tsover__getOverloadReturnType(
    node.left,
    node.operatorToken.kind,
    node.right,
    checker.getTypeAtLocation(node.left),
    checker.getTypeAtLocation(node.right),
  );

  return overloadedType !== undefined;
}
