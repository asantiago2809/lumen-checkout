import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CheckoutStore, Stored, Write, WriteConflict } from '../../application/ports';
import { Product, Transaction } from '../../domain/models';

/** Durable development adapter. One process only; production uses DynamoDB. */
export class FileStore implements CheckoutStore {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly path: string) {}
  private async read(): Promise<Record<string, Stored<unknown>>> {
    try { return JSON.parse(await readFile(this.path, 'utf8')) as Record<string, Stored<unknown>>; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
  }
  async get<T>(key: string): Promise<Stored<T> | null> {
    await this.tail;
    return (await this.read())[key] as Stored<T> ?? null;
  }
  async products(): Promise<Stored<Product>[]> {
    await this.tail;
    return Object.entries(await this.read()).filter(([key]) => key.startsWith('PRODUCT#')).map(([, item]) => item as Stored<Product>);
  }
  async pending(): Promise<Stored<Transaction>[]> {
    await this.tail;
    return Object.entries(await this.read()).filter(([key, item]) => key.startsWith('TX#') && (item.value as Transaction).status === 'PENDING').map(([, item]) => item as Stored<Transaction>);
  }
  async commit(writes: Write[]): Promise<void> {
    const operation = this.tail.then(async () => {
      const state = await this.read();
      for (const write of writes) if ((state[write.key]?.version ?? null) !== write.expectedVersion) throw new WriteConflict();
      for (const write of writes) {
        if (write.value === null) delete state[write.key];
        else state[write.key] = { value: write.value, version: (write.expectedVersion ?? 0) + 1 };
      }
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
      await rename(temporary, this.path);
    });
    this.tail = operation.catch(() => undefined);
    await operation;
  }
}
