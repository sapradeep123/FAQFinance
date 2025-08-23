"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePortfolioStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const portfolioService_1 = require("../services/portfolioService");
const marketDataService_1 = require("../services/marketDataService");
const initialInsights = {
    totalValue: 0,
    totalCost: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    allocation: [],
    sectorAllocation: []
};
exports.usePortfolioStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    portfolios: [],
    activePortfolioId: null,
    positions: [],
    insights: initialInsights,
    isLoading: false,
    error: null,
    lastUpdated: null,
    loadPortfolios: async () => {
        try {
            set({ isLoading: true, error: null });
            const portfolios = await portfolioService_1.portfolioService.listPortfolios();
            set({ portfolios, isLoading: false });
            const { activePortfolioId } = get();
            if (!activePortfolioId && portfolios.length > 0) {
                await get().setActivePortfolio(portfolios[0].id);
            }
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load portfolios',
                isLoading: false
            });
        }
    },
    createPortfolio: async (name, description) => {
        try {
            set({ isLoading: true, error: null });
            const portfolio = await portfolioService_1.portfolioService.createPortfolio(name, description);
            const { portfolios } = get();
            set({
                portfolios: [...portfolios, portfolio],
                isLoading: false
            });
            if (portfolios.length === 0) {
                await get().setActivePortfolio(portfolio.id);
            }
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create portfolio',
                isLoading: false
            });
        }
    },
    setActivePortfolio: async (portfolioId) => {
        try {
            set({ activePortfolioId: portfolioId, error: null });
            await get().loadPositions();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to set active portfolio'
            });
        }
    },
    updatePortfolio: async (portfolioId, updates) => {
        try {
            set({ error: null });
            await portfolioService_1.portfolioService.updatePortfolio(portfolioId, updates);
            const { portfolios } = get();
            set({
                portfolios: portfolios.map(p => p.id === portfolioId ? { ...p, ...updates } : p)
            });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update portfolio'
            });
        }
    },
    deletePortfolio: async (portfolioId) => {
        try {
            set({ error: null });
            await portfolioService_1.portfolioService.deletePortfolio(portfolioId);
            const { portfolios, activePortfolioId } = get();
            const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
            set({ portfolios: updatedPortfolios });
            if (activePortfolioId === portfolioId) {
                if (updatedPortfolios.length > 0) {
                    await get().setActivePortfolio(updatedPortfolios[0].id);
                }
                else {
                    set({ activePortfolioId: null, positions: [], insights: initialInsights });
                }
            }
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete portfolio'
            });
        }
    },
    loadPositions: async () => {
        const { activePortfolioId } = get();
        if (!activePortfolioId) {
            set({ positions: [], insights: initialInsights });
            return;
        }
        try {
            set({ isLoading: true, error: null });
            const positions = await portfolioService_1.portfolioService.getPositions(activePortfolioId);
            set({ positions, isLoading: false, lastUpdated: new Date() });
            get().computeInsights();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load positions',
                isLoading: false
            });
        }
    },
    addPosition: async (symbol, quantity, averagePrice) => {
        const { activePortfolioId } = get();
        if (!activePortfolioId) {
            set({ error: 'No active portfolio selected' });
            return;
        }
        try {
            set({ error: null });
            const position = await portfolioService_1.portfolioService.createPosition({
                portfolioId: activePortfolioId,
                symbol: symbol.toUpperCase(),
                quantity,
                averagePrice,
                currentPrice: averagePrice
            });
            const { positions } = get();
            set({ positions: [...positions, position] });
            get().computeInsights();
            await get().refreshMarketData();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to add position'
            });
        }
    },
    updatePosition: async (positionId, updates) => {
        try {
            set({ error: null });
            await portfolioService_1.portfolioService.updatePosition(positionId, updates);
            const { positions } = get();
            set({
                positions: positions.map(p => p.id === positionId ? { ...p, ...updates } : p)
            });
            get().computeInsights();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update position'
            });
        }
    },
    deletePosition: async (positionId) => {
        try {
            set({ error: null });
            await portfolioService_1.portfolioService.deletePosition(positionId);
            const { positions } = get();
            set({ positions: positions.filter(p => p.id !== positionId) });
            get().computeInsights();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete position'
            });
        }
    },
    refreshMarketData: async () => {
        const { positions } = get();
        if (positions.length === 0)
            return;
        try {
            set({ isLoading: true, error: null });
            const updatedPositions = await Promise.all(positions.map(async (position) => {
                try {
                    const snapshot = await marketDataService_1.marketDataService.getSnapshot(position.symbol);
                    return {
                        ...position,
                        currentPrice: snapshot.price,
                        sector: snapshot.sector,
                        lastUpdated: new Date()
                    };
                }
                catch (error) {
                    console.warn(`Failed to update price for ${position.symbol}:`, error);
                    return position;
                }
            }));
            await Promise.all(updatedPositions.map(position => portfolioService_1.portfolioService.updatePosition(position.id, {
                currentPrice: position.currentPrice,
                sector: position.sector,
                lastUpdated: position.lastUpdated
            })));
            set({
                positions: updatedPositions,
                isLoading: false,
                lastUpdated: new Date()
            });
            get().computeInsights();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to refresh market data',
                isLoading: false
            });
        }
    },
    computeInsights: () => {
        const { positions } = get();
        if (positions.length === 0) {
            set({ insights: initialInsights });
            return;
        }
        let totalValue = 0;
        let totalCost = 0;
        const allocation = [];
        const sectorMap = new Map();
        positions.forEach(position => {
            const marketValue = position.quantity * position.currentPrice;
            const costBasis = position.quantity * position.averagePrice;
            totalValue += marketValue;
            totalCost += costBasis;
            allocation.push({
                symbol: position.symbol,
                value: marketValue,
                percentage: 0,
                sector: position.sector || 'Unknown'
            });
            const sector = position.sector || 'Unknown';
            const existing = sectorMap.get(sector) || { value: 0, count: 0 };
            sectorMap.set(sector, {
                value: existing.value + marketValue,
                count: existing.count + 1
            });
        });
        allocation.forEach(item => {
            item.percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
        });
        const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, data]) => ({
            sector,
            value: data.value,
            percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0
        }));
        const unrealizedPnL = totalValue - totalCost;
        const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
        set({
            insights: {
                totalValue,
                totalCost,
                unrealizedPnL,
                unrealizedPnLPercent,
                dayChange: 0,
                dayChangePercent: 0,
                allocation: allocation.sort((a, b) => b.value - a.value),
                sectorAllocation: sectorAllocation.sort((a, b) => b.value - a.value)
            }
        });
    },
    importPositions: async (file) => {
        const { activePortfolioId } = get();
        if (!activePortfolioId) {
            set({ error: 'No active portfolio selected' });
            return;
        }
        try {
            set({ isLoading: true, error: null });
            await portfolioService_1.portfolioService.importPositions(activePortfolioId, file);
            await get().loadPositions();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to import positions',
                isLoading: false
            });
        }
    },
    exportPositions: async () => {
        const { activePortfolioId } = get();
        if (!activePortfolioId) {
            set({ error: 'No active portfolio selected' });
            return;
        }
        try {
            set({ error: null });
            await portfolioService_1.portfolioService.exportPositions(activePortfolioId);
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to export positions'
            });
        }
    },
    clearError: () => set({ error: null })
}), {
    name: 'portfolio-storage',
    partialize: (state) => ({
        activePortfolioId: state.activePortfolioId,
        lastUpdated: state.lastUpdated
    })
}));
//# sourceMappingURL=usePortfolioStore.js.map