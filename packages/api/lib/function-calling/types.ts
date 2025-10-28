import { z } from 'zod';
import type { z as zod } from 'zod';

// Base message types
export const CompletionRoleSchema = z.enum(['system', 'user', 'assistant']);
export type CompletionRole = zod.infer<typeof CompletionRoleSchema>;

export const CompletionMessageSchema = z.object({
  content: z.string(),
  role: CompletionRoleSchema,
  error: z.string().optional(),
});

export type CompletionMessage = zod.infer<typeof CompletionMessageSchema>;

// Function calling response schema
export const FunctionCallResponseSchema = z.object({
  message: z.string().nullable(),
  function: z.string().nullable(),
  parameter: z.union([z.string(), z.number()]).nullable(),
  functionResult: z.unknown().optional(),
});

export type FunctionCallResponse = zod.infer<typeof FunctionCallResponseSchema>;

// Message with parsed function call
export const MessageSchema = CompletionMessageSchema.extend({
  parsed: FunctionCallResponseSchema.optional(),
});

export type Message = zod.infer<typeof MessageSchema>;

// Configuration
export const FunctionCallingConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(0).default(1000),
  strictMode: z.boolean().default(false),
  enableLogging: z.boolean().default(true),
  timeout: z.number().int().min(0).optional(),
});

export type FunctionCallingConfig = zod.infer<typeof FunctionCallingConfigSchema>;

// Error types
export const FunctionCallingErrorSchema = z.object({
  type: z.enum(['parsing', 'validation', 'execution', 'timeout', 'not_found']),
  message: z.string(),
  originalError: z.instanceof(Error).optional(),
  timestamp: z.number(),
});

export type FunctionCallingError = zod.infer<typeof FunctionCallingErrorSchema>;

// Function definition - generic interface
export interface FunctionDefinition<P extends z.ZodTypeAny = z.ZodTypeAny, R extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: P;
  returns: R;
  execute: (input: z.infer<P>) => z.infer<R> | Promise<z.infer<R>>;
}

// Helper to create a typed function with validation
export const createFunction = <P extends z.ZodTypeAny, R extends z.ZodTypeAny>(
  def: FunctionDefinition<P, R>,
): FunctionDefinition<P, R> => def;

// Example function type
export type ExampleFunctionCall = {
  message: string | null;
  function: string | null;
  parameter: string | number | null;
};
