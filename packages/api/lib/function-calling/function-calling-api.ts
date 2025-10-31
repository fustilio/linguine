// original based on https://github.com/nico-martin/benz-gpt/blob/main/src/functionCallingPromptAPI/FunctionCallingPromptAPI.ts

import { chromeAIManager } from '../chrome-ai/index.js';
import pRetry from 'p-retry';
import { z } from 'zod';
import type { Message, FunctionCallingConfig, FunctionDefinition } from './types.js';

// Session interface for Chrome AI
interface LanguageModelSession {
  prompt: (text: string, options?: Record<string, never>) => Promise<string>;
  destroy: () => void;
}

export class FunctionCallingPromptAPI extends EventTarget {
  private session: LanguageModelSession | null = null;
  private _messages: Message[] = [];
  private functions: Array<FunctionDefinition> = [];
  private _busy = false;
  private initialized = false;
  private config: Required<Omit<FunctionCallingConfig, 'timeout'>> & { timeout?: number };

  constructor(config?: Partial<FunctionCallingConfig>) {
    super();

    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
      strictMode: config?.strictMode ?? false,
      enableLogging: config?.enableLogging ?? true,
      timeout: config?.timeout ?? undefined,
    };
  }

  set messages(messages: Message[]) {
    this._messages = messages;
    this.dispatchEvent(
      new CustomEvent<Message[]>('messagesChanged', {
        detail: messages,
      }),
    );
  }

  get messages(): Message[] {
    return this._messages;
  }

  public onMessagesChanged = (callback: (messages: Message[]) => void): (() => void) => {
    const listener = () => callback(this.messages);
    this.addEventListener('messagesChanged', listener);
    return () => this.removeEventListener('messagesChanged', listener);
  };

  set busy(busy: boolean) {
    this._busy = busy;
    this.dispatchEvent(new CustomEvent<boolean>('busyChanged', { detail: busy }));
  }

  get busy(): boolean {
    return this._busy;
  }

  public onBusyChanged = (callback: (busy: boolean) => void): (() => void) => {
    const listener = () => callback(this.busy);
    this.addEventListener('busyChanged', listener);
    return () => this.removeEventListener('busyChanged', listener);
  };

  private log(...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log('[FunctionCallingAPI]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.error('[FunctionCallingAPI]', ...args);
    }
  }

  public registerFunction<P extends z.ZodTypeAny, R extends z.ZodTypeAny>(func: FunctionDefinition<P, R>): void {
    if (this.initialized) {
      throw new Error('Cannot add functions after session is initialized');
    }

    this.validateFunction(func);
    this.functions.push(func);
    this.log(`Registered function: ${func.name}`);
  }

  private validateFunction(func: FunctionDefinition): void {
    if (!func.name || func.name.trim() === '') {
      throw new Error('Function name is required');
    }

    if (!func.description || func.description.trim() === '') {
      throw new Error('Function description is required');
    }

    if (!func.parameters) {
      throw new Error('Function parameters schema is required');
    }

    // Validation happens at runtime when function is called

    if (!func.execute || typeof func.execute !== 'function') {
      throw new Error('Function execute method is required');
    }
  }

  private generateSystemPrompt(systemMessage: string): string {
    const functionDescriptions = this.functions
      .map(
        func => `function: ${func.name}
description: ${func.description}
parameters: ${this.describeZodSchema(func.parameters)}`,
      )
      .join('\n\n');

    return `${systemMessage}

You are friendly and helpful. You can call functions to help answer questions.

FUNCTIONS:
${functionDescriptions}

You must respond in this JSON format:
{
  "message": "description of what you're doing",
  "function": "functionName" or null,
  "parameter": "value" or null
}

EXAMPLES:
${this.generateExamples()}

IMPORTANT: 
- Only call functions when they help answer the user's question
- If just chatting, set function and parameter to null
- Always respond with valid JSON`;
  }

  private describeZodSchema(schema: z.ZodTypeAny): string {
    // This is a simplified schema description for the AI
    // In production, you'd want more sophisticated schema introspection
    if (schema instanceof z.ZodString) {
      return 'string';
    }
    if (schema instanceof z.ZodNumber) {
      return 'number';
    }
    if (schema instanceof z.ZodBoolean) {
      return 'boolean';
    }
    if (schema instanceof z.ZodObject) {
      // For now, just return "object" as a generic description
      return 'object';
    }
    return 'any';
  }

  private generateExamples(): string {
    // Generate examples for each registered function
    return this.functions
      .map(
        func => `{
  "message": "Calling ${func.name} to help with your request",
  "function": "${func.name}",
  "parameter": "example-value"
}`,
      )
      .join('\n\n');
  }

  public async initializeSession(callback: (status: string) => void = () => {}, systemMessage = ''): Promise<void> {
    const systemPrompt = this.generateSystemPrompt(systemMessage);

    // Use the Chrome AI manager to get a session
    const session = await chromeAIManager.getMainSession(systemPrompt);
    this.session = session.model;

    this.messages = [...this.messages, { role: 'system', content: systemPrompt }];
    this.initialized = true;
    callback('created');
  }

  private parseMessage(content: string): Message['parsed'] {
    try {
      let cleanedContent = content.trim();

      // Remove markdown code fences if present
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Remove trailing commas
      cleanedContent = cleanedContent.replace(/,\s*([}\]])/g, '$1');

      const json = JSON.parse(cleanedContent);

      // Validate against schema
      const FunctionCallResponseSchema = z.object({
        message: z.string().nullable(),
        function: z.string().nullable(),
        parameter: z.union([z.string(), z.number()]).nullable(),
      });

      const parsed = FunctionCallResponseSchema.parse(json);

      return parsed;
    } catch (error) {
      this.error('Parse error:', error);
      this.error('Original content:', content);
      throw new Error(`Failed to parse message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeFunction(funcName: string, parameter: string | number): Promise<unknown> {
    const func = this.functions.find(f => f.name === funcName);

    if (!func) {
      throw new Error(`Function not found: ${funcName}`);
    }

    this.log(`Executing function: ${funcName}`, parameter);

    try {
      // Parse and validate parameter against the function's parameter schema
      let validatedParameter: unknown = parameter;

      // Try to parse as JSON if it's a string
      if (typeof parameter === 'string') {
        try {
          const parsed = JSON.parse(parameter);
          validatedParameter = parsed;
        } catch {
          // Keep as string if not valid JSON
          validatedParameter = parameter;
        }
      }

      // Validate against the function's schema
      const parsed = func.parameters.safeParse(validatedParameter);

      if (!parsed.success) {
        throw new Error(`Invalid parameter for function ${funcName}: ${parsed.error.message}`);
      }

      // Execute the function
      const result = func.execute(parsed.data);

      // Handle async results
      if (result instanceof Promise) {
        return await result;
      }

      return result;
    } catch (error) {
      this.error(`Error executing function ${funcName}:`, error);
      throw error;
    }
  }

  public async generate(text: string): Promise<Message> {
    if (this.busy) {
      throw new Error('API is busy processing another request');
    }

    if (!this.session) {
      throw new Error('Session not initialized. Call initializeSession() first.');
    }

    this.busy = true;
    this.messages = [...this.messages, { role: 'user', content: text }];

    this.log('Generating response for:', text);

    try {
      const fullMessage = await pRetry(
        async () => {
          const answer = await this.session!.prompt(text);
          this.log('Raw answer:', answer);

          const parsed = this.parseMessage(answer);
          this.log('Parsed response:', parsed);

          const message: Message = {
            role: 'assistant',
            content: answer,
            parsed,
          };

          // Execute function if one was requested
          if (parsed?.function && parsed.parameter !== null) {
            const funcResult = await this.executeFunction(parsed.function, parsed.parameter);
            message.parsed = {
              ...parsed,
              functionResult: funcResult,
            };

            this.log('Function result:', funcResult);
          }

          return message;
        },
        {
          retries: this.config.maxRetries,
          minTimeout: this.config.retryDelay,
          onFailedAttempt: error => {
            this.log(`Retrying... (${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`);
          },
        },
      );

      this.messages = [...this.messages, fullMessage];
      this.busy = false;
      return fullMessage;
    } catch (error) {
      this.busy = false;

      const errorMessage: Message = {
        role: 'assistant',
        content: 'I am sorry, I could not understand that.',
        error: error instanceof Error ? error.message : String(error),
      };

      this.messages = [...this.messages, errorMessage];
      this.error('Failed to generate response:', error);
      throw error;
    }
  }

  public getRegisteredFunctions(): string[] {
    return this.functions.map(f => f.name);
  }

  public clearMessages(): void {
    this._messages = [];
    this.dispatchEvent(
      new CustomEvent<Message[]>('messagesChanged', {
        detail: [],
      }),
    );
  }

  public reset(): void {
    this._messages = [];
    this.initialized = false;
    this.busy = false;

    // Don't destroy the singleton session as it might be used elsewhere
    this.session = null;
  }
}
