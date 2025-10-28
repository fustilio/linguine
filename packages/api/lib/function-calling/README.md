# Function Calling API

A type-safe, Zod-validated function calling system for Chrome AI that allows LLMs to call user-defined functions.

## Features

- ✅ **Fully Type-Safe** - Uses Zod schemas with TypeScript inference
- ✅ **Runtime Validation** - All parameters are validated at runtime
- ✅ **No `any` or `unknown`** - Strict typing throughout
- ✅ **Async Support** - Functions can return promises
- ✅ **Retry Logic** - Automatic retry on failures
- ✅ **Error Handling** - Comprehensive error types and handling
- ✅ **Event-Driven** - Listen to messages and busy state changes

## Installation

This is part of the `@extension/api` package and uses:
- `zod` for validation
- TypeScript for type safety

## Quick Start

```typescript
import { z } from 'zod';
import FunctionCallingPromptAPI from './function-calling-api.js';

// 1. Define a function with Zod schema
const getUserFunction = {
  name: 'get_user',
  description: 'Get user information by ID',
  parameters: z.object({
    userId: z.string(),
    includeEmail: z.boolean().optional(),
  }),
  returns: z.promise(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
  })),
  execute: async (input) => {
    // Type-safe! input.userId is string, input.includeEmail is boolean | undefined
    return await fetchUser(input.userId, input.includeEmail);
  },
};

// 2. Create API instance
const api = new FunctionCallingPromptAPI({
  maxRetries: 3,
  enableLogging: true,
});

// 3. Register the function
api.registerFunction(getUserFunction);

// 4. Initialize the session
await api.initializeSession(
  (status) => console.log('Status:', status),
  'You are a helpful assistant.'
);

// 5. Generate responses
const response = await api.generate("Get user 123's info");
console.log(response.parsed?.functionResult);
```

## Type-Safe Function Definitions

Every function is fully typed with Zod schemas:

```typescript
const myFunction: FunctionDefinition<
  z.ZodObject<{ param: z.ZodString }>,
  z.ZodNumber
> = {
  name: 'my_function',
  description: 'Does something',
  parameters: z.object({ param: z.string() }),
  returns: z.number(),
  execute: (input) => {
    // input.param is typed as string
    return 42;
  },
};
```

### Supported Parameter Types

- `z.string()` - String values
- `z.number()` - Numeric values
- `z.boolean()` - Boolean values
- `z.object({ ... })` - Complex objects
- `z.array(z.string())` - Arrays
- `z.union([...])` - Union types
- `z.optional(...)` - Optional fields
- Any Zod schema!

## API Reference

### `FunctionCallingPromptAPI`

#### Constructor

```typescript
new FunctionCallingPromptAPI(config?: Partial<FunctionCallingConfig>)
```

**Config Options:**
- `maxRetries`: number (default: 3) - Max retry attempts
- `retryDelay`: number (default: 1000) - Delay between retries (ms)
- `strictMode`: boolean (default: false) - Reject unknown functions
- `enableLogging`: boolean (default: true) - Enable console logging
- `timeout`: number (optional) - Request timeout (ms)

#### Methods

**`registerFunction<P, R>(func: FunctionDefinition<P, R>): void`**

Register a new function. Must be called before `initializeSession()`.

**`initializeSession(callback, systemMessage?): Promise<void>`**

Initialize the AI session. Call this once after registering all functions.

**`generate(text: string): Promise<Message>`**

Send a message to the AI and get a response with optional function call.

**`getRegisteredFunctions(): string[]`**

Get list of all registered function names.

**`clearMessages(): void`**

Clear the message history.

**`reset(): void`**

Reset the API to initial state and close the session.

#### Events

**`onMessagesChanged(callback): () => void`**

Listen to messages changing. Returns cleanup function.

**`onBusyChanged(callback): () => void`**

Listen to busy state changes. Returns cleanup function.

## Improvements Over Previous Version

### 1. Type Safety
- ❌ Before: `parameter: any`, `functionResult?: any`
- ✅ Now: Strict Zod schemas with TypeScript inference

### 2. Validation
- ❌ Before: Basic runtime checks
- ✅ Now: Full Zod validation with detailed error messages

### 3. No `any` or `unknown`
- ❌ Before: Used `any` extensively
- ✅ Now: All types properly inferred from Zod schemas

### 4. Better Error Handling
- ❌ Before: Generic errors
- ✅ Now: Typed error categories (`parsing`, `validation`, `execution`, etc.)

### 5. Configuration
- ❌ Before: Hardcoded defaults
- ✅ Now: Flexible config with sensible defaults

## Examples

See `example.ts` for complete working examples.

## Error Handling

```typescript
try {
  const response = await api.generate("Do something");
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

// Listen to message errors
api.onMessagesChanged((messages) => {
  messages.forEach(msg => {
    if (msg.error) {
      console.error('Message error:', msg.error);
    }
  });
});
```

## How It Works

1. **Define Functions** with Zod schemas for parameters and return types
2. **Register Functions** with the API
3. **Initialize Session** - Creates Chrome AI session with function descriptions
4. **Generate Response** - AI decides which function to call (if any)
5. **Validate & Execute** - Parameters are validated against Zod schema before execution
6. **Return Results** - Function results are included in the response

## Comparison with OpenAI Function Calling

This implementation is similar to OpenAI's function calling but:
- Uses Chrome's built-in AI API
- Fully type-safe with Zod
- No external API keys required
- Works offline

## License

Part of the Linguine Chrome Extension project.

