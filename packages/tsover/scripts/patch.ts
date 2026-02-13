import { $ } from "bun";
import * as jsonc from "comment-json";
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
if (existsSync(versionFilePath)) {
  const currentVersion = await readFile(versionFilePath, "utf-8");
  if (currentVersion.trim() === tag) {
    console.log(`TypeScript ${tag} already downloaded. Resetting and reapplying patches...`);
    shouldClone = false;
  } else {
    console.log(
      `Mismatched version: ${currentVersion.trim()} != ${tag}. Resetting and reapplying patches...`,
    );
  }
}

function injectBefore(source: string, toInject: string, postludePattern: RegExp): string {
  const result = postludePattern.exec(source);
  if (!result || result.length < 1) {
    throw new Error("Could not find pattern to inject after");
  }

  return source.slice(0, result.index) + toInject + source.slice(result.index);
}

function injectAfter(source: string, preludePattern: RegExp, toInject: string): string {
  const result = preludePattern.exec(source);
  if (!result || result.length < 1) {
    throw new Error("Could not find pattern to inject after");
  }

  const injectPoint = result.index + result[0].length;
  return source.slice(0, injectPoint) + toInject + source.slice(injectPoint);
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
  // Write version file
  await writeFile(versionFilePath, tag);
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

  // Patch types.ts
  const typesPath = resolve(typescriptTargetDir, "src", "compiler", "types.ts");
  let typesContent = await readFile(typesPath, "utf-8");

  const patchErrors: unknown[] = [];

  try {
    typesContent = injectAfter(
      typesContent,
      /export interface NodeLinks \{[\S\s]*nonExistentPropCheckCache\?: Set<string>;/,
      `
      useTsoverScope?: boolean;    // True if node is within a 'use tsover' directive scope,
      useGpuScope?: boolean;       // True if node is within a 'use gpu' directive scope
      `,
    );

    typesContent = injectAfter(
      typesContent,
      /export interface TypeChecker \{/,
      `
      __tsover__isInUseTsoverScope(node: Node): boolean;
      __tsover__isInUseGpuScope(node: Node): boolean;
      __tsover__getOverloadReturnType(
        left: Expression,
        operator: BinaryOperator,
        right: Expression,
        leftType: Type,
        rightType: Type,
      ): Type | undefined;
      `,
    );

    await writeFile(typesPath, typesContent);

    console.log("  ✓ Patched types.ts");
  } catch (error) {
    patchErrors.push("  ✗ Could not find pattern in types.ts");
    patchErrors.push(error);
  }

  // Patch checker.ts - add operatorPlus support
  const checkerPath = resolve(typescriptTargetDir, "src", "compiler", "checker.ts");
  let checkerContent = await readFile(checkerPath, "utf-8");

  try {
    if (!checkerContent.includes("isPrologueDirective")) {
      // Only import isPrologueDirective if it's not already imported
      checkerContent = injectBefore(
        checkerContent,
        `isPrologueDirective,`,
        /} from "\.\/_namespaces\/ts\.js";/,
      );
    }

    checkerContent = injectAfter(
      checkerContent,
      /export function createTypeChecker\(host: TypeCheckerHost\): TypeChecker \{/,
      `
    const __tsover__overloaded = {
        [SyntaxKind.PlusToken]: ['operatorPlus'],
        [SyntaxKind.PlusEqualsToken]: ['operatorPlusEq', 'operatorPlus'],
        [SyntaxKind.AsteriskToken]: ['operatorStar'],
        [SyntaxKind.AsteriskEqualsToken]: ['operatorStarEq', 'operatorStar'],
    };

    function __tsover__findBinarySignature(signatures: readonly Signature[], lhs: Type, rhs: Type): Type | undefined {
        // Find a signature where the first parameter accepts lhs and second accepts rhs
        for (const signature of signatures) {
            const paramType1 = getTypeAtPosition(signature, 0);
            const paramType2 = getTypeAtPosition(signature, 1);
            if (isTypeAssignableTo(lhs, paramType1) && isTypeAssignableTo(rhs, paramType2)) {
                return getReturnTypeOfSignature(signature);
            }
        }
        return undefined;
    }

    function __tsover__getDeferOperationSymbolType(): Type | undefined {
        const ctorType = getGlobalESSymbolConstructorSymbol(/*reportErrors*/ false);
        return ctorType && getTypeOfPropertyOfType(getTypeOfSymbol(ctorType), 'deferOperation' as __String);
    }

    function __tsover__findDirective(statements: readonly Statement[], directive: string): Statement | undefined {
        for (const statement of statements) {
            if (isPrologueDirective(statement)) {
                if (isStringLiteral(statement.expression) && statement.expression.text === directive) {
                    return statement;
                }
            }
            else {
                break;
            }
        }
        return undefined;
    }

    function __tsover__isInUseTsoverScope(node: Node): boolean {
        const links = getNodeLinks(node);
        if (links.useTsoverScope !== undefined) {
            return links.useTsoverScope;
        }
        return links.useTsoverScope = __tsover__computeIsInDirectiveScope(node, 'use tsover');
    }

    function __tsover__isInUseGpuScope(node: Node): boolean {
        const links = getNodeLinks(node);
        if (links.useGpuScope !== undefined) {
            return links.useGpuScope;
        }
        return links.useGpuScope = __tsover__computeIsInDirectiveScope(node, 'use gpu');
    }

    function __tsover__computeIsInDirectiveScope(node: Node, directive: string): boolean {
        // Check source file level first
        const sourceFile = getSourceFileOfNode(node);
        if (__tsover__findDirective(sourceFile.statements, directive)) {
            return true;
        }

        // Walk up through containing functions (transitive lexical scope)
        let current: Node | undefined = node;
        while (current) {
            if (isFunctionLikeDeclaration(current) && current.body && isBlock(current.body)) {
                if (__tsover__findDirective(current.body.statements, directive)) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }

    function __tsover__getOverloadReturnType(
      left: Expression,
      operator: BinaryOperator,
      right: Expression,
      leftType: Type,
      rightType: Type
    ): Type | undefined {
        if (!(__tsover__isInUseTsoverScope(left) || __tsover__isInUseGpuScope(left)) || !__tsover__overloaded[operator as keyof typeof __tsover__overloaded]) {
            return undefined;
        }

        const deferOperationType = __tsover__getDeferOperationSymbolType();
        const symbols = __tsover__overloaded[operator as keyof typeof __tsover__overloaded].map(getPropertyNameForKnownSymbolName);
        const lhsOverload = symbols.reduce<Type | undefined>((acc, symbol) => acc ?? getTypeOfPropertyOfType(leftType, symbol), undefined);
        const rhsOverload = symbols.reduce<Type | undefined>((acc, symbol) => acc ?? getTypeOfPropertyOfType(rightType, symbol), undefined);
        const lhsSignatures = lhsOverload ? getSignaturesOfType(lhsOverload, SignatureKind.Call) : [];
        let resultType = __tsover__findBinarySignature(lhsSignatures, leftType, rightType);

        if (lhsSignatures.length === 0 || (resultType && deferOperationType && isTypeIdenticalTo(resultType, deferOperationType))) {
            // Try rhs overloads if lhs has no overloads or if result has deferOperation symbol
            const rhsSignatures = rhsOverload ? getSignaturesOfType(rhsOverload, SignatureKind.Call) : [];
            resultType = __tsover__findBinarySignature(rhsSignatures, leftType, rightType);
        }
        if (resultType && deferOperationType && isTypeIdenticalTo(resultType, deferOperationType)) {
            return undefined;
        }

        return resultType;
    }
  `,
    );

    // Making some functions public for use outside of the type checker (by the plugin)
    checkerContent = injectAfter(
      checkerContent,
      /const checker: TypeChecker = {/,
      `
      __tsover__isInUseTsoverScope,
      __tsover__isInUseGpuScope,
      __tsover__getOverloadReturnType,
      `,
    );

    checkerContent = injectAfter(
      checkerContent,
      /function checkBinaryLikeExpressionWorker\([\S\s]*const operator = operatorToken\.kind;/,
      `
      const overloadedType = __tsover__getOverloadReturnType(left, operator, right, leftType, rightType);
      if (overloadedType) {
          return overloadedType;
      }
      `,
    );
    // The code below can be re-added if underlining is considered useful
    // if (overloadedType) {
    //   errorOrSuggestion(
    //     /*isError*/ false,
    //     operatorToken,
    //     Diagnostics.Operator_0_is_overloaded,
    //     tokenToString(operator),
    //   );
    //   return overloadedType;
    // }

    await writeFile(checkerPath, checkerContent);

    console.log("  ✓ Patched checker.ts");
  } catch (error) {
    patchErrors.push("  ✗ Could not find pattern in checker.ts");
    patchErrors.push(error);
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
    patchErrors.push("  ✗ Could not find pattern in commandLineParser.ts");
  }

  // Patch libs.json - add tsover to end of libs array
  try {
    const libsJsonPath = resolve(typescriptTargetDir, "src", "lib", "libs.json");
    const libsJsonContent = jsonc.parse(
      await readFile(libsJsonPath, "utf-8"),
    ) as jsonc.CommentObject;

    (libsJsonContent?.libs as jsonc.CommentArray<string>).push("tsover");
    await writeFile(libsJsonPath, jsonc.stringify(libsJsonContent, undefined, 4));
    console.log("  ✓ Patched libs.json");
  } catch (error) {
    patchErrors.push("  ✗ Could not find libs array end in libs.json");
    patchErrors.push(error);
  }

  // Patch diagnosticMessages.json
  try {
    const diagnosticsJsonPath = resolve(
      typescriptTargetDir,
      "src",
      "compiler",
      "diagnosticMessages.json",
    );
    const diagnosticsJsonContent = jsonc.parse(
      await readFile(diagnosticsJsonPath, "utf-8"),
    ) as jsonc.CommentObject;

    const diagnosticCodes = (Object.values(diagnosticsJsonContent) as jsonc.CommentObject[])
      .filter((d) => d.category === "Message")
      .map((d) => d.code as number)
      .sort((a, b) => a - b);
    // Choosing the last diagnostic code and incrementing it by 1
    const code = diagnosticCodes[diagnosticCodes.length - 1] + 1;
    jsonc.assign(diagnosticsJsonContent, {
      "Operator '{0}' is overloaded.": {
        category: "Message",
        code,
      },
    });
    await writeFile(diagnosticsJsonPath, jsonc.stringify(diagnosticsJsonContent, undefined, 4));
    console.log("  ✓ Patched diagnosticMessages.json");
  } catch (error) {
    patchErrors.push("  ✗ Could not patch diagnosticMessages.json");
    patchErrors.push(error);
  }

  // Create tsover.d.ts
  const tsoverDtsPath = resolve(typescriptTargetDir, "src", "lib", "tsover.d.ts");
  const tsoverDtsContent = `\
declare var __tsover__enabled: true;

interface SymbolConstructor {
    readonly deferOperation: unique symbol;

    // binary operations
    readonly operatorPlus: unique symbol;
    readonly operatorMinus: unique symbol;
    readonly operatorStar: unique symbol;
    readonly operatorSlash: unique symbol;
    readonly operatorEqEq: unique symbol;

    // unary operations
    readonly operatorPrePlusPlus: unique symbol;
    readonly operatorPreMinusMinus: unique symbol;
    readonly operatorPostPlusPlus: unique symbol;
    readonly operatorPostMinusMinus: unique symbol;
    readonly operatorPreMinus: unique symbol;
}
`;
  await writeFile(tsoverDtsPath, tsoverDtsContent);
  console.log("  ✓ Created tsover.d.ts");

  // Rebuild after patching
  console.log("Rebuilding TypeScript with patches...");
  await $`npx --yes hereby@latest`;

  console.log(`✓ Successfully patched TypeScript ${tag}`);

  // Show diff
  console.log("\nChanges applied:");
  console.log("================");
  await $`git diff -w`.cwd(typescriptTargetDir);

  // Show errors
  if (patchErrors.length > 0) {
    console.error("\nErrors:");
    console.error("========");
    console.error(patchErrors.join("\n"));
  }
} finally {
  // Restore original working directory
  process.chdir(originalCwd);
}
