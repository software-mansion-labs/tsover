import { $ } from "bun";
import { existsSync } from "fs";
import { rm, mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";

const tag = process.argv[2];

if (!tag) {
  console.log("No tag specified. Fetching available tags from GitHub...\n");

  const allTags: string[] = [];
  let url: string | null = "https://api.github.com/repos/microsoft/TypeScript/tags?per_page=100";

  while (url) {
    const response: Response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch tags from GitHub");
      process.exit(1);
    }

    const tags = (await response.json()) as Array<{ name: string }>;
    allTags.push(...tags.map((t) => t.name));

    // Parse Link header for pagination
    const linkHeader = response.headers.get("link");
    url = null;

    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }

  console.log("Available tags:");
  for (const t of allTags) {
    console.log(`  - ${t}`);
  }
  console.log(`\nTotal: ${allTags.length} tags`);
  console.log("\nUsage: bun scripts/patch.ts <tag>");
  process.exit(1);
}

const typescriptTargetDir = resolve(import.meta.dir, "..", "typescript");
const versionFilePath = resolve(typescriptTargetDir, ".tsover-version");

console.log(`Patching TypeScript ${tag} ...`);

// Check if we already have the correct version
let shouldClone = true;
if (existsSync(typescriptTargetDir) && existsSync(versionFilePath)) {
  const currentVersion = await readFile(versionFilePath, "utf-8");
  if (currentVersion.trim() === tag) {
    console.log(`TypeScript ${tag} already downloaded. Resetting and reapplying patches...`);
    shouldClone = false;
  }
}

if (shouldClone) {
  // Remove existing directory if it exists
  if (existsSync(typescriptTargetDir)) {
    console.log(`Removing existing directory: ${typescriptTargetDir}`);
    await rm(typescriptTargetDir, { recursive: true, force: true });
  }

  // Create directory
  await mkdir(typescriptTargetDir, { recursive: true });

  // Clone the TypeScript repository (shallow clone, single branch, single commit)
  console.log(`Cloning microsoft/TypeScript@${tag} ...`);
  await $`git clone --depth 1 --branch ${tag} --single-branch https://github.com/microsoft/TypeScript.git ${typescriptTargetDir}`;

  // Write version file
  await writeFile(versionFilePath, tag);
} else {
  // Reset local unstaged changes
  process.chdir(typescriptTargetDir);
  await $`git checkout -- .`;
  await $`git clean -fd`;
}

// Store original directory and ensure we're in the target directory
const originalCwd = process.cwd();
process.chdir(typescriptTargetDir);

try {
  // Install dependencies
  console.log("Installing dependencies ...");
  await $`npm install`;

  // Apply patches
  console.log("Applying tsover patches...");

  // Patch checker.ts - add operatorPlus support
  const checkerPath = resolve(typescriptTargetDir, "src", "compiler", "checker.ts");
  let checkerContent = await readFile(checkerPath, "utf-8");

  const bigintPattern =
    /else if \(isTypeAssignableToKind\(leftType, TypeFlags\.BigIntLike, \/\*strict\*\/ true\) && isTypeAssignableToKind\(rightType, TypeFlags\.BigIntLike, \/\*strict\*\/ true\)\) \{\s*\/\/ If both operands are of the BigInt primitive type, the result is of the BigInt primitive type\.\s*resultType = bigintType;\s*\}\s*else if \(isTypeAssignableToKind\(leftType, TypeFlags\.StringLike/;

  const bigintReplacement = `\
                else if (isTypeAssignableToKind(leftType, TypeFlags.BigIntLike, /*strict*/ true) && isTypeAssignableToKind(rightType, TypeFlags.BigIntLike, /*strict*/ true)) {
                    // If both operands are of the BigInt primitive type, the result is of the BigInt primitive type.
                    resultType = bigintType;
                }
                else if (!(leftType.flags & (TypeFlags.Primitive | TypeFlags.Any | TypeFlags.Never | TypeFlags.Unknown))) {
                    // Check if left operand has Symbol.operatorPlus defined
                    const operatorPlusProp = getPropertyOfType(leftType, getPropertyNameForKnownSymbolName("operatorPlus"));
                    if (operatorPlusProp) {
                        const propType = getTypeOfSymbol(operatorPlusProp);
                        const signatures = getSignaturesOfType(propType, SignatureKind.Call);
                        if (signatures.length > 0) {
                            // Use the return type of the first call signature
                            resultType = getReturnTypeOfSignature(signatures[0]);
                        }
                    }
                    // If no valid operatorPlus found, resultType remains undefined and will fall through to stringType
                    if (!resultType) {
                        resultType = stringType;
                    }
                }
                else if (isTypeAssignableToKind(leftType, TypeFlags.StringLike`;

  if (bigintPattern.test(checkerContent)) {
    checkerContent = checkerContent.replace(bigintPattern, bigintReplacement);
    await writeFile(checkerPath, checkerContent);
    console.log("  ✓ Patched checker.ts");
  } else {
    console.error("  ✗ Could not find pattern in checker.ts");
  }

  // Patch commandLineParser.ts - add tsover lib entry
  const cmdParserPath = resolve(typescriptTargetDir, "src", "compiler", "commandLineParser.ts");
  let cmdParserContent = await readFile(cmdParserPath, "utf-8");

  // Look for the esnext.sharedmemory entry and insert tsover after it
  const cmdParserPattern = /(\["esnext\.sharedmemory", "lib\.esnext\.sharedmemory\.d\.ts"\],)/;
  if (cmdParserPattern.test(cmdParserContent)) {
    cmdParserContent = cmdParserContent.replace(
      cmdParserPattern,
      `$1\n    ["tsover", "lib.tsover.d.ts"],`,
    );
    await writeFile(cmdParserPath, cmdParserContent);
    console.log("  ✓ Patched commandLineParser.ts");
  } else {
    console.error("  ✗ Could not find pattern in commandLineParser.ts");
  }

  // Patch libs.json - add tsover to end of libs array
  const libsJsonPath = resolve(typescriptTargetDir, "src", "lib", "libs.json");
  let libsJsonContent = await readFile(libsJsonPath, "utf-8");

  // Find the end of the libs array and append tsover before the closing bracket
  const libsArrayEndPattern = /(        "esnext\.full"\s*\n    \],)/;
  if (libsArrayEndPattern.test(libsJsonContent)) {
    libsJsonContent = libsJsonContent.replace(libsArrayEndPattern, `        "tsover",\n$1`);
    await writeFile(libsJsonPath, libsJsonContent);
    console.log("  ✓ Patched libs.json");
  } else {
    console.error("  ✗ Could not find libs array end in libs.json");
  }

  // Create tsover.d.ts
  const tsoverDtsPath = resolve(typescriptTargetDir, "src", "lib", "tsover.d.ts");
  const tsoverDtsContent = `interface SymbolConstructor {\n    readonly operatorPlus: unique symbol;\n    readonly deferOperation: unique symbol;\n}\n`;
  await writeFile(tsoverDtsPath, tsoverDtsContent);
  console.log("  ✓ Created tsover.d.ts");

  // Rebuild after patching
  console.log("Rebuilding TypeScript with patches...");
  await $`npx --yes hereby@latest`;

  console.log(`✓ Successfully patched TypeScript ${tag}`);

  // Show diff
  console.log("\nChanges applied:");
  console.log("================");
  await $`git diff`.cwd(typescriptTargetDir);
} finally {
  // Restore original working directory
  process.chdir(originalCwd);
}
