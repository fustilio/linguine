# SQLite Package

This package provides SQLite with OPFS (Origin Private File System) support for the Chrome extension.

## Features

- SQLite database with OPFS persistence
- Worker-based implementation for OPFS VFS
- React hooks for easy integration
- Client API for database operations

## Usage

### In a React Component

```tsx
import { useSqliteOpfs } from '@extension/sqlite';

const MyComponent = () => {
  const {
    isReady,
    db,
    exec,
    openDatabase,
    closeDatabase,
  } = useSqliteOpfs();

  const handleQuery = async () => {
    const result = await exec('SELECT * FROM table;');
    console.log(result);
  };

  return (
    <div>
      {isReady && <button onClick={handleQuery}>Run Query</button>}
    </div>
  );
};
```

### Direct Client Usage

```tsx
import { SqliteWorkerClient } from '@extension/sqlite';

const client = new SqliteWorkerClient();
await client.init();
await client.open('mydb.sqlite3');
const result = await client.exec('SELECT * FROM table;');
await client.close();
```

## Requirements

- OPFS support (Chrome 109+, Edge 109+)
- Background service worker (for worker context)
- Storage permissions in manifest

## API

### useSqliteOpfs()

React hook for SQLite operations.

**Returns:**
- `isReady`: boolean - WASM initialized
- `db`: boolean - Database is open
- `dbFilename`: string - Current database filename
- `opfsFiles`: Array - List of OPFS files
- `opfsSupported`: boolean - OPFS available
- `persistent`: boolean - Using persistent storage
- `storage`: 'opfs' | 'jsstorage' | 'memory' - Storage type
- `openDatabase()`: Function - Open database
- `closeDatabase()`: Function - Close database
- `exec()`: Function - Execute SQL
- `runSampleSchema()`: Function - Seed sample data
- `listOpfsFiles()`: Function - List OPFS files
- `deleteOpfsFile()`: Function - Delete file

### SqliteWorkerClient

Direct client for SQLite operations.

**Methods:**
- `init()`: Initialize SQLite
- `open(filename)`: Open database
- `close()`: Close database
- `exec(sql)`: Execute SQL
- `seed()`: Seed sample schema
- `flush()`: Flush to disk
- `listOpfs()`: List OPFS files
- `deleteOpfs(filename)`: Delete file
- `dispose()`: Cleanup

