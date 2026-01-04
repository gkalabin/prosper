import {demoDataSql} from '@/lib/demo/data';
import prisma from '@/lib/prisma';

export async function resetDemoData() {
  console.log('Resetting demo data...');
  // Execute each statement
  for (const statement of demoDataSql) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (e) {
      console.error('Error executing demo sql:', statement.substring(0, 100));
      console.error(e);
      // If one fails, we probably want to continue or stop?
      // Since it's IGNORE, it shouldn't fail on dupes.
      // If it fails on foreign key, that might be an issue if order is wrong.
      // But my generation order is User -> Bank -> Account -> Category -> Transaction.
      // So it should be fine.
      throw e;
    }
  }
  console.log('Demo data reset complete.');
}
