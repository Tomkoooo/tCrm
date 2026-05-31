#!/usr/bin/env tsx
import { seedDatabase } from './seed';
import fs from 'node:fs';
import { connectDB, Category } from './index';

seedDatabase()
  .then(async () => {
    await connectDB();

    if (process.env.SEED_INVENTORY === '1') {
      const { parseInventoryXlsx, commitInventoryImport, readImportWorkbook, buildAutoColumnMap } =
        await import('@crm/core');
      const filePath = process.env.SEED_INVENTORY_FILE ?? 'docs/excel/import-sample.xlsx';
      const buf = fs.readFileSync(filePath);
      const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const inspect = readImportWorkbook(arrayBuf);
      const sheetName = inspect.sheetNames[0]!;
      const headers = inspect.headersBySheet[sheetName] ?? [];
      const parsed = await parseInventoryXlsx(arrayBuf, {
        sheetName,
        columnMap: buildAutoColumnMap(headers),
        allowMissingSupplier: true,
      });
      if (parsed.errors.length > 0) {
        console.error('Inventory seed aborted due to parse errors:', parsed.errors.slice(0, 5));
      } else {
        const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@tcrm.local';
        const { User } = await import('./models/User');
        const admin = await User.findOne({ email: adminEmail });
        const userId = admin?._id?.toString() ?? '000000000000000000000000';
        await commitInventoryImport(parsed, userId);
        console.log(`Seeded inventory from ${filePath}`);
      }
    }

    if (process.env.SEED_CATEGORY_SKU === '1') {
      const filePath = 'docs/excel/sku.csv';
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        // Expected: NAME <tab> OPTIONAL_EXAMPLE_INTERNAL_SKU <tab> NOTE
        const parts = line
          .split(/\t+/)
          .map((p) => p.trim())
          .filter(Boolean);
        const name = parts[0] ?? '';
        const exampleSku = parts[1]; // may be undefined

        // Determine prefix: either from example SKU first char or from NOTE like "6+8"
        let prefix = exampleSku?.[0] ?? '';
        if (!prefix) {
          const note = parts.find((p) => p.includes('+')) ?? '';
          const m = note.match(/^([0-9]+)\\s*\\+/);
          prefix = m?.[1] ?? '';
        }

        const slug = name
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^\\w\\s-]/g, '')
          .trim()
          .replace(/\\s+/g, '-')
          .replace(/-+/g, '-');

        if (!prefix) {
          console.warn(`Skipping sku.csv line (no prefix): ${line}`);
          continue;
        }

        const totalLength = (() => {
          const note = parts.find((p) => p.includes('+')) ?? '';
          const m = note.match(/([0-9]+)\s*\+\s*([0-9]+)/i);
          if (m) {
            return Number(m[1]) + Number(m[2]);
          }
          return 16;
        })();

        await Category.findOneAndUpdate(
          { slug, level: 1 },
          {
            $setOnInsert: { slug, level: 1, names: { hu: name } },
            $set: { skuPrefix: prefix, skuTotalLength: totalLength, skuPadChar: '0' },
          },
          { upsert: true, new: true }
        ).exec();
      }

      console.log('Seeded category SKU settings from sku.csv');
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
