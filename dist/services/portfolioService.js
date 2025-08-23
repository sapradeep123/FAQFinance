"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioService = void 0;
const dexie_1 = require("../lib/dexie");
const uuid_1 = require("uuid");
class PortfolioService {
    async createPortfolio(data) {
        const now = Date.now();
        const portfolio = {
            id: (0, uuid_1.v4)(),
            name: data.name,
            description: data.description,
            currency: data.currency,
            createdAt: now,
            updatedAt: now
        };
        await dexie_1.db.portfolios.add(portfolio);
        return portfolio;
    }
    async listPortfolios() {
        return await dexie_1.db.portfolios.orderBy('updatedAt').reverse().toArray();
    }
    async getPortfolio(id) {
        return await dexie_1.db.portfolios.get(id);
    }
    async updatePortfolio(id, updates) {
        await dexie_1.db.portfolios.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
    }
    async deletePortfolio(id) {
        await dexie_1.db.positions.where('portfolioId').equals(id).delete();
        await dexie_1.db.portfolios.delete(id);
    }
    async getPositions(portfolioId) {
        return await dexie_1.db.positions
            .where('portfolioId')
            .equals(portfolioId)
            .orderBy('createdAt')
            .reverse()
            .toArray();
    }
    async addPosition(portfolioId, positionData) {
        const portfolio = await this.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }
        const now = Date.now();
        const position = {
            id: (0, uuid_1.v4)(),
            portfolioId,
            ticker: positionData.ticker.toUpperCase(),
            name: positionData.name,
            quantity: positionData.quantity,
            averagePrice: positionData.averagePrice,
            currency: positionData.currency || portfolio.currency,
            sector: positionData.sector,
            exchange: positionData.exchange,
            createdAt: now,
            updatedAt: now
        };
        await dexie_1.db.positions.add(position);
        await this.updatePortfolio(portfolioId, {});
        return position;
    }
    async updatePosition(id, updates) {
        const position = await dexie_1.db.positions.get(id);
        if (!position) {
            throw new Error('Position not found');
        }
        await dexie_1.db.positions.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
        await this.updatePortfolio(position.portfolioId, {});
    }
    async deletePosition(id) {
        const position = await dexie_1.db.positions.get(id);
        if (!position) {
            throw new Error('Position not found');
        }
        await dexie_1.db.positions.delete(id);
        await this.updatePortfolio(position.portfolioId, {});
    }
    async savePositionsCSVorXLSX(portfolioId, file) {
        const portfolio = await this.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let positions = [];
        if (fileExtension === 'csv') {
            positions = await this.parseCSV(file);
        }
        else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            positions = await this.parseXLSX(file);
        }
        else {
            throw new Error('Unsupported file format. Please use CSV or XLSX files.');
        }
        await dexie_1.db.positions.where('portfolioId').equals(portfolioId).delete();
        const savedPositions = [];
        for (const positionData of positions) {
            const savedPosition = await this.addPosition(portfolioId, positionData);
            savedPositions.push(savedPosition);
        }
        return savedPositions;
    }
    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target?.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    if (lines.length < 2) {
                        throw new Error('CSV file must have at least a header row and one data row');
                    }
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const positions = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        if (values.length < headers.length)
                            continue;
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index];
                        });
                        const position = {
                            ticker: row.ticker || row.symbol || row.stock || '',
                            name: row.name || row.company || row.description || '',
                            quantity: parseFloat(row.quantity || row.shares || row.units || '0'),
                            averagePrice: parseFloat(row.averageprice || row.price || row.cost || row['average price'] || '0'),
                            currency: row.currency || row.curr || undefined,
                            sector: row.sector || row.industry || undefined,
                            exchange: row.exchange || row.market || undefined
                        };
                        if (position.ticker && position.quantity > 0 && position.averagePrice > 0) {
                            positions.push(position);
                        }
                    }
                    resolve(positions);
                }
                catch (error) {
                    reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    async parseXLSX(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result;
                    reject(new Error('XLSX parsing not implemented. Please convert to CSV format or use a proper XLSX library.'));
                }
                catch (error) {
                    reject(new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    async exportPositionsCSV(portfolioId) {
        const positions = await this.getPositions(portfolioId);
        const headers = ['ticker', 'name', 'quantity', 'averagePrice', 'currency', 'sector', 'exchange'];
        const csvContent = [
            headers.join(','),
            ...positions.map(pos => [
                pos.ticker,
                `"${pos.name}"`,
                pos.quantity,
                pos.averagePrice,
                pos.currency || '',
                pos.sector || '',
                pos.exchange || ''
            ].join(','))
        ].join('\n');
        return csvContent;
    }
    async getTotalPositions() {
        return await dexie_1.db.positions.count();
    }
    async getTotalPortfolios() {
        return await dexie_1.db.portfolios.count();
    }
}
exports.portfolioService = new PortfolioService();
exports.default = exports.portfolioService;
//# sourceMappingURL=portfolioService.js.map