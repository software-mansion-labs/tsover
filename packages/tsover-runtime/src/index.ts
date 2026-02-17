/**
 * Runtime library for TypeScript operator overloading polyfill
 */

// Extend the global Symbol interface to include operators
// This should already be provided by tsover for projects
// that use it, but for projects that support tsover (rather than
// depend on it) benefit from this duplication.
declare global {
  interface SymbolConstructor {
    readonly deferOperation: unique symbol;

    // binary operations
    readonly operatorPlus: unique symbol;
    readonly operatorMinus: unique symbol;
    readonly operatorStar: unique symbol;
    readonly operatorSlash: unique symbol;
    readonly operatorEqEq: unique symbol;

    // unary operations
    readonly operatorPrePlusPlus: unique symbol;
    readonly operatorPreMinusMinus: unique symbol;
    readonly operatorPostPlusPlus: unique symbol;
    readonly operatorPostMinusMinus: unique symbol;
    readonly operatorPreMinus: unique symbol;
  }
}

/**
 * `true` if the user uses the `tsover` Language Server, `false` if the user is using the
 * standard TypeScript Language Server.
 */
export type TsoverEnabled = typeof globalThis extends {
  __tsover__enabled: true;
}
  ? true
  : false;

function polyfillSymbol(name: string): void {
  // Polyfill the symbol if it doesn't exist
  if (typeof (Symbol as any)[name] === 'undefined') {
    Object.defineProperty(Symbol, name, {
      value: Symbol.for(`Symbol.${name}`),
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

type WithBinOp<T extends symbol> = {
  [Key in T]: (a: unknown, b: unknown) => unknown;
};

/**
 * Checks if a value has the Symbol.operatorPlus property
 */
function hasOperator<T extends symbol>(value: unknown, operator: T): value is WithBinOp<T> {
  return typeof (value as Record<symbol, unknown>)?.[operator] === 'function';
}

function binOp<T extends symbol>(
  a: unknown,
  b: unknown,
  opSymbol: T,
  fallback: (a: never, b: never) => unknown,
): unknown {
  let result: unknown = Operator.deferOperation;
  // Check if left operand has operator overloading
  if (hasOperator(a, opSymbol)) {
    result = a[opSymbol](a, b);
  }

  // Check if right operand has operator overloading
  if (result === Operator.deferOperation && hasOperator(b, opSymbol)) {
    result = b[opSymbol](a, b);
  }

  if (result === Operator.deferOperation) {
    // Fall back to standard JavaScript + operator
    return fallback(a as never, b as never);
  }

  return result;
}

const normalAdd = (a: number, b: number) => a + b;

/**
 * Performs the + operation with support for operator overloading
 * If either operand has Symbol.operatorPlus, uses that operator
 * Otherwise falls back to standard JavaScript + behavior
 */
function add(a: unknown, b: unknown): unknown {
  // Fast paths for numerics or strings
  if (
    (typeof a === 'number' || typeof a === 'string') &&
    (typeof b === 'number' || typeof b === 'string')
  ) {
    // The types here don't matter, we let JS handle it as it would
    return (a as number) + (b as number);
  }

  return binOp(a, b, Operator.plus, normalAdd);
}

const normalSub = (a: number, b: number) => a - b;

/**
 * Performs the - operation with support for operator overloading
 * If either operand has Symbol.operatorMinus, uses that operator
 * Otherwise falls back to standard JavaScript - behavior
 */
function sub(a: unknown, b: unknown): unknown {
  // Fast paths for numerics
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return binOp(a, b, Operator.minus, normalSub);
}

const normalMul = (a: number, b: number) => a * b;

/**
 * Performs the * operation with support for operator overloading
 * If either operand has Symbol.operatorStar, uses that operator
 * Otherwise falls back to standard JavaScript * behavior
 */
function mul(a: unknown, b: unknown): unknown {
  // Fast paths for numerics
  if (typeof a === 'number' && typeof b === 'number') {
    return a * b;
  }

  return binOp(a, b, Operator.star, normalMul);
}

const normalDiv = (a: number, b: number) => a / b;

/**
 * Performs the / operation with support for operator overloading
 * If either operand has Symbol.operatorSlash, uses that operator
 * Otherwise falls back to standard JavaScript / behavior
 */
function div(a: unknown, b: unknown): unknown {
  // Fast paths for numerics
  if (typeof a === 'number' && typeof b === 'number') {
    return a / b;
  }

  return binOp(a, b, Operator.slash, normalDiv);
}

export const Operator = /* @__PURE__ */ (() => {
  polyfillSymbol('deferOperation');

  polyfillSymbol('operatorPlus');
  polyfillSymbol('operatorMinus');
  polyfillSymbol('operatorStar');
  polyfillSymbol('operatorSlash');
  polyfillSymbol('operatorEqEq');

  polyfillSymbol('operatorPrePlusPlus');
  polyfillSymbol('operatorPreMinusMinus');
  polyfillSymbol('operatorPostPlusPlus');
  polyfillSymbol('operatorPostMinusMinus');
  polyfillSymbol('operatorPreMinus');

  (globalThis as any).__tsover_add = add;
  (globalThis as any).__tsover_sub = sub;
  (globalThis as any).__tsover_mul = mul;
  (globalThis as any).__tsover_div = div;

  return {
    deferOperation: Symbol.deferOperation,
    plus: Symbol.operatorPlus,
    minus: Symbol.operatorMinus,
    star: Symbol.operatorStar,
    slash: Symbol.operatorSlash,
    eqEq: Symbol.operatorEqEq,

    prePlusPlus: Symbol.operatorPrePlusPlus,
    preMinusMinus: Symbol.operatorPreMinusMinus,
    postPlusPlus: Symbol.operatorPostPlusPlus,
    postMinusMinus: Symbol.operatorPostMinusMinus,
    preMinus: Symbol.operatorPreMinus,
  } as const;
})();
