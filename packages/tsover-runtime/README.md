# tsover-runtime

Minimal runtime library for overloading operators in tsover.

## Installation

```bash
npm install tsover-runtime
```

## Usage

```typescript
import { add, Operator } from "tsover/runtime";

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

The `tsover` package provides the alternate TypeScript server, as well as a bundler plugin to transform JS operations into `tsover/runtime` function calls.

## License

MIT
