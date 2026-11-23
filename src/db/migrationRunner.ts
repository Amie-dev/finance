import { DatabaseClient } from './types';
import { migration001 } from './migrations/001_initial_schema';

export interface Migration {
  version: number;
  name: string;
  up: string[];
}

const ALL_MIGRATIONS: Migration[] = [migration001];

export async function runMigrations(client: DatabaseClient): Promise<void> {
  // Ensure migration tracking table exists
  await client.executeMutation(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Fetch applied versions
  const appliedRows = await client.execute<{ version: number }>(
    `SELECT version FROM schema_migrations ORDER BY version ASC;`
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of ALL_MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[SmartMoney DB] Applying migration ${migration.version}: ${migration.name}`);
      await client.transaction(async (tx) => {
        for (const statement of migration.up) {
          await tx.executeMutation(statement);
        }
        await tx.executeMutation(
          `INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
      console.log(`[SmartMoney DB] Migration ${migration.version} applied successfully.`);
    }
  }
}

