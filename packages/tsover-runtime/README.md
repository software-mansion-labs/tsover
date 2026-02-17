# tsover-runtime

Minimal runtime library for overloading operators in tsover.

## Installation

```bash
npm install tsover-runtime
```

## Usage

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

The [`tsover`](../tsover) package is the one that provides an alternate TypeScript server, as well as a bundler plugin to transform JS operations into `tsover-runtime` function calls.

## tsover is created by Software Mansion

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=tsover-github 'Software Mansion')](https://swmansion.com)

Since 2012 [Software Mansion](https://swmansion.com) is a software agency with
experience in building web and mobile apps. We are Core React Native
Contributors and experts in dealing with all kinds of React Native issues. We
can help you build your next dream product –
[Hire us](https://swmansion.com/contact/projects?utm_source=tsover&utm_medium=readme).
