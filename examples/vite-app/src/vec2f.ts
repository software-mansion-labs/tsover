import { Operator } from "tsover-runtime";

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

  /** lhs * rhs */
  [Operator.star](lhs: number, rhs: Vec2f): Vec2f;
  [Operator.star](lhs: Vec2f, rhs: number): Vec2f;
  [Operator.star](
    lhs: Vec2f | number,
    rhs: Vec2f | number,
  ): Vec2f | typeof Operator.deferOperation {
    if (typeof lhs === "number" && typeof rhs !== "number") {
      return new Vec2f(lhs * rhs.x, lhs * rhs.y);
    } else if (typeof rhs === "number" && typeof lhs !== "number") {
      return new Vec2f(lhs.x * rhs, lhs.y * rhs);
    }
    return Operator.deferOperation;
  }
}
