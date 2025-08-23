import Dexie, { Table } from 'dexie';
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
export interface ChatThread {
    id: string;
    title: string;
    createdAt: number;
    messages: ChatMessage[];
}
export interface Portfolio {
    id: string;
    name: string;
    description?: string;
    currency: string;
    createdAt: number;
    updatedAt: number;
}
export interface Position {
    id: string;
    portfolioId: string;
    ticker: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currency: string;
    sector?: string;
    exchange?: string;
    createdAt: number;
    updatedAt: number;
}
export declare class ChatDatabase extends Dexie {
    threads: Table<ChatThread>;
    portfolios: Table<Portfolio>;
    positions: Table<Position>;
    constructor();
}
export declare const db: ChatDatabase;
//# sourceMappingURL=dexie.d.ts.map