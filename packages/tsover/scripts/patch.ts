import { $ } from 'bun';
import * as jsonc from 'comment-json';
import { existsSync } from 'fs';
import { rm, mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const tag = process.argv[2];

const SWM_LICENSE = `\
/*
 * Copyright 2026 Software Mansion S.A.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
`;

const SWM_CHANGE_NOTICE = `\
/*! Modified by Software Mansion S.A. on [data] to implement operator overloading. */
`;

if (!tag) {
  console.log('No tag specified. Fetching available tags from GitHub...\n');

  const allTags: string[] = [];
  let url: string | null = 'https://api.github.com/repos/microsoft/TypeScript/tags?per_page=100';

  while (url) {
    const response: Response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch tags from GitHub');
      process.exit(1);
    }

    const tags = (await response.json()) as Array<{ name: string }>;
    allTags.push(...tags.map((t) => t.name));

    // Parse Link header for pagination
    const linkHeader = response.headers.get('link');
    url = null;

    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }

  console.log('Available tags:');
  for (const t of allTags) {
    console.log(`  - ${t}`);
  }
  console.log(`\nTotal: ${allTags.length} tags`);
  console.log('\nUsage: bun scripts/patch.ts <tag>');
  process.exit(1);
}

const typescriptTargetDir = resolve(import.meta.dir, '..', 'typescript');
const versionFilePath = resolve(typescriptTargetDir, '.tsover-version');

console.log(`Patching TypeScript ${tag} ...`);

// Check if we already have the correct version
let shouldClone = true;
if (existsSync(versionFilePath)) {
  const currentVersion = await readFile(versionFilePath, 'utf-8');
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
    throw new Error('Could not find pattern to inject after');
  }

  return source.slice(0, result.index) + toInject + source.slice(result.index);
}

