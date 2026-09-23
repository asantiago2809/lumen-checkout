import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CheckoutStore, Stored, Write, WriteConflict } from '../../application/ports';
import { Product, Session, Transaction } from '../../domain/models';

export function dynamoKey(key: string) {
  return key.startsWith('PRODUCT#') ? { pk: 'CATALOG', sk: key } : { pk: key, sk: 'META' };
}
export class DynamoStore implements CheckoutStore {
  constructor(private readonly client: Pick<DynamoDBDocumentClient, 'send'>, private readonly table: string) {}
  async get<T>(key: string): Promise<Stored<T> | null> {
    const response = await this.client.send(new GetCommand({ TableName: this.table, Key: dynamoKey(key), ConsistentRead: true }));
    return response.Item ? { value: response.Item.data as T, version: response.Item.version as number } : null;
  }
  private async query<T>(pending: boolean): Promise<Stored<T>[]> {
    const result: Stored<T>[] = [];
    let cursor: Record<string, unknown> | undefined;
    do {
      const response = await this.client.send(new QueryCommand({ TableName: this.table,
        ...(pending ? { IndexName: 'pending-index' } : { ConsistentRead: true }),
        KeyConditionExpression: pending ? 'gsi1pk = :pk' : 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pending ? 'PENDING' : 'CATALOG' }, ExclusiveStartKey: cursor,
      }));
      result.push(...(response.Items ?? []).map(item => ({ value: item.data as T, version: item.version as number })));
      cursor = response.LastEvaluatedKey;
    } while (cursor);
    return result;
  }
  products() { return this.query<Product>(false); }
  pending() { return this.query<Transaction>(true); }
  async commit(writes: Write[]): Promise<void> {
    if (writes.length === 0) return;
    const TransactItems = writes.map(write => {
      const condition = write.expectedVersion === null
        ? { ConditionExpression: 'attribute_not_exists(pk)' }
        : { ConditionExpression: '#v = :version', ExpressionAttributeNames: { '#v': 'version' }, ExpressionAttributeValues: { ':version': write.expectedVersion } };
      const common = { TableName: this.table, ...condition };
      if (write.value === null) return { Delete: { ...common, Key: dynamoKey(write.key) } };
      const tx = write.value as Transaction;
      const session = write.value as Session;
      return { Put: { ...common, Item: { ...dynamoKey(write.key), data: write.value, version: (write.expectedVersion ?? 0) + 1,
        ...(write.key.startsWith('TX#') && tx.status === 'PENDING' ? { gsi1pk: 'PENDING', gsi1sk: tx.createdAt } : {}),
        ...(write.key.startsWith('SESSION#') ? { expiresAt: Math.floor(Date.parse(session.expiresAt) / 1000) } : {}),
      } } };
    });
    try { await this.client.send(new TransactWriteCommand({ TransactItems })); }
    catch (error) {
      const e = error as { name?: string; CancellationReasons?: { Code?: string }[] };
      if (e.name === 'ConditionalCheckFailedException' || (e.name === 'TransactionCanceledException' && e.CancellationReasons?.some(reason => reason.Code === 'ConditionalCheckFailed' || reason.Code === 'TransactionConflict'))) throw new WriteConflict();
      throw error;
    }
  }
}
