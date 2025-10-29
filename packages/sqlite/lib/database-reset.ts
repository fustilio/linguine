import { resetVocabularyDatabase } from './vocabulary.js';
import { resetTextRewritesDatabase } from './text-rewrites.js';
import { getDatabaseManager } from './database-manager.js';

/**
 * Completely resets the entire database by dropping and recreating all tables
 * This will delete ALL data in the database
 */
export const resetEntireDatabase = async () => {
  console.log('Resetting entire database...');
  
  try {
    // Reset both tables
    await Promise.all([
      resetVocabularyDatabase(),
      resetTextRewritesDatabase()
    ]);
    
    // Reset the database manager singleton state
    const dbManager = getDatabaseManager();
    dbManager.reset();
    
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
};

/**
 * Resets only the text rewrites table
 */
export const resetTextRewritesOnly = async () => {
  console.log('Resetting text rewrites table...');
  
  try {
    await resetTextRewritesDatabase();
    console.log('Text rewrites table reset completed successfully');
  } catch (error) {
    console.error('Error resetting text rewrites table:', error);
    throw error;
  }
};

/**
 * Resets only the vocabulary table
 */
export const resetVocabularyOnly = async () => {
  console.log('Resetting vocabulary table...');
  
  try {
    await resetVocabularyDatabase();
    console.log('Vocabulary table reset completed successfully');
  } catch (error) {
    console.error('Error resetting vocabulary table:', error);
    throw error;
  }
};
