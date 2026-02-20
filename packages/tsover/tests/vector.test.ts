import { test, expect, expectTypeOf } from 'vitest';
import { Operator } from 'tsover-runtime';

class Vec2f {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  [Operator.plus](lhs: Vec2f, rhs: Vec2f): Vec2f {
    return new Vec2f(lhs.x + rhs.x, lhs.y + rhs.y);
  }

  [Operator.star](lhs: Vec2f | number, rhs: Vec2f | number): Vec2f;
  [Operator.star](lhs: Vec2f | number, rhs: Vec2f | number): Vec2f | typeof Operator.deferOperation {
    if (typeof lhs === 'number' && rhs instanceof Vec2f) {
      return new Vec2f(lhs * rhs.x, lhs * rhs.y);
    } else if (typeof rhs === 'number' && lhs instanceof Vec2f) {
      return new Vec2f(lhs.x * rhs, lhs.y * rhs);
    } else if (lhs instanceof Vec2f && rhs instanceof Vec2f) {
      return new Vec2f(lhs.x * rhs.x, lhs.y * rhs.y);
    }
    return Operator.deferOperation;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

class Vec3f {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  [Operator.plus](lhs: Vec3f, rhs: Vec3f): Vec3f {
    return new Vec3f(lhs.x + rhs.x, lhs.y + rhs.y, lhs.z + rhs.z);
  }

  [Operator.star](lhs: Vec3f | number, rhs: Vec3f | number): Vec3f;
  [Operator.star](lhs: Vec3f | number, rhs: Vec3f | number): Vec3f | typeof Operator.deferOperation {
    if (typeof lhs === 'number' && rhs instanceof Vec3f) {
      return new Vec3f(lhs * rhs.x, lhs * rhs.y, lhs * rhs.z);
    } else if (typeof rhs === 'number' && lhs instanceof Vec3f) {
      return new Vec3f(lhs.x * rhs, lhs.y * rhs, lhs.z * rhs);
    } else if (lhs instanceof Vec3f && rhs instanceof Vec3f) {
      return new Vec3f(lhs.x * rhs.x, lhs.y * rhs.y, lhs.z * rhs.z);
    }
    return Operator.deferOperation;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

test('outside of directive scope', () => {
  // @ts-expect-error
  expect(new Vec2f(1, 2) + new Vec2f(3, 4)).toMatchInlineSnapshot(`"(1, 2)(3, 4)"`);
})

test('A + B', () => {
  'use tsover';

  // positive test
  expect(new Vec2f(1, 2) + new Vec2f(3, 4)).toStrictEqual(new Vec2f(4, 6));
  // negative test
  expect(new Vec2f(1, 1) + new Vec2f(1, 1)).not.toStrictEqual(new Vec2f(6, 6));
});

test('T extends Vec2f, vec * 2', () => {
  function double<T extends Vec2f>(vec: T): T {
    'use tsover';
    const result = vec * 2;

    expectTypeOf(result).toEqualTypeOf<Vec2f>();

    return result as T;
  }

  expect(double(new Vec2f(1, 2))).toStrictEqual(new Vec2f(2, 4));
});

test('T extends Vec2f | Vec3f, vec * vec', () => {
  function square<T extends Vec2f | Vec3f>(vec: T): T {
    'use tsover';
    const result = vec * vec;

    expectTypeOf(result).toEqualTypeOf<Vec2f | Vec3f>();

    return result as T;
  }

  expect(square(new Vec2f(0.5, 2))).toStrictEqual(new Vec2f(0.25, 4));
});
