import { Pool, PoolClient, QueryResult } from 'pg';
declare const pool: Pool;
export declare const query: (text: string, params?: any[]) => Promise<QueryResult>;
export declare const getClient: () => Promise<PoolClient>;
export declare const transaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
export declare const testConnection: () => Promise<boolean>;
export declare const closePool: () => Promise<void>;
export default pool;
//# sourceMappingURL=pool.d.ts.map