function injectAfter(source: string, preludePattern: RegExp, toInject: string): string {
  const result = preludePattern.exec(source);
  if (!result || result.length < 1) {
    throw new Error('Could not find pattern to inject after');
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
  console.log('Installing dependencies ...');
  await $`npm install`;

  // Apply patches
  console.log('Applying tsover patches...');

  // Patch types.ts
  const typesPath = resolve(typescriptTargetDir, 'src', 'compiler', 'types.ts');
  let typesContent = await readFile(typesPath, 'utf-8');

  const patchErrors: unknown[] = [];

  try {
    typesContent = SWM_CHANGE_NOTICE + typesContent;

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
      __tsover__couldHaveOverloadedOperators(
        left: Expression,
        operator: BinaryOperator,
        right: Expression,
        leftType: Type,
        rightType: Type,
      ): boolean;
      `,
    );

    await writeFile(typesPath, typesContent);

    console.log('  ✓ Patched types.ts');
  } catch (error) {
    patchErrors.push('  ✗ Could not find pattern in types.ts');
    patchErrors.push(error);
  }

  // Patch checker.ts - add operatorPlus support
  const checkerPath = resolve(typescriptTargetDir, 'src', 'compiler', 'checker.ts');
  let checkerContent = await readFile(checkerPath, 'utf-8');

  try {
    checkerContent = SWM_CHANGE_NOTICE + checkerContent;

    if (!checkerContent.includes('isPrologueDirective')) {
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
        [SyntaxKind.MinusToken]: ['operatorMinus'],
        [SyntaxKind.MinusEqualsToken]: ['operatorMinusEq', 'operatorMinus'],
        [SyntaxKind.AsteriskToken]: ['operatorStar'],
        [SyntaxKind.AsteriskEqualsToken]: ['operatorStarEq', 'operatorStar'],
        [SyntaxKind.SlashToken]: ['operatorSlash'],
        [SyntaxKind.SlashEqualsToken]: ['operatorSlashEq', 'operatorSlash'],
    };

    const __tsover__assignmentOperators = [
        SyntaxKind.PlusEqualsToken,
        SyntaxKind.MinusEqualsToken,
        SyntaxKind.AsteriskEqualsToken,
        SyntaxKind.SlashEqualsToken,
    ];

    function __tsover__BRUH(node: CallLikeExpression, signatures: readonly Signature[], checkMode: CheckMode, callChainFlags: SignatureFlags, headMessage?: DiagnosticMessage): Type | undefined {
        // TODO: Fold constants
        const candidatesOutArray = undefined;
        const isTaggedTemplate = false;
        const isDecorator = false;
        const isJsxOpeningOrSelfClosingElement = false;
        const isJsxOpenFragment = false;
        const isInstanceof = false;
        const reportErrors = !isInferencePartiallyBlocked;

        // The following variables are captured and modified by calls to chooseOverload.
        // If overload resolution or type argument inference fails, we want to report the
        // best error possible. The best error is one which says that an argument was not
        // assignable to a parameter. This implies that everything else about the overload
        // was fine. So if there is any overload that is only incorrect because of an
        // argument, we will report an error on that one.
        //
        //     function foo(s: string): void;
        //     function foo(n: number): void; // Report argument error on this overload
        //     function foo(): void;
        //     foo(true);
        //
        // If none of the overloads even made it that far, there are two possibilities.
        // There was a problem with type arguments for some overload, in which case
        // report an error on that. Or none of the overloads even had correct arity,
        // in which case give an arity error.
        //
        //     function foo<T extends string>(x: T): void; // Report type argument error
        //     function foo(): void;
        //     foo<number>(0);
        //
        let candidatesForArgumentError: Signature[] | undefined;
        let candidateForArgumentArityError: Signature | undefined;
        let candidateForTypeArgumentError: Signature | undefined; // TODO: <- should be necessary
        let result: Signature | undefined;
        let argCheckMode = CheckMode.Normal;

        let candidates: Signature[] = [];
        const typeArguments: NodeArray<TypeNode> | undefined = (node as CallExpression).typeArguments;

        // We already perform checking on the type arguments on the class declaration itself.
        forEach(typeArguments, checkSourceElement);

        candidates = candidatesOutArray || [];
        // reorderCandidates fills up the candidates array directly
        reorderCandidates(signatures, candidates, callChainFlags);
        if (!isJsxOpenFragment) {
            if (!candidates.length) {
                if (reportErrors) {
                    diagnostics.add(getDiagnosticForCallNode(node, Diagnostics.Call_target_does_not_contain_any_signatures));
                }
                return resolveErrorCall(node);
            }
        }
        const args = getEffectiveCallArguments(node);

        // The excludeArgument array contains true for each context sensitive argument (an argument
        // is context sensitive it is susceptible to a one-time permanent contextual typing).
        //
        // The idea is that we will perform type argument inference & assignability checking once
        // without using the susceptible parameters that are functions, and once more for those
        // parameters, contextually typing each as we go along.
        //
        // For a tagged template, then the first argument be 'undefined' if necessary because it
        // represents a TemplateStringsArray.
        //
        // For a decorator, no arguments are susceptible to contextual typing due to the fact
        // decorators are applied to a declaration by the emitter, and not to an expression.
        const isSingleNonGenericCandidate = candidates.length === 1 && !candidates[0].typeParameters;
        if (!isDecorator && !isSingleNonGenericCandidate && some(args, isContextSensitive)) {
            argCheckMode = CheckMode.SkipContextSensitive;
        }

        // If we are in signature help, a trailing comma indicates that we intend to provide another argument,
        // so we will only accept overloads with arity at least 1 higher than the current number of provided arguments.
        const signatureHelpTrailingComma = !!(checkMode & CheckMode.IsForSignatureHelp) && node.kind === SyntaxKind.CallExpression && node.arguments.hasTrailingComma;

        // Section 4.12.1:
        // if the candidate list contains one or more signatures for which the type of each argument
        // expression is a subtype of each corresponding parameter type, the return type of the first
        // of those signatures becomes the return type of the function call.
        // Otherwise, the return type of the first signature in the candidate list becomes the return
        // type of the function call.
        //
        // Whether the call is an error is determined by assignability of the arguments. The subtype pass
        // is just important for choosing the best signature. So in the case where there is only one
        // signature, the subtype pass is useless. So skipping it is an optimization.
        if (candidates.length > 1) {
            result = chooseOverload(candidates, subtypeRelation, isSingleNonGenericCandidate, signatureHelpTrailingComma);
        }
        if (!result) {
            result = chooseOverload(candidates, assignableRelation, isSingleNonGenericCandidate, signatureHelpTrailingComma);
        }
        const links = getNodeLinks(node);
        if (links.resolvedSignature !== resolvingSignature && !candidatesOutArray) {
            // There are 2 situations in which it's good to preemptively return the cached result here:
            //
            // 1. if the signature resolution originated on a node that itself depends on the contextual type
            // then it's possible that the resolved signature might not be the same as the one that would be computed in source order
            // since resolving such signature leads to resolving the potential outer signature, its arguments and thus the very same signature
            // it's possible that this inner resolution sets the resolvedSignature first.
            // In such a case we ignore the local result and reuse the correct one that was cached.
            //
            // 2. In certain circular-like situations it's possible that the compiler reentries this function for the same node.
            // It's possible to resolve the inner call against preemptively set empty members (for example in 'resolveAnonymousTypeMembers') of some type.
            // When that happens the compiler might report an error for that inner call but at the same time it might end up resolving the actual members of the other type.
            // This in turn creates a situation in which the outer call fails in 'getSignatureApplicabilityError' due to a cached 'RelationComparisonResult.Failed'
            // but when the compiler tries to report that error (in the code below) it also tries to elaborate it and that can succeed as types would be related against the *resolved* members of the other type.
            // This can hit 'No error for last overload signature' assert but since that error was already reported when the inner call failed we can skip this step altogether here by returning the cached signature early.
            Debug.assert(links.resolvedSignature);
            return links.resolvedSignature;
        }
        if (result) {
            return result;
        }
        result = getCandidateForOverloadFailure(node, candidates, args, !!candidatesOutArray, checkMode);
        // Preemptively cache the result; getResolvedSignature will do this after we return, but
        // we need to ensure that the result is present for the error checks below so that if
        // this signature is encountered again, we handle the circularity (rather than producing a
        // different result which may produce no errors and assert). Callers of getResolvedSignature
        // don't hit this issue because they only observe this result after it's had a chance to
        // be cached, but the error reporting code below executes before getResolvedSignature sets
        // resolvedSignature.
        links.resolvedSignature = result;

        // No signatures were applicable. Now report errors based on the last applicable signature with
        // no arguments excluded from assignability checks.
        // If candidate is undefined, it means that no candidates had a suitable arity. In that case,
        // skip the checkApplicableSignature check.
        if (reportErrors) {
            // If the call expression is a synthetic call to a '[Symbol.hasInstance]' method then we will produce a head
            // message when reporting diagnostics that explains how we got to 'right[Symbol.hasInstance](left)' from
            // 'left instanceof right', as it pertains to "Argument" related messages reported for the call.
            if (!headMessage && isInstanceof) {
                headMessage = Diagnostics.The_left_hand_side_of_an_instanceof_expression_must_be_assignable_to_the_first_argument_of_the_right_hand_side_s_Symbol_hasInstance_method;
            }
            if (candidatesForArgumentError) {
                if (candidatesForArgumentError.length === 1 || candidatesForArgumentError.length > 3) {
                    const last = candidatesForArgumentError[candidatesForArgumentError.length - 1];
                    let chain: DiagnosticMessageChain | undefined;
                    if (candidatesForArgumentError.length > 3) {
                        chain = chainDiagnosticMessages(chain, Diagnostics.The_last_overload_gave_the_following_error);
                        chain = chainDiagnosticMessages(chain, Diagnostics.No_overload_matches_this_call);
                    }
                    if (headMessage) {
                        chain = chainDiagnosticMessages(chain, headMessage);
                    }
                    const diags = getSignatureApplicabilityError(node, args, last, assignableRelation, CheckMode.Normal, /*reportErrors*/ true, () => chain);
                    if (diags) {
                        for (const d of diags) {
                            if (last.declaration && candidatesForArgumentError.length > 3) {
                                addRelatedInfo(d, createDiagnosticForNode(last.declaration, Diagnostics.The_last_overload_is_declared_here));
                            }
                            addImplementationSuccessElaboration(last, d);
                            diagnostics.add(d);
                        }
                    }
                    else {
                        Debug.fail("No error for last overload signature");
                    }
                }
                else {
                    const allDiagnostics: (readonly DiagnosticRelatedInformation[])[] = [];
                    let max = 0;
                    let min = Number.MAX_VALUE;
                    let minIndex = 0;
                    let i = 0;
                    for (const c of candidatesForArgumentError) {
                        const chain = () => chainDiagnosticMessages(/*details*/ undefined, Diagnostics.Overload_0_of_1_2_gave_the_following_error, i + 1, candidates.length, signatureToString(c));
                        const diags = getSignatureApplicabilityError(node, args, c, assignableRelation, CheckMode.Normal, /*reportErrors*/ true, chain);
                        if (diags) {
                            if (diags.length <= min) {
                                min = diags.length;
                                minIndex = i;
                            }
                            max = Math.max(max, diags.length);
                            allDiagnostics.push(diags);
                        }
                        else {
                            Debug.fail("No error for 3 or fewer overload signatures");
                        }
                        i++;
                    }

                    const diags = max > 1 ? allDiagnostics[minIndex] : flatten(allDiagnostics);
                    Debug.assert(diags.length > 0, "No errors reported for 3 or fewer overload signatures");
                    let chain = chainDiagnosticMessages(
                        map(diags, createDiagnosticMessageChainFromDiagnostic),
                        Diagnostics.No_overload_matches_this_call,
                    );
                    if (headMessage) {
                        chain = chainDiagnosticMessages(chain, headMessage);
                    }
                    // The below is a spread to guarantee we get a new (mutable) array - our 'flatMap' helper tries to do "smart" optimizations where it reuses input
                    // arrays and the emptyArray singleton where possible, which is decidedly not what we want while we're still constructing this diagnostic
                    const related = [...flatMap(diags, d => (d as Diagnostic).relatedInformation) as DiagnosticRelatedInformation[]];
                    let diag: Diagnostic;
                    if (every(diags, d => d.start === diags[0].start && d.length === diags[0].length && d.file === diags[0].file)) {
                        const { file, start, length } = diags[0];
                        diag = { file, start, length, code: chain.code, category: chain.category, messageText: chain, relatedInformation: related };
                    }
                    else {
                        diag = createDiagnosticForNodeFromMessageChain(getSourceFileOfNode(node), getErrorNodeForCallNode(node), chain, related);
                    }
                    addImplementationSuccessElaboration(candidatesForArgumentError[0], diag);
                    diagnostics.add(diag);
                }
            }
            else if (candidateForArgumentArityError) {
                diagnostics.add(getArgumentArityError(node, [candidateForArgumentArityError], args, headMessage));
            }
            else if (candidateForTypeArgumentError) {
                checkTypeArguments(candidateForTypeArgumentError, (node as CallExpression | TaggedTemplateExpression | JsxOpeningLikeElement).typeArguments!, /*reportErrors*/ true, headMessage);
            }
            else if (!isJsxOpenFragment) {
                const signaturesWithCorrectTypeArgumentArity = filter(signatures, s => hasCorrectTypeArgumentArity(s, typeArguments));
                if (signaturesWithCorrectTypeArgumentArity.length === 0) {
                    diagnostics.add(getTypeArgumentArityError(node, signatures, typeArguments!, headMessage));
                }
                else {
                    diagnostics.add(getArgumentArityError(node, signaturesWithCorrectTypeArgumentArity, args, headMessage));
                }
            }
        }

        // return result;
        return getReturnTypeOfSignature(result);

        function addImplementationSuccessElaboration(failed: Signature, diagnostic: Diagnostic) {
            const oldCandidatesForArgumentError = candidatesForArgumentError;
            const oldCandidateForArgumentArityError = candidateForArgumentArityError;
            const oldCandidateForTypeArgumentError = candidateForTypeArgumentError;

            const failedSignatureDeclarations = failed.declaration?.symbol?.declarations || emptyArray;
            const isOverload = failedSignatureDeclarations.length > 1;
            const implDecl = isOverload ? find(failedSignatureDeclarations, d => isFunctionLikeDeclaration(d) && nodeIsPresent(d.body)) : undefined;
            if (implDecl) {
                const candidate = getSignatureFromDeclaration(implDecl as FunctionLikeDeclaration);
                const isSingleNonGenericCandidate = !candidate.typeParameters;
                if (chooseOverload([candidate], assignableRelation, isSingleNonGenericCandidate)) {
                    addRelatedInfo(diagnostic, createDiagnosticForNode(implDecl, Diagnostics.The_call_would_have_succeeded_against_this_implementation_but_implementation_signatures_of_overloads_are_not_externally_visible));
                }
            }

            candidatesForArgumentError = oldCandidatesForArgumentError;
            candidateForArgumentArityError = oldCandidateForArgumentArityError;
            candidateForTypeArgumentError = oldCandidateForTypeArgumentError;
        }

        function chooseOverload(candidates: Signature[], relation: Map<string, RelationComparisonResult>, isSingleNonGenericCandidate: boolean, signatureHelpTrailingComma = false) {
            candidatesForArgumentError = undefined;
            candidateForArgumentArityError = undefined;
            candidateForTypeArgumentError = undefined;

            if (isSingleNonGenericCandidate) {
                const candidate = candidates[0];
                if (some(typeArguments) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) {
                    return undefined;
                }
                if (getSignatureApplicabilityError(node, args, candidate, relation, CheckMode.Normal, /*reportErrors*/ false, /*containingMessageChain*/ undefined)) {
                    candidatesForArgumentError = [candidate];
                    return undefined;
                }
                return candidate;
            }

            for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
                const candidate = candidates[candidateIndex];
                if (!hasCorrectTypeArgumentArity(candidate, typeArguments) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) {
                    continue;
                }

                let checkCandidate: Signature;
                let inferenceContext: InferenceContext | undefined;

                if (candidate.typeParameters) {
                    let typeArgumentTypes: Type[] | undefined;
                    if (some(typeArguments)) {
                        typeArgumentTypes = checkTypeArguments(candidate, typeArguments, /*reportErrors*/ false);
                        if (!typeArgumentTypes) {
                            candidateForTypeArgumentError = candidate;
                            continue;
                        }
                    }
                    else {
                        inferenceContext = createInferenceContext(candidate.typeParameters, candidate, /*flags*/ isInJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
                        typeArgumentTypes = inferTypeArguments(node, candidate, args, argCheckMode | CheckMode.SkipGenericFunctions, inferenceContext);
                        argCheckMode |= inferenceContext.flags & InferenceFlags.SkippedGenericFunction ? CheckMode.SkipGenericFunctions : CheckMode.Normal;
                    }
                    checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, isInJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParameters);
                    // If the original signature has a generic rest type, instantiation may produce a
                    // signature with different arity and we need to perform another arity check.
                    if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
                        candidateForArgumentArityError = checkCandidate;
                        continue;
                    }
                }
                else {
                    checkCandidate = candidate;
                }
                if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, /*reportErrors*/ false, /*containingMessageChain*/ undefined)) {
                    // Give preference to error candidates that have no rest parameters (as they are more specific)
                    (candidatesForArgumentError || (candidatesForArgumentError = [])).push(checkCandidate);
                    continue;
                }
                if (argCheckMode) {
                    // If one or more context sensitive arguments were excluded, we start including
                    // them now (and keeping do so for any subsequent candidates) and perform a second
                    // round of type inference and applicability checking for this particular candidate.
                    argCheckMode = CheckMode.Normal;
                    if (inferenceContext) {
                        const typeArgumentTypes = inferTypeArguments(node, candidate, args, argCheckMode, inferenceContext);
                        checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, isInJSFile(candidate.declaration), inferenceContext.inferredTypeParameters);
                        // If the original signature has a generic rest type, instantiation may produce a
                        // signature with different arity and we need to perform another arity check.
                        if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
                            candidateForArgumentArityError = checkCandidate;
                            continue;
                        }
                    }
                    if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, /*reportErrors*/ false, /*containingMessageChain*/ undefined)) {
                        // Give preference to error candidates that have no rest parameters (as they are more specific)
                        (candidatesForArgumentError || (candidatesForArgumentError = [])).push(checkCandidate);
                        continue;
                    }
                }
                candidates[candidateIndex] = checkCandidate;
                return checkCandidate;
            }

            return undefined;
        }
    }

    function __tsover__resolveOverloadCall(method: Expression, lhs: Expression, rhs: Expression, checkMode: CheckMode): Type | undefined {
        const fakeCallExpression = factory.createCallExpression(method, undefined, [lhs, rhs]);
        const result = checkCallExpression(resolveCallExpression(fakeCallExpression, undefined, [lhs, rhs], checkMode));
        return result;
    }

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

    function __tsover__couldHaveOverloadedOperators(
      left: Expression,
      operator: BinaryOperator,
      right: Expression,
      _leftType: Type,
      _rightType: Type,
    ): boolean {
        if (!(__tsover__isInUseTsoverScope(left) || __tsover__isInUseGpuScope(left)) || !__tsover__overloaded[operator as keyof typeof __tsover__overloaded]) {
            return false;
        }

        const leftType = getBaseConstraintOrType(_leftType);
        const rightType = getBaseConstraintOrType(_rightType);

        const typesToCheck: Type[] = [];
        if (leftType.flags & TypeFlags.Union) {
            typesToCheck.push(...(leftType as UnionType).types);
        } else {
            typesToCheck.push(leftType);
        }
        if (rightType.flags & TypeFlags.Union) {
            typesToCheck.push(...(rightType as UnionType).types);
        } else {
            typesToCheck.push(rightType);
        }

        const symbols = __tsover__overloaded[operator as keyof typeof __tsover__overloaded].map(getPropertyNameForKnownSymbolName);
        return typesToCheck.some((aType) => {
          const member = symbols.reduce<Type | undefined>((acc, symbol) => acc ?? getTypeOfPropertyOfType(aType, symbol), undefined);
          return member !== undefined;
        });
    }

    function __tsover__getOverloadReturnType(
      left: Expression,
      operator: BinaryOperator,
      right: Expression,
      _leftType: Type,
      _rightType: Type,
      checkDeeper: (lt: Type, rt: Type) => Type | undefined,
    ): Type | undefined {
        if (!(__tsover__isInUseTsoverScope(left) || __tsover__isInUseGpuScope(left)) || !__tsover__overloaded[operator as keyof typeof __tsover__overloaded]) {
            return undefined;
        }

        const deferOperationType = __tsover__getDeferOperationSymbolType();

        const symbols = __tsover__overloaded[operator as keyof typeof __tsover__overloaded].map(getPropertyNameForKnownSymbolName);
        let resultMembers: Type[] = [];
        for (const [leftType, rightType] of combinations) {
            const lhsOverload = symbols.reduce<Type | undefined>((acc, symbol) => acc ?? getPropertyOfType(leftType, symbol), undefined);
            const rhsOverload = symbols.reduce<Type | undefined>((acc, symbol) => acc ?? getPropertyOfType(rightType, symbol), undefined);
            let resultType = __tsover__resolveOverloadCall(lhsOverload, leftType, rightType);

            if (resultType === undefined || (deferOperationType && isTypeIdenticalTo(resultType, deferOperationType))) {
                // Try rhs overloads if lhs has no overloads or if result has deferOperation symbol
                resultType = __tsover__resolveOverloadCall(rhsOverload, leftType, rightType);
            }
            if (resultType && deferOperationType && isTypeIdenticalTo(resultType, deferOperationType)) {
                resultType = undefined;
            }

            // Might be a valid primitive that can be part of this operation. If the number
            // of combinations is 1, then we can just fallback to standard behavior, but if not,
            // we need to check deeper and append the result to the union.
            if (resultType === undefined && combinations.length > 1) {
                resultType = checkDeeper(leftType, rightType);
            }

            // Both operands either have no overloads, or both have deferred.
            if (resultType === undefined) {
                // All union members must be valid operations
                resultMembers = [];
                break;
            }
            resultMembers.push(resultType);
        }

        if (resultMembers.length === 0) {
            // Fallback to normal TS behavior
            return undefined;
        }

        return getUnionType(resultMembers);
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
      __tsover__couldHaveOverloadedOperators,
      `,
    );

    checkerContent = injectAfter(
      checkerContent,
      /function checkBinaryLikeExpressionWorker\([\S\s]*const operator = operatorToken\.kind;/,
      `
      const overloadedType = __tsover__getOverloadReturnType(
        left,
        operator,
        right,
        leftType,
        rightType,
        (lt, rt) => checkBinaryLikeExpressionWorker(left, operatorToken, right, lt, rt, checkMode, errorNode),
      );
      if (overloadedType) {
          if (__tsover__assignmentOperators.includes(operator)) {
            checkAssignmentOperator(overloadedType);
          }
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

    console.log('  ✓ Patched checker.ts');
  } catch (error) {
    patchErrors.push('  ✗ Could not find pattern in checker.ts');
    patchErrors.push(error);
  }

  // Patch commandLineParser.ts - add tsover lib entry
  const cmdParserPath = resolve(typescriptTargetDir, 'src', 'compiler', 'commandLineParser.ts');
  let cmdParserContent = await readFile(cmdParserPath, 'utf-8');

  // Look for the esnext.sharedmemory entry and insert tsover after it
  const cmdParserPattern = /(\["esnext\.sharedmemory", "lib\.esnext\.sharedmemory\.d\.ts"\],)/;
  if (cmdParserPattern.test(cmdParserContent)) {
    cmdParserContent = SWM_CHANGE_NOTICE + cmdParserContent;
    cmdParserContent = cmdParserContent.replace(
      cmdParserPattern,
      `$1\n    ["tsover", "lib.tsover.d.ts"],`,
    );
    await writeFile(cmdParserPath, cmdParserContent);
    console.log('  ✓ Patched commandLineParser.ts');
  } else {
    patchErrors.push('  ✗ Could not find pattern in commandLineParser.ts');
  }

  // Patch libs.json - add tsover to end of libs array
  try {
    const libsJsonPath = resolve(typescriptTargetDir, 'src', 'lib', 'libs.json');
    const libsJsonContent = jsonc.parse(
      await readFile(libsJsonPath, 'utf-8'),
    ) as jsonc.CommentObject;

    (libsJsonContent?.libs as jsonc.CommentArray<string>).push('tsover');
    await writeFile(libsJsonPath, jsonc.stringify(libsJsonContent, undefined, 4));
    console.log('  ✓ Patched libs.json');
  } catch (error) {
    patchErrors.push('  ✗ Could not find libs array end in libs.json');
    patchErrors.push(error);
  }

  // Patch diagnosticMessages.json
  try {
    const diagnosticsJsonPath = resolve(
      typescriptTargetDir,
      'src',
      'compiler',
      'diagnosticMessages.json',
    );
    const diagnosticsJsonContent = jsonc.parse(
      await readFile(diagnosticsJsonPath, 'utf-8'),
    ) as jsonc.CommentObject;

    const diagnosticCodes = (Object.values(diagnosticsJsonContent) as jsonc.CommentObject[])
      .filter((d) => d.category === 'Message')
      .map((d) => d.code as number)
      .sort((a, b) => a - b);
    // Choosing the last diagnostic code and incrementing it by 1
    const code = diagnosticCodes[diagnosticCodes.length - 1] + 1;
    jsonc.assign(diagnosticsJsonContent, {
      "Operator '{0}' is overloaded.": {
        category: 'Message',
        code,
      },
    });
    await writeFile(diagnosticsJsonPath, jsonc.stringify(diagnosticsJsonContent, undefined, 4));
    console.log('  ✓ Patched diagnosticMessages.json');
  } catch (error) {
    patchErrors.push('  ✗ Could not patch diagnosticMessages.json');
    patchErrors.push(error);
  }

  // Create tsover.d.ts
  const tsoverDtsPath = resolve(typescriptTargetDir, 'src', 'lib', 'tsover.d.ts');
  const tsoverDtsContent = `${SWM_LICENSE}
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
  console.log('  ✓ Created tsover.d.ts');

  // Rebuild after patching
  console.log('Rebuilding TypeScript with patches...');
  await $`npx --yes hereby@latest`;

  console.log(`✓ Successfully patched TypeScript ${tag}`);

  // Show diff
  console.log('\nChanges applied:');
  console.log('================');
  await $`git diff -w`.cwd(typescriptTargetDir);

  // Show errors
  if (patchErrors.length > 0) {
    console.error('\nErrors:');
    console.error('========');
    console.error(patchErrors.join('\n'));
  }
} finally {
  // Restore original working directory
  process.chdir(originalCwd);
}
