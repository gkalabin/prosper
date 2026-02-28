'use server';

import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function resetDemoData() {
  console.log('Resetting demo data...');

  const sqlPath = path.join(process.cwd(), 'prisma/demo.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon. Be careful if data contains semicolons.
  // The generated SQL separates statements by `;\n`.
  // I will use that as a separator to be safer, or just `;` if I trust the data.
  // The data I generated doesn't have semicolons in strings.
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (e) {
      console.error(
        'Error executing demo sql statement:',
        statement.substring(0, 100)
      );
      console.error(e);
      // Throwing might stop the whole process, but for demo data maybe we want to continue?
      // User asked for "demo mode data".
      // I'll throw to be safe.
      throw e;
    }
  }
  console.log('Demo data reset complete.');
}
