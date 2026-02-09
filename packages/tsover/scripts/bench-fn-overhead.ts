import { Bench } from "tinybench";
import { Operator, add } from "tsover/runtime";

export class Vec2f {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** lhs + rhs */
  [Operator.plus](lhs: Vec2f, rhs: Vec2f): Vec2f {
    return new Vec2f(lhs.x + rhs.x, lhs.y + rhs.y);
  }

  /**
   * String representation of the vector
   */
  toString(): string {
    return `vec2f(${this.x}, ${this.y})`;
  }
}

const bench = new Bench({ name: "simple benchmark", time: 100 });

bench
  .add("addition", () => {
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      // prettier-ignore
      result = result + i + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19 + 20;
    }
    console.log(result);
  })
  .add("addition with function", async () => {
    let result = 0;
    // const a = new Vec2f(1, 2);
    // const b = new Vec2f(3, 4);
    // const c = plus(a, b);
    // console.log(c);
    for (let i = 0; i < 100000; i++) {
      // prettier-ignore
      result = add(i, add(1, add(2, add(3, add(4, add(5, add(6, add(7, add(8, add(9, add(10, add(11, add(12, add(13, add(14, add(15, add(16, add(17, add(18, add(19, add(20, result))))))))))))))))))))) as number;
    }
    console.log(result);
  });

await bench.run();

console.log(bench.name);
console.table(bench.table());
