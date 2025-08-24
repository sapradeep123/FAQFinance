import { query, transaction } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { marketDataService, MarketSnapshot } from './marketDataService';

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'STOCKS' | 'BONDS' | 'MIXED' | 'CRYPTO' | 'OTHER';
  currency: string;
  total_value_cents: number;
  total_cost_cents: number;
  unrealized_pnl_cents: number;
  realized_pnl_cents: number;
  cash_balance_cents: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface Position {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name?: string;
  quantity: number;
  avg_cost_cents: number;
  current_price_cents: number;
  market_value_cents: number;
  unrealized_pnl_cents: number;
  unrealized_pnl_percentage: number;
  last_updated: Date;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface PositionHistory {
  id: string;
  position_id: string;
  date: Date;
  quantity: number;
  price_cents: number;
  market_value_cents: number;
  unrealized_pnl_cents: number;
  created_at: Date;
}

export interface PortfolioUpload {
  id: string;
  portfolio_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processed_positions: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioAnalytics {
  id: string;
  portfolio_id: string;
  date: Date;
  total_value_cents: number;
  total_return_cents: number;
  total_return_percentage: number;
  day_change_cents: number;
  day_change_percentage: number;
  volatility_30d: number;
  sharpe_ratio: number;
  max_drawdown_percentage: number;
  sector_allocation: Record<string, number>;
  top_holdings: Array<{ ticker: string; percentage: number }>;
  created_at: Date;
}

export interface CreatePortfolioData {
  name: string;
  description?: string;
  type: 'STOCKS' | 'BONDS' | 'MIXED' | 'CRYPTO' | 'OTHER';
  currency?: string;
  cash_balance_cents?: number;
}

export interface AddPositionData {
  ticker: string;
  quantity: number;
  avg_cost_cents: number;
  company_name?: string;
}

export interface UpdatePositionData {
  quantity?: number;
  avg_cost_cents?: number;
}

class PortfolioService {
  async createPortfolio(userId: string, data: CreatePortfolioData): Promise<Portfolio> {
    const result = await query(
      `INSERT INTO portfolios (
        user_id, name, description, type, currency, cash_balance_cents, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, true)
      RETURNING id, user_id, name, description, type, currency, total_value_cents, 
                total_cost_cents, unrealized_pnl_cents, realized_pnl_cents, 
                cash_balance_cents, is_active, created_at, updated_at, metadata`,
      [
        userId,
        data.name,
        data.description || null,
        data.type,
        data.currency || 'USD',
        data.cash_balance_cents || 0
      ]
    );

    return result.rows[0];
  }

  async getUserPortfolios(userId: string, includeInactive: boolean = false): Promise<Portfolio[]> {
    let whereClause = 'WHERE user_id = ?';
    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    const result = await query(
      `SELECT id, user_id, name, description, type, currency, total_value_cents, 
              total_cost_cents, unrealized_pnl_cents, realized_pnl_cents, 
              cash_balance_cents, is_active, created_at, updated_at, metadata
       FROM portfolios 
       ${whereClause}
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async getPortfolio(portfolioId: string, userId: string): Promise<Portfolio | null> {
    const result = await query(
      `SELECT id, user_id, name, description, type, currency, total_value_cents, 
              total_cost_cents, unrealized_pnl_cents, realized_pnl_cents, 
              cash_balance_cents, is_active, created_at, updated_at, metadata
       FROM portfolios 
       WHERE id = ? AND user_id = ?`,
      [portfolioId, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updatePortfolio(
    portfolioId: string,
    userId: string,
    updates: Partial<CreatePortfolioData>
  ): Promise<Portfolio> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = ?`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = ?`);
      values.push(updates.description);
    }
    if (updates.type !== undefined) {
      setClause.push(`type = ?`);
      values.push(updates.type);
    }
    if (updates.currency !== undefined) {
      setClause.push(`currency = ?`);
      values.push(updates.currency);
    }
    if (updates.cash_balance_cents !== undefined) {
      setClause.push(`cash_balance_cents = ?`);
      values.push(updates.cash_balance_cents);
    }

    if (setClause.length === 0) {
      throw createError('No valid updates provided', 400);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(portfolioId, userId);

    const result = await query(
      `UPDATE portfolios 
       SET ${setClause.join(', ')}
       WHERE id = ? AND user_id = ?
       RETURNING id, user_id, name, description, type, currency, total_value_cents, 
                 total_cost_cents, unrealized_pnl_cents, realized_pnl_cents, 
                 cash_balance_cents, is_active, created_at, updated_at, metadata`,
      values
    );

    if (result.rows.length === 0) {
      throw createError('Portfolio not found', 404);
    }

    return result.rows[0];
  }

  async deletePortfolio(portfolioId: string, userId: string): Promise<void> {
    const result = await query(
      `UPDATE portfolios 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [portfolioId, userId]
    );

    if (result.rowCount === 0) {
      throw createError(404, 'Portfolio not found');
    }
  }

  async addPosition(
    portfolioId: string,
    userId: string,
    positionData: AddPositionData
  ): Promise<Position> {
    return await transaction(async (queryFn) => {
      // Verify portfolio ownership
      const portfolio = await this.getPortfolio(portfolioId, userId);
      if (!portfolio) {
        throw createError('Portfolio not found', 404);
      }

      // Check if position already exists
      const existingResult = await queryFn(
        'SELECT id, quantity, avg_cost_cents FROM positions WHERE portfolio_id = ? AND ticker = ?',
        [portfolioId, positionData.ticker.toUpperCase()]
      );

      let position: Position;

      if (existingResult.rows.length > 0) {
        // Update existing position (average cost calculation)
        const existing = existingResult.rows[0];
        const totalQuantity = existing.quantity + positionData.quantity;
        const totalCost = (existing.quantity * existing.avg_cost_cents) + 
                         (positionData.quantity * positionData.avg_cost_cents);
        const newAvgCost = Math.round(totalCost / totalQuantity);

        const updateResult = await queryFn(
          `UPDATE positions 
           SET quantity = ?, avg_cost_cents = ?, last_updated = CURRENT_TIMESTAMP
           WHERE id = ?
           RETURNING id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                     current_price_cents, market_value_cents, unrealized_pnl_cents, 
                     unrealized_pnl_percentage, last_updated, created_at, metadata`,
          [totalQuantity, newAvgCost, existing.id]
        );

        position = updateResult.rows[0];
      } else {
        // Create new position
        const insertResult = await queryFn(
          `INSERT INTO positions (
            portfolio_id, ticker, company_name, quantity, avg_cost_cents
          ) VALUES (?, ?, ?, ?, ?)
          RETURNING id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                    current_price_cents, market_value_cents, unrealized_pnl_cents, 
                    unrealized_pnl_percentage, last_updated, created_at, metadata`,
          [
            portfolioId,
            positionData.ticker.toUpperCase(),
            positionData.company_name || null,
            positionData.quantity,
            positionData.avg_cost_cents
          ]
        );

        position = insertResult.rows[0];
      }

      // Update position with current market data
      await this.updatePositionPrices([position.id]);

      // Recalculate portfolio totals
      await this.recalculatePortfolioTotals(portfolioId);

      // Get updated position
      const finalResult = await queryFn(
        `SELECT id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                current_price_cents, market_value_cents, unrealized_pnl_cents, 
                unrealized_pnl_percentage, last_updated, created_at, metadata
         FROM positions WHERE id = ?`,
        [position.id]
      );

      return finalResult.rows[0];
    });
  }

  async getPortfolioPositions(portfolioId: string, userId: string): Promise<Position[]> {
    // Verify portfolio ownership
    const portfolio = await this.getPortfolio(portfolioId, userId);
    if (!portfolio) {
      throw createError(404, 'Portfolio not found');
    }

    const result = await query(
      `SELECT id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
              current_price_cents, market_value_cents, unrealized_pnl_cents, 
              unrealized_pnl_percentage, last_updated, created_at, metadata
       FROM positions 
       WHERE portfolio_id = ? AND quantity > 0
       ORDER BY market_value_cents DESC`,
      [portfolioId]
    );

    return result.rows;
  }

  async updatePosition(
    positionId: string,
    userId: string,
    updates: UpdatePositionData
  ): Promise<Position> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify position ownership through portfolio
      const positionResult = await client.query(
        `SELECT p.id, p.portfolio_id, p.quantity, p.avg_cost_cents
         FROM positions p
         JOIN portfolios pf ON p.portfolio_id = pf.id
         WHERE p.id = ? AND pf.user_id = ?`,
        [positionId, userId]
      );

      if (positionResult.rows.length === 0) {
        throw createError(404, 'Position not found');
      }

      const position = positionResult.rows[0];

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      if (updates.quantity !== undefined) {
        setClause.push(`quantity = ?`);
        values.push(updates.quantity);
      }
      if (updates.avg_cost_cents !== undefined) {
        setClause.push(`avg_cost_cents = ?`);
        values.push(updates.avg_cost_cents);
      }

      if (setClause.length === 0) {
        throw createError(400, 'No valid updates provided');
      }

      setClause.push(`last_updated = CURRENT_TIMESTAMP`);
      values.push(positionId);

      const updateResult = await client.query(
        `UPDATE positions 
         SET ${setClause.join(', ')}
         WHERE id = ?
         RETURNING id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                   current_price_cents, market_value_cents, unrealized_pnl_cents, 
                   unrealized_pnl_percentage, last_updated, created_at, metadata`,
        values
      );

      const updatedPosition = updateResult.rows[0];

      // Update position with current market data
      await this.updatePositionPrices([updatedPosition.id]);

      // Recalculate portfolio totals
      await this.recalculatePortfolioTotals(position.portfolio_id);

      await client.query('COMMIT');

      // Get final updated position
      const finalResult = await pool.query(
        `SELECT id, portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                current_price_cents, market_value_cents, unrealized_pnl_cents, 
                unrealized_pnl_percentage, last_updated, created_at, metadata
         FROM positions WHERE id = ?`,
        [updatedPosition.id]
      );

      return finalResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removePosition(positionId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify position ownership and get portfolio ID
      const positionResult = await client.query(
        `SELECT p.portfolio_id
         FROM positions p
         JOIN portfolios pf ON p.portfolio_id = pf.id
         WHERE p.id = ? AND pf.user_id = ?`,
        [positionId, userId]
      );

      if (positionResult.rows.length === 0) {
        throw createError(404, 'Position not found');
      }

      const portfolioId = positionResult.rows[0].portfolio_id;

      // Delete the position
      await client.query('DELETE FROM positions WHERE id = ?', [positionId]);

      // Recalculate portfolio totals
      await this.recalculatePortfolioTotals(portfolioId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePositionPrices(positionIds?: string[]): Promise<void> {
    let query = `
      SELECT id, ticker, quantity, avg_cost_cents 
      FROM positions 
      WHERE quantity > 0
    `;
    const params: any[] = [];

    if (positionIds && positionIds.length > 0) {
      query += ` AND id = ANY($1)`;
      params.push(positionIds);
    }

    const positions = await pool.query(query, params);

    if (positions.rows.length === 0) {
      return;
    }

    // Get unique tickers
    const tickers = [...new Set(positions.rows.map(p => p.ticker))];

    // Fetch current market data
    const marketData = await marketDataService.getMarketSnapshots(tickers);
    const marketDataMap = new Map(marketData.map(data => [data.ticker, data]));

    // Update positions with current prices
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const position of positions.rows) {
        const marketSnapshot = marketDataMap.get(position.ticker);
        if (!marketSnapshot) continue;

        const currentPriceCents = Math.round(marketSnapshot.price * 100);
        const marketValueCents = position.quantity * currentPriceCents;
        const costBasisCents = position.quantity * position.avg_cost_cents;
        const unrealizedPnlCents = marketValueCents - costBasisCents;
        const unrealizedPnlPercentage = costBasisCents > 0 ? 
          (unrealizedPnlCents / costBasisCents) * 100 : 0;

        await client.query(
          `UPDATE positions 
           SET current_price_cents = ?,
               market_value_cents = ?,
               unrealized_pnl_cents = ?,
               unrealized_pnl_percentage = ?,
               last_updated = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            currentPriceCents,
            marketValueCents,
            unrealizedPnlCents,
            unrealizedPnlPercentage,
            position.id
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recalculatePortfolioTotals(portfolioId: string): Promise<void> {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(market_value_cents), 0) as total_market_value,
        COALESCE(SUM(quantity * avg_cost_cents), 0) as total_cost,
        COALESCE(SUM(unrealized_pnl_cents), 0) as total_unrealized_pnl
       FROM positions 
       WHERE portfolio_id = ? AND quantity > 0`,
      [portfolioId]
    );

    const totals = result.rows[0];

    await pool.query(
      `UPDATE portfolios 
       SET total_value_cents = ?,
           total_cost_cents = ?,
           unrealized_pnl_cents = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        parseInt(totals.total_market_value),
        parseInt(totals.total_cost),
        parseInt(totals.total_unrealized_pnl),
        portfolioId
      ]
    );
  }

  async getPositionHistory(
    positionId: string,
    userId: string,
    days: number = 30
  ): Promise<PositionHistory[]> {
    // Verify position ownership
    const positionResult = await pool.query(
      `SELECT p.id
       FROM positions p
       JOIN portfolios pf ON p.portfolio_id = pf.id
       WHERE p.id = ? AND pf.user_id = ?`,
      [positionId, userId]
    );

    if (positionResult.rows.length === 0) {
      throw createError(404, 'Position not found');
    }

    const result = await pool.query(
      `SELECT id, position_id, date, quantity, price_cents, market_value_cents, 
              unrealized_pnl_cents, created_at
       FROM position_history 
       WHERE position_id = ? AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`,
      [positionId]
    );

    return result.rows;
  }

  async getPortfolioAnalytics(
    portfolioId: string,
    userId: string,
    days: number = 30
  ): Promise<PortfolioAnalytics[]> {
    // Verify portfolio ownership
    const portfolio = await this.getPortfolio(portfolioId, userId);
    if (!portfolio) {
      throw createError(404, 'Portfolio not found');
    }

    const result = await pool.query(
      `SELECT id, portfolio_id, date, total_value_cents, total_return_cents, 
              total_return_percentage, day_change_cents, day_change_percentage, 
              volatility_30d, sharpe_ratio, max_drawdown_percentage, 
              sector_allocation, top_holdings, created_at
       FROM portfolio_analytics 
       WHERE portfolio_id = ? AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`,
      [portfolioId]
    );

    return result.rows;
  }

  async refreshPortfolioData(portfolioId: string, userId: string): Promise<Portfolio> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify portfolio ownership
      const portfolio = await this.getPortfolio(portfolioId, userId);
      if (!portfolio) {
        throw createError(404, 'Portfolio not found');
      }

      // Get all positions for this portfolio
      const positionsResult = await client.query(
        'SELECT id FROM positions WHERE portfolio_id = ? AND quantity > 0',
        [portfolioId]
      );

      const positionIds = positionsResult.rows.map(row => row.id);

      // Update all position prices
      if (positionIds.length > 0) {
        await this.updatePositionPrices(positionIds);
      }

      // Recalculate portfolio totals
      await this.recalculatePortfolioTotals(portfolioId);

      await client.query('COMMIT');

      // Return updated portfolio
      return await this.getPortfolio(portfolioId, userId) as Portfolio;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPortfolioSummary(userId: string): Promise<{
    total_portfolios: number;
    total_value_cents: number;
    total_unrealized_pnl_cents: number;
    total_positions: number;
    top_performers: Array<{ ticker: string; unrealized_pnl_percentage: number }>;
    worst_performers: Array<{ ticker: string; unrealized_pnl_percentage: number }>;
  }> {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT pf.id) as total_portfolios,
        COALESCE(SUM(pf.total_value_cents), 0) as total_value_cents,
        COALESCE(SUM(pf.unrealized_pnl_cents), 0) as total_unrealized_pnl_cents,
        COUNT(DISTINCT p.id) as total_positions
      FROM portfolios pf
      LEFT JOIN positions p ON pf.id = p.portfolio_id AND p.quantity > 0
      WHERE pf.user_id = ? AND pf.is_active = true`,
      [userId]
    );

    const summary = result.rows[0];

    // Get top and worst performers
    const performersResult = await pool.query(
      `SELECT ticker, unrealized_pnl_percentage
       FROM positions p
       JOIN portfolios pf ON p.portfolio_id = pf.id
       WHERE pf.user_id = ? AND pf.is_active = true AND p.quantity > 0
       ORDER BY unrealized_pnl_percentage DESC
       LIMIT 10`,
      [userId]
    );

    const performers = performersResult.rows;
    const topPerformers = performers.slice(0, 5);
    const worstPerformers = performers.slice(-5).reverse();

    return {
      total_portfolios: parseInt(summary.total_portfolios),
      total_value_cents: parseInt(summary.total_value_cents),
      total_unrealized_pnl_cents: parseInt(summary.total_unrealized_pnl_cents),
      total_positions: parseInt(summary.total_positions),
      top_performers: topPerformers,
      worst_performers: worstPerformers
    };
  }

  async processUploadedPositions(
    portfolioId: string,
    userId: string,
    positions: any[],
    fileInfo: {
      filename: string;
      fileSize: number;
      mimeType: string;
    }
  ): Promise<{
    uploaded_positions: number;
    skipped_positions: number;
    errors: string[];
    upload_id: string;
  }> {
    const client = await pool.connect();
    const errors: string[] = [];
    let uploadedCount = 0;
    let skippedCount = 0;
    
    try {
      await client.query('BEGIN');

      // Verify portfolio ownership
      const portfolio = await this.getPortfolio(portfolioId, userId);
      if (!portfolio) {
        throw createError(404, 'Portfolio not found');
      }

      // Create upload record
      const uploadResult = await client.query(
        `INSERT INTO portfolio_uploads 
         (portfolio_id, filename, file_size, file_type, upload_status, created_at)
         VALUES (?, ?, ?, ?, 'processing', CURRENT_TIMESTAMP)
         RETURNING id`,
        [portfolioId, fileInfo.filename, fileInfo.fileSize, fileInfo.mimeType]
      );
      
      const uploadId = uploadResult.rows[0].id;

      // Process each position
      for (const positionData of positions) {
        try {
          // Validate required fields
          if (!positionData.ticker || !positionData.quantity || !positionData.avgCostCents) {
            errors.push(`Skipped position: Missing required fields (ticker: ${positionData.ticker})`);
            skippedCount++;
            continue;
          }

          const ticker = positionData.ticker.toUpperCase();
          const quantity = parseFloat(positionData.quantity);
          const avgCostCents = parseInt(positionData.avgCostCents);

          if (quantity <= 0 || avgCostCents <= 0) {
            errors.push(`Skipped ${ticker}: Invalid quantity or price`);
            skippedCount++;
            continue;
          }

          // Check if position already exists
          const existingResult = await client.query(
            'SELECT id, quantity, avg_cost_cents FROM positions WHERE portfolio_id = ? AND ticker = ?',
            [portfolioId, ticker]
          );

          if (existingResult.rows.length > 0) {
            // Update existing position (average cost calculation)
            const existing = existingResult.rows[0];
            const totalQuantity = existing.quantity + quantity;
            const totalCost = (existing.quantity * existing.avg_cost_cents) + (quantity * avgCostCents);
            const newAvgCost = Math.round(totalCost / totalQuantity);

            await client.query(
              `UPDATE positions 
               SET quantity = ?, avg_cost_cents = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [totalQuantity, newAvgCost, existing.id]
            );
          } else {
            // Create new position
            await client.query(
              `INSERT INTO positions 
               (portfolio_id, ticker, company_name, quantity, avg_cost_cents, 
                sector, exchange, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                portfolioId,
                ticker,
                positionData.companyName || null,
                quantity,
                avgCostCents,
                positionData.sector || null,
                positionData.exchange || null
              ]
            );
          }

          uploadedCount++;
        } catch (error: any) {
          errors.push(`Error processing ${positionData.ticker}: ${error.message}`);
          skippedCount++;
        }
      }

      // Update upload status
      const finalStatus = errors.length > 0 ? 'completed_with_errors' : 'completed';
      await client.query(
        `UPDATE portfolio_uploads 
         SET upload_status = ?, processed_at = CURRENT_TIMESTAMP,
             positions_uploaded = ?, positions_skipped = ?, error_details = ?
         WHERE id = ?`,
        [finalStatus, uploadedCount, skippedCount, JSON.stringify(errors), uploadId]
      );

      // Recalculate portfolio totals
      await this.recalculatePortfolioTotals(portfolioId, client);

      await client.query('COMMIT');

      return {
        uploaded_positions: uploadedCount,
        skipped_positions: skippedCount,
        errors,
        upload_id: uploadId
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recalculatePortfolioTotals(portfolioId: string, client?: any): Promise<void> {
    const queryClient = client || pool;
    
    // Calculate total cost and current value
    const result = await queryClient.query(
      `SELECT 
        COALESCE(SUM(quantity * avg_cost_cents), 0) as total_cost_cents,
        COUNT(*) as position_count
       FROM positions 
       WHERE portfolio_id = ? AND quantity > 0`,
      [portfolioId]
    );

    const { total_cost_cents } = result.rows[0];

    // Update portfolio totals (we'll update market values when we fetch real-time data)
    await queryClient.query(
      `UPDATE portfolios 
       SET total_cost_cents = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [total_cost_cents, portfolioId]
    );
  }
}

export const portfolioService = new PortfolioService();
export default portfolioService;