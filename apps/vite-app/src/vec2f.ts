export class Vec2f {
  x: number;
  y: number;

  constructor(
    x: number,
    y: number
  ) {
    this.x = x;
    this.y = y;
  }

  /** lhs + rhs */
  [Symbol.operatorPlus](lhs: Vec2f, rhs: Vec2f): Vec2f {
    return new Vec2f(lhs.x + rhs.x, lhs.y + rhs.y);
  }

  /**
   * String representation of the vector
   */
  toString(): string {
    return `vec2f(${this.x}, ${this.y})`;
  }
}
