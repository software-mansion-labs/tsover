# tsover

A fork of TypeScript that adds only one functionality to the type checker... operator **over**loading.

## Installation

```bash
npm install tsover tsover-runtime
```

### Setup in VSCode/Cursor

```jsonc
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/tsover/lib",
}
```

### Setup in Zed

Configure vtsls settings in your Zed settings file:

```jsonc
// .zed/settings.json
{
  "lsp": {
    "vtsls": {
      "settings": {
        "typescript": {
          "tsdk": "node_modules/tsover/lib",
        },
      },
    },
  },
  // ...
}
```

### Bundler Plugin

The plugin automatically transforms `a + b` to `__tsover_add(a, b)` (and so on) when either operand has overloaded operators.

#### Setup (Vite)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import tsover from "tsover/plugin/vite";

export default defineConfig({
  plugins: [
    tsover({
      tsconfigPath: "./tsconfig.json", // optional
      moduleName: "tsover", // optional
      include: ["**/*.ts"], // optional
      exclude: ["node_modules/**"], // optional
    }),
  ],
});
```

#### Example

Input:

```typescript
'use tsover';
import { Operator } from 'tsover-runtime';

class Vector {
  x: number;
  y: number;

  [Operator.plus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const result = new Vector(1, 2) + new Vector(3, 4);
```

Output:

```typescript
'use tsover';
import { Operator } from 'tsover-runtime';

class Vector {
  x: number;
  y: number;

  [Operator.plus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const result = __tsover_add(new Vector(1, 2), new Vector(3, 4));
```

## Defining operator overloads

The [`tsover-runtime`](../tsover-runtime/README.md) package provides the necessary runtime support for operator overloading,
[see docs for more details](../tsover-runtime/README.md).

```typescript
import { add, Operator } from "tsover-runtime";

class Vector {
  constructor(
    public x: number,
    public y: number,
  ) {}

  [Operator.plus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const a = new Vector(1, 2);
const b = new Vector(3, 4);
const c = add(a, b); // Uses Vector's Operator.plus method
```

## Progressive enhancement

Branded numeric types can now propagate through numeric operations:

```ts
type f32 = number & {
  __brand: "f32", [Operator.plus](lhs: f32, rhs: f32): f32
};

const a = 12 as f32;
const b = 34 as f32;
const c = a + b;
//    ^? f32
```

## License

MIT
