import { Bench } from "tinybench";
import { Operator, add } from "tsover-runtime";

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

const s = (a: unknown) => typeof a === "number" || typeof a === "string";
// prettier-ignore
const A0 = (a:unknown,b:unknown)=>((typeof a==="number"||typeof a==="string")&&(typeof b==="number"||typeof b==="string")?a+b:add(a,b));
// prettier-ignore
// const [A0, A1] = [
//   (a,b)=>((typeof a === "number" || typeof a === "string")&&(typeof b === "number" || typeof b === "string")?a+b:add(a,b)),
//   (a,b)=>((typeof a === "number" || typeof a === "string")&&(typeof b === "number" || typeof b === "string")?a+b:add(a,b)),
// ];

// const [
//   A0,
//   A1,
//   A2,
//   A3,
//   A4,
//   A5,
//   A6,
//   A7,
//   A8,
//   A9,
//   A10,
//   A11,
//   A12,
//   A13,
//   A14,
//   A15,
//   A16,
//   A17,
//   A18,
//   A19,
//   A20,
//   A21,
// ] = Array.from({ length: 22 }, createAdd);

// const A1 = createAdd();

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
    const a = new Vec2f(1, 2);
    const b = new Vec2f(3, 4);
    const c = A0(a, b);
    console.log(c);
    for (let i = 0; i < 100000; i++) {
      // prettier-ignore
      // result = A0(i, A1(1, A2(2, A3(3, A4(4, A5(5, A6(6, A7(7, A8(8, A9(9, A10(10, A11(11, A12(12, A13(13, A14(14, A15(15, A16(16, A17(17, A18(18, A19(19, A20(20, result))))))))))))))))))))) as number;
      result = A0(i, A0(1, A0(2, A0(3, A0(4, A0(5, A0(6, A0(7, A0(8, A0(9, A0(10, A0(11, A0(12, A0(13, A0(14, A0(15, A0(16, A0(17, A0(18, A0(19, A0(20, result))))))))))))))))))))) as number;
    }
    console.log(result);
  });

await bench.run();

console.log(bench.name);
console.table(bench.table());
