#!/usr/bin/env node
/**
 * Guards the RSC serialization boundary.
 *
 * Functions cannot be passed from a Server Component to a Client Component —
 * Next.js throws "Functions cannot be passed directly to Client Components" at
 * *render* time, which lint, typecheck and `next build` all miss (the route is
 * compiled, not rendered). The convention in this repo is to wrap the table in a
 * `'use client'` component under `_components/` and keep the callback there.
 *
 * Run via `pnpm preflight`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../apps/crm/src/app'
);

/** Props on shared components whose value is a callback. */
const FUNCTION_PROPS = [
  'rowHref',
  'rowDetail',
  'onSelectedRowKeysChange',
  'getRowKey',
  'onSearch',
  'onSelect',
  'onOpenChange',
  'onClick',
  'onValueChange',
  'onCheckedChange',
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith('.tsx')) yield full;
  }
}

/** `'use client'` must be the first statement, so a prefix check is enough. */
function isClientComponent(src) {
  return /^\s*(\/\*[\s\S]*?\*\/\s*|\/\/.*\n\s*)*['"]use client['"]/.test(src);
}

const failures = [];

for (const file of walk(APP_DIR)) {
  const src = readFileSync(file, 'utf8');
  if (isClientComponent(src)) continue;

  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const prop of FUNCTION_PROPS) {
      // Match `prop={` followed by anything that starts a function value.
      const re = new RegExp(`\\b${prop}=\\{\\s*(\\(|async\\s|function\\b|[a-zA-Z_$][\\w$]*\\s*=>)`);
      if (re.test(line)) {
        failures.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          prop,
          text: line.trim(),
        });
      }
    }
  });
}

if (failures.length > 0) {
  console.error(
    'verify-rsc-function-props: function prop passed from a Server Component to a Client Component.\n' +
      "Move the JSX into a 'use client' component under _components/ and keep the callback there.\n"
  );
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}  ${f.prop}=  →  ${f.text}`);
  }
  process.exit(1);
}

console.log('verify-rsc-function-props: ok');
