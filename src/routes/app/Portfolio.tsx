import { useState } from 'react'
import { cn } from '../../lib/cn'

interface Portfolio {
  id: string
  name: string
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  positions: number
}

export function Portfolio() {
  const [portfolios] = useState<Portfolio[]>([
    {
      id: '1',
      name: 'Main Portfolio',
      totalValue: 125000,
      dailyChange: 2500,
      dailyChangePercent: 2.04,
      positions: 12
    },
    {
      id: '2',
      name: 'Retirement Fund',
      totalValue: 85000,
      dailyChange: -1200,
      dailyChangePercent: -1.39,
      positions: 8
    }
  ])
  const [activeTab, setActiveTab] = useState('overview')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Management</h1>
          <p className="text-muted-foreground">Track and manage your investment portfolios</p>
        </div>
        <button className="btn btn-primary">
          Upload Portfolio
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'positions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Positions
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-foreground">{portfolio.name}</h3>
                <button className="text-muted-foreground hover:text-foreground">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-semibold">{formatCurrency(portfolio.totalValue)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily Change</span>
                  <span className={cn(
                    'font-semibold',
                    portfolio.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(portfolio.dailyChange)} ({formatPercent(portfolio.dailyChangePercent)})
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <span className="font-semibold">{portfolio.positions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Analytics</h3>
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Analytics dashboard coming soon</p>
              <p className="text-sm mt-2">Performance charts, risk metrics, and allocation analysis</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Positions</h3>
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p>Detailed positions view coming soon</p>
              <p className="text-sm mt-2">Individual holdings, quantities, and performance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}