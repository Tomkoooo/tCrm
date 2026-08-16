#!/usr/bin/env node
/**
 * Guards against React #143: Slot (Button asChild) must receive exactly one child.
 * Run via `pnpm preflight` — no jsdom needed (Next tsconfig uses jsx: preserve).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const buttonPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../packages/ui/src/components/button.tsx'
);

const src = readFileSync(buttonPath, 'utf8');

const asChildBlock = src.match(/if \(asChild\) \{[\s\S]*?return \([\s\S]*?\);/);
if (!asChildBlock) {
  console.error('verify-button-aschild: could not find asChild branch in button.tsx');
  process.exit(1);
}

if (asChildBlock[0].includes('Loader2')) {
  console.error(
    'verify-button-aschild: Button asChild branch must not render Loader2 (React.Children.only / error #143)'
  );
  process.exit(1);
}

console.log('verify-button-aschild: ok');
