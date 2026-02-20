"use tsover";
import "./style.css";
import { setupCounter } from "./counter.ts";

import { Vec2f } from "./vec2f.ts";

let a = new Vec2f(1, 2);
const b = new Vec2f(3, 4);
a += b;
const c = a + b;
const d = a * 2;
const e = 2 * a;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>tsover - Vite example</h1>
    <div class="card">
      <p>a = ${a.toString()}</p>
      <p>b = ${b.toString()}</p>
      <p>a + b = ${c.toString()}</p>
      <p>a * 2 = ${d.toString()}</p>
      <p>2 * a = ${e.toString()}</p>
    </div>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
