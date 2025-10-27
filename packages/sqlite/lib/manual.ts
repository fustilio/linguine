import { Kysely } from 'kysely';
import { SQLocalKysely } from 'sqlocal/kysely';
import type { DatabaseSchema } from './types.js';

export class ManualSqliteClient {
  private db: Kysely<DatabaseSchema> | null = null;
  private filename: string;
  constructor() {
    this.db = null;
    this.filename = 'database.sqlite3';

    const { dialect } = new SQLocalKysely(this.filename);
    this.db = new Kysely({ dialect });
  }

  public getDb(): Kysely<DatabaseSchema> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
