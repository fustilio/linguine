// Database Manager - Singleton for centralized database initialization and management
import { ManualSqliteClient } from './manual.js';
import { initializeVocabularyDatabase } from './vocabulary.js';
import { initializeTextRewritesDatabase } from './text-rewrites.js';

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Ensures the database is initialized. Returns a promise that resolves when initialization is complete.
   * This method is idempotent - multiple calls will return the same promise.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }

    await this.initializationPromise;
    this.isInitialized = true;
  }

  /**
   * Performs the actual database initialization
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing database...');
      
      // Initialize both database tables in parallel
      await Promise.all([
        initializeVocabularyDatabase(),
        initializeTextRewritesDatabase()
      ]);
      
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Resets the initialization state (useful for testing or reinitialization)
   */
  public reset(): void {
    this.isInitialized = false;
    this.initializationPromise = null;
    ManualSqliteClient.resetInstance();
  }

  /**
   * Checks if the database is currently initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

// Export a convenience function for easy access
export const getDatabaseManager = (): DatabaseManager => {
  return DatabaseManager.getInstance();
};
