#!/usr/bin/env tsx
import { ensureBaselineRbac } from './seed';

ensureBaselineRbac()
  .then(() => {
    console.log('Baseline RBAC synced (permissions + system roles).');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
