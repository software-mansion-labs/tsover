/**
 * Runtime library for TypeScript operator overloading polyfill
 */

// Extend the global Symbol interface to include operators
// This should already be provided by tsover for projects
// that use it, but for projects that support tsover (rather than
// depend on it) benefit from this duplication.
declare global {
  interface SymbolConstructor {
    readonly operatorPlus: unique symbol;
    readonly operatorStar: unique symbol;
    readonly operatorSlash: unique symbol;
    readonly operatorEqEq: unique symbol;

    readonly deferOperation: unique symbol;
  }
}

function polyfillSymbol(name: string): void {
  // Polyfill the symbol if it doesn't exist
  if (typeof (Symbol as any)[name] === "undefined") {
    Object.defineProperty(Symbol, name, {
      value: Symbol.for(`Symbol.${name}`),
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

polyfillSymbol("operatorPlus");
polyfillSymbol("operatorStar");
polyfillSymbol("operatorSlash");
polyfillSymbol("operatorEqEq");
polyfillSymbol("deferOperation");

export const Operator = {
  plus: Symbol.operatorPlus,
  star: Symbol.operatorStar,
  slash: Symbol.operatorSlash,
  eqEq: Symbol.operatorEqEq,
  deferOperation: Symbol.deferOperation,
};

type WithBinOp<T extends symbol> = {
  [Key in T]: (a: unknown, b: unknown) => unknown;
};

/**
 * Checks if a value has the Symbol.operatorPlus property
 */
function hasOperator<T extends symbol>(value: unknown, operator: T): value is WithBinOp<T> {
  return typeof (value as Record<symbol, unknown>)?.[operator] === "function";
}

function isValid(value: unknown): value is number {
  return typeof value !== "object" && typeof value !== "function";
}

/**
 * Performs the + operation with support for operator overloading
 * If either operand has Symbol.operatorPlus, uses that operator
 * Otherwise falls back to standard JavaScript + behavior
 */
export function add(a: unknown, b: unknown): unknown {
  if (isValid(a) && isValid(b)) {
    // Fast path for numbers
    return a + b;
  }

  // Check if left operand has operator overloading
  if (hasOperator(a, Symbol.operatorPlus)) {
    return a[Symbol.operatorPlus](a, b);
  }

  // Check if right operand has operator overloading
  if (hasOperator(b, Symbol.operatorPlus)) {
    return b[Symbol.operatorPlus](a, b);
  }

  // Fall back to standard JavaScript + operator
  return (a as string) + (b as string);
}
