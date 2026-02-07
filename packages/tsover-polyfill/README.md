# tsover-polyfill

Polyfill for TypeScript operator overloading via `Symbol.operatorPlus`.

## Installation

```bash
npm install tsover-polyfill
```

Make sure you also have `tsover` (the TypeScript fork) installed as a peer dependency.

## Runtime Usage

```typescript
import { plus } from "tsover-polyfill";

class Vector {
  constructor(
    public x: number,
    public y: number,
  ) {}

  [Symbol.operatorPlus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const a = new Vector(1, 2);
const b = new Vector(3, 4);
const c = plus(a, b); // Uses Vector's operatorPlus method
```

## Vite Plugin

The plugin automatically transforms `a + b` to `tsoverPolyfill.plus(a, b)` when either operand has the `Symbol.operatorPlus` property.

### Setup

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { tsoverPlugin } from "tsover-polyfill/plugin";

export default defineConfig({
  plugins: [
    tsoverPlugin({
      tsconfigPath: "./tsconfig.json", // optional
      moduleName: "tsover-polyfill", // optional
      include: ["**/*.ts"], // optional
      exclude: ["node_modules/**"], // optional
    }),
  ],
});
```

### Example

Input:

```typescript
class Vector {
  x: number;
  y: number;

  [Symbol.operatorPlus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const result = new Vector(1, 2) + new Vector(3, 4);
```

Output:

```typescript
import * as tso from "tsover-polyfill";

class Vector {
  x: number;
  y: number;

  [Symbol.operatorPlus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const result = tso.plus(new Vector(1, 2), new Vector(3, 4));
```

## API

### `plus<T>(a: T, b: T): T`

Performs the `+` operation with support for operator overloading. If either operand has `Symbol.operatorPlus`, uses that operator. Otherwise falls back to standard JavaScript `+` behavior.

### `tsoverPlugin(options?: TsoverPluginOptions): Plugin`

Vite plugin that transforms TypeScript code.

#### Options

- `tsconfigPath?: string` - Path to tsconfig.json. If not provided, searches for it in the project root.
- `moduleName?: string` - Module name to import the runtime from. Defaults to `'tsover-polyfill'`.
- `include?: string | string[]` - Include patterns for files to transform. Defaults to all TypeScript files.
- `exclude?: string | string[]` - Exclude patterns for files to skip. Defaults to `node_modules/**`.

## How It Works

1. **Type Checking**: The plugin uses the TypeScript compiler API to analyze your code and detect which types have the `Symbol.operatorPlus` property.

2. **Transformation**: When the plugin finds a `+` operation where either operand has `Symbol.operatorPlus`, it:
   - Adds an import statement for the runtime if not already present
   - Replaces `a + b` with `tsoverPolyfill.plus(a, b)`

3. **Caching**: The TypeScript program is cached for the duration of the process for performance.

## Type Checking

If type checking fails, the plugin will throw a descriptive error showing the file path and line number of the error.

## License

MIT
