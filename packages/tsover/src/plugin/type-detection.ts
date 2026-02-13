/**
 * Type checking utilities
 */

import type ts from "./tsover";

/**
 * Check if either operand of a binary expression has operator overloading
 */
export function shouldTransformBinaryExpression(
  node: ts.BinaryExpression,
  checker: ts.TypeChecker,
): boolean {
  const overloadedType = checker.__tsover__getOverloadReturnType(
    node.left,
    node.operatorToken.kind,
    node.right,
    checker.getTypeAtLocation(node.left),
    checker.getTypeAtLocation(node.right),
  );

  return overloadedType !== undefined;
}
