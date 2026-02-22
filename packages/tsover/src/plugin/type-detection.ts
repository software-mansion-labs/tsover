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
    // This is because unplugin-typegpu handles that transformation on its own.
    return false;
  }

  return checker.__tsover__couldHaveOverloadedOperators(
    node.left,
    node.operatorToken.kind,
    node.right,
    checker.getTypeAtLocation(node.left),
    checker.getTypeAtLocation(node.right),
  );
}
