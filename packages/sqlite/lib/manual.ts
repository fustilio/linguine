import { Kysely } from 'kysely';
import { SQLocalKysely } from 'sqlocal/kysely';
import type { DatabaseSchema } from './types.js';

export class ManualSqliteClient {
  private static instance: ManualSqliteClient | null = null;
  private db: Kysely<DatabaseSchema> | null = null;
  private filename: string;

  private constructor() {
    this.filename = 'database.sqlite3';
    this.initializeDatabase();
  }

  public static getInstance(): ManualSqliteClient {
    if (!ManualSqliteClient.instance) {
      ManualSqliteClient.instance = new ManualSqliteClient();
    }
    return ManualSqliteClient.instance;
  }

  private initializeDatabase(): void {
    const { dialect } = new SQLocalKysely(this.filename);
    this.db = new Kysely({ dialect });
  }

  public getDb(): Kysely<DatabaseSchema> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  public static resetInstance(): void {
    ManualSqliteClient.instance = null;
  }
}
