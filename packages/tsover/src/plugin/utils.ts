/**
 * Utility functions for the plugin
 */

import ts from 'tsover';

export const opToRuntimeFn = {
  [ts.SyntaxKind.PlusToken]: 'add',
  [ts.SyntaxKind.PlusEqualsToken]: 'add',
  [ts.SyntaxKind.MinusToken]: 'sub',
  [ts.SyntaxKind.MinusEqualsToken]: 'sub',
  [ts.SyntaxKind.AsteriskToken]: 'mul',
  [ts.SyntaxKind.AsteriskEqualsToken]: 'mul',
  [ts.SyntaxKind.SlashToken]: 'div',
  [ts.SyntaxKind.SlashEqualsToken]: 'div',
  [ts.SyntaxKind.AsteriskAsteriskToken]: 'pow',
  [ts.SyntaxKind.AsteriskAsteriskEqualsToken]: 'pow',
};

export const assignmentOps = [
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
];
