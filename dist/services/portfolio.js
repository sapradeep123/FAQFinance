"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const marketData_1 = __importDefault(require("./marketData"));
class PortfolioService {
    constructor() {
        this.marketDataService = new marketData_1.default();
    }
    async createPortfolio(userId, name, description, isDefault = false) {
        if (isDefault) {
            await (0, pool_1.query)('UPDATE portfolios SET is_default = false WHERE user_id = $1', [userId]);
        }
        const result = await (0, pool_1.query)(`INSERT INTO portfolios (user_id, name, description, is_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, user_id, name, description, is_default, created_at, updated_at`, [userId, name, description, isDefault]);
        const portfolio = result.rows[0];
        return {
            id: portfolio.id,
            userId: portfolio.user_id,
            name: portfolio.name,
            description: portfolio.description,
            isDefault: portfolio.is_default,
            totalValue: 0,
            totalCost: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            createdAt: portfolio.created_at,
            updatedAt: portfolio.updated_at
        };
    }
    async getUserPortfolios(userId) {
        const result = await (0, pool_1.query)('SELECT * FROM portfolios WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC', [userId]);
        const portfolios = [];
        for (const row of result.rows) {
            const portfolio = await this.calculatePortfolioMetrics({
                id: row.id,
                userId: row.user_id,
                name: row.name,
                description: row.description,
                isDefault: row.is_default,
                totalValue: 0,
                totalCost: 0,
                totalGainLoss: 0,
                totalGainLossPercent: 0,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            });
            portfolios.push(portfolio);
        }
        return portfolios;
    }
    async getPortfolio(portfolioId, userId) {
        const result = await (0, pool_1.query)('SELECT * FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return await this.calculatePortfolioMetrics({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            isDefault: row.is_default,
            totalValue: 0,
            totalCost: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
    async updatePortfolio(portfolioId, userId, updates) {
        const { name, description, isDefault } = updates;
        if (isDefault) {
            await (0, pool_1.query)('UPDATE portfolios SET is_default = false WHERE user_id = $1 AND id != $2', [userId, portfolioId]);
        }
        const result = await (0, pool_1.query)(`UPDATE portfolios 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_default = COALESCE($3, is_default),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`, [name, description, isDefault, portfolioId, userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return await this.calculatePortfolioMetrics({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            isDefault: row.is_default,
            totalValue: 0,
            totalCost: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
    async deletePortfolio(portfolioId, userId) {
        const result = await (0, pool_1.query)('DELETE FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        if (result.rowCount === 0) {
            throw new errorHandler_1.AppError('Portfolio not found', 404);
        }
    }
    async addHolding(portfolioId, userId, symbol, quantity, price, fees = 0, notes) {
        await this.verifyPortfolioOwnership(portfolioId, userId);
        if (!marketData_1.default.isValidSymbol(symbol)) {
            throw new errorHandler_1.AppError('Invalid symbol format', 400);
        }
        await (0, pool_1.transaction)(async (client) => {
            await client.query(`INSERT INTO portfolio_transactions 
         (portfolio_id, symbol, type, quantity, price, total_amount, fees, notes, transaction_date, created_at)
         VALUES ($1, $2, 'buy', $3, $4, $5, $6, $7, NOW(), NOW())`, [portfolioId, symbol.toUpperCase(), quantity, price, quantity * price, fees, notes]);
            const existingHolding = await client.query('SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2', [portfolioId, symbol.toUpperCase()]);
            if (existingHolding.rows.length > 0) {
                const holding = existingHolding.rows[0];
                const newQuantity = holding.quantity + quantity;
                const newTotalCost = holding.total_cost + (quantity * price) + fees;
                const newAverageCost = newTotalCost / newQuantity;
                await client.query(`UPDATE portfolio_holdings 
           SET quantity = $1, average_cost = $2, total_cost = $3, updated_at = NOW()
           WHERE portfolio_id = $4 AND symbol = $5`, [newQuantity, newAverageCost, newTotalCost, portfolioId, symbol.toUpperCase()]);
            }
            else {
                const totalCost = (quantity * price) + fees;
                await client.query(`INSERT INTO portfolio_holdings 
           (portfolio_id, symbol, quantity, average_cost, total_cost, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`, [portfolioId, symbol.toUpperCase(), quantity, price, totalCost]);
            }
            await client.query('UPDATE portfolios SET updated_at = NOW() WHERE id = $1', [portfolioId]);
        });
    }
    async removeHolding(portfolioId, userId, symbol, quantity, price, fees = 0, notes) {
        await this.verifyPortfolioOwnership(portfolioId, userId);
        await (0, pool_1.transaction)(async (client) => {
            const holdingResult = await client.query('SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2', [portfolioId, symbol.toUpperCase()]);
            if (holdingResult.rows.length === 0) {
                throw new errorHandler_1.AppError('Holding not found', 404);
            }
            const holding = holdingResult.rows[0];
            if (holding.quantity < quantity) {
                throw new errorHandler_1.AppError('Insufficient quantity to sell', 400);
            }
            await client.query(`INSERT INTO portfolio_transactions 
         (portfolio_id, symbol, type, quantity, price, total_amount, fees, notes, transaction_date, created_at)
         VALUES ($1, $2, 'sell', $3, $4, $5, $6, $7, NOW(), NOW())`, [portfolioId, symbol.toUpperCase(), quantity, price, quantity * price, fees, notes]);
            const newQuantity = holding.quantity - quantity;
            if (newQuantity === 0) {
                await client.query('DELETE FROM portfolio_holdings WHERE portfolio_id = $1 AND symbol = $2', [portfolioId, symbol.toUpperCase()]);
            }
            else {
                const newTotalCost = holding.average_cost * newQuantity;
                await client.query(`UPDATE portfolio_holdings 
           SET quantity = $1, total_cost = $2, updated_at = NOW()
           WHERE portfolio_id = $3 AND symbol = $4`, [newQuantity, newTotalCost, portfolioId, symbol.toUpperCase()]);
            }
            await client.query('UPDATE portfolios SET updated_at = NOW() WHERE id = $1', [portfolioId]);
        });
    }
    async getPortfolioHoldings(portfolioId, userId) {
        await this.verifyPortfolioOwnership(portfolioId, userId);
        const result = await (0, pool_1.query)('SELECT * FROM portfolio_holdings WHERE portfolio_id = $1 ORDER BY symbol ASC', [portfolioId]);
        const holdings = [];
        for (const row of result.rows) {
            try {
                const quote = await this.marketDataService.getQuote(row.symbol);
                const currentPrice = quote.price;
                const currentValue = row.quantity * currentPrice;
                const gainLoss = currentValue - row.total_cost;
                const gainLossPercent = (gainLoss / row.total_cost) * 100;
                holdings.push({
                    id: row.id,
                    portfolioId: row.portfolio_id,
                    symbol: row.symbol,
                    quantity: row.quantity,
                    averageCost: row.average_cost,
                    totalCost: row.total_cost,
                    currentPrice,
                    currentValue,
                    gainLoss,
                    gainLossPercent,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            }
            catch (error) {
                holdings.push({
                    id: row.id,
                    portfolioId: row.portfolio_id,
                    symbol: row.symbol,
                    quantity: row.quantity,
                    averageCost: row.average_cost,
                    totalCost: row.total_cost,
                    currentPrice: row.average_cost,
                    currentValue: row.total_cost,
                    gainLoss: 0,
                    gainLossPercent: 0,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            }
        }
        return holdings;
    }
    async getPortfolioTransactions(portfolioId, userId, limit = 50, offset = 0) {
        await this.verifyPortfolioOwnership(portfolioId, userId);
        const result = await (0, pool_1.query)('SELECT * FROM portfolio_transactions WHERE portfolio_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT $2 OFFSET $3', [portfolioId, limit, offset]);
        return result.rows.map(row => ({
            id: row.id,
            portfolioId: row.portfolio_id,
            symbol: row.symbol,
            type: row.type,
            quantity: row.quantity,
            price: row.price,
            totalAmount: row.total_amount,
            fees: row.fees,
            notes: row.notes,
            transactionDate: row.transaction_date,
            createdAt: row.created_at
        }));
    }
    async getPortfolioPerformance(portfolioId, userId, period = '1M') {
        await this.verifyPortfolioOwnership(portfolioId, userId);
        const holdings = await this.getPortfolioHoldings(portfolioId, userId);
        const currentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
        const totalCost = holdings.reduce((sum, holding) => sum + holding.totalCost, 0);
        const gainLoss = currentValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        let bestPerformer = { symbol: '', gainLossPercent: -Infinity };
        let worstPerformer = { symbol: '', gainLossPercent: Infinity };
        holdings.forEach(holding => {
            if (holding.gainLossPercent > bestPerformer.gainLossPercent) {
                bestPerformer = { symbol: holding.symbol, gainLossPercent: holding.gainLossPercent };
            }
            if (holding.gainLossPercent < worstPerformer.gainLossPercent) {
                worstPerformer = { symbol: holding.symbol, gainLossPercent: holding.gainLossPercent };
            }
        });
        return {
            portfolioId,
            period,
            startValue: totalCost,
            endValue: currentValue,
            gainLoss,
            gainLossPercent,
            bestPerformer: holdings.length > 0 ? bestPerformer : { symbol: 'N/A', gainLossPercent: 0 },
            worstPerformer: holdings.length > 0 ? worstPerformer : { symbol: 'N/A', gainLossPercent: 0 }
        };
    }
    async getUserPortfolioAnalytics(userId) {
        const portfolios = await this.getUserPortfolios(userId);
        const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
        const totalCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
        const allHoldings = [];
        for (const portfolio of portfolios) {
            const holdings = await this.getPortfolioHoldings(portfolio.id, userId);
            allHoldings.push(...holdings);
        }
        const holdingsBySymbol = new Map();
        allHoldings.forEach(holding => {
            const existing = holdingsBySymbol.get(holding.symbol) || { value: 0, weight: 0 };
            existing.value += holding.currentValue;
            existing.weight = totalValue > 0 ? (existing.value / totalValue) * 100 : 0;
            holdingsBySymbol.set(holding.symbol, existing);
        });
        const topHoldings = Array.from(holdingsBySymbol.entries())
            .map(([symbol, data]) => ({ symbol, ...data }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        return {
            totalPortfolios: portfolios.length,
            totalValue,
            totalGainLoss,
            totalGainLossPercent,
            topHoldings,
            sectorAllocation: [],
            assetAllocation: [{ type: 'Stocks', value: totalValue, weight: 100 }]
        };
    }
    async verifyPortfolioOwnership(portfolioId, userId) {
        const result = await (0, pool_1.query)('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Portfolio not found', 404);
        }
    }
    async calculatePortfolioMetrics(portfolio) {
        try {
            const holdings = await this.getPortfolioHoldings(portfolio.id, portfolio.userId);
            const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
            const totalCost = holdings.reduce((sum, holding) => sum + holding.totalCost, 0);
            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
            return {
                ...portfolio,
                totalValue,
                totalCost,
                totalGainLoss,
                totalGainLossPercent
            };
        }
        catch (error) {
            return portfolio;
        }
    }
}
exports.PortfolioService = PortfolioService;
exports.default = PortfolioService;
//# sourceMappingURL=portfolio.js.map