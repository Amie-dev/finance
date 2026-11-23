import * as SQLite from 'expo-sqlite';
import { DatabaseClient } from './types';
import { runMigrations } from './migrationRunner';

const DB_NAME = 'smartmoney.db';

class ExpoSQLiteClient implements DatabaseClient {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return await this.db.getAllAsync<T>(sql, params);
  }

  async executeMutation(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const result = await this.db.runAsync(sql, params);
    return {
      rowsAffected: result.changes,
      insertId: result.lastInsertRowId,
    };
  }

  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    let result: T;
    await this.db.withTransactionAsync(async () => {
      result = await callback(this);
    });
    return result!;
  }
}

let dbInstance: DatabaseClient | null = null;
let isInitializing = false;

export async function getDatabaseClient(): Promise<DatabaseClient> {
  if (dbInstance) {
    return dbInstance;
  }

  if (isInitializing) {
    // Wait briefly if already initializing
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getDatabaseClient();
  }

  isInitializing = true;
  try {
    const rawDb = await SQLite.openDatabaseAsync(DB_NAME);

    // Enforce WAL mode and foreign key constraints as required by PRD Section 6
    await rawDb.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
    `);

    const client = new ExpoSQLiteClient(rawDb);
    // Run schema migrations
    await runMigrations(client);

    dbInstance = client;
    return client;
  } finally {
    isInitializing = false;
  }
}
