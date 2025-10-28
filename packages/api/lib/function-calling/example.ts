/**
 * Example usage of the Function Calling API
 * This demonstrates how to create and use typed functions with Zod validation
 */

import { z } from 'zod';
import { FunctionCallingPromptAPI } from './function-calling-api.js';
import type { FunctionDefinition } from './types.js';

// Define your function with Zod schemas
const searchVocabularyFunction: FunctionDefinition<
  z.ZodObject<{
    query: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
  }>,
  z.ZodPromise<z.ZodArray<z.ZodString>>
> = {
  name: 'search_vocabulary',
  description: 'Search for vocabulary words matching a query',
  parameters: z.object({
    query: z.string(),
    language: z.string().optional(),
  }),
  returns: z.promise(z.array(z.string())),
  execute: async (input) => {
    // This is type-safe! TypeScript knows input.query is string
    // and input.language is string | undefined
    console.log(`Searching for: ${input.query} in language: ${input.language}`);

    // Simulate async database query
    return ['word1', 'word2', 'word3'];
  },
};

// Another example: simple synchronous function
const calculateSumFunction: FunctionDefinition<
  z.ZodObject<{ a: z.ZodNumber; b: z.ZodNumber }>,
  z.ZodNumber
> = {
  name: 'calculate_sum',
  description: 'Add two numbers together',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  returns: z.number(),
  execute: (input) => {
    // Type-safe! input.a and input.b are both numbers
    return input.a + input.b;
  },
};

// Setup and usage
export async function example() {
  // Create API instance with configuration
  const api = new FunctionCallingPromptAPI({
    maxRetries: 3,
    enableLogging: true,
    strictMode: false,
  });

  // Register functions
  api.registerFunction(searchVocabularyFunction);
  api.registerFunction(calculateSumFunction);

  // Initialize session
  await api.initializeSession(
    (status) => console.log('Session status:', status),
    'You are a helpful vocabulary assistant.'
  );

  // Generate a response (AI will decide which function to call)
  try {
    const response = await api.generate(
      "Search for vocabulary containing 'hello' in English"
    );

    console.log('AI Response:', response);
    console.log('Function called:', response.parsed?.function);
    console.log('Function result:', response.parsed?.functionResult);
  } catch (error) {
    console.error('Error:', error);
  }

  // Get all registered function names
  console.log('Available functions:', api.getRegisteredFunctions());

  // Listen to events
  api.onMessagesChanged((messages) => {
    console.log('Messages updated:', messages.length);
  });

  api.onBusyChanged((busy) => {
    console.log('API busy:', busy);
  });
}

