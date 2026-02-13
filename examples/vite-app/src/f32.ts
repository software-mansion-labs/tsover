"use tsover";

interface _f32 {
  [Symbol.operatorPlus](lhs: f32, rhs: f32): f32;
  valueOf(): number;
}

export type f32 = number & _f32;

export declare const f32: (v: number) => f32;

const a = f32(1);
const b = f32(2);

const c = a + b;
console.log(c);

function hello(a: f32, b: f32): f32 {
  const hello = a + b;
  return f32(hello);
}

hello(f32(1), f32(2));
