"use client";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

console.log("hewwo");
console.log("hello");

const code = `\
{
  "devDependencies": {
    "typescript": "^5.9.3" // [!code --]
    "typescript": "npm:tsover@~5.9.5" // [!code ++]
  }
}`;

function SwapTypeScriptCodeBlock() {
  return <DynamicCodeBlock lang="json" code={code} />;
}

export default SwapTypeScriptCodeBlock;
