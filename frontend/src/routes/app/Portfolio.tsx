import { useState, useEffect } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

import { MoreHorizontal, Plus, Upload, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import { usePortfolioStore } from '../../stores/usePortfolioStore'

interface Portfolio {
  id: string
  name: string
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  positions: number
}

interface Position {
  id: string
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  gainLoss: number
  gainLossPercent: number
  sector: string
}

interface SectorAllocation {
  sector: string
  value: number
  percentage: number
  color: string
}

export function Portfolio() {
  const { toast } = useToast()
  
  // Portfolio store integration
  const { 
    portfolios: storePortfolios, 
    positions, 
    loadPortfolios, 
    createPortfolio, 
    setActivePortfolio 
  } = usePortfolioStore()
  
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
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
  
  const [samplePositions] = useState<Position[]>([
    {
      id: '1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 100,
      avgPrice: 150.00,
      currentPrice: 175.50,
      marketValue: 17550,
      gainLoss: 2550,
      gainLossPercent: 17.0,
      sector: 'Technology'
    },
    {
      id: '2',
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      quantity: 50,
      avgPrice: 2800.00,
      currentPrice: 2950.00,
      marketValue: 147500,
      gainLoss: 7500,
      gainLossPercent: 5.36,
      sector: 'Technology'
    },
    {
      id: '3',
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      quantity: 75,
      avgPrice: 220.00,
      currentPrice: 195.00,
      marketValue: 14625,
      gainLoss: -1875,
      gainLossPercent: -11.36,
      sector: 'Automotive'
    },
    {
      id: '4',
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 80,
      avgPrice: 300.00,
      currentPrice: 335.00,
      marketValue: 26800,
      gainLoss: 2800,
      gainLossPercent: 11.67,
      sector: 'Technology'
    },
    {
      id: '5',
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      quantity: 60,
      avgPrice: 3200.00,
      currentPrice: 3100.00,
      marketValue: 186000,
      gainLoss: -6000,
      gainLossPercent: -3.13,
      sector: 'E-commerce'
    }
  ])
  
  const [sectorAllocations] = useState<SectorAllocation[]>([
    { sector: 'Technology', value: 191850, percentage: 48.7, color: '#3b82f6' },
    { sector: 'E-commerce', value: 186000, percentage: 47.2, color: '#10b981' },
    { sector: 'Automotive', value: 14625, percentage: 3.7, color: '#f59e0b' },
    { sector: 'Healthcare', value: 1525, percentage: 0.4, color: '#ef4444' }
  ])
  
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  
  // Load portfolios on component mount
  useEffect(() => {
    loadPortfolios()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a portfolio name',
        variant: 'destructive'
      })
      return
    }
    
    try {
      await createPortfolio({
        name: newPortfolioName,
        description: `Portfolio created on ${new Date().toLocaleDateString()}`
      })
      
      // Also add to local state for immediate UI update
      const newPortfolio: Portfolio = {
        id: Date.now().toString(),
        name: newPortfolioName,
        totalValue: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        positions: 0
      }
      
      setPortfolios([...portfolios, newPortfolio])
      setNewPortfolioName('')
      setShowCreateDialog(false)
      
      toast({
        title: 'Success',
        description: `Portfolio "${newPortfolioName}" created successfully`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create portfolio. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleDeletePortfolio = (portfolioId: string) => {
    const portfolio = portfolios.find(p => p.id === portfolioId)
    if (portfolio) {
      setPortfolios(portfolios.filter(p => p.id !== portfolioId))
      toast({
        title: 'Success',
        description: `Portfolio "${portfolio.name}" deleted successfully`
      })
    }
  }

  const handleUploadPortfolio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const fileName = file.name
      const fileSize = (file.size / 1024 / 1024).toFixed(2) // Convert to MB
      
      toast({
        title: 'Portfolio Upload Started',
        description: `Processing ${fileName} (${fileSize} MB)...`
      })
      
      // Simulate file processing
      setTimeout(() => {
        toast({
          title: 'Upload Complete',
          description: `Successfully imported portfolio data from ${fileName}`
        })
      }, 2000)
    }
    
    // Reset the input value to allow uploading the same file again
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Management</h1>
          <p className="text-muted-foreground">Track and manage your investment portfolios</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>
                  Enter a name for your new portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePortfolio}>
                  Create Portfolio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleUploadPortfolio}
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Portfolio
              </Button>
            </div>
        </div>
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
            <Card key={portfolio.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
              setSelectedPortfolio(portfolio.id)
              setActivePortfolio(portfolio.id)
            }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{portfolio.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      setActiveTab('positions')
                      setSelectedPortfolio(portfolio.id)
                      setActivePortfolio(portfolio.id)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      toast({
                        title: 'Edit Feature',
                        description: 'Portfolio editing will be available soon'
                      })
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePortfolio(portfolio.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Portfolio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="font-semibold text-lg">{formatCurrency(portfolio.totalValue)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Daily Change</span>
                  <div className="flex items-center">
                    {portfolio.dailyChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    <span className={cn(
                      'font-semibold',
                      portfolio.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatCurrency(portfolio.dailyChange)} ({formatPercent(portfolio.dailyChangePercent)})
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Positions</span>
                  <Badge variant="secondary">{portfolio.positions} holdings</Badge>
                </div>
                
                {portfolio.totalValue > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Performance</span>
                      <span>{portfolio.dailyChangePercent > 0 ? 'Gaining' : 'Losing'}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all",
                          portfolio.dailyChangePercent >= 0 ? "bg-green-600" : "bg-red-600"
                        )}
                        style={{ width: `${Math.min(Math.abs(portfolio.dailyChangePercent) * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+12.5%</div>
                <p className="text-xs text-muted-foreground">+$15,420 this year</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">AAPL</div>
                <p className="text-xs text-green-600">+28.3% return</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">Medium</div>
                <p className="text-xs text-muted-foreground">Volatility: 18.2%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dividend Yield</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.8%</div>
                <p className="text-xs text-muted-foreground">$3,420 annually</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Sector Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Sector Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorAllocations.map((sector) => (
                   <div key={sector.name} className="flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                       <div 
                         className="w-4 h-4 rounded-full" 
                         style={{ backgroundColor: sector.color }}
                       />
                       <span className="font-medium">{sector.name}</span>
                     </div>
                    <div className="text-right">
                      <div className="font-semibold">{sector.percentage}%</div>
                      <div className="text-sm text-muted-foreground">{formatCurrency(sector.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Interactive chart will be available soon</p>
                  <p className="text-sm text-muted-foreground mt-1">Portfolio performance over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-6">
          {/* Positions Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Portfolio Positions</h3>
              <p className="text-sm text-muted-foreground">
                {selectedPortfolio ? `Showing positions for ${portfolios.find(p => p.id === selectedPortfolio)?.name || 'Selected Portfolio'}` : 'All positions across portfolios'}
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </div>
          
          {/* Positions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samplePositions.map((position) => {
                    const gainLoss = position.gainLoss
                    const gainLossPercent = position.gainLossPercent
                    const marketValue = position.marketValue
                    
                    return (
                      <TableRow key={position.symbol}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>{position.name}</TableCell>
                        <TableCell className="text-right">{position.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(position.avgPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(position.currentPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(marketValue)}</TableCell>
                        <TableCell className={cn(
                          'text-right font-semibold',
                          gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(gainLoss)}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right font-semibold',
                          gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                toast({
                                  title: 'Buy More',
                                  description: `Adding more ${position.symbol} shares`
                                })
                              }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Buy More
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                toast({
                                  title: 'Sell Position',
                                  description: `Selling ${position.symbol} shares`
                                })
                              }}>
                                <TrendingDown className="h-4 w-4 mr-2" />
                                Sell
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                toast({
                                  title: 'Position Details',
                                  description: `Viewing details for ${position.symbol}`
                                })
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Position Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{samplePositions.length}</div>
                <p className="text-xs text-muted-foreground">Active holdings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Market Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(samplePositions.reduce((sum, pos) => sum + pos.marketValue, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Current value</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(samplePositions.reduce((sum, pos) => sum + pos.gainLoss, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Unrealized P&L</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}