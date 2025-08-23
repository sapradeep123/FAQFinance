"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.ChatDatabase = void 0;
const dexie_1 = __importDefault(require("dexie"));
class ChatDatabase extends dexie_1.default {
    constructor() {
        super('ChatDatabase');
        this.version(1).stores({
            threads: 'id, title, createdAt',
            portfolios: 'id, name, currency, createdAt, updatedAt',
            positions: 'id, portfolioId, ticker, name, createdAt, updatedAt'
        });
    }
}
exports.ChatDatabase = ChatDatabase;
exports.db = new ChatDatabase();
//# sourceMappingURL=dexie.js.map