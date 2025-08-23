import { db, Portfolio, Position } from '../lib/dexie'
import { v4 as uuidv4 } from 'uuid'
import { API_BASE_URL } from '../config/clientEnv'
import * as XLSX from 'xlsx'

export interface CreatePortfolioData {
  name: string
  description?: string
  currency: string
}

export interface PositionData {
  ticker: string
  name: string
  quantity: number
  averagePrice: number
  currency?: string
  sector?: string
  exchange?: string
}

export interface CSVPositionRow {
  ticker: string
  name: string
  quantity: string | number
  averagePrice: string | number
  currency?: string
  sector?: string
  exchange?: string
}

class PortfolioService {
  async createPortfolio(data: CreatePortfolioData): Promise<Portfolio> {
    // TODO: Replace with actual API call to POST /portfolio
    // const response = await fetch(`${API_BASE_URL}/portfolio`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(data)
    // });
    // if (!response.ok) throw new Error('Failed to create portfolio');
    // return await response.json();
    
    const now = Date.now()
    const portfolio: Portfolio = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      currency: data.currency,
      createdAt: now,
      updatedAt: now
    }

    await db.portfolios.add(portfolio)
    return portfolio
  }

  async listPortfolios(): Promise<Portfolio[]> {
    // TODO: Replace with actual API call to GET /portfolio
    // const response = await fetch(`${API_BASE_URL}/portfolio`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to fetch portfolios');
    // return await response.json();
    
    return await db.portfolios.orderBy('updatedAt').reverse().toArray()
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    // TODO: Replace with actual API call to GET /portfolio/{id}
    // const response = await fetch(`${API_BASE_URL}/portfolio/${id}`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to fetch portfolio');
    // return await response.json();
    return await db.portfolios.get(id)
  }

  async updatePortfolio(id: string, updates: Partial<Omit<Portfolio, 'id' | 'createdAt'>>): Promise<void> {
    await db.portfolios.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  async deletePortfolio(id: string): Promise<void> {
    // Delete all positions first
    await db.positions.where('portfolioId').equals(id).delete()
    // Then delete the portfolio
    await db.portfolios.delete(id)
  }

  async getPositions(portfolioId: string): Promise<Position[]> {
    // TODO: Replace with actual API call to GET /portfolio/{id}/positions
    // const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/positions`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to fetch positions');
    // return await response.json();
    
    return await db.positions
      .where('portfolioId')
      .equals(portfolioId)
      .orderBy('createdAt')
      .reverse()
      .toArray()
  }

  async addPosition(portfolioId: string, positionData: PositionData): Promise<Position> {
    // TODO: Replace with actual API call to POST /portfolio/{id}/positions
    // const response = await fetch(`${API_BASE_URL}/portfolio/${portfolioId}/positions`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(positionData)
    // });
    // if (!response.ok) throw new Error('Failed to add position');
    // return await response.json();
    
    // Check if portfolio exists
    const portfolio = await this.getPortfolio(portfolioId)
    if (!portfolio) {
      throw new Error('Portfolio not found')
    }const now = Date.now()
    const position: Position = {
      id: uuidv4(),
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
    }

    await db.positions.add(position)
    
    // Update portfolio timestamp
    await this.updatePortfolio(portfolioId, {})
    
    return position
  }

  async updatePosition(id: string, updates: Partial<Omit<Position, 'id' | 'portfolioId' | 'createdAt'>>): Promise<void> {
    const position = await db.positions.get(id)
    if (!position) {
      throw new Error('Position not found')
    }

    await db.positions.update(id, {
      ...updates,
      updatedAt: Date.now()
    })

    // Update portfolio timestamp
    await this.updatePortfolio(position.portfolioId, {})
  }

  async deletePosition(id: string): Promise<void> {
    const position = await db.positions.get(id)
    if (!position) {
      throw new Error('Position not found')
    }

    await db.positions.delete(id)
    
    // Update portfolio timestamp
    await this.updatePortfolio(position.portfolioId, {})
  }

  async savePositionsCSVorXLSX(portfolioId: string, file: File): Promise<Position[]> {
    const portfolio = await this.getPortfolio(portfolioId)
    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    let positions: PositionData[] = []

    if (fileExtension === 'csv') {
      positions = await this.parseCSV(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      positions = await this.parseXLSX(file)
    } else {
      throw new Error('Unsupported file format. Please use CSV or XLSX files.')
    }

    // Clear existing positions for this portfolio
    await db.positions.where('portfolioId').equals(portfolioId).delete()

    // Add new positions
    const savedPositions: Position[] = []
    for (const positionData of positions) {
      const savedPosition = await this.addPosition(portfolioId, positionData)
      savedPositions.push(savedPosition)
    }

    return savedPositions
  }

  private async parseCSV(file: File): Promise<PositionData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string
          const lines = csv.split('\n').filter(line => line.trim())
          
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row')
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          const positions: PositionData[] = []

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            if (values.length < headers.length) continue

            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index]
            })

            // Map common header variations
            const position: PositionData = {
              ticker: row.ticker || row.symbol || row.stock || '',
              name: row.name || row.company || row.description || '',
              quantity: parseFloat(row.quantity || row.shares || row.units || '0'),
              averagePrice: parseFloat(row.averageprice || row.price || row.cost || row['average price'] || '0'),
              currency: row.currency || row.curr || undefined,
              sector: row.sector || row.industry || undefined,
              exchange: row.exchange || row.market || undefined
            }

            if (position.ticker && position.quantity > 0 && position.averagePrice > 0) {
              positions.push(position)
            }
          }

          resolve(positions)
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  private async parseXLSX(file: File): Promise<PositionData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          const positions: PositionData[] = []
          
          for (const row of jsonData) {
            // Convert all keys to lowercase for consistent mapping
            const lowerRow: any = {}
            Object.keys(row).forEach(key => {
              lowerRow[key.toLowerCase().replace(/\s+/g, '')] = (row as any)[key]
            })
            
            const position: PositionData = {
              ticker: lowerRow.ticker || lowerRow.symbol || lowerRow.stock || '',
              name: lowerRow.name || lowerRow.company || lowerRow.description || '',
              quantity: parseFloat(lowerRow.quantity || lowerRow.shares || lowerRow.units || '0'),
              averagePrice: parseFloat(lowerRow.averageprice || lowerRow.price || lowerRow.cost || lowerRow.averagecost || '0'),
              currency: lowerRow.currency || lowerRow.curr || undefined,
              sector: lowerRow.sector || lowerRow.industry || undefined,
              exchange: lowerRow.exchange || lowerRow.market || undefined
            }
            
            if (position.ticker && position.quantity > 0 && position.averagePrice > 0) {
              positions.push(position)
            }
          }
          
          resolve(positions)
        } catch (error) {
          reject(new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  async exportPositionsCSV(portfolioId: string): Promise<string> {
    const positions = await this.getPositions(portfolioId)
    
    const headers = ['ticker', 'name', 'quantity', 'averagePrice', 'currency', 'sector', 'exchange']
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
    ].join('\n')

    return csvContent
  }

  async getTotalPositions(): Promise<number> {
    return await db.positions.count()
  }

  async getTotalPortfolios(): Promise<number> {
    return await db.portfolios.count()
  }

  async uploadPortfolioFile(portfolioId: string, file: File): Promise<{
    uploaded_positions: number;
    skipped_positions: number;
    errors: string[];
    upload_id: string;
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('authToken')
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${API_BASE_URL}/api/portfolio/${portfolioId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(errorData.message || 'Failed to upload portfolio file')
    }

    const result = await response.json()
    return result.data
  }
}

export { PortfolioService }
export const portfolioService = new PortfolioService()
export default portfolioService