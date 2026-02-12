"use tsover";
import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";

import { Vec2f } from "./vec2f.ts";

const a = new Vec2f(1, 2);
const b = new Vec2f(3, 4);
const c = a + b;
const d = a * 2;
const e = 2 * a;
console.log(c, d, e);

interface _f32 {
  [Symbol.operatorPlus](lhs: f32, rhs: f32): f32;
  valueOf(): number;
}

export type f32 = number & _f32;
export declare const f32: (v: number) => f32;

const A = f32(1);
const B = f32(2);
const C = A + B;
console.log(C);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
