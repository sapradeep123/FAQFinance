import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { portfolioService } from '../services/portfolioService';
import { marketDataService } from '../services/marketDataService';
import type { Portfolio, Position } from '../lib/dexie';

interface PortfolioInsights {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: Array<{
    symbol: string;
    value: number;
    percentage: number;
    sector: string;
  }>;
  sectorAllocation: Array<{
    sector: string;
    value: number;
    percentage: number;
  }>;
}

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  positions: Position[];
  insights: PortfolioInsights;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PortfolioActions {
  // Portfolio management
  loadPortfolios: () => Promise<void>;
  createPortfolio: (name: string, description?: string) => Promise<void>;
  setActivePortfolio: (portfolioId: string) => Promise<void>;
  updatePortfolio: (portfolioId: string, updates: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (portfolioId: string) => Promise<void>;
  
  // Position management
  loadPositions: () => Promise<void>;
  addPosition: (symbol: string, quantity: number, averagePrice: number) => Promise<void>;
  updatePosition: (positionId: string, updates: Partial<Position>) => Promise<void>;
  deletePosition: (positionId: string) => Promise<void>;
  
  // Market data and insights
  refreshMarketData: () => Promise<void>;
  computeInsights: () => void;
  
  // File operations
  importPositions: (file: File) => Promise<void>;
  exportPositions: () => Promise<void>;
  
  // Utility
  clearError: () => void;
}

type PortfolioStore = PortfolioState & PortfolioActions;

const initialInsights: PortfolioInsights = {
  totalValue: 0,
  totalCost: 0,
  unrealizedPnL: 0,
  unrealizedPnLPercent: 0,
  dayChange: 0,
  dayChangePercent: 0,
  allocation: [],
  sectorAllocation: []
};

export const usePortfolioStore = create<PortfolioStore>()(persist(
  (set, get) => ({
    // Initial state
    portfolios: [],
    activePortfolioId: null,
    positions: [],
    insights: initialInsights,
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Portfolio management
    loadPortfolios: async () => {
      try {
        set({ isLoading: true, error: null });
        const portfolios = await portfolioService.listPortfolios();
        set({ portfolios, isLoading: false });
        
        // Set first portfolio as active if none selected
        const { activePortfolioId } = get();
        if (!activePortfolioId && portfolios.length > 0) {
          await get().setActivePortfolio(portfolios[0].id);
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load portfolios',
          isLoading: false 
        });
      }
    },

    createPortfolio: async (name: string, description?: string) => {
      try {
        set({ isLoading: true, error: null });
        const portfolio = await portfolioService.createPortfolio(name, description);
        const { portfolios } = get();
        set({ 
          portfolios: [...portfolios, portfolio],
          isLoading: false 
        });
        
        // Set as active if it's the first portfolio
        if (portfolios.length === 0) {
          await get().setActivePortfolio(portfolio.id);
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create portfolio',
          isLoading: false 
        });
      }
    },

    setActivePortfolio: async (portfolioId: string) => {
      try {
        set({ activePortfolioId: portfolioId, error: null });
        await get().loadPositions();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to set active portfolio'
        });
      }
    },

    updatePortfolio: async (portfolioId: string, updates: Partial<Portfolio>) => {
      try {
        set({ error: null });
        await portfolioService.updatePortfolio(portfolioId, updates);
        const { portfolios } = get();
        set({
          portfolios: portfolios.map(p => 
            p.id === portfolioId ? { ...p, ...updates } : p
          )
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update portfolio'
        });
      }
    },

    deletePortfolio: async (portfolioId: string) => {
      try {
        set({ error: null });
        await portfolioService.deletePortfolio(portfolioId);
        const { portfolios, activePortfolioId } = get();
        const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
        
        set({ portfolios: updatedPortfolios });
        
        // If deleted portfolio was active, switch to first available
        if (activePortfolioId === portfolioId) {
          if (updatedPortfolios.length > 0) {
            await get().setActivePortfolio(updatedPortfolios[0].id);
          } else {
            set({ activePortfolioId: null, positions: [], insights: initialInsights });
          }
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete portfolio'
        });
      }
    },

    // Position management
    loadPositions: async () => {
      const { activePortfolioId } = get();
      if (!activePortfolioId) {
        set({ positions: [], insights: initialInsights });
        return;
      }

      try {
        set({ isLoading: true, error: null });
        const positions = await portfolioService.getPositions(activePortfolioId);
        set({ positions, isLoading: false, lastUpdated: new Date() });
        get().computeInsights();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load positions',
          isLoading: false 
        });
      }
    },

    addPosition: async (symbol: string, quantity: number, averagePrice: number) => {
      const { activePortfolioId } = get();
      if (!activePortfolioId) {
        set({ error: 'No active portfolio selected' });
        return;
      }

      try {
        set({ error: null });
        const position = await portfolioService.createPosition({
          portfolioId: activePortfolioId,
          symbol: symbol.toUpperCase(),
          quantity,
          averagePrice,
          currentPrice: averagePrice // Will be updated by market data
        });
        
        const { positions } = get();
        set({ positions: [...positions, position] });
        get().computeInsights();
        
        // Refresh market data for the new position
        await get().refreshMarketData();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to add position'
        });
      }
    },

    updatePosition: async (positionId: string, updates: Partial<Position>) => {
      try {
        set({ error: null });
        await portfolioService.updatePosition(positionId, updates);
        const { positions } = get();
        set({
          positions: positions.map(p => 
            p.id === positionId ? { ...p, ...updates } : p
          )
        });
        get().computeInsights();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update position'
        });
      }
    },

    deletePosition: async (positionId: string) => {
      try {
        set({ error: null });
        await portfolioService.deletePosition(positionId);
        const { positions } = get();
        set({ positions: positions.filter(p => p.id !== positionId) });
        get().computeInsights();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete position'
        });
      }
    },

    // Market data and insights
    refreshMarketData: async () => {
      const { positions } = get();
      if (positions.length === 0) return;

      try {
        set({ isLoading: true, error: null });
        
        const updatedPositions = await Promise.all(
          positions.map(async (position) => {
            try {
              const snapshot = await marketDataService.getSnapshot(position.symbol);
              return {
                ...position,
                currentPrice: snapshot.price,
                sector: snapshot.sector,
                lastUpdated: new Date()
              };
            } catch (error) {
              console.warn(`Failed to update price for ${position.symbol}:`, error);
              return position;
            }
          })
        );

        // Update positions in database
        await Promise.all(
          updatedPositions.map(position => 
            portfolioService.updatePosition(position.id, {
              // Note: currentPrice and lastUpdated are not part of the Position type
              // These would need to be added to the Position interface if needed
            })
          )
        );

        set({ 
          positions: updatedPositions, 
          isLoading: false, 
          lastUpdated: new Date() 
        });
        get().computeInsights();
      } catch (error) {
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
      const allocation: PortfolioInsights['allocation'] = [];
      const sectorMap = new Map<string, { value: number; count: number }>();

      positions.forEach(position => {
        const marketValue = position.quantity * (position.averagePrice); // Using averagePrice as fallback
        const costBasis = position.quantity * position.averagePrice;
        
        totalValue += marketValue;
        totalCost += costBasis;
        
        allocation.push({
          symbol: position.ticker,
          value: marketValue,
          percentage: 0, // Will be calculated after totalValue is known
          sector: position.sector || 'Unknown'
        });
        
        // Aggregate by sector
        const sector = position.sector || 'Unknown';
        const existing = sectorMap.get(sector) || { value: 0, count: 0 };
        sectorMap.set(sector, {
          value: existing.value + marketValue,
          count: existing.count + 1
        });
      });

      // Calculate percentages
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
          dayChange: 0, // Would need historical data
          dayChangePercent: 0, // Would need historical data
          allocation: allocation.sort((a, b) => b.value - a.value),
          sectorAllocation: sectorAllocation.sort((a, b) => b.value - a.value)
        }
      });
    },

    // File operations
    importPositions: async (file: File) => {
      const { activePortfolioId } = get();
      if (!activePortfolioId) {
        set({ error: 'No active portfolio selected' });
        return;
      }

      try {
        set({ isLoading: true, error: null });
        await portfolioService.importPositions(activePortfolioId, file);
        await get().loadPositions();
      } catch (error) {
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
        await portfolioService.exportPositionsCSV(activePortfolioId);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to export positions'
        });
      }
    },

    // Utility
    clearError: () => set({ error: null })
  }),
  {
    name: 'portfolio-storage',
    partialize: (state) => ({
      activePortfolioId: state.activePortfolioId,
      lastUpdated: state.lastUpdated
    })
  }
));

export type { Portfolio, Position, PortfolioInsights };