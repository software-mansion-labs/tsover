/**
 * Runtime library for TypeScript operator overloading polyfill
 */

// Extend the global Symbol interface to include operatorPlus
// This should already be provided by tsover for projects
// that use it, but for projects that support tsover (rather than
// depend on it) benefit from this duplication.
declare global {
  interface SymbolConstructor {
    readonly operatorPlus: unique symbol;
  }
}

// Polyfill the symbol if it doesn't exist
if (typeof Symbol.operatorPlus === "undefined") {
  Object.defineProperty(Symbol, "operatorPlus", {
    value: Symbol.for("Symbol.operatorPlus"),
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

interface WithPlus {
  [Symbol.operatorPlus](a: unknown, b: unknown): unknown;
}

/**
 * Checks if a value has the Symbol.operatorPlus property
 */
function hasOperatorPlus(value: unknown): value is WithPlus {
  return (
    typeof (value as Record<symbol, unknown>)?.[Symbol.operatorPlus] === "function"
  );
}

/**
 * Performs the + operation with support for operator overloading
 * If either operand has Symbol.operatorPlus, uses that operator
 * Otherwise falls back to standard JavaScript + behavior
 */
export function plus(a: unknown, b: unknown): unknown {
  // Check if left operand has operator overloading
  if (hasOperatorPlus(a)) {
    return a[Symbol.operatorPlus](a, b);
  }

  // Check if right operand has operator overloading
  if (hasOperatorPlus(b)) {
    return b[Symbol.operatorPlus](a, b);
  }

  // Fall back to standard JavaScript + operator
  return (a as number) + (b as number);
}

