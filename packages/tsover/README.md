# tsover

A fork of TypeScript that adds only one functionality to the type checker... operator **over**loading.

## Installation

```bash
npm install tsover
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

The plugin automatically transforms `a + b` to `tsover.add(a, b)` (and so on) when either operand has overloaded operators.

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
import * as tso from "tsover";

class Vector {
  x: number;
  y: number;

  [Symbol.operatorPlus](other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }
}

const result = tso.add(new Vector(1, 2), new Vector(3, 4));
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

## License

MIT
