/**
 * Type checking utilities for detecting Symbol.operatorPlus
 */

import ts from "./tsover";

/**
 * Check if a type has the Symbol.operatorPlus property
 */
export function hasOperatorPlus(type: ts.Type, checker: ts.TypeChecker): boolean {
  // Get all properties of the type
  const properties = checker.getPropertiesOfType(type);

  for (const prop of properties) {
    // Check if this is the well-known Symbol.operatorPlus
    if (isOperatorPlusSymbol(prop)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a symbol is the Symbol.operatorPlus well-known symbol
 */
function isOperatorPlusSymbol(symbol: ts.Symbol): boolean {
  // Check the symbol name - for well-known symbols, TypeScript uses @@name format
  // or the escapedName might be "[Symbol.operatorPlus]"
  const escapedName = symbol.getEscapedName().toString();

  // Check various possible representations
  if (escapedName === "[Symbol.operatorPlus]" || escapedName === "@@operatorPlus") {
    return true;
  }

  // Also check the symbol value declaration
  if (symbol.valueDeclaration) {
    const decl = symbol.valueDeclaration;
    // Check if it's a method with a computed name
    if ((decl as any).name && (decl as any).name.kind === ts.SyntaxKind.ComputedPropertyName) {
      const name = (decl as any).name;
      // Check if it's Symbol.operatorPlus
      const expression = name.expression;
      if (
        expression &&
        expression.kind === ts.SyntaxKind.PropertyAccessExpression &&
        (expression as any).expression &&
        (expression as any).expression.kind === ts.SyntaxKind.Identifier &&
        (expression as any).expression.text === "Symbol" &&
        (expression as any).name &&
        (expression as any).name.text === "operatorPlus"
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if either operand of a binary expression has operator overloading
 */
export function shouldTransformBinaryExpression(
  node: ts.BinaryExpression,
  checker: ts.TypeChecker,
): boolean {
  return true;
  // if (node.operatorToken.kind !== ts.SyntaxKind.PlusToken) {
  //   return false;
  // }

  // const leftType = checker.getTypeAtLocation(node.left);
  // const rightType = checker.getTypeAtLocation(node.right);

  // return hasOperatorPlus(leftType, checker) || hasOperatorPlus(rightType, checker);
}